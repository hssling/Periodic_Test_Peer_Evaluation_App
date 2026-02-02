"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, motion } from "framer-motion";
import {
  Brain,
  ChevronDown,
  ChevronUp,
  Clock,
  FileText,
  GripVertical,
  Import,
  Loader2,
  Plus,
  Save,
  Send,
  Sparkles,
  Trash2,
  Users,
  Wand2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { getSupabaseClient } from "@/lib/supabase/client";
import { addMinutesToLocalValue, fromDateTimeLocalValue } from "@/lib/utils";

const questionSchema = z.object({
  type: z.enum(["mcq_single", "mcq_multi", "short", "long"]),
  prompt: z.string().min(1, "Question is required"),
  options: z
    .array(
      z.object({
        id: z.string(),
        text: z.string(),
      }),
    )
    .optional(),
  correctAnswer: z.array(z.string()).optional(),
  maxMarks: z.number().min(1, "Marks must be at least 1"),
});

const testSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  durationMinutes: z.number().min(5, "Duration must be at least 5 minutes"),
  startAt: z.string().min(1, "Start time is required"),
  endAt: z.string().min(1, "End time is required"),
  evaluatorsPerSubmission: z.number().min(1).max(5),
  sameBatchOnly: z.boolean(),
  autoAllocateOnEnd: z.boolean(),
  targetBatch: z.string().optional(),
  questions: z
    .array(questionSchema)
    .min(1, "At least one question is required"),
});

type TestFormData = z.infer<typeof testSchema>;

const defaultQuestion = {
  type: "mcq_single" as const,
  prompt: "",
  options: [
    { id: "A", text: "" },
    { id: "B", text: "" },
    { id: "C", text: "" },
    { id: "D", text: "" },
  ],
  correctAnswer: [],
  maxMarks: 5,
};

