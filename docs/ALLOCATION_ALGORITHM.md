# Peer Evaluation Allocation Algorithm

## Overview

The allocation algorithm assigns peer evaluators to student submissions while maintaining fairness, load balancing, and preventing identification.

## Design Decisions

### Trigger: Immediate on Submission

**Decision**: Allocate evaluators immediately when a student submits their test.

**Rationale**:
1. **Faster feedback**: Students can start evaluating earlier
2. **Better UX**: No waiting for submission window to close
3. **Simpler implementation**: No batch processing needed
4. **Real-time progress**: Admin can monitor allocations as they happen

**Trade-off**: If few students have submitted, allocation pool is limited. Mitigation: Re-run allocation after window closes if needed.

## Algorithm Specification

### Inputs

```typescript
interface AllocationInput {
  attemptId: string;           // The submission to allocate
  testConfig: {
    evaluatorsPerSubmission: number;  // N (default: 1)
    sameBatchOnly: boolean;           // Restrict to same batch
    noRepeatHorizon: number;          // Tests to check for repeat pairs
  };
}
```

### Constraints

1. **Self-exclusion**: Student cannot evaluate their own submission
2. **Batch restriction** (optional): Evaluator must be from same batch
3. **No recent repeats**: Avoid same evaluator-author pairs within horizon
4. **Load balancing**: Prefer evaluators with fewer assignments
5. **Fairness**: Random selection among equally qualified candidates

### Algorithm Steps

```
FUNCTION allocatePeerEvaluators(attemptId, testConfig):
    // Step 1: Get submission details
    attempt = getAttempt(attemptId)
    test = getTest(attempt.testId)
    student = getProfile(attempt.studentId)
    
    // Step 2: Get all potential evaluators
    allStudents = getStudents(WHERE role = 'student' AND isActive = true)
    
    // Step 3: Apply filters
    candidates = []
    FOR each s IN allStudents:
        // Exclude self
        IF s.id == student.id THEN CONTINUE
        
        // Batch restriction
        IF testConfig.sameBatchOnly AND s.batch != student.batch THEN CONTINUE
        
        // Check recent pairing history
        IF hasRecentPairing(s.id, student.id, testConfig.noRepeatHorizon) THEN CONTINUE
        
        // Check if already allocated for this test
        IF hasAllocationForTest(s.id, test.id) >= maxAllocationsPerStudent THEN CONTINUE
        
        candidates.ADD(s)
    
    // Step 4: Calculate assignment load for each candidate
    FOR each c IN candidates:
        c.currentLoad = countPendingAllocations(c.id)
    
    // Step 5: Sort by load (ascending) with random tiebreaker
    candidates.SORT_BY(c => (c.currentLoad, RANDOM()))
    
    // Step 6: Select top N evaluators
    selected = candidates.TAKE(testConfig.evaluatorsPerSubmission)
    
    // Step 7: Create allocations
    allocations = []
    FOR each evaluator IN selected:
        allocation = createAllocation({
            attemptId: attemptId,
            evaluatorId: evaluator.id,
            allocatedAt: NOW(),
            status: 'pending',
            deadline: test.evalEndAt
        })
        allocations.ADD(allocation)
    
    // Step 8: Log allocation event
    logAuditEvent('allocation_created', {
        attemptId: attemptId,
        evaluatorIds: selected.MAP(e => e.id),
        constraints: testConfig
    })
    
    RETURN allocations
```

### Helper Functions

```
FUNCTION hasRecentPairing(evaluatorId, authorId, horizon):
    // Find tests within horizon
    recentTests = getRecentTests(horizon)
    
    // Check if this pair has been matched
    FOR each testId IN recentTests:
        IF EXISTS allocation WHERE
            evaluatorId = evaluatorId AND
            attempt.studentId = authorId AND
            attempt.testId = testId
        THEN RETURN true
    
    RETURN false

FUNCTION countPendingAllocations(evaluatorId):
    RETURN COUNT(allocations WHERE 
        evaluatorId = evaluatorId AND
        status IN ('pending', 'in_progress'))
```

