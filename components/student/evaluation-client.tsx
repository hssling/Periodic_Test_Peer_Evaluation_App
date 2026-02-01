'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { getSupabaseClient } from '@/lib/supabase/client';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Loader2, Save, Send, User } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

interface EvaluationClientProps {
  allocation: any;
  submission: any;
  existingEvaluation: any;
}

export function EvaluationClient({ allocation, submission, existingEvaluation }: EvaluationClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const supabase = getSupabaseClient();

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [scores, setScores] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    existingEvaluation?.items?.forEach((item: any) => {
      initial[item.question_id] = item.score;
    });
    return initial;
  });
  const [feedback, setFeedback] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    existingEvaluation?.items?.forEach((item: any) => {
      initial[item.question_id] = item.feedback || '';
    });
    return initial;
  });
  const [overallFeedback, setOverallFeedback] = useState(existingEvaluation?.overall_feedback || '');
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [evaluationId, setEvaluationId] = useState(existingEvaluation?.id);

  const questions = submission.questions || [];
  const responses = new Map(submission.responses?.map((r: any) => [r.question_id, r]) || []);
  const currentQuestion = questions[currentQuestionIndex];
  const currentResponse = responses.get(currentQuestion?.id);

  const totalScore = Object.values(scores).reduce((sum, s) => sum + (s || 0), 0);
  const maxScore = questions.reduce((sum: number, q: any) => sum + q.max_marks, 0);

  const retryOperation = useCallback(
    async <T,>(operation: () => Promise<T>, retries = 3) => {
      let attemptCount = 0;
      let delay = 500;
      while (attemptCount < retries) {
        try {
          return await operation();
        } catch (error) {
          attemptCount += 1;
          if (attemptCount >= retries) throw error;
          await new Promise((resolve) => setTimeout(resolve, delay));
          delay *= 2;
        }
      }
      throw new Error('Retry failed');
    },
    [],
  );

  const ensureEvaluation = useCallback(async () => {
    if (evaluationId) return;
    const { data } = await retryOperation(() =>
      supabase
        .from('evaluations')
        .insert({
          allocation_id: allocation.id,
          is_draft: true,
        })
        .select()
        .single(),
    );

    if (data) {
      setEvaluationId(data.id);
      // Update allocation status
      await retryOperation(() =>
        supabase
          .from('allocations')
          .update({ status: 'in_progress' })
          .eq('id', allocation.id),
      );
    }
  }, [allocation.id, evaluationId, retryOperation, supabase]);

  // Create or get evaluation on mount
  useEffect(() => {
    ensureEvaluation();
  }, [ensureEvaluation]);

  const handleScoreChange = (questionId: string, score: number, maxMarks: number) => {
    const validScore = Math.min(Math.max(0, score), maxMarks);
    setScores(prev => ({ ...prev, [questionId]: validScore }));
  };

  const handleSaveDraft = async () => {
    if (!evaluationId) return;
    setIsSaving(true);

    try {
      // Upsert evaluation items
      for (const question of questions) {
        if (scores[question.id] !== undefined) {
          await retryOperation(() =>
            supabase
              .from('evaluation_items')
              .upsert({
                evaluation_id: evaluationId,
                question_id: question.id,
                score: scores[question.id] || 0,
                feedback: feedback[question.id] || null,
              }, { onConflict: 'evaluation_id,question_id' }),
          );
        }
      }

      // Update overall feedback
      await retryOperation(() =>
        supabase
          .from('evaluations')
          .update({ overall_feedback: overallFeedback })
          .eq('id', evaluationId),
      );

      toast({
        variant: 'success',
        title: 'Draft saved',
        description: 'Your evaluation has been saved.',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Save failed',
        description: error.message,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmit = async () => {
    // Check all questions have scores
    const missingScores = questions.filter((q: any) => scores[q.id] === undefined);
    if (missingScores.length > 0) {
      toast({
        variant: 'warning',
        title: 'Incomplete evaluation',
        description: `Please score all ${missingScores.length} remaining questions.`,
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Save all items first
      await handleSaveDraft();

      // Submit evaluation
      const { error } = await retryOperation(() =>
        supabase.rpc('submit_evaluation', {
          p_evaluation_id: evaluationId,
        }),
      );

      if (error) throw error;

      toast({
        variant: 'success',
        title: 'Evaluation submitted!',
        description: 'Thank you for your evaluation.',
      });

      router.push('/student/evaluations');
      router.refresh();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Submission failed',
        description: error.message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!currentQuestion) {
    return <div>Loading...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">
          Evaluate Submission
        </h1>
        <p className="text-muted-foreground flex items-center gap-2 mt-1">
          <User className="w-4 h-4" />
          {submission.submission_code} • {submission.test_title}
        </p>
      </div>

      {/* Progress */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm">Progress</span>
            <span className="text-sm font-medium">
              {Object.keys(scores).length}/{questions.length} scored
            </span>
          </div>
          <Progress value={(Object.keys(scores).length / questions.length) * 100} />
          <div className="flex items-center justify-between mt-2 text-sm text-muted-foreground">
            <span>Current Score: {totalScore}/{maxScore}</span>
          </div>
        </CardContent>
      </Card>

      {/* Question Card */}
      <motion.div
        key={currentQuestion.id}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.2 }}
      >
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center text-sm">
                  {currentQuestionIndex + 1}
                </span>
                Question {currentQuestionIndex + 1} of {questions.length}
              </CardTitle>
              <span className="text-sm text-muted-foreground">
                Max: {currentQuestion.max_marks} marks
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Question prompt */}
            <div className="p-4 bg-muted/30 rounded-lg">
              <p className="font-medium">{currentQuestion.prompt}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {currentQuestion.type.replace('_', ' ')}
              </p>
            </div>

            {/* Student's response */}
            <div>
              <Label className="text-muted-foreground">Student&apos;s Response</Label>
              <div className="mt-2 p-4 bg-background border rounded-lg min-h-[100px]">
                {currentResponse?.answer_text ? (
                  <p className="whitespace-pre-wrap">{currentResponse.answer_text}</p>
                ) : currentResponse?.selected_options ? (
                  <p>Selected: {(currentResponse.selected_options as string[]).join(', ')}</p>
                ) : (
                  <p className="text-muted-foreground italic">No response provided</p>
                )}
              </div>
            </div>

            {/* Score input */}
            <div className="flex items-center gap-4">
              <Label>Score</Label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  max={currentQuestion.max_marks}
                  value={scores[currentQuestion.id] ?? ''}
                  onChange={(e) => handleScoreChange(currentQuestion.id, parseInt(e.target.value) || 0, currentQuestion.max_marks)}
                  className="w-20 h-10 text-center text-lg font-semibold border rounded-lg bg-background"
                  placeholder="0"
                />
                <span className="text-muted-foreground">/ {currentQuestion.max_marks}</span>
              </div>
              {/* Quick score buttons */}
              <div className="flex gap-1 ml-4">
                {[0, Math.floor(currentQuestion.max_marks / 2), currentQuestion.max_marks].map(score => (
                  <Button
                    key={score}
                    variant="outline"
                    size="sm"
                    onClick={() => handleScoreChange(currentQuestion.id, score, currentQuestion.max_marks)}
                    className={scores[currentQuestion.id] === score ? 'bg-primary/20' : ''}
                  >
                    {score}
                  </Button>
                ))}
              </div>
            </div>

            {/* Feedback */}
            <div>
              <Label>Feedback (optional)</Label>
              <Textarea
                value={feedback[currentQuestion.id] || ''}
                onChange={(e) => setFeedback(prev => ({ ...prev, [currentQuestion.id]: e.target.value }))}
                placeholder="Provide constructive feedback..."
                className="mt-2"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
          disabled={currentQuestionIndex === 0}
        >
          <ChevronLeft className="w-4 h-4 mr-2" />
          Previous
        </Button>

        <div className="flex gap-2">
          <Button variant="outline" onClick={handleSaveDraft} disabled={isSaving}>
            {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Save Draft
          </Button>
        </div>

        {currentQuestionIndex < questions.length - 1 ? (
          <Button
            variant="outline"
            onClick={() => setCurrentQuestionIndex(prev => prev + 1)}
          >
            Next
            <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        ) : (
          <Button variant="gradient" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
            Submit Evaluation
          </Button>
        )}
      </div>

      {/* Overall feedback (shown on last question) */}
      {currentQuestionIndex === questions.length - 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Overall Feedback</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={overallFeedback}
              onChange={(e) => setOverallFeedback(e.target.value)}
              placeholder="Provide overall feedback for this submission..."
              rows={4}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