export default function CreateTestPage() {
  const router = useRouter();
  const { toast } = useToast();
  const supabase = getSupabaseClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expandedQuestions, setExpandedQuestions] = useState<Set<number>>(
    new Set([0]),
  );

  // AI Generation State
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [showImportPanel, setShowImportPanel] = useState(false);
  const [aiScript, setAiScript] = useState("");
  const [aiQuestionCount, setAiQuestionCount] = useState(5);
  const [aiDifficulty, setAiDifficulty] = useState("medium");
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiProvider, setAiProvider] = useState("openai");
  const [aiApiKey, setAiApiKey] = useState("");
  const [googleFormsUrl, setGoogleFormsUrl] = useState("");
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    const storedProvider = localStorage.getItem("aiProvider");
    const storedKey = localStorage.getItem("aiApiKey");
    if (storedProvider) setAiProvider(storedProvider);
    if (storedKey) setAiApiKey(storedKey);
  }, []);

  useEffect(() => {
    localStorage.setItem("aiProvider", aiProvider);
  }, [aiProvider]);

  useEffect(() => {
    if (aiApiKey) {
      localStorage.setItem("aiApiKey", aiApiKey);
    } else {
      localStorage.removeItem("aiApiKey");
    }
  }, [aiApiKey]);

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<TestFormData>({
    resolver: zodResolver(testSchema),
    defaultValues: {
      title: "",
      description: "",
      durationMinutes: 60,
      startAt: "",
      endAt: "",
      evaluatorsPerSubmission: 2,
      sameBatchOnly: true,
      autoAllocateOnEnd: true,
      targetBatch: "",
      questions: [{ ...defaultQuestion }],
    },
  });

  const { fields, append, remove, move } = useFieldArray({
    control,
    name: "questions",
  });

  const watchQuestions = watch("questions");
  const watchStartAt = watch("startAt");
  const watchDuration = watch("durationMinutes");

  const totalMarks =
    watchQuestions?.reduce((acc, q) => acc + (q.maxMarks || 0), 0) || 0;

  // Auto-compute end time based on duration
  useEffect(() => {
    if (!watchStartAt || !watchDuration) return;
    const computedEnd = addMinutesToLocalValue(
      watchStartAt,
      Number(watchDuration),
    );
    if (computedEnd) {
      setValue("endAt", computedEnd);
    }
  }, [setValue, watchDuration, watchStartAt]);

  const toggleQuestionExpand = (index: number) => {
    setExpandedQuestions((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  // AI Question Generation
  const handleAIGenerate = async () => {
    if (aiScript.length < 50) {
      toast({
        variant: "destructive",
        title: "Script must be at least 50 characters",
      });
      return;
    }

    setAiGenerating(true);
    try {
      const response = await fetch("/api/ai/generate-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          script: aiScript,
          questionCount: aiQuestionCount,
          difficulty: aiDifficulty,
          aiProvider: aiProvider,
          apiKey: aiApiKey || undefined,
          questionTypes: [
            "mcq_single",
            "mcq_multi",
            "short_answer",
            "long_answer",
          ],
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate questions");
      }

      // Convert AI response to form format
      const newQuestions = data.questions.map((q: any) => ({
        type:
          q.type === "short_answer"
            ? "short"
            : q.type === "long_answer"
              ? "long"
              : q.type,
        prompt: q.prompt,
        options: q.options?.map((opt: string, idx: number) => ({
          id: String.fromCharCode(65 + idx),
          text: opt,
        })) || [
          { id: "A", text: "" },
          { id: "B", text: "" },
          { id: "C", text: "" },
          { id: "D", text: "" },
        ],
        correctAnswer:
          q.correctAnswer
            ?.split(",")
            .map((i: string) => String.fromCharCode(65 + parseInt(i))) || [],
        maxMarks: q.maxMarks || 5,
      }));

      // Add to existing questions
      newQuestions.forEach((q: any) => append(q));

      toast({
        variant: "success",
        title: `Generated ${newQuestions.length} questions!`,
        description: "Questions have been added to your test.",
      });
      setShowAIPanel(false);
      setAiScript("");
    } catch (error: any) {
      toast({ variant: "destructive", title: error.message });
    } finally {
      setAiGenerating(false);
    }
  };

  // Google Forms Import
  const handleGoogleFormsImport = async () => {
    if (!googleFormsUrl) {
      toast({
        variant: "destructive",
        title: "Please enter a Google Forms URL",
      });
      return;
    }

    setImporting(true);
    try {
      const response = await fetch("/api/import/google-forms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ formUrl: googleFormsUrl }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to import from Google Forms");
      }

      // Convert imported questions to form format
      const newQuestions = data.questions.map((q: any) => ({
        type:
          q.type === "short_answer"
            ? "short"
            : q.type === "long_answer"
              ? "long"
              : q.type === "mcq_single"
                ? "mcq_single"
                : q.type === "mcq_multiple"
                  ? "mcq_multi"
                  : "short",
        prompt: q.prompt,
        options: q.options?.map((opt: string, idx: number) => ({
          id: String.fromCharCode(65 + idx),
          text: opt,
        })) || [
          { id: "A", text: "" },
          { id: "B", text: "" },
          { id: "C", text: "" },
          { id: "D", text: "" },
        ],
        correctAnswer: [],
        maxMarks: q.maxMarks || 5,
      }));

      // If there's only one question and it's empty, remove it
      if (
        fields.length === 1 &&
        !watchQuestions[0].prompt &&
        !watchQuestions[0].options?.[0].text
      ) {
        remove(0);
      }

      newQuestions.forEach((q: any) => append(q));

      toast({
        variant: "success",
        title: data.message,
      });
      setShowImportPanel(false);
      setGoogleFormsUrl("");
    } catch (error: any) {
      toast({ variant: "destructive", title: error.message });
    } finally {
      setImporting(false);
    }
  };

  const onSubmit = async (
    data: TestFormData,
    status: "draft" | "published",
  ) => {
    setIsSubmitting(true);

    try {
      // Get current user profile
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: profileData } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!profileData) throw new Error("Profile not found");
      const profile = profileData as { id: string };

      // Create test
      const startAtIso = fromDateTimeLocalValue(data.startAt);
      const computedEndLocal = addMinutesToLocalValue(
        data.startAt,
        data.durationMinutes,
      );
      const endAtIso = fromDateTimeLocalValue(
        computedEndLocal || data.endAt,
      );

      if (!startAtIso || !endAtIso) {
        throw new Error("Invalid start or end time");
      }

      const { data: test, error: testError } = await supabase
        .from("tests")
        .insert({
          title: data.title,
          description: data.description || null,
          duration_minutes: data.durationMinutes,
          start_at: startAtIso,
          end_at: endAtIso,
          total_marks: totalMarks,
          status,
          evaluators_per_submission: data.evaluatorsPerSubmission,
          same_batch_only: data.sameBatchOnly,
          auto_allocate_on_end: data.autoAllocateOnEnd,
          target_batch: data.targetBatch || null,
          created_by: profile.id,
        } as any)
        .select()
        .single();

      if (testError) throw testError;
      if (!test) throw new Error("Failed to create test");

      const testData = test as { id: string };

      // Create questions
      const questions = data.questions.map((q, index) => ({
        test_id: testData.id,
        type: q.type,
        prompt: q.prompt,
        options: q.type.startsWith("mcq") ? q.options : null,
        correct_answer: q.type.startsWith("mcq") ? q.correctAnswer : null,
        max_marks: q.maxMarks,
        order_num: index + 1,
      }));

      const { error: questionsError } = await supabase
        .from("questions")
        .insert(questions as any);

      if (questionsError) throw questionsError;

      toast({
        variant: "success",
        title: `Test ${status === "draft" ? "saved as draft" : "published"}!`,
      });

      router.push("/admin/tests");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error creating test",
        description: error.message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Create <span className="text-gradient">New Test</span>
          </h1>
          <p className="text-muted-foreground mt-1">
            Build your test with AI assistance or manual creation
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            onClick={() => {
              setShowAIPanel(!showAIPanel);
              setShowImportPanel(false);
            }}
            className={showAIPanel ? "border-primary" : ""}
          >
            <Sparkles className="w-4 h-4 mr-2" />
            AI Generate
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setShowImportPanel(!showImportPanel);
              setShowAIPanel(false);
            }}
            className={showImportPanel ? "border-primary" : ""}
          >
            <Import className="w-4 h-4 mr-2" />
            Import
          </Button>
        </div>
      </div>

      {/* AI Generation Panel */}
      <AnimatePresence>
        {showAIPanel && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Card className="border-primary/30 bg-primary/5">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Brain className="w-5 h-5 text-primary" />
                  AI Question Generator
                  <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full ml-2">
                    Beta
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Study Material / Script</Label>
                  <Textarea
                    value={aiScript}
                    onChange={(e) => setAiScript(e.target.value)}
                    placeholder="Paste your study material, notes, or topic description here. The AI will generate questions based on this content..."
                    rows={6}
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {aiScript.length}/50 characters minimum
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Number of Questions</Label>
                    <Input
                      type="number"
                      min={1}
                      max={20}
                      value={aiQuestionCount}
                      onChange={(e) =>
                        setAiQuestionCount(parseInt(e.target.value) || 5)
                      }
                    />
                  </div>
                  <div>
                    <Label>Difficulty Level</Label>
                    <select
                      value={aiDifficulty}
                      onChange={(e) => setAiDifficulty(e.target.value)}
                      className="w-full h-10 px-3 rounded-lg border bg-background"
                    >
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                      <option value="mixed">Mixed</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>AI Provider</Label>
                    <select
                      value={aiProvider}
                      onChange={(e) => setAiProvider(e.target.value)}
                      className="w-full h-10 px-3 rounded-lg border bg-background"
                    >
                      <option value="openai">OpenAI (GPT-4)</option>
                      <option value="google">Google (Gemini)</option>
                    </select>
                  </div>
                  <div>
                    <Label>API Key (Optional)</Label>
                    <Input
                      type="password"
                      value={aiApiKey}
                      onChange={(e) => setAiApiKey(e.target.value)}
                      placeholder={
                        aiProvider === "openai" ? "sk-..." : "AIza..."
                      }
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Saved locally in this browser. Leave empty to use server-configured key.
                    </p>
                  </div>
                </div>
                <Button
                  variant="gradient"
                  onClick={handleAIGenerate}
                  disabled={aiGenerating || aiScript.length < 50}
                >
                  {aiGenerating ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Wand2 className="w-4 h-4 mr-2" />
                  )}
                  {aiGenerating ? "Generating..." : "Generate Questions"}
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Import Panel */}
      <AnimatePresence>
        {showImportPanel && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Card className="border-info/30 bg-info/5">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Import className="w-5 h-5 text-info" />
                  Import from Google Forms
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Google Forms URL</Label>
                  <Input
                    value={googleFormsUrl}
                    onChange={(e) => setGoogleFormsUrl(e.target.value)}
                    placeholder="https://docs.google.com/forms/d/..."
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    The form must be publicly accessible (Anyone with link can
                    view)
                  </p>
                </div>
                <Button
                  variant="gradient"
                  onClick={handleGoogleFormsImport}
                  disabled={importing || !googleFormsUrl}
                >
                  {importing ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Import className="w-4 h-4 mr-2" />
                  )}
                  {importing ? "Importing..." : "Import Questions"}
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <form
        onSubmit={handleSubmit(
          (data) => onSubmit(data, "published"),
          (errors) => {
            console.error("Form validation errors:", errors);
            toast({
              variant: "destructive",
              title: "Validation Error",
              description:
                "Please check the form for missing or invalid fields.",
            });
          },
        )}
      >
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Test Details */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Test Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    {...register("title")}
                    placeholder="e.g., Midterm Exam - Data Structures"
                    error={errors.title?.message}
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    {...register("description")}
                    placeholder="Test instructions and guidelines..."
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Timing */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Timing
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-3">
                <div>
                  <Label htmlFor="durationMinutes">Duration (minutes) *</Label>
                  <Input
                    id="durationMinutes"
                    type="number"
                    min={5}
                    {...register("durationMinutes", { valueAsNumber: true })}
                    error={errors.durationMinutes?.message}
                  />
                </div>
                <div>
                  <Label htmlFor="startAt">Start Date/Time *</Label>
                  <Input
                    id="startAt"
                    type="datetime-local"
                    {...register("startAt")}
                    error={errors.startAt?.message}
                  />
                </div>
                <div>
                  <Label htmlFor="endAt">End Date/Time *</Label>
                  <Input
                    id="endAt"
                    type="datetime-local"
                    {...register("endAt")}
                    error={errors.endAt?.message}
                    readOnly
                  />
                </div>
              </CardContent>
            </Card>

            {/* Questions */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">
                    Questions ({fields.length})
                  </CardTitle>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      append({ ...defaultQuestion });
                      setExpandedQuestions(
                        (prev) => new Set([...prev, fields.length]),
                      );
                    }}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add Question
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {fields.map((field, index) => (
                  <Card key={field.id} className="border">
                    <div
                      className="flex items-center gap-2 p-3 cursor-pointer hover:bg-muted/50"
                      onClick={() => toggleQuestionExpand(index)}
                    >
                      <GripVertical className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">Q{index + 1}</span>
                      <span className="text-sm text-muted-foreground flex-1 truncate">
                        {watchQuestions?.[index]?.prompt || "New question..."}
                      </span>
                      <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded">
                        {watchQuestions?.[index]?.maxMarks || 0} marks
                      </span>
                      {expandedQuestions.has(index) ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </div>

                    <AnimatePresence>
                      {expandedQuestions.has(index) && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                        >
                          <CardContent className="border-t pt-4 space-y-4">
                            <div className="grid gap-4 sm:grid-cols-2">
                              <div>
                                <Label>Question Type</Label>
                                <select
                                  {...register(
                                    `questions.${index}.type` as const,
                                  )}
                                  className="w-full h-10 px-3 rounded-lg border bg-background"
                                >
                                  <option value="mcq_single">
                                    MCQ (Single Answer)
                                  </option>
                                  <option value="mcq_multi">
                                    MCQ (Multiple Answers)
                                  </option>
                                  <option value="short">Short Answer</option>
                                  <option value="long">Long Answer</option>
                                </select>
                              </div>
                              <div>
                                <Label>Marks</Label>
                                <Input
                                  type="number"
                                  min={1}
                                  {...register(
                                    `questions.${index}.maxMarks` as const,
                                    { valueAsNumber: true },
                                  )}
                                />
                              </div>
                            </div>

                            <div>
                              <Label>Question *</Label>
                              <Textarea
                                {...register(
                                  `questions.${index}.prompt` as const,
                                )}
                                placeholder="Enter your question..."
                                rows={2}
                              />
                            </div>

                            {/* Options for MCQ */}
                            {(watchQuestions?.[index]?.type === "mcq_single" ||
                              watchQuestions?.[index]?.type ===
                                "mcq_multi") && (
                              <div className="space-y-2">
                                <Label>Options</Label>
                                {["A", "B", "C", "D"].map((opt, optIndex) => (
                                  <div
                                    key={opt}
                                    className="flex items-center gap-2"
                                  >
                                    <input
                                      type={
                                        watchQuestions?.[index]?.type ===
                                        "mcq_single"
                                          ? "radio"
                                          : "checkbox"
                                      }
                                      name={`questions.${index}.correctAnswer`}
                                      value={opt}
                                      checked={watchQuestions?.[
                                        index
                                      ]?.correctAnswer?.includes(opt)}
                                      onChange={(e) => {
                                        const current =
                                          watchQuestions?.[index]
                                            ?.correctAnswer || [];
                                        let updated;
                                        if (
                                          watchQuestions?.[index]?.type ===
                                          "mcq_single"
                                        ) {
                                          updated = [opt];
                                        } else {
                                          updated = e.target.checked
                                            ? [...current, opt]
                                            : current.filter(
                                                (c: string) => c !== opt,
                                              );
                                        }
                                        setValue(
                                          `questions.${index}.correctAnswer`,
                                          updated,
                                        );
                                      }}
                                      className="w-4 h-4"
                                    />
                                    <span className="font-medium w-6">
                                      {opt}.
                                    </span>
                                    <Input
                                      {...register(
                                        `questions.${index}.options.${optIndex}.text` as const,
                                      )}
                                      placeholder={`Option ${opt}`}
                                      className="flex-1"
                                    />
                                  </div>
                                ))}
                              </div>
                            )}

                            <div className="flex justify-end">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => remove(index)}
                                disabled={fields.length === 1}
                              >
                                <Trash2 className="w-4 h-4 mr-1 text-destructive" />
                                Remove
                              </Button>
                            </div>
                          </CardContent>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </Card>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Summary Card */}
            <Card className="sticky top-6">
              <CardHeader>
                <CardTitle className="text-lg">Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Questions</span>
                  <span className="font-medium">{fields.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Marks</span>
                  <span className="font-medium">{totalMarks}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Duration</span>
                  <span className="font-medium">
                    {watch("durationMinutes")} min
                  </span>
                </div>

                <hr className="my-4" />

                {/* Evaluation Settings */}
                <div className="space-y-3">
                  <h4 className="font-medium flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Peer Evaluation
                  </h4>
                  <div>
                    <Label>Evaluators per submission</Label>
                    <Input
                      type="number"
                      min={1}
                      max={5}
                      {...register("evaluatorsPerSubmission", {
                        valueAsNumber: true,
                      })}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="sameBatchOnly"
                      {...register("sameBatchOnly")}
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
                      {...register("autoAllocateOnEnd")}
                      className="w-4 h-4"
                    />
                    <Label htmlFor="autoAllocateOnEnd" className="cursor-pointer">
                      Auto-allocate evaluations when test ends
                    </Label>
                  </div>
                  <div className="space-y-2 mt-4">
                    <Label htmlFor="targetBatch">Target Batch (Optional)</Label>
                    <Input
                      id="targetBatch"
                      {...register("targetBatch")}
                      placeholder="e.g. 2024"
                    />
                    <p className="text-[10px] text-muted-foreground">
                      If specified, only students from this batch can see/take
                      this test.
                    </p>
                  </div>
                </div>

                <hr className="my-4" />

                <div className="space-y-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={handleSubmit(
                      (data) => onSubmit(data, "draft"),
                      (errors) => {
                        console.error("Draft validation errors:", errors);
                        toast({
                          variant: "destructive",
                          title: "Validation Error",
                          description:
                            "Please check the form for missing or invalid fields.",
                        });
                      },
                    )}
                    disabled={isSubmitting}
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Save as Draft
                  </Button>
                  <Button
                    type="submit"
                    variant="gradient"
                    className="w-full"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4 mr-2" />
                    )}
                    Publish Test
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
}