## SQL Implementation

```sql
CREATE OR REPLACE FUNCTION allocate_peer_evaluators(p_attempt_id UUID)
RETURNS SETOF allocations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_test_id UUID;
    v_student_id UUID;
    v_student_batch TEXT;
    v_evaluators_needed INTEGER;
    v_same_batch_only BOOLEAN;
    v_no_repeat_horizon INTEGER;
    v_eval_end_at TIMESTAMPTZ;
    v_evaluator RECORD;
BEGIN
    -- Get attempt and test details
    SELECT 
        a.test_id, a.student_id, p.batch,
        t.evaluators_per_submission, t.same_batch_only, 
        t.no_repeat_horizon, t.eval_end_at
    INTO 
        v_test_id, v_student_id, v_student_batch,
        v_evaluators_needed, v_same_batch_only,
        v_no_repeat_horizon, v_eval_end_at
    FROM attempts a
    JOIN profiles p ON p.id = a.student_id
    JOIN tests t ON t.id = a.test_id
    WHERE a.id = p_attempt_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Attempt not found: %', p_attempt_id;
    END IF;
    
    -- Find and allocate evaluators
    FOR v_evaluator IN (
        WITH recent_tests AS (
            -- Get recent test IDs within horizon
            SELECT id FROM tests
            WHERE id != v_test_id
            ORDER BY created_at DESC
            LIMIT v_no_repeat_horizon
        ),
        recent_pairs AS (
            -- Get evaluator-author pairs from recent tests
            SELECT DISTINCT al.evaluator_id, att.student_id
            FROM allocations al
            JOIN attempts att ON att.id = al.attempt_id
            WHERE att.test_id IN (SELECT id FROM recent_tests)
        ),
        evaluator_loads AS (
            -- Count pending allocations per evaluator
            SELECT 
                evaluator_id,
                COUNT(*) as pending_count
            FROM allocations
            WHERE status IN ('pending', 'in_progress')
            GROUP BY evaluator_id
        ),
        candidates AS (
            -- Find eligible candidates
            SELECT 
                p.id,
                COALESCE(el.pending_count, 0) as load
            FROM profiles p
            LEFT JOIN evaluator_loads el ON el.evaluator_id = p.id
            WHERE p.role = 'student'
            AND p.is_active = true
            AND p.id != v_student_id
            AND (NOT v_same_batch_only OR p.batch = v_student_batch)
            AND NOT EXISTS (
                -- Exclude recent pairs
                SELECT 1 FROM recent_pairs rp
                WHERE rp.evaluator_id = p.id
                AND rp.student_id = v_student_id
            )
            AND NOT EXISTS (
                -- Exclude already allocated for this attempt
                SELECT 1 FROM allocations al
                WHERE al.attempt_id = p_attempt_id
                AND al.evaluator_id = p.id
            )
        )
        SELECT id
        FROM candidates
        ORDER BY load ASC, RANDOM()
        LIMIT v_evaluators_needed
    )
    LOOP
        INSERT INTO allocations (
            attempt_id, evaluator_id, allocated_at, 
            status, deadline
        )
        VALUES (
            p_attempt_id, v_evaluator.id, NOW(),
            'pending', v_eval_end_at
        )
        RETURNING * INTO v_evaluator;
        
        RETURN NEXT v_evaluator;
    END LOOP;
    
    -- Log allocation event
    INSERT INTO audit_logs (action_type, payload)
    VALUES ('allocation_created', jsonb_build_object(
        'attempt_id', p_attempt_id,
        'allocations', (SELECT jsonb_agg(id) FROM allocations WHERE attempt_id = p_attempt_id)
    ));
    
    RETURN;
END;
$$;
```

## Edge Cases

### 1. Insufficient Evaluators

**Scenario**: Fewer eligible candidates than `evaluatorsPerSubmission`.

