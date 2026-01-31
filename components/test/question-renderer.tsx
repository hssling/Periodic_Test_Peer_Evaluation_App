'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type { Tables } from '@/types/supabase';

interface QuestionRendererProps {
    question: Tables<'questions'>;
    response: { answer_text?: string; selected_options?: string[] } | undefined;
    onResponseChange: (response: { answer_text?: string; selected_options?: string[] }) => void;
    onPasteAttempt: () => void;
    disabled?: boolean;
}

export function QuestionRenderer({
    question,
    response,
    onResponseChange,
    onPasteAttempt,
    disabled = false,
}: QuestionRendererProps) {
    const options = question.options as { id: string; text: string }[] | null;

    const handleTextChange = (value: string) => {
        onResponseChange({ ...response, answer_text: value });
    };

    const handleOptionChange = (optionId: string, isMulti: boolean) => {
        const current = response?.selected_options || [];
        let updated: string[];

        if (isMulti) {
            if (current.includes(optionId)) {
                updated = current.filter((id) => id !== optionId);
            } else {
                updated = [...current, optionId];
            }
        } else {
            updated = [optionId];
        }

        onResponseChange({ ...response, selected_options: updated });
    };

    return (
        <div className="space-y-6">
            {/* Question prompt */}
            <div className="prose dark:prose-invert max-w-none no-select">
                <p className="text-lg font-medium leading-relaxed">{question.prompt}</p>
            </div>

            {/* Answer area based on question type */}
            {(question.type === 'mcq_single' || question.type === 'mcq_multi') && options && (
                <div className="space-y-3">
                    {question.type === 'mcq_multi' && (
                        <p className="text-sm text-muted-foreground">Select all that apply</p>
                    )}
                    {options.map((option, index) => {
                        const isSelected = response?.selected_options?.includes(option.id);
                        const isMulti = question.type === 'mcq_multi';

                        return (
                            <motion.label
                                key={option.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                                className={cn(
                                    'flex items-start gap-4 p-4 rounded-xl border cursor-pointer transition-all duration-200',
                                    isSelected
                                        ? 'border-primary bg-primary/5 shadow-sm'
                                        : 'border-border hover:border-primary/50 hover:bg-muted/50',
                                    disabled && 'cursor-not-allowed opacity-60'
                                )}
                            >
                                <div className="shrink-0 mt-0.5">
                                    {isMulti ? (
                                        <div
                                            className={cn(
                                                'w-5 h-5 rounded border-2 transition-all flex items-center justify-center',
                                                isSelected
                                                    ? 'border-primary bg-primary'
                                                    : 'border-muted-foreground'
                                            )}
                                        >
                                            {isSelected && (
                                                <svg className="w-3 h-3 text-white" viewBox="0 0 12 12">
                                                    <path
                                                        fill="currentColor"
                                                        d="M10.28 2.28L4 8.56 1.72 6.28l-.94.94L4 10.44l7.22-7.22-.94-.94z"
                                                    />
                                                </svg>
                                            )}
                                        </div>
                                    ) : (
                                        <div
                                            className={cn(
                                                'w-5 h-5 rounded-full border-2 transition-all flex items-center justify-center',
                                                isSelected
                                                    ? 'border-primary'
                                                    : 'border-muted-foreground'
                                            )}
                                        >
                                            {isSelected && (
                                                <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                                            )}
                                        </div>
                                    )}
                                </div>
                                <input
                                    type={isMulti ? 'checkbox' : 'radio'}
                                    name={`question-${question.id}`}
                                    value={option.id}
                                    checked={isSelected}
                                    onChange={() => handleOptionChange(option.id, isMulti)}
                                    disabled={disabled}
                                    className="sr-only"
                                />
                                <span className="flex-1">
                                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-muted text-xs font-medium mr-2">
                                        {option.id}
                                    </span>
                                    {option.text}
                                </span>
                            </motion.label>
                        );
                    })}
                </div>
            )}

            {question.type === 'short' && (
                <Textarea
                    value={response?.answer_text || ''}
                    onChange={(e) => handleTextChange(e.target.value)}
                    placeholder="Type your answer here..."
                    className="min-h-[100px]"
                    maxLength={500}
                    disablePaste
                    onPasteAttempt={onPasteAttempt}
                    disabled={disabled}
                />
            )}

            {question.type === 'long' && (
                <div className="space-y-2">
                    <Textarea
                        value={response?.answer_text || ''}
                        onChange={(e) => handleTextChange(e.target.value)}
                        placeholder="Write your detailed answer here..."
                        className="min-h-[250px]"
                        disablePaste
                        onPasteAttempt={onPasteAttempt}
                        disabled={disabled}
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Paste and drag-drop are disabled</span>
                        <span>{(response?.answer_text || '').length} characters</span>
                    </div>
                </div>
            )}
        </div>
    );
}
