"use client";

import { UserAvatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { getSupabaseClient } from "@/lib/supabase/client";
import { Calendar, Loader2, Save, Shield, User } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

export default function AdminProfilePage() {
  const supabase = getSupabaseClient();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<any>(null);

  const fetchProfile = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .single();

    setProfile(data);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ name: profile.name } as any)
        .eq("id", profile.id);

      if (error) throw error;
      toast({ variant: "success", title: "Profile updated!" });
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
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
          My <span className="text-gradient">Profile</span>
        </h1>
        <p className="text-muted-foreground mt-1">
          View and manage your account details
        </p>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <UserAvatar name={profile?.name || ""} size="xl" />
            <div className="text-center sm:text-left flex-1">
              <h2 className="text-2xl font-bold">{profile?.name}</h2>
              <p className="text-muted-foreground">{profile?.email}</p>
              <div className="flex flex-wrap justify-center sm:justify-start gap-2 mt-3">
                {profile?.batch && (
                  <span className="px-3 py-1 rounded-full text-xs bg-primary/20 text-primary">
                    Batch {profile.batch}
                  </span>
                )}
                {profile?.section && (
                  <span className="px-3 py-1 rounded-full text-xs bg-accent/20 text-accent">
                    Group {profile.section}
                  </span>
                )}
                <span
                  className={`px-3 py-1 rounded-full text-xs ${
                    profile?.is_active
                      ? "bg-success/20 text-success"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {profile?.is_active ? "Active" : "Inactive"}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <User className="w-5 h-5" />
            Profile Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Full Name</Label>
            <Input
              value={profile?.name || ""}
              onChange={(e) => setProfile({ ...profile, name: e.target.value })}
            />
          </div>
          <div>
            <Label>Email</Label>
            <Input value={profile?.email || ""} disabled />
            <p className="text-xs text-muted-foreground mt-1">
              Email cannot be changed
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Role</Label>
              <Input value={profile?.role || "-"} disabled className="capitalize" />
            </div>
            <div>
              <Label>Status</Label>
              <Input value={profile?.is_active ? "Active" : "Inactive"} disabled />
            </div>
          </div>
          <Button variant="gradient" onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Save Changes
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Account Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-muted/30 text-center">
              <Calendar className="w-6 h-6 mx-auto text-muted-foreground mb-2" />
              <p className="text-xs text-muted-foreground">Member Since</p>
              <p className="font-medium">
                {profile?.created_at
                  ? new Date(profile.created_at).toLocaleDateString()
                  : "-"}
              </p>
            </div>
            <div className="p-4 rounded-lg bg-muted/30 text-center">
              <Shield className="w-6 h-6 mx-auto text-muted-foreground mb-2" />
              <p className="text-xs text-muted-foreground">Account Type</p>
              <p className="font-medium capitalize">{profile?.role}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
