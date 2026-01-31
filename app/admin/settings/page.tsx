"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Database, Loader2, Mail, Save, Settings, Shield } from "lucide-react";
import { useState } from "react";

export default function AdminSettingsPage() {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    platformName: "Periodic Test Peer Evaluation",
    adminEmail: "",
    evaluatorsPerSubmission: 3,
    allowLateSubmissions: false,
    enableEmailNotifications: true,
    aiProvider: "openai",
    aiApiKey: "",
  });

  const handleSave = async () => {
    setSaving(true);
    // Simulate save
    await new Promise((resolve) => setTimeout(resolve, 1000));
    toast({ variant: "success", title: "Settings saved successfully!" });
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
          Platform <span className="text-gradient">Settings</span>
        </h1>
        <p className="text-muted-foreground mt-1">
          Configure platform-wide settings and preferences
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* General Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Settings className="w-5 h-5" />
              General Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Platform Name</Label>
              <Input
                value={settings.platformName}
                onChange={(e) =>
                  setSettings({ ...settings, platformName: e.target.value })
                }
              />
            </div>
            <div>
              <Label>Admin Email</Label>
              <Input
                type="email"
                value={settings.adminEmail}
                onChange={(e) =>
                  setSettings({ ...settings, adminEmail: e.target.value })
                }
                placeholder="admin@example.com"
              />
            </div>
            <div>
              <Label>Default Evaluators Per Submission</Label>
              <Input
                type="number"
                min={1}
                max={10}
                value={settings.evaluatorsPerSubmission}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    evaluatorsPerSubmission: parseInt(e.target.value),
                  })
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Email Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Mail className="w-5 h-5" />
              Email Notifications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Email Notifications</p>
                <p className="text-sm text-muted-foreground">
                  Send automated emails for important events
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.enableEmailNotifications}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      enableEmailNotifications: e.target.checked,
                    })
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-muted rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-primary after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
              </label>
            </div>
            <div className="text-sm text-muted-foreground space-y-2 p-3 bg-muted/30 rounded-lg">
              <p>• Test start/end reminders</p>
              <p>• Evaluation assignment notifications</p>
              <p>• Deadline reminders</p>
              <p>• Results availability</p>
            </div>
          </CardContent>
        </Card>

        {/* AI Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Database className="w-5 h-5" />
              AI Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>AI Provider</Label>
              <select
                value={settings.aiProvider}
                onChange={(e) =>
                  setSettings({ ...settings, aiProvider: e.target.value })
                }
                className="w-full h-10 px-3 rounded-lg border bg-background"
              >
                <option value="openai">OpenAI (GPT-4)</option>
                <option value="google">Google (Gemini)</option>
                <option value="anthropic">Anthropic (Claude)</option>
              </select>
            </div>
            <div>
              <Label>API Key</Label>
              <Input
                type="password"
                value={settings.aiApiKey}
                onChange={(e) =>
                  setSettings({ ...settings, aiApiKey: e.target.value })
                }
                placeholder="sk-..."
              />
              <p className="text-xs text-muted-foreground mt-1">
                Required for AI-powered question generation
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Security Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Security & Compliance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Allow Late Submissions</p>
                <p className="text-sm text-muted-foreground">
                  Accept submissions after deadline
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.allowLateSubmissions}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      allowLateSubmissions: e.target.checked,
                    })
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-muted rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-primary after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
              </label>
            </div>
            <div className="p-3 bg-success/10 text-success rounded-lg text-sm">
              <Shield className="w-4 h-4 inline mr-2" />
              Row Level Security enabled on all tables
            </div>
          </CardContent>
        </Card>

        {/* Install App */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Smartphone className="w-5 h-5" />
              Install App
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Install the Periodic Test app on your device for quick access and
              offline support.
            </p>
            <div className="text-sm space-y-2 p-3 bg-muted/30 rounded-lg">
              <p className="flex items-center gap-2">
                <span className="w-2 h-2 bg-success rounded-full"></span>
                Works offline
              </p>
              <p className="flex items-center gap-2">
                <span className="w-2 h-2 bg-info rounded-full"></span>
                Fast app-like experience
              </p>
              <p className="flex items-center gap-2">
                <span className="w-2 h-2 bg-warning rounded-full"></span>
                Push notifications
              </p>
            </div>
            <InstallButton />
          </CardContent>
        </Card>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button variant="gradient" onClick={handleSave} disabled={saving}>
          {saving ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          Save Settings
        </Button>
      </div>
    </div>
  );
}
