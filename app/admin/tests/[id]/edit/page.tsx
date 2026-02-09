"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { getSupabaseClient } from "@/lib/supabase/client";
import {
  addMinutesToLocalValue,
  fromDateTimeLocalValue,
  toDateTimeLocalValue,
} from "@/lib/utils";
import {
  ArrowLeft,
  Clock,
  FileText,
  Loader2,
  Plus,
  Save,
  Trash2,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

type QuestionType = "mcq_single" | "mcq_multi" | "short" | "long";

type EditableOption = {
  id: string;
  text: string;
};

type EditableQuestion = {
  id?: string;
  type: QuestionType;
  prompt: string;
  options: EditableOption[];
  correct_answer: string[];
  max_marks: number;
  order_num: number;
};

const defaultOptions: EditableOption[] = [
  { id: "A", text: "" },
  { id: "B", text: "" },
  { id: "C", text: "" },
  { id: "D", text: "" },
];

const createDefaultQuestion = (order: number): EditableQuestion => ({
  type: "mcq_single",
  prompt: "",
  options: [...defaultOptions],
  correct_answer: [],
  max_marks: 5,
  order_num: order,
});

function isMcq(type: QuestionType) {
  return type === "mcq_single" || type === "mcq_multi";
}

export default function AdminTestEditPage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const supabase = getSupabaseClient();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [test, setTest] = useState<any>(null);
  const [questions, setQuestions] = useState<EditableQuestion[]>([]);
  const [originalQuestionIds, setOriginalQuestionIds] = useState<string[]>([]);

  const totalMarks = useMemo(
    () => questions.reduce((sum, q) => sum + (Number(q.max_marks) || 0), 0),
    [questions],
  );

  const fetchTest = useCallback(async () => {
    const { data, error } = await supabase
      .from("tests")
      .select("*, questions(*)")
      .eq("id", params.id)
      .single();

    if (error || !data) {
      toast({ variant: "destructive", title: "Test not found" });
      router.push("/admin/tests");
      return;
    }

    const testData = data as any;
    testData.start_at = toDateTimeLocalValue(testData.start_at);
    testData.end_at = toDateTimeLocalValue(testData.end_at);

    const sortedQuestions = [...(testData.questions || [])].sort(
      (a: any, b: any) => a.order_num - b.order_num,
    );

    const mapped: EditableQuestion[] = sortedQuestions.map((q: any, index: number) => ({
      id: q.id,
      type: q.type,
      prompt: q.prompt || "",
      options:
        q.type === "mcq_single" || q.type === "mcq_multi"
          ? Array.isArray(q.options) && q.options.length > 0
            ? q.options
            : [...defaultOptions]
          : [],
      correct_answer: Array.isArray(q.correct_answer) ? q.correct_answer : [],
      max_marks: Number(q.max_marks) || 1,
      order_num: Number(q.order_num) || index + 1,
    }));

    setTest(testData);
    setQuestions(mapped.length > 0 ? mapped : [createDefaultQuestion(1)]);
    setOriginalQuestionIds(mapped.map((q) => q.id).filter(Boolean) as string[]);
    setLoading(false);
  }, [params.id, router, supabase, toast]);

  useEffect(() => {
    fetchTest();
  }, [fetchTest]);

  useEffect(() => {
    if (!test?.start_at || !test?.duration_minutes) return;
    const computedEnd = addMinutesToLocalValue(
      test.start_at,
      Number(test.duration_minutes),
    );
    if (computedEnd && computedEnd !== test.end_at) {
      setTest((prev: any) => ({ ...prev, end_at: computedEnd }));
    }
  }, [test?.duration_minutes, test?.end_at, test?.start_at]);

  const updateQuestion = (index: number, patch: Partial<EditableQuestion>) => {
    setQuestions((prev) =>
      prev.map((q, i) => (i === index ? { ...q, ...patch } : q)),
    );
  };

  const handleQuestionTypeChange = (index: number, nextType: QuestionType) => {
    const current = questions[index];
    updateQuestion(index, {
      type: nextType,
      options: isMcq(nextType)
        ? current.options && current.options.length > 0
          ? current.options
          : [...defaultOptions]
        : [],
      correct_answer: isMcq(nextType) ? current.correct_answer || [] : [],
    });
  };

  const handleOptionChange = (qIndex: number, optIndex: number, value: string) => {
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== qIndex) return q;
        const nextOptions = [...q.options];
        nextOptions[optIndex] = {
          ...nextOptions[optIndex],
          text: value,
        };
        return { ...q, options: nextOptions };
      }),
    );
  };

  const toggleCorrect = (qIndex: number, optionId: string, checked: boolean) => {
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== qIndex) return q;
        let nextCorrect = q.correct_answer || [];
        if (q.type === "mcq_single") {
          nextCorrect = checked ? [optionId] : [];
        } else {
          nextCorrect = checked
            ? Array.from(new Set([...nextCorrect, optionId]))
            : nextCorrect.filter((id) => id !== optionId);
        }
        return { ...q, correct_answer: nextCorrect };
      }),
    );
  };

  const addQuestion = () => {
    setQuestions((prev) => [...prev, createDefaultQuestion(prev.length + 1)]);
  };

  const removeQuestion = (index: number) => {
    if (questions.length === 1) {
      toast({
        variant: "destructive",
        title: "At least one question is required",
      });
      return;
    }

    setQuestions((prev) =>
      prev
        .filter((_, i) => i !== index)
        .map((q, i) => ({ ...q, order_num: i + 1 })),
    );
  };

  const validateQuestions = () => {
    for (let i = 0; i < questions.length; i += 1) {
      const q = questions[i];
      if (!q.prompt?.trim()) {
        return `Question ${i + 1} cannot be empty`;
      }
      if (!q.max_marks || q.max_marks < 1) {
        return `Question ${i + 1} must have at least 1 mark`;
      }
      if (isMcq(q.type)) {
        const emptyOption = q.options.find((opt) => !opt.text?.trim());
        if (emptyOption) {
          return `Question ${i + 1} has empty MCQ options`;
        }
      }
    }
    return null;
  };

  const handleSave = async () => {
    if (!test?.title?.trim()) {
      toast({ variant: "destructive", title: "Title is required" });
      return;
    }

    if (questions.length < 1) {
      toast({
        variant: "destructive",
        title: "At least one question is required",
      });
      return;
    }

    const questionError = validateQuestions();
    if (questionError) {
      toast({ variant: "destructive", title: questionError });
      return;
    }

    setSaving(true);
    try {
      const startAtIso = fromDateTimeLocalValue(test.start_at);
      const computedEndLocal = addMinutesToLocalValue(
        test.start_at,
        Number(test.duration_minutes),
      );
      const endAtIso = fromDateTimeLocalValue(computedEndLocal || test.end_at);

      if (!startAtIso || !endAtIso) {
        throw new Error("Invalid start or end time");
      }

      const preparedQuestions = questions.map((q, idx) => ({
        ...q,
        prompt: q.prompt.trim(),
        max_marks: Number(q.max_marks),
        order_num: idx + 1,
        options: isMcq(q.type)
          ? q.options.map((opt) => ({ ...opt, text: opt.text.trim() }))
          : null,
        correct_answer: isMcq(q.type) ? q.correct_answer || [] : null,
      }));

      const { error: testError } = await supabase
        .from("tests")
        .update({
          title: test.title.trim(),
          description: test.description?.trim() || null,
          duration_minutes: Number(test.duration_minutes),
          start_at: startAtIso,
          end_at: endAtIso,
          status: test.status,
          evaluators_per_submission: Number(test.evaluators_per_submission),
          same_batch_only: !!test.same_batch_only,
          auto_allocate_on_end: !!test.auto_allocate_on_end,
          target_batch: test.target_batch?.trim() || null,
          total_marks: totalMarks,
        } as any)
        .eq("id", params.id);

      if (testError) throw testError;

      const existingPayload = preparedQuestions
        .filter((q) => !!q.id)
        .map((q) => ({
          id: q.id,
          test_id: params.id,
          type: q.type,
          prompt: q.prompt,
          options: q.options,
          correct_answer: q.correct_answer,
          max_marks: q.max_marks,
          order_num: q.order_num,
        }));

      if (existingPayload.length > 0) {
        const { error: existingError } = await supabase
          .from("questions")
          .upsert(existingPayload as any, { onConflict: "id" });
        if (existingError) throw existingError;
      }

      const newPayload = preparedQuestions
        .filter((q) => !q.id)
        .map((q) => ({
          test_id: params.id,
          type: q.type,
          prompt: q.prompt,
          options: q.options,
          correct_answer: q.correct_answer,
          max_marks: q.max_marks,
          order_num: q.order_num,
        }));

      if (newPayload.length > 0) {
        const { error: newError } = await supabase
          .from("questions")
          .insert(newPayload as any);
        if (newError) throw newError;
      }

      const remainingIds = preparedQuestions
        .map((q) => q.id)
        .filter(Boolean) as string[];
      const removedIds = originalQuestionIds.filter(
        (id) => !remainingIds.includes(id),
      );

      if (removedIds.length > 0) {
        const { error: deleteError } = await supabase
          .from("questions")
          .delete()
          .eq("test_id", params.id)
          .in("id", removedIds);

        if (deleteError) {
          throw new Error(
            "Some removed questions are already used in student responses and cannot be deleted.",
          );
        }
      }

      toast({ variant: "success", title: "Test and questions updated" });
      router.push(`/admin/tests/${params.id}`);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Failed to update test",
        description: error.message,
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-4">
        <Link href={`/admin/tests/${params.id}`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Edit <span className="text-gradient">Test</span>
          </h1>
          <p className="text-muted-foreground">Update test details and questions</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Test Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Title *</Label>
            <Input
              value={test?.title || ""}
              onChange={(e) => setTest({ ...test, title: e.target.value })}
            />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea
              value={test?.description || ""}
              onChange={(e) => setTest({ ...test, description: e.target.value })}
              rows={3}
            />
          </div>
          <div>
            <Label>Status</Label>
            <select
              value={test?.status || "draft"}
              onChange={(e) => setTest({ ...test, status: e.target.value })}
              className="w-full h-10 px-3 rounded-lg border bg-background"
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="active">Active</option>
              <option value="closed">Closed</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Timing
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div>
            <Label>Duration (minutes)</Label>
            <Input
              type="number"
              min={5}
              value={test?.duration_minutes || 60}
              onChange={(e) =>
                setTest({ ...test, duration_minutes: Number(e.target.value) || 0 })
              }
            />
          </div>
          <div>
            <Label>Start Date/Time</Label>
            <Input
              type="datetime-local"
              value={test?.start_at || ""}
              onChange={(e) => setTest({ ...test, start_at: e.target.value })}
            />
          </div>
          <div>
            <Label>End Date/Time</Label>
            <Input type="datetime-local" value={test?.end_at || ""} readOnly />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="w-5 h-5" />
            Peer Evaluation Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Evaluators Per Submission</Label>
            <Input
              type="number"
              min={1}
              max={5}
              value={test?.evaluators_per_submission || 2}
              onChange={(e) =>
                setTest({
                  ...test,
                  evaluators_per_submission: Number(e.target.value) || 1,
                })
              }
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="sameBatchOnly"
              checked={test?.same_batch_only || false}
              onChange={(e) =>
                setTest({ ...test, same_batch_only: e.target.checked })
              }
              className="w-4 h-4"
            />
            <Label htmlFor="sameBatchOnly" className="cursor-pointer">
              Same batch only
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="autoAllocateOnEnd"
              checked={test?.auto_allocate_on_end ?? true}
              onChange={(e) =>
                setTest({ ...test, auto_allocate_on_end: e.target.checked })
              }
              className="w-4 h-4"
            />
            <Label htmlFor="autoAllocateOnEnd" className="cursor-pointer">
              Auto-allocate evaluations when test ends
            </Label>
          </div>
          <div>
            <Label>Target Batch (Optional)</Label>
            <Input
              value={test?.target_batch || ""}
              onChange={(e) => setTest({ ...test, target_batch: e.target.value })}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Questions ({questions.length})</CardTitle>
          <Button variant="outline" size="sm" type="button" onClick={addQuestion}>
            <Plus className="w-4 h-4 mr-1" />
            Add Question
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {questions.map((q, index) => (
            <div key={q.id || `new-${index}`} className="rounded-lg border p-4 space-y-4">
              <div className="flex items-center justify-between">
                <p className="font-semibold">Question {index + 1}</p>
                <Button
                  variant="ghost"
                  size="sm"
                  type="button"
                  onClick={() => removeQuestion(index)}
                >
                  <Trash2 className="w-4 h-4 mr-1 text-destructive" />
                  Remove
                </Button>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>Question Type</Label>
                  <select
                    value={q.type}
                    onChange={(e) =>
                      handleQuestionTypeChange(index, e.target.value as QuestionType)
                    }
                    className="w-full h-10 px-3 rounded-lg border bg-background"
                  >
                    <option value="mcq_single">MCQ (Single Answer)</option>
                    <option value="mcq_multi">MCQ (Multiple Answers)</option>
                    <option value="short">Short Answer</option>
                    <option value="long">Long Answer</option>
                  </select>
                </div>
                <div>
                  <Label>Marks</Label>
                  <Input
                    type="number"
                    min={1}
                    value={q.max_marks}
                    onChange={(e) =>
                      updateQuestion(index, {
                        max_marks: Number(e.target.value) || 0,
                      })
                    }
                  />
                </div>
              </div>

              <div>
                <Label>Prompt</Label>
                <Textarea
                  value={q.prompt}
                  rows={2}
                  onChange={(e) => updateQuestion(index, { prompt: e.target.value })}
                />
              </div>

              {isMcq(q.type) && (
                <div className="space-y-2">
                  <Label>Options</Label>
                  {q.options.map((opt, optIndex) => (
                    <div key={opt.id} className="flex items-center gap-2">
                      <input
                        type={q.type === "mcq_single" ? "radio" : "checkbox"}
                        name={`correct-${index}`}
                        checked={(q.correct_answer || []).includes(opt.id)}
                        onChange={(e) => toggleCorrect(index, opt.id, e.target.checked)}
                        className="w-4 h-4"
                      />
                      <span className="w-6 text-sm font-semibold">{opt.id}.</span>
                      <Input
                        value={opt.text}
                        onChange={(e) => handleOptionChange(index, optIndex, e.target.value)}
                        placeholder={`Option ${opt.id}`}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

          <div className="rounded-md bg-muted/40 px-3 py-2 text-sm">
            Total marks: <span className="font-semibold">{totalMarks}</span>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-2 justify-end">
        <Link href={`/admin/tests/${params.id}`}>
          <Button variant="outline">Cancel</Button>
        </Link>
        <Button variant="gradient" onClick={handleSave} disabled={saving}>
          {saving ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          Save Changes
        </Button>
      </div>
    </div>
  );
}
