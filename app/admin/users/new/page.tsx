"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function AdminUserCreatePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    user_id: "",
    name: "",
    email: "",
    role: "student",
    roll_no: "",
    batch: "",
    section: "",
  });

  const handleSave = async () => {
    if (!form.user_id || !form.name || !form.email) {
      toast({
        variant: "destructive",
        title: "Missing fields",
        description: "User ID, name, and email are required.",
      });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create user");

      toast({ variant: "success", title: "Profile created" });
      router.push("/admin/users");
    } catch (error: any) {
      toast({ variant: "destructive", title: error.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Create User Profile</h1>
        <p className="text-muted-foreground">
          Provide the Auth User ID and details to create a profile.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Profile Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Auth User ID *</Label>
            <Input
              value={form.user_id}
              onChange={(e) => setForm({ ...form, user_id: e.target.value })}
              placeholder="UUID from auth.users"
            />
          </div>
          <div>
            <Label>Name *</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div>
            <Label>Email *</Label>
            <Input
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div>
            <Label>Role</Label>
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              className="w-full h-10 px-3 rounded-lg border bg-background"
            >
              <option value="student">Student</option>
              <option value="admin">Admin</option>
              <option value="faculty">Faculty</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Roll Number</Label>
              <Input
                value={form.roll_no}
                onChange={(e) => setForm({ ...form, roll_no: e.target.value })}
              />
            </div>
            <div>
              <Label>Batch</Label>
              <Input
                value={form.batch}
                onChange={(e) => setForm({ ...form, batch: e.target.value })}
              />
            </div>
          </div>
          <div>
            <Label>Group</Label>
            <Input
              value={form.section}
              onChange={(e) => setForm({ ...form, section: e.target.value })}
            />
          </div>
          <Button variant="gradient" onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Create Profile"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
