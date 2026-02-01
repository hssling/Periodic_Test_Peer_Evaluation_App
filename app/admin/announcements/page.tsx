'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { getSupabaseClient } from '@/lib/supabase/client';
import { formatDate } from '@/lib/utils';
import { Loader2, Megaphone, Plus, Send, Trash2, Users } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

export default function AdminAnnouncementsPage() {
  const supabase = getSupabaseClient();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title: '',
    content: '',
    targetRole: 'all',
  });

  const fetchAnnouncements = useCallback(async () => {
    const { data } = await supabase
      .from('announcements')
      .select('*, created_by_profile:profiles!announcements_created_by_fkey(name)')
      .order('created_at', { ascending: false });
    setAnnouncements(data || []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  useEffect(() => {
    if (searchParams.get('create') === '1') {
      setShowForm(true);
    }
  }, [searchParams]);

  const handleCreate = async () => {
    if (!form.title || !form.content) {
      toast({ variant: 'destructive', title: 'Please fill all fields' });
      return;
    }

    setCreating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user!.id)
        .single();

      await supabase.from('announcements').insert({
        title: form.title,
        content: form.content,
        target_role: form.targetRole === 'all' ? null : form.targetRole,
        created_by: (profile as any).id,
        is_active: true,
      } as any);

      toast({ variant: 'success', title: 'Announcement created!' });
      setShowForm(false);
      setForm({ title: '', content: '', targetRole: 'all' });
      fetchAnnouncements();
    } catch (error: any) {
      toast({ variant: 'destructive', title: error.message });
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    await supabase.from('announcements').delete().eq('id', id);
    fetchAnnouncements();
    toast({ title: 'Announcement deleted' });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            <span className="text-gradient">Announcements</span>
          </h1>
          <p className="text-muted-foreground mt-1">
            Broadcast messages to students and faculty
          </p>
        </div>
        <Button variant="gradient" onClick={() => setShowForm(!showForm)}>
          <Plus className="w-4 h-4 mr-2" />
          New Announcement
        </Button>
      </div>

      {/* Create Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Create Announcement</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Title</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Announcement title..."
              />
            </div>
            <div>
              <Label>Content</Label>
              <Textarea
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                placeholder="Write your announcement..."
                rows={4}
              />
            </div>
            <div>
              <Label>Target Audience</Label>
              <select
                value={form.targetRole}
                onChange={(e) => setForm({ ...form, targetRole: e.target.value })}
                className="w-full h-10 px-3 rounded-lg border bg-background"
              >
                <option value="all">All Users</option>
                <option value="student">Students Only</option>
                <option value="admin">Admins Only</option>
                <option value="faculty">Faculty Only</option>
              </select>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
              <Button variant="gradient" onClick={handleCreate} disabled={creating}>
                {creating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                Publish
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Announcements List */}
      <div className="space-y-4">
        {loading ? (
          <Card><CardContent className="p-8 text-center text-muted-foreground">Loading...</CardContent></Card>
        ) : announcements.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Megaphone className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No announcements yet</p>
            </CardContent>
          </Card>
        ) : (
          announcements.map((ann) => (
            <Card key={ann.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold">{ann.title}</h3>
                      {ann.target_role && (
                        <span className="px-2 py-0.5 rounded-full text-xs bg-primary/20 text-primary flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {ann.target_role}
                        </span>
                      )}
                      <span className={`px-2 py-0.5 rounded-full text-xs ${ann.is_active ? 'bg-success/20 text-success' : 'bg-muted text-muted-foreground'}`}>
                        {ann.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{ann.content}</p>
                    <p className="text-xs text-muted-foreground">
                      By {ann.created_by_profile?.name} • {formatDate(ann.created_at)}
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(ann.id)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
