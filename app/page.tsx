import { createClient } from '@/lib/supabase/server';
import type { Database } from '@/types/supabase';
import { redirect } from 'next/navigation';

type Profile = Database['public']['Tables']['profiles']['Row'];

export default async function HomePage() {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (user) {
        // Get user role and redirect to appropriate dashboard
        const { data: profileData } = await supabase
            .from('profiles')
            .select('role, is_active')
            .eq('user_id', user.id)
            .maybeSingle();
        
        const profile = profileData as Pick<Profile, 'role' | 'is_active'> | null;

        if (profile && !profile.is_active) {
            redirect('/auth/login?error=account_inactive');
        }

        if (profile?.role === 'admin' || profile?.role === 'faculty') {
            redirect('/admin/dashboard');
        } else {
            redirect('/student/dashboard');
        }
    }

    redirect('/auth/login');
}
