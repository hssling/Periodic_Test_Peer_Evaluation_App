import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

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

    const { data: profile, error } = await supabase
      .from("profiles")
      .insert({
        user_id: body.user_id,
        name: body.name,
        email: body.email,
        role: body.role,
        roll_no: body.roll_no || null,
        batch: body.batch || null,
        section: body.section || null,
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
