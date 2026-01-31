import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { StudentSidebar } from '@/components/layout/student-sidebar';
import { TopNav } from '@/components/layout/top-nav';

export default async function StudentLayout({
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

    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

    if (!profile || profile.role !== 'student') {
        redirect('/admin/dashboard');
    }

    return (
        <div className="min-h-screen bg-background">
            <StudentSidebar profile={profile} />
            <div className="lg:pl-72">
                <TopNav profile={profile} />
                <main className="py-6 px-4 sm:px-6 lg:px-8">
                    {children}
                </main>
            </div>
        </div>
    );
}
