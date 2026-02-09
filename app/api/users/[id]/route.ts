import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

function normalizeBatch(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const yearMatch = trimmed.match(/(19|20)\d{2}/);
  return yearMatch ? yearMatch[0] : null;
}

// GET - Fetch user profile
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if admin
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

    // Fetch the requested profile
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", params.id)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    return NextResponse.json(profile);
  } catch (error) {
    console.error("Error fetching profile:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// PATCH - Update user profile
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if admin
    const { data: adminProfile } = await supabase
      .from("profiles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (!adminProfile || adminProfile.role !== "admin") {
      return NextResponse.json(
        { error: "Only admins can update profiles" },
        { status: 403 },
      );
    }

    const body = await request.json();
    const allowedFields = [
      "name",
      "role",
      "email",
      "roll_no",
      "batch",
      "section",
      "is_active",
    ];

    // Filter to allowed fields only
    const updates: Record<string, any> = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field];
      }
    }

    if (typeof updates.name === "string") {
      updates.name = updates.name.trim();
    }
    if (typeof updates.email === "string") {
      updates.email = updates.email.trim().toLowerCase();
    }
    if (typeof updates.roll_no === "string") {
      updates.roll_no = updates.roll_no.trim() || null;
    }
    if (updates.batch !== undefined) {
      updates.batch = normalizeBatch(updates.batch);
    }
    if (typeof updates.section === "string") {
      updates.section = updates.section.trim() || null;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 },
      );
    }

    const { data: updatedProfile, error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", params.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(updatedProfile);
  } catch (error) {
    console.error("Error updating profile:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// DELETE - Deactivate user (not delete)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if admin
    const { data: adminProfile } = await supabase
      .from("profiles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (!adminProfile || adminProfile.role !== "admin") {
      return NextResponse.json(
        { error: "Only admins can deactivate users" },
        { status: 403 },
      );
    }

    // Try hard delete first, fallback to deactivation if constrained
    const { error: deleteError } = await supabase
      .from("profiles")
      .delete()
      .eq("id", params.id);

    if (!deleteError) {
      return NextResponse.json({ success: true, message: "User deleted" });
    }

    const { error: deactivateError } = await supabase
      .from("profiles")
      .update({ is_active: false })
      .eq("id", params.id);

    if (deactivateError) {
      return NextResponse.json({ error: deactivateError.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: "User deactivated (delete blocked by references)",
    });
  } catch (error) {
    console.error("Error deactivating user:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
