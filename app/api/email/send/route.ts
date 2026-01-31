import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// Email notification types
type EmailType = 
  | 'test_reminder'
  | 'evaluation_assigned'
  | 'evaluation_reminder'
  | 'results_available'
  | 'announcement';

interface EmailPayload {
  type: EmailType;
  recipients: string[] | 'all_students' | 'all_admins';
  subject?: string;
  data?: Record<string, any>;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Verify admin access
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (!profile || (profile as any).role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body: EmailPayload = await request.json();
    const { type, recipients, subject, data } = body;

    // Get recipient emails
    let emailList: string[] = [];
    
    if (Array.isArray(recipients)) {
      emailList = recipients;
    } else if (recipients === 'all_students') {
      const { data: students } = await supabase
        .from('profiles')
        .select('email')
        .eq('role', 'student')
        .eq('is_active', true);
      emailList = (students || []).map((s: any) => s.email);
    } else if (recipients === 'all_admins') {
      const { data: admins } = await supabase
        .from('profiles')
        .select('email')
        .in('role', ['admin', 'faculty'])
        .eq('is_active', true);
      emailList = (admins || []).map((a: any) => a.email);
    }

    if (emailList.length === 0) {
      return NextResponse.json({ error: 'No recipients found' }, { status: 400 });
    }

    // Build email content based on type
    const emailContent = buildEmailContent(type, data, subject);

    // Send emails using configured provider
    const emailProvider = process.env.EMAIL_PROVIDER || 'console';
    
    let result;
    switch (emailProvider) {
      case 'resend':
        result = await sendWithResend(emailList, emailContent);
        break;
      case 'smtp':
        result = await sendWithSMTP(emailList, emailContent);
        break;
      default:
        // Console logging for development
        console.log('📧 Email would be sent:', {
          to: emailList,
          subject: emailContent.subject,
          preview: emailContent.text.substring(0, 200),
        });
        result = { success: true, message: 'Email logged (development mode)' };
    }

    // Log email in database (optional audit)
    await supabase.from('announcements').insert({
      title: `Email: ${emailContent.subject}`,
      content: `Sent to ${emailList.length} recipients`,
      created_by: (await supabase.from('profiles').select('id').eq('user_id', user.id).single()).data?.id,
      is_active: false, // Don't show as announcement
    } as any).catch(() => {}); // Ignore errors

    return NextResponse.json({
      success: true,
      recipientCount: emailList.length,
      ...result,
    });
  } catch (error: any) {
    console.error('Email Send Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send emails' },
      { status: 500 }
    );
  }
}

function buildEmailContent(type: EmailType, data?: Record<string, any>, customSubject?: string) {
  const templates: Record<EmailType, { subject: string; text: string; html: string }> = {
    test_reminder: {
      subject: `Reminder: ${data?.testTitle || 'Test'} starting soon`,
      text: `Dear Student,\n\nThis is a reminder that "${data?.testTitle || 'a test'}" will start at ${data?.startTime || 'the scheduled time'}.\n\nPlease ensure you are ready to take the test.\n\nBest regards,\nPeriodic Test Platform`,
      html: `<h2>Test Reminder</h2><p>Dear Student,</p><p>This is a reminder that <strong>${data?.testTitle || 'a test'}</strong> will start at <strong>${data?.startTime || 'the scheduled time'}</strong>.</p><p>Please ensure you are ready to take the test.</p><p>Best regards,<br/>Periodic Test Platform</p>`,
    },
    evaluation_assigned: {
      subject: 'New Peer Evaluation Assigned',
      text: `Dear Student,\n\nYou have been assigned a new peer evaluation for "${data?.testTitle || 'a test'}".\n\nDeadline: ${data?.deadline || 'Please check the platform'}\n\nPlease complete your evaluation promptly.\n\nBest regards,\nPeriodic Test Platform`,
      html: `<h2>New Evaluation Assignment</h2><p>Dear Student,</p><p>You have been assigned a new peer evaluation for <strong>${data?.testTitle || 'a test'}</strong>.</p><p><strong>Deadline:</strong> ${data?.deadline || 'Please check the platform'}</p><p>Please complete your evaluation promptly.</p><p>Best regards,<br/>Periodic Test Platform</p>`,
    },
    evaluation_reminder: {
      subject: 'Reminder: Pending Evaluation',
      text: `Dear Student,\n\nYou have pending peer evaluations that need to be completed.\n\nPlease log in to the platform and complete your evaluations.\n\nBest regards,\nPeriodic Test Platform`,
      html: `<h2>Evaluation Reminder</h2><p>Dear Student,</p><p>You have pending peer evaluations that need to be completed.</p><p>Please log in to the platform and complete your evaluations.</p><p>Best regards,<br/>Periodic Test Platform</p>`,
    },
    results_available: {
      subject: `Results Available: ${data?.testTitle || 'Test'}`,
      text: `Dear Student,\n\nThe results for "${data?.testTitle || 'your test'}" are now available.\n\nPlease log in to view your scores and feedback.\n\nBest regards,\nPeriodic Test Platform`,
      html: `<h2>Results Available</h2><p>Dear Student,</p><p>The results for <strong>${data?.testTitle || 'your test'}</strong> are now available.</p><p>Please log in to view your scores and feedback.</p><p>Best regards,<br/>Periodic Test Platform</p>`,
    },
    announcement: {
      subject: customSubject || data?.title || 'Platform Announcement',
      text: data?.content || 'Please check the platform for updates.',
      html: `<h2>${data?.title || 'Announcement'}</h2><p>${data?.content || 'Please check the platform for updates.'}</p><p>Best regards,<br/>Periodic Test Platform</p>`,
    },
  };

  return templates[type] || templates.announcement;
}

async function sendWithResend(to: string[], content: { subject: string; text: string; html: string }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error('RESEND_API_KEY not configured');

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM || 'noreply@yourdomain.com',
      to,
      subject: content.subject,
      text: content.text,
      html: content.html,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Resend API error');
  }

  return { success: true, provider: 'resend' };
}

async function sendWithSMTP(to: string[], content: { subject: string; text: string; html: string }) {
  // SMTP would require nodemailer or similar
  // For now, log the attempt
  console.log('SMTP email would be sent to:', to);
  return { success: true, provider: 'smtp', note: 'SMTP not fully implemented' };
}
