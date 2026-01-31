"use client";

import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { getSupabaseClient } from "@/lib/supabase/client";
import { CheckCircle, Loader2, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface PublishTestButtonProps {
  testId: string;
  currentStatus: string;
  questionsCount: number;
}

export function PublishTestButton({
  testId,
  currentStatus,
  questionsCount,
}: PublishTestButtonProps) {
  const supabase = getSupabaseClient();
  const router = useRouter();
  const { toast } = useToast();
  const [publishing, setPublishing] = useState(false);

  const handlePublish = async () => {
    if (questionsCount === 0) {
      toast({
        variant: "destructive",
        title: "Cannot publish",
        description: "Add at least one question before publishing.",
      });
      return;
    }

    setPublishing(true);
    try {
      const newStatus = currentStatus === "draft" ? "published" : "active";

      const { error } = await supabase
        .from("tests")
        .update({ status: newStatus })
        .eq("id", testId);

      if (error) throw error;

      toast({
        variant: "success",
        title:
          newStatus === "published" ? "Test published!" : "Test activated!",
        description: "Students can now access this test.",
      });

      router.refresh();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Failed to publish",
        description: error.message,
      });
    } finally {
      setPublishing(false);
    }
  };

  const handleUnpublish = async () => {
    setPublishing(true);
    try {
      const { error } = await supabase
        .from("tests")
        .update({ status: "draft" })
        .eq("id", testId);

      if (error) throw error;

      toast({
        variant: "success",
        title: "Test unpublished",
        description: "Test is now in draft mode.",
      });

      router.refresh();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Failed to unpublish",
        description: error.message,
      });
    } finally {
      setPublishing(false);
    }
  };

  if (currentStatus === "draft") {
    return (
      <Button variant="gradient" onClick={handlePublish} disabled={publishing}>
        {publishing ? (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        ) : (
          <Upload className="w-4 h-4 mr-2" />
        )}
        Publish Test
      </Button>
    );
  }

  if (currentStatus === "published" || currentStatus === "active") {
    return (
      <div className="flex gap-2">
        <Button
          variant="outline"
          onClick={handleUnpublish}
          disabled={publishing}
        >
          {publishing ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : null}
          Unpublish
        </Button>
        <span className="flex items-center gap-1 px-3 py-2 text-sm text-success bg-success/10 rounded-lg">
          <CheckCircle className="w-4 h-4" />
          Published
        </span>
      </div>
    );
  }

  return null;
}
