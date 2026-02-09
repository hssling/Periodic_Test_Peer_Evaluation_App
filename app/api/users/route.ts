import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

function normalizeBatch(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const yearMatch = trimmed.match(/(19|20)\d{2}/);
  return yearMatch ? yearMatch[0] : null;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: adminProfile } = await supabase
      .from("profiles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (!adminProfile || (adminProfile.role !== "admin" && adminProfile.role !== "faculty")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const required = ["user_id", "name", "email", "role"];
    for (const key of required) {
      if (!body[key]) {
        return NextResponse.json({ error: `${key} is required` }, { status: 400 });
      }
    }

    const name = String(body.name || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const role = String(body.role || "student").trim();
    const rollNo = typeof body.roll_no === "string" ? body.roll_no.trim() : "";
    const section = typeof body.section === "string" ? body.section.trim() : "";

    const { data: profile, error } = await supabase
      .from("profiles")
      .insert({
        user_id: body.user_id,
        name,
        email,
        role: role || "student",
        roll_no: rollNo || null,
        batch: normalizeBatch(body.batch),
        section: section || null,
        is_active: body.is_active ?? true,
      } as any)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(profile);
  } catch (error) {
    console.error("Error creating profile:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
