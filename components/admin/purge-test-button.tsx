"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

export function PurgeTestButton({ testId }: { testId: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handlePurge = async () => {
    const confirmed = window.confirm(
      "Delete this test and all related data? This cannot be undone.",
    );
    if (!confirmed) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/admin/tests/${testId}/purge`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Delete failed");
      }
      toast({ variant: "success", title: "Test deleted" });
      router.push("/admin/tests");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Delete failed",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="destructive"
      className="w-full"
      onClick={handlePurge}
      disabled={loading}
    >
      {loading ? "Deleting..." : "Delete Test Data"}
    </Button>
  );
}
