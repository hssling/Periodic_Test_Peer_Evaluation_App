"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  Loader2,
  Send,
  Shield,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ConfirmSubmitDialog } from "@/components/test/confirm-submit-dialog";
import { QuestionRenderer } from "@/components/test/question-renderer";
import { SyncIndicator } from "@/components/test/sync-indicator";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/components/ui/use-toast";
import { getSupabaseClient } from "@/lib/supabase/client";
import { cn, formatTimeRemaining } from "@/lib/utils";
import type { Tables } from "@/types/supabase";

interface TestAttemptClientProps {
  test: Tables<"tests">;
  questions: Tables<"questions">[];
  attempt: Tables<"attempts">;
  existingResponses: Tables<"responses">[];
  profile: Tables<"profiles">;
}

export function TestAttemptClient({
  test,
  questions,
  attempt,
  existingResponses,
  profile,
}: TestAttemptClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const supabase = getSupabaseClient();

  // State
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [responses, setResponses] = useState<Record<string, any>>(() => {
    const initial: Record<string, any> = {};
    existingResponses.forEach((r) => {
      initial[r.question_id] = {
        answer_text: r.answer_text,
        selected_options: r.selected_options,
      };
    });
    return initial;
  });
  const [syncStatus, setSyncStatus] = useState<
    Record<string, "pending" | "syncing" | "synced" | "error">
  >({});
  const [timeRemaining, setTimeRemaining] = useState<number>(() => {
    const startedAt = new Date(attempt.started_at).getTime();
    const elapsed = Math.floor((Date.now() - startedAt) / 1000);
    const total = test.duration_minutes * 60;
    return Math.max(0, total - elapsed);
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [violations, setViolations] = useState({
    tabSwitches: attempt.tab_switches || 0,
    pasteAttempts: attempt.paste_attempts || 0,
  });
  const baseViolations = useMemo(
    () => (Array.isArray(attempt.violations) ? attempt.violations : []),
    [attempt.violations],
  );

  // Refs for tracking
  const saveTimeoutRef = useRef<Record<string, NodeJS.Timeout>>({});
  const timeSpentRef = useRef(attempt.time_spent_seconds || 0);

  // Current question
  const currentQuestion = questions[currentQuestionIndex];
  const answeredCount = Object.keys(responses).filter(
    (qId) =>
      responses[qId]?.answer_text || responses[qId]?.selected_options?.length,
  ).length;

  // Auto-submit when time runs out
  const handleAutoSubmit = useCallback(async () => {
    toast({
      variant: "warning",
      title: "Time is up!",
      description: "Your test is being submitted automatically.",
    });
    await handleSubmit();
  }, [handleSubmit, toast]);

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
      throw new Error("Retry failed");
    },
    [],
  );

  // Save response
  const saveResponse = useCallback(
    async (questionId: string, response: any) => {
      // Clear existing timeout for this question
      if (saveTimeoutRef.current[questionId]) {
        clearTimeout(saveTimeoutRef.current[questionId]);
      }

      // Update local state immediately
      setResponses((prev) => ({ ...prev, [questionId]: response }));
      setSyncStatus((prev) => ({ ...prev, [questionId]: "pending" }));

      // Debounce save to server
      saveTimeoutRef.current[questionId] = setTimeout(async () => {
        setSyncStatus((prev) => ({ ...prev, [questionId]: "syncing" }));

        try {
          const { error } = await retryOperation(() =>
            supabase.from("responses").upsert(
              {
                attempt_id: attempt.id,
                question_id: questionId,
                answer_text: response.answer_text || null,
                selected_options: response.selected_options || null,
                saved_at: new Date().toISOString(),
              },
              {
                onConflict: "attempt_id,question_id",
              },
            ),
          );

          if (error) throw error;

          setSyncStatus((prev) => ({ ...prev, [questionId]: "synced" }));
        } catch (error) {
          console.error("Failed to save response:", error);
          setSyncStatus((prev) => ({ ...prev, [questionId]: "error" }));
          toast({
            variant: "destructive",
            title: "Save failed",
            description:
              "Your answer could not be saved. Please check your connection.",
          });
        }
      }, 1000);
    },
    [attempt.id, retryOperation, supabase, toast],
  );

  // Handle paste attempt
  const handlePasteAttempt = useCallback(() => {
    setViolations((prev) => {
      const newCount = prev.pasteAttempts + 1;
      supabase
        .from("attempts")
        .update({
          paste_attempts: newCount,
          violations: [
            ...baseViolations,
            { type: "paste_attempt", timestamp: new Date().toISOString() },
          ],
        })
        .eq("id", attempt.id);

      toast({
        variant: "warning",
        title: "Paste blocked",
        description:
          "Copy-paste is disabled for this test. Please type your answer.",
      });

      return { ...prev, pasteAttempts: newCount };
    });
  }, [attempt.id, baseViolations, supabase, toast]);

  // Submit test
  const handleSubmit = useCallback(async () => {
    if (isSubmitting) return;

    // Clear all pending save timeouts to prevent race conditions
    Object.values(saveTimeoutRef.current).forEach((timeout) =>
      clearTimeout(timeout),
    );
    saveTimeoutRef.current = {};

    setIsSubmitting(true);

    try {
      // Sync final time spent before submission
      await supabase
        .from("attempts")
        .update({ time_spent_seconds: timeSpentRef.current })
        .eq("id", attempt.id);

      // Call the submit function
      const { data, error } = await supabase.rpc("submit_test", {
        p_attempt_id: attempt.id,
      });

      if (error) {
        console.error("RPC submit_test error:", error);
        throw new Error(
          error.message ||
            "The server failed to process your submission. Please check if you have already submitted.",
        );
      }

      toast({
        variant: "success",
        title: "Test submitted!",
        description: "Your answers have been saved successfully.",
      });

      // Clear any unsaved state locally to be safe
      setSyncStatus({});

      router.push(`/student/results/${attempt.id}`);
      router.refresh();
    } catch (error: any) {
      console.error("Submit failed:", error);
      toast({
        variant: "destructive",
        title: "Submit failed",
        description: error.message || "Please try again.",
      });
    } finally {
      setIsSubmitting(false);
      setShowSubmitDialog(false);
    }
  }, [attempt.id, isSubmitting, router, supabase, toast]);

  // Timer effect
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });

      // Update time spent
      timeSpentRef.current += 1;

      // Sync time spent every 30 seconds
      if (timeSpentRef.current % 30 === 0) {
        supabase
          .from("attempts")
          .update({ time_spent_seconds: timeSpentRef.current })
          .eq("id", attempt.id);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [attempt.id, handleAutoSubmit, supabase]);

  // Tab visibility tracking
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setViolations((prev) => {
          const newCount = prev.tabSwitches + 1;
          // Log violation
          supabase
            .from("attempts")
            .update({
              tab_switches: newCount,
              violations: [
                ...baseViolations,
                { type: "tab_switch", timestamp: new Date().toISOString() },
              ],
            })
            .eq("id", attempt.id);

          toast({
            variant: "warning",
            title: "Tab switch detected",
            description: `You have switched tabs ${newCount} time(s). This is being recorded.`,
          });

          return { ...prev, tabSwitches: newCount };
        });
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [attempt.id, baseViolations, supabase, toast]);

  // Get timer color
  const getTimerColor = () => {
    if (timeRemaining <= 60) return "timer-danger";
    if (timeRemaining <= 300) return "timer-warning";
    return "";
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Watermark */}
      <div
        className="watermark"
        data-watermark={`${profile.roll_no || profile.name}`}
      />

      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="font-semibold line-clamp-1">{test.title}</h1>
              <p className="text-xs text-muted-foreground">
                Question {currentQuestionIndex + 1} of {questions.length}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Violation indicators */}
            {(violations.tabSwitches > 0 || violations.pasteAttempts > 0) && (
              <div className="flex items-center gap-2 text-xs text-warning">
                <Shield className="w-4 h-4" />
                <span>
                  {violations.tabSwitches + violations.pasteAttempts} violations
                </span>
              </div>
            )}

            {/* Timer */}
            <div
              className={cn(
                "flex items-center gap-2 font-mono text-lg font-bold",
                getTimerColor(),
              )}
            >
              <Clock className="w-5 h-5" />
              <span>{formatTimeRemaining(timeRemaining)}</span>
            </div>

            {/* Submit button */}
            <Button
              variant="gradient"
              onClick={() => setShowSubmitDialog(true)}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              Submit
            </Button>
          </div>
        </div>

        {/* Progress bar */}
        <Progress
          value={(answeredCount / questions.length) * 100}
          className="h-1 rounded-none"
        />
      </header>

      {/* Main content */}
      <div className="flex">
        {/* Question Navigator */}
        <aside className="hidden md:block w-64 border-r border-border p-4 sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto">
          <h3 className="text-sm font-medium text-muted-foreground mb-3">
            Questions
          </h3>
          <div className="grid grid-cols-5 gap-2">
            {questions.map((q, index) => {
              const hasAnswer =
                responses[q.id]?.answer_text ||
                responses[q.id]?.selected_options?.length;
              const isCurrent = index === currentQuestionIndex;
              const status = syncStatus[q.id];

              return (
                <button
                  key={q.id}
                  onClick={() => setCurrentQuestionIndex(index)}
                  className={cn(
                    "question-nav-item",
                    isCurrent && "current",
                    hasAnswer && !isCurrent && "answered",
                    !hasAnswer && !isCurrent && "unanswered",
                  )}
                  title={`Question ${index + 1}${hasAnswer ? " (answered)" : ""}`}
                >
                  {hasAnswer && !isCurrent ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : (
                    index + 1
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-6 space-y-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 rounded bg-success/20 border-2 border-success/30" />
              <span>Answered ({answeredCount})</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 rounded bg-muted" />
              <span>Unanswered ({questions.length - answeredCount})</span>
            </div>
          </div>
        </aside>

        {/* Question area */}
        <main className="flex-1 p-6 max-w-4xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentQuestion.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <Card className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-medium">
                      {currentQuestionIndex + 1}
                    </span>
                    <div>
                      <span className="text-xs font-medium uppercase text-muted-foreground">
                        {currentQuestion.type.replace("_", " ")}
                      </span>
                      <span className="text-xs text-muted-foreground ml-2">
                        ({currentQuestion.max_marks} marks)
                      </span>
                    </div>
                  </div>
                  <SyncIndicator
                    status={syncStatus[currentQuestion.id] || "synced"}
                  />
                </div>

                <QuestionRenderer
                  question={currentQuestion}
                  response={responses[currentQuestion.id]}
                  onResponseChange={(response) =>
                    saveResponse(currentQuestion.id, response)
                  }
                  onPasteAttempt={handlePasteAttempt}
                  disabled={isSubmitting}
                />
              </Card>
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          <div className="flex items-center justify-between mt-6">
            <Button
              variant="outline"
              onClick={() =>
                setCurrentQuestionIndex((prev) => Math.max(0, prev - 1))
              }
              disabled={currentQuestionIndex === 0}
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Previous
            </Button>

            <div className="flex items-center gap-2 md:hidden">
              <span className="text-sm text-muted-foreground">
                {currentQuestionIndex + 1} / {questions.length}
              </span>
            </div>

            <Button
              variant="outline"
              onClick={() =>
                setCurrentQuestionIndex((prev) =>
                  Math.min(questions.length - 1, prev + 1),
                )
              }
              disabled={currentQuestionIndex === questions.length - 1}
            >
              Next
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </main>
      </div>

      {/* Submit confirmation dialog */}
      <ConfirmSubmitDialog
        open={showSubmitDialog}
        onOpenChange={setShowSubmitDialog}
        onConfirm={handleSubmit}
        isSubmitting={isSubmitting}
        answeredCount={answeredCount}
        totalCount={questions.length}
      />
    </div>
  );
}
