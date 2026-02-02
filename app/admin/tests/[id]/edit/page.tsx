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
import { ArrowLeft, Clock, FileText, Loader2, Save, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

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

  const fetchTest = useCallback(async () => {
    const { data, error } = await supabase
      .from("tests")
      .select("*")
      .eq("id", params.id)
      .single();

    if (error) {
      toast({ variant: "destructive", title: "Test not found" });
      router.push("/admin/tests");
      return;
    }

    // Format dates for datetime-local input (local time)
    const testData = data as any;
    testData.start_at = toDateTimeLocalValue(testData.start_at);
    testData.end_at = toDateTimeLocalValue(testData.end_at);

    setTest(testData);
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

  const handleSave = async () => {
    if (!test.title) {
      toast({ variant: "destructive", title: "Title is required" });
      return;
    }

    setSaving(true);
    try {
      const startAtIso = fromDateTimeLocalValue(test.start_at);
      const computedEndLocal = addMinutesToLocalValue(
        test.start_at,
        test.duration_minutes,
      );
      const endAtIso = fromDateTimeLocalValue(
        computedEndLocal || test.end_at,
      );

      if (!startAtIso || !endAtIso) {
        throw new Error("Invalid start or end time");
      }

      const { error } = await supabase
        .from("tests")
        .update({
          title: test.title,
          description: test.description,
          duration_minutes: test.duration_minutes,
          start_at: startAtIso,
          end_at: endAtIso,
          status: test.status,
          evaluators_per_submission: test.evaluators_per_submission,
          same_batch_only: test.same_batch_only,
          auto_allocate_on_end: test.auto_allocate_on_end,
          target_batch: test.target_batch || null,
        } as any)
        .eq("id", params.id);

      if (error) throw error;

      toast({ variant: "success", title: "Test updated successfully!" });
      router.push(`/admin/tests/${params.id}`);
    } catch (error: any) {
      toast({ variant: "destructive", title: error.message });
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
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
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
          <p className="text-muted-foreground">
            Update test details and settings
          </p>
        </div>
      </div>

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
              onChange={(e) =>
                setTest({ ...test, description: e.target.value })
              }
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
            <p className="text-xs text-muted-foreground mt-1">
              Published/Active tests are visible to students based on start/end
              times
            </p>
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
            <Label>Duration (minutes)</Label>
            <Input
              type="number"
              min={5}
              value={test?.duration_minutes || 60}
              onChange={(e) =>
                setTest({ ...test, duration_minutes: parseInt(e.target.value) })
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
            <Input
              type="datetime-local"
              value={test?.end_at || ""}
              onChange={(e) => setTest({ ...test, end_at: e.target.value })}
              readOnly
            />
          </div>
        </CardContent>
      </Card>

      {/* Evaluation Settings */}
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
                  evaluators_per_submission: parseInt(e.target.value),
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
              Same batch only (students can only evaluate peers from their
              batch)
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
              onChange={(e) =>
                setTest({ ...test, target_batch: e.target.value })
              }
            />
            <p className="text-xs text-muted-foreground mt-1">
              Limit test visibility and allocations to this batch.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
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
