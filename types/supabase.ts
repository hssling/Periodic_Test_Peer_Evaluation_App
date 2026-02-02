export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[];

export type Database = {
    public: {
        Tables: {
            profiles: {
                Row: {
                    id: string;
                    user_id: string;
                    role: 'student' | 'admin' | 'faculty';
                    roll_no: string | null;
                    name: string;
                    email: string;
                    batch: string | null;
                    section: string | null;
                    is_active: boolean;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    user_id: string;
                    role: 'student' | 'admin' | 'faculty';
                    roll_no?: string | null;
                    name: string;
                    email: string;
                    batch?: string | null;
                    section?: string | null;
                    is_active?: boolean;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    user_id?: string;
                    role?: 'student' | 'admin' | 'faculty';
                    roll_no?: string | null;
                    name?: string;
                    email?: string;
                    batch?: string | null;
                    section?: string | null;
                    is_active?: boolean;
                    created_at?: string;
                    updated_at?: string;
                };
                Relationships: [];
            };
            tests: {
                Row: {
                    id: string;
                    title: string;
                    description: string | null;
                    start_at: string;
                    end_at: string;
                    duration_minutes: number;
                    total_marks: number;
                    status: 'draft' | 'published' | 'active' | 'closed' | 'archived';
                    evaluators_per_submission: number;
                    same_batch_only: boolean;
                    no_repeat_horizon: number;
                    eval_start_at: string | null;
                    eval_end_at: string | null;
                    auto_allocate_on_end: boolean;
                    target_batch: string | null;
                    created_by: string;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    title: string;
                    description?: string | null;
                    start_at: string;
                    end_at: string;
                    duration_minutes: number;
                    total_marks: number;
                    status?: 'draft' | 'published' | 'active' | 'closed' | 'archived';
                    evaluators_per_submission?: number;
                    same_batch_only?: boolean;
                    no_repeat_horizon?: number;
                    eval_start_at?: string | null;
                    eval_end_at?: string | null;
                    auto_allocate_on_end?: boolean;
                    target_batch?: string | null;
                    created_by: string;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    title?: string;
                    description?: string | null;
                    start_at?: string;
                    end_at?: string;
                    duration_minutes?: number;
                    total_marks?: number;
                    status?: 'draft' | 'published' | 'active' | 'closed' | 'archived';
                    evaluators_per_submission?: number;
                    same_batch_only?: boolean;
                    no_repeat_horizon?: number;
                    eval_start_at?: string | null;
                    eval_end_at?: string | null;
                    auto_allocate_on_end?: boolean;
                    target_batch?: string | null;
                    created_by?: string;
                    created_at?: string;
                    updated_at?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: 'tests_created_by_fkey';
                        columns: ['created_by'];
                        referencedRelation: 'profiles';
                        referencedColumns: ['id'];
                    },
                ];
            };
            questions: {
                Row: {
                    id: string;
                    test_id: string;
                    type: 'mcq_single' | 'mcq_multi' | 'short' | 'long';
                    prompt: string;
                    options: Json | null;
                    correct_answer: Json | null;
                    max_marks: number;
                    order_num: number;
                    explanation: string | null;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    test_id: string;
                    type: 'mcq_single' | 'mcq_multi' | 'short' | 'long';
                    prompt: string;
                    options?: Json | null;
                    correct_answer?: Json | null;
                    max_marks: number;
                    order_num: number;
                    explanation?: string | null;
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    test_id?: string;
                    type?: 'mcq_single' | 'mcq_multi' | 'short' | 'long';
                    prompt?: string;
                    options?: Json | null;
                    correct_answer?: Json | null;
                    max_marks?: number;
                    order_num?: number;
                    explanation?: string | null;
                    created_at?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: 'questions_test_id_fkey';
                        columns: ['test_id'];
                        referencedRelation: 'tests';
                        referencedColumns: ['id'];
                    },
                ];
            };
            rubrics: {
                Row: {
                    id: string;
                    test_id: string | null;
                    question_id: string | null;
                    criterion: string;
                    max_score: number;
                    descriptors: Json | null;
                    order_num: number;
                };
                Insert: {
                    id?: string;
                    test_id?: string | null;
                    question_id?: string | null;
                    criterion: string;
                    max_score: number;
                    descriptors?: Json | null;
                    order_num: number;
                };
                Update: {
                    id?: string;
                    test_id?: string | null;
                    question_id?: string | null;
                    criterion?: string;
                    max_score?: number;
                    descriptors?: Json | null;
                    order_num?: number;
                };
                Relationships: [
                    {
                        foreignKeyName: 'rubrics_test_id_fkey';
                        columns: ['test_id'];
                        referencedRelation: 'tests';
                        referencedColumns: ['id'];
                    },
                    {
                        foreignKeyName: 'rubrics_question_id_fkey';
                        columns: ['question_id'];
                        referencedRelation: 'questions';
                        referencedColumns: ['id'];
                    },
                ];
            };
            attempts: {
                Row: {
                    id: string;
                    test_id: string;
                    student_id: string;
                    started_at: string;
                    submitted_at: string | null;
                    status: 'in_progress' | 'submitted' | 'evaluated' | 'reopened';
                    final_score: number | null;
                    time_spent_seconds: number;
                    tab_switches: number;
                    paste_attempts: number;
                    violations: Json;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    test_id: string;
                    student_id: string;
                    started_at?: string;
                    submitted_at?: string | null;
                    status?: 'in_progress' | 'submitted' | 'evaluated' | 'reopened';
                    final_score?: number | null;
                    time_spent_seconds?: number;
                    tab_switches?: number;
                    paste_attempts?: number;
                    violations?: Json;
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    test_id?: string;
                    student_id?: string;
                    started_at?: string;
                    submitted_at?: string | null;
                    status?: 'in_progress' | 'submitted' | 'evaluated' | 'reopened';
                    final_score?: number | null;
                    time_spent_seconds?: number;
                    tab_switches?: number;
                    paste_attempts?: number;
                    violations?: Json;
                    created_at?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: 'attempts_test_id_fkey';
                        columns: ['test_id'];
                        referencedRelation: 'tests';
                        referencedColumns: ['id'];
                    },
                    {
                        foreignKeyName: 'attempts_student_id_fkey';
                        columns: ['student_id'];
                        referencedRelation: 'profiles';
                        referencedColumns: ['id'];
                    },
                ];
            };
            responses: {
                Row: {
                    id: string;
                    attempt_id: string;
                    question_id: string;
                    answer_text: string | null;
                    selected_options: Json | null;
                    saved_at: string;
                    is_final: boolean;
                };
                Insert: {
                    id?: string;
                    attempt_id: string;
                    question_id: string;
                    answer_text?: string | null;
                    selected_options?: Json | null;
                    saved_at?: string;
                    is_final?: boolean;
                };
                Update: {
                    id?: string;
                    attempt_id?: string;
                    question_id?: string;
                    answer_text?: string | null;
                    selected_options?: Json | null;
                    saved_at?: string;
                    is_final?: boolean;
                };
                Relationships: [
                    {
                        foreignKeyName: 'responses_attempt_id_fkey';
                        columns: ['attempt_id'];
                        referencedRelation: 'attempts';
                        referencedColumns: ['id'];
                    },
                    {
                        foreignKeyName: 'responses_question_id_fkey';
                        columns: ['question_id'];
                        referencedRelation: 'questions';
                        referencedColumns: ['id'];
                    },
                ];
            };
            allocations: {
                Row: {
                    id: string;
                    attempt_id: string;
                    evaluator_id: string;
                    allocated_at: string;
                    status: 'pending' | 'in_progress' | 'completed' | 'expired';
                    deadline: string | null;
                };
                Insert: {
                    id?: string;
                    attempt_id: string;
                    evaluator_id: string;
                    allocated_at?: string;
                    status?: 'pending' | 'in_progress' | 'completed' | 'expired';
                    deadline?: string | null;
                };
                Update: {
                    id?: string;
                    attempt_id?: string;
                    evaluator_id?: string;
                    allocated_at?: string;
                    status?: 'pending' | 'in_progress' | 'completed' | 'expired';
                    deadline?: string | null;
                };
                Relationships: [
                    {
                        foreignKeyName: 'allocations_attempt_id_fkey';
                        columns: ['attempt_id'];
                        referencedRelation: 'attempts';
                        referencedColumns: ['id'];
                    },
                    {
                        foreignKeyName: 'allocations_evaluator_id_fkey';
                        columns: ['evaluator_id'];
                        referencedRelation: 'profiles';
                        referencedColumns: ['id'];
                    },
                ];
            };
            evaluations: {
                Row: {
                    id: string;
                    allocation_id: string;
                    submitted_at: string | null;
                    overall_feedback: string | null;
                    total_score: number | null;
                    is_draft: boolean;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    allocation_id: string;
                    submitted_at?: string | null;
                    overall_feedback?: string | null;
                    total_score?: number | null;
                    is_draft?: boolean;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    allocation_id?: string;
                    submitted_at?: string | null;
                    overall_feedback?: string | null;
                    total_score?: number | null;
                    is_draft?: boolean;
                    created_at?: string;
                    updated_at?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: 'evaluations_allocation_id_fkey';
                        columns: ['allocation_id'];
                        referencedRelation: 'allocations';
                        referencedColumns: ['id'];
                    },
                ];
            };
            attempt_files: {
                Row: {
                    id: string;
                    attempt_id: string;
                    uploader_id: string;
                    file_path: string;
                    file_name: string;
                    mime_type: string;
                    size_bytes: number;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    attempt_id: string;
                    uploader_id: string;
                    file_path: string;
                    file_name: string;
                    mime_type: string;
                    size_bytes: number;
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    attempt_id?: string;
                    uploader_id?: string;
                    file_path?: string;
                    file_name?: string;
                    mime_type?: string;
                    size_bytes?: number;
                    created_at?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: 'attempt_files_attempt_id_fkey';
                        columns: ['attempt_id'];
                        referencedRelation: 'attempts';
                        referencedColumns: ['id'];
                    },
                    {
                        foreignKeyName: 'attempt_files_uploader_id_fkey';
                        columns: ['uploader_id'];
                        referencedRelation: 'profiles';
                        referencedColumns: ['id'];
                    },
                ];
            };
            evaluation_items: {
                Row: {
                    id: string;
                    evaluation_id: string;
                    question_id: string;
                    score: number;
                    feedback: string | null;
                    max_score: number | null;
                    score_percent: number | null;
                };
                Insert: {
                    id?: string;
                    evaluation_id: string;
                    question_id: string;
                    score: number;
                    feedback?: string | null;
                    max_score?: number | null;
                    score_percent?: number | null;
                };
                Update: {
                    id?: string;
                    evaluation_id?: string;
                    question_id?: string;
                    score?: number;
                    feedback?: string | null;
                    max_score?: number | null;
                    score_percent?: number | null;
                };
                Relationships: [
                    {
                        foreignKeyName: 'evaluation_items_evaluation_id_fkey';
                        columns: ['evaluation_id'];
                        referencedRelation: 'evaluations';
                        referencedColumns: ['id'];
                    },
                    {
                        foreignKeyName: 'evaluation_items_question_id_fkey';
                        columns: ['question_id'];
                        referencedRelation: 'questions';
                        referencedColumns: ['id'];
                    },
                ];
            };
            audit_logs: {
                Row: {
                    id: string;
                    user_id: string | null;
                    action_type: string;
                    payload: Json;
                    ip_address: string | null;
                    user_agent: string | null;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    user_id?: string | null;
                    action_type: string;
                    payload?: Json;
                    ip_address?: string | null;
                    user_agent?: string | null;
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    user_id?: string | null;
                    action_type?: string;
                    payload?: Json;
                    ip_address?: string | null;
                    user_agent?: string | null;
                    created_at?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: 'audit_logs_user_id_fkey';
                        columns: ['user_id'];
                        referencedRelation: 'profiles';
                        referencedColumns: ['id'];
                    },
                ];
            };
            announcements: {
                Row: {
                    id: string;
                    title: string;
                    content: string;
                    target_role: string | null;
                    created_by: string;
                    is_active: boolean;
                    created_at: string;
                    expires_at: string | null;
                };
                Insert: {
                    id?: string;
                    title: string;
                    content: string;
                    target_role?: string | null;
                    created_by: string;
                    is_active?: boolean;
                    created_at?: string;
                    expires_at?: string | null;
                };
                Update: {
                    id?: string;
                    title?: string;
                    content?: string;
                    target_role?: string | null;
                    created_by?: string;
                    is_active?: boolean;
                    created_at?: string;
                    expires_at?: string | null;
                };
                Relationships: [
                    {
                        foreignKeyName: 'announcements_created_by_fkey';
                        columns: ['created_by'];
                        referencedRelation: 'profiles';
                        referencedColumns: ['id'];
                    },
                ];
            };
        };
        Views: {
            [_ in never]: never;
        };
        Functions: {
            allocate_peer_evaluators: {
                Args: {
                    p_attempt_id: string;
                };
                Returns: {
                    id: string;
                    attempt_id: string;
                    evaluator_id: string;
                    allocated_at: string;
                    status: string;
                    deadline: string | null;
                }[];
            };
            allocate_pending_evaluations: {
                Args: {
                    p_test_id: string;
                    p_force?: boolean;
                };
                Returns: number;
            };
            get_anonymized_submission: {
                Args: {
                    p_allocation_id: string;
                };
                Returns: {
                    allocation_id: string;
                    submission_code: string;
                    test_title: string;
                    submitted_at: string;
                    questions: Json;
                    responses: Json;
                    rubrics?: Json;
                    attachments?: Json;
                }[];
            };
            calculate_evaluator_metrics: {
                Args: {
                    evaluator_uuid: string;
                };
                Returns: {
                    leniency_score: number;
                    reliability_score: number;
                    total_evaluations: number;
                }[];
            };
        };
        Enums: {
            [_ in never]: never;
        };
        CompositeTypes: {
            [_ in never]: never;
        };
    };
};

export type Tables<T extends keyof Database['public']['Tables']> =
    Database['public']['Tables'][T]['Row'];

export type Inserts<T extends keyof Database['public']['Tables']> =
    Database['public']['Tables'][T]['Insert'];

export type Updates<T extends keyof Database['public']['Tables']> =
    Database['public']['Tables'][T]['Update'];

export type Enums<T extends keyof Database['public']['Enums']> =
    Database['public']['Enums'][T];
