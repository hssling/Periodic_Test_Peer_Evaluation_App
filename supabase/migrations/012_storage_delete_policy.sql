-- Migration: Allow authorized deletion of attempt uploads

CREATE POLICY "attempt_uploads_delete_authorized" ON storage.objects
    FOR DELETE
    USING (
        bucket_id = 'attempt-uploads'
        AND EXISTS (
            SELECT 1
            FROM attempt_files f
            JOIN attempts a ON a.id = f.attempt_id
            LEFT JOIN allocations al ON al.attempt_id = f.attempt_id
            WHERE f.file_path = storage.objects.name
            AND (
                a.student_id = get_current_profile_id()
                OR al.evaluator_id = get_current_profile_id()
                OR is_admin()
            )
        )
    );
