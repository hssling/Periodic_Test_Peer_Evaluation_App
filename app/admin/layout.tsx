import { AdminSidebar } from '@/components/layout/admin-sidebar';
import { TopNav } from '@/components/layout/top-nav';
import { createClient } from '@/lib/supabase/server';
import type { Database } from '@/types/supabase';
import { redirect } from 'next/navigation';

type Profile = Database['public']['Tables']['profiles']['Row'];

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect('/auth/login');
    }

    const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();
    
    const profile = profileData as Profile | null;

    if (!profile || (profile.role !== 'admin' && profile.role !== 'faculty')) {
        redirect('/student/dashboard');
    }

    return (
        <div className="min-h-screen bg-background">
            <AdminSidebar profile={profile} />
            <div className="lg:pl-72">
                <TopNav profile={profile} />
                <main className="py-6 px-4 sm:px-6 lg:px-8">
                    {children}
                </main>
            </div>
        </div>
    );
}
