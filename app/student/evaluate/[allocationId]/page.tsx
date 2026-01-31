import { EvaluationClient } from "@/components/student/evaluation-client";
import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";

export const dynamic = "force-dynamic";

interface EvaluatePageProps {
  params: { allocationId: string };
}

export default async function EvaluatePage({ params }: EvaluatePageProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (!profile) {
    redirect("/auth/login");
  }

  // Get allocation
  const { data: allocation } = await supabase
    .from("allocations")
    .select("*")
    .eq("id", params.allocationId)
    .eq("evaluator_id", profile.id)
    .single();

  if (!allocation) {
    notFound();
  }

  if (allocation.status === "completed") {
    redirect("/student/evaluations?message=already_completed");
  }

  // Get anonymized submission
  const { data: submission } = await supabase
    .rpc("get_anonymized_submission", { p_allocation_id: params.allocationId })
    .single();

  if (!submission) {
    notFound();
  }

  // Get existing evaluation if any
  const { data: existingEvaluation } = await supabase
    .from("evaluations")
    .select("*, items:evaluation_items(*)")
    .eq("allocation_id", params.allocationId)
    .single();

  return (
    <EvaluationClient
      allocation={allocation}
      submission={submission}
      existingEvaluation={existingEvaluation}
    />
  );
}