**Solution**: Allocate available candidates, flag for admin review.

```sql
-- After allocation, check if we got enough
IF (SELECT COUNT(*) FROM allocations WHERE attempt_id = p_attempt_id) 
   < v_evaluators_needed THEN
    INSERT INTO audit_logs (action_type, payload)
    VALUES ('allocation_insufficient', jsonb_build_object(
        'attempt_id', p_attempt_id,
        'needed', v_evaluators_needed,
        'allocated', (SELECT COUNT(*) FROM allocations WHERE attempt_id = p_attempt_id)
    ));
END IF;
```

### 2. Early Submissions

**Scenario**: First few submissions have no peers to evaluate yet.

**Solution**: 
1. Allocate from future submitters when they submit
2. Or admin triggers re-allocation after window closes

### 3. Dropout Evaluators

**Scenario**: Assigned evaluator becomes inactive.

**Solution**: Admin can re-run allocation for specific submissions.

```sql
CREATE OR REPLACE FUNCTION reallocate_expired_allocations(p_test_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_count INTEGER := 0;
    v_allocation RECORD;
BEGIN
    FOR v_allocation IN (
        SELECT al.* 
        FROM allocations al
        JOIN attempts a ON a.id = al.attempt_id
        WHERE a.test_id = p_test_id
        AND al.status = 'pending'
        AND (al.deadline < NOW() OR NOT EXISTS (
            SELECT 1 FROM profiles p 
            WHERE p.id = al.evaluator_id 
            AND p.is_active = true
        ))
    )
    LOOP
        -- Mark as expired
        UPDATE allocations SET status = 'expired' 
        WHERE id = v_allocation.id;
        
        -- Trigger new allocation
        PERFORM allocate_peer_evaluators(v_allocation.attempt_id);
        v_count := v_count + 1;
    END LOOP;
    
    RETURN v_count;
END;
$$;
```

## Monitoring & Admin Tools

### Allocation Status Dashboard Query

```sql
SELECT 
    t.title,
    COUNT(DISTINCT a.id) as total_submissions,
    COUNT(al.id) as total_allocations,
    COUNT(CASE WHEN al.status = 'pending' THEN 1 END) as pending,
    COUNT(CASE WHEN al.status = 'in_progress' THEN 1 END) as in_progress,
    COUNT(CASE WHEN al.status = 'completed' THEN 1 END) as completed,
    COUNT(CASE WHEN al.status = 'expired' THEN 1 END) as expired
FROM tests t
LEFT JOIN attempts a ON a.test_id = t.id AND a.status = 'submitted'
LEFT JOIN allocations al ON al.attempt_id = a.id
GROUP BY t.id, t.title;
```

### Evaluator Load Distribution

```sql
SELECT 
    p.name,
    p.roll_no,
    COUNT(al.id) as total_assignments,
    COUNT(CASE WHEN al.status = 'pending' THEN 1 END) as pending,
    COUNT(CASE WHEN al.status = 'completed' THEN 1 END) as completed,
    ROUND(AVG(e.total_score)::numeric, 2) as avg_score_given
FROM profiles p
LEFT JOIN allocations al ON al.evaluator_id = p.id
LEFT JOIN evaluations e ON e.allocation_id = al.id
WHERE p.role = 'student'
GROUP BY p.id
ORDER BY total_assignments DESC;
```

## Fairness Metrics

### Load Balance Score

```sql
-- Calculate coefficient of variation for allocation loads
WITH loads AS (
    SELECT 
        evaluator_id,
        COUNT(*) as allocation_count
    FROM allocations al
    JOIN attempts a ON a.id = al.attempt_id
    WHERE a.test_id = $1
    GROUP BY evaluator_id
)
SELECT 
    AVG(allocation_count) as mean_load,
    STDDEV(allocation_count) as std_load,
    STDDEV(allocation_count) / NULLIF(AVG(allocation_count), 0) as cv
FROM loads;
-- CV < 0.2 indicates good balance
```
