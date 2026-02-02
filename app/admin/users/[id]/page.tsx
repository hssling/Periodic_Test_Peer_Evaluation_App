"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { ArrowLeft, Loader2, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function AdminUserEditPage({
  params,
}: {
  params: { id: string };
}) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      const res = await fetch(`/api/users/${params.id}`);
      const data = await res.json();
      if (!res.ok) {
        toast({ variant: "destructive", title: data.error || "Failed to load" });
        setLoading(false);
        return;
      }
      setProfile(data);
      setLoading(false);
    };

    fetchProfile();
  }, [params.id, toast]);

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/users/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Update failed");
      toast({ variant: "success", title: "Profile updated" });
    } catch (error: any) {
      toast({ variant: "destructive", title: error.message });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/users/${params.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Delete failed");
      toast({ variant: "success", title: data.message || "User removed" });
      window.location.href = "/admin/users";
    } catch (error: any) {
      toast({ variant: "destructive", title: error.message });
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!profile) {
    return null;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/users">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Edit User</h1>
          <p className="text-muted-foreground">{profile.email}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Profile Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Name</Label>
            <Input
              value={profile.name || ""}
              onChange={(e) => setProfile({ ...profile, name: e.target.value })}
            />
          </div>
          <div>
            <Label>Email</Label>
            <Input
              value={profile.email || ""}
              onChange={(e) => setProfile({ ...profile, email: e.target.value })}
            />
          </div>
          <div>
            <Label>Role</Label>
            <select
              value={profile.role || "student"}
              onChange={(e) => setProfile({ ...profile, role: e.target.value })}
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
                value={profile.roll_no || ""}
                onChange={(e) =>
                  setProfile({ ...profile, roll_no: e.target.value })
                }
              />
            </div>
            <div>
              <Label>Batch</Label>
              <Input
                value={profile.batch || ""}
                onChange={(e) =>
                  setProfile({ ...profile, batch: e.target.value })
                }
              />
            </div>
          </div>
          <div>
            <Label>Group</Label>
            <Input
              value={profile.section || ""}
              onChange={(e) =>
                setProfile({ ...profile, section: e.target.value })
              }
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_active"
              checked={!!profile.is_active}
              onChange={(e) =>
                setProfile({ ...profile, is_active: e.target.checked })
              }
              className="w-4 h-4"
            />
            <Label htmlFor="is_active">Active</Label>
          </div>
          <Button variant="gradient" onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Danger Zone</CardTitle>
        </CardHeader>
        <CardContent>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={deleting}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            {deleting ? "Deleting..." : "Delete User"}
          </Button>
          <p className="text-xs text-muted-foreground mt-2">
            If deletion fails, the user will be deactivated instead.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
