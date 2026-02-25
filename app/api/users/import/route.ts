import { createClient as createAdminClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

import { normalizeBatchYear } from "@/lib/utils";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/supabase";

function getServiceClient() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

  if (!url || !serviceRoleKey) return null;

  return createAdminClient<Database>(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
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

    if (
      !adminProfile ||
      (adminProfile.role !== "admin" && adminProfile.role !== "faculty")
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const serviceClient = getServiceClient();
    if (!serviceClient) {
      return NextResponse.json(
        {
          error:
            "SUPABASE_SERVICE_ROLE_KEY is required for CSV import. Configure it in environment variables.",
        },
        { status: 500 },
      );
    }

    const body = await request.json();
    const name = String(body.name || "").trim();
    const email = String(body.email || "")
      .trim()
      .toLowerCase();
    const rollNo = String(body.roll_no || "").trim();
    const section = String(body.section || "").trim();
    const batch = normalizeBatchYear(body.batch);

    if (!name || !email) {
      return NextResponse.json(
        { error: "name and email are required" },
        { status: 400 },
      );
    }

    const tempPassword = `Temp_${crypto.randomUUID()}!aA1`;
    const { data: createdUser, error: createUserError } =
      await serviceClient.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: {
          name,
          role: "student",
          roll_no: rollNo || null,
          batch,
          section: section || null,
        },
      });

    if (createUserError) {
      const message = createUserError.message || "Failed to create user";
      if (message.toLowerCase().includes("already registered")) {
        return NextResponse.json(
          { error: `Email already registered: ${email}` },
          { status: 409 },
        );
      }
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const userId = createdUser.user?.id;
    if (!userId) {
      return NextResponse.json(
        { error: "Failed to create auth user id" },
        { status: 500 },
      );
    }

    const { error: profileError } = await serviceClient.from("profiles").upsert(
      {
        user_id: userId,
        name,
        email,
        role: "student",
        roll_no: rollNo || null,
        batch,
        section: section || null,
        is_active: true,
      },
      { onConflict: "user_id" },
    );

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, email, user_id: userId });
  } catch (error) {
    console.error("CSV import error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
