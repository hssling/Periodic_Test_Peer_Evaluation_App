import { NextRequest, NextResponse } from 'next/server';

// Google Forms Import API
// This parses a Google Forms URL and extracts questions
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { formUrl } = body;

    if (!formUrl) {
      return NextResponse.json(
        { error: 'Google Forms URL is required' },
        { status: 400 }
      );
    }

    // Extract form ID from URL
    const formIdMatch = formUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (!formIdMatch) {
      return NextResponse.json(
        { error: 'Invalid Google Forms URL format. Please provide a valid Google Forms link.' },
        { status: 400 }
      );
    }

    const formId = formIdMatch[1];
    
    // Fetch the form's public response page to extract questions
    // Note: This works for public forms. For private forms, Google Forms API with OAuth is needed.
    const formViewUrl = `https://docs.google.com/forms/d/${formId}/viewform`;
    
    const response = await fetch(formViewUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch Google Form. Make sure the form is publicly accessible.' },
        { status: 400 }
      );
    }

    const html = await response.text();
    
    // Parse questions from the form HTML
    const questions = parseGoogleFormQuestions(html);

    if (questions.length === 0) {
      return NextResponse.json(
        { error: 'No questions found in the form. Make sure the form is publicly accessible and contains questions.' },
        { status: 400 }
      );
    }

    return NextResponse.json({ 
      questions, 
      formId,
      success: true,
      message: `Successfully imported ${questions.length} questions from Google Forms`
    });
  } catch (error: any) {
    console.error('Google Forms Import Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to import from Google Forms' },
      { status: 500 }
    );
  }
}

function parseGoogleFormQuestions(html: string): any[] {
  const questions: any[] = [];
  
  try {
    // Google Forms stores data in a JavaScript variable called FB_PUBLIC_LOAD_DATA_
    const dataMatch = html.match(/FB_PUBLIC_LOAD_DATA_\s*=\s*(\[[\s\S]*?\]);/);
    
    if (dataMatch) {
      // Parse the form data
      const formData = JSON.parse(dataMatch[1]);
      
      // The structure varies, but questions are typically in formData[1][1]
      const questionGroups = formData?.[1]?.[1] || [];
      
      questionGroups.forEach((group: any, index: number) => {
        if (!Array.isArray(group) || group.length < 2) return;
        
        const questionText = group[1];
        const questionType = group[3];
        const options = group[4];
        
        if (!questionText || typeof questionText !== 'string') return;

        let type = 'short_answer';
        let parsedOptions: string[] = [];
        let correctAnswer = '';

        // Map Google Forms question types
        // 0 = Short answer, 1 = Paragraph, 2 = Multiple choice, 4 = Checkboxes
        switch (questionType) {
          case 0:
            type = 'short_answer';
            break;
          case 1:
            type = 'long_answer';
            break;
          case 2:
            type = 'mcq_single';
            if (Array.isArray(options) && options[0]) {
              parsedOptions = options[0].map((opt: any) => opt[0] || '').filter(Boolean);
            }
            break;
          case 4:
            type = 'mcq_multiple';
            if (Array.isArray(options) && options[0]) {
              parsedOptions = options[0].map((opt: any) => opt[0] || '').filter(Boolean);
            }
            break;
          default:
            type = 'short_answer';
        }

        questions.push({
          type,
          prompt: questionText,
          options: parsedOptions.length > 0 ? parsedOptions : undefined,
          correctAnswer: correctAnswer || undefined,
          maxMarks: type === 'long_answer' ? 5 : type.startsWith('mcq') ? 1 : 2,
        });
      });
    }
    
    // Fallback: Try to parse from visible HTML structure
    if (questions.length === 0) {
      // Basic regex extraction for form fields
      const questionRegex = /data-params="[^"]*\["([^"]+)"[^"]*\]"/g;
      let match;
      let index = 0;
      
      while ((match = questionRegex.exec(html)) !== null && index < 50) {
        const questionText = match[1].replace(/\\u003c[^>]+\\u003e/g, '').trim();
        if (questionText && questionText.length > 3) {
          questions.push({
            type: 'short_answer',
            prompt: questionText,
            maxMarks: 2,
          });
          index++;
        }
      }
    }
  } catch (e) {
    console.error('Error parsing Google Form:', e);
  }
  
  return questions;
}
