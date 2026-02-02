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

    // Try to normalize the URL (support /d/, /d/e/, and forms.gle share links)
    const normalized = extractFormInfo(formUrl);
    const formViewUrl = normalized?.url || formUrl;

    // Fetch the form's public response page to extract questions
    // Note: This works for public forms. For private forms, Google Forms API with OAuth is needed.
    const response = await fetch(formViewUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      redirect: 'follow',
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
      formId: normalized?.formId || extractFormId(response.url) || null,
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
    const formData = extractFormData(html);

    if (formData) {
      const candidateGroups = collectQuestionGroups(formData);

      candidateGroups.forEach((group) => {
        if (!Array.isArray(group) || group.length < 4) return;

        const questionText = group[1];
        const questionType = group[3];
        const options = group[4];

        if (!questionText || typeof questionText !== 'string') return;

        let type = 'short_answer';
        let parsedOptions: string[] = [];
        let correctAnswer = '';

        // Map Google Forms question types
        // 0 = Short answer, 1 = Paragraph, 2 = Multiple choice, 3 = Dropdown, 4 = Checkboxes
        switch (questionType) {
          case 0:
            type = 'short_answer';
            break;
          case 1:
            type = 'long_answer';
            break;
          case 2:
          case 3:
            type = 'mcq_single';
            parsedOptions = extractOptions(options);
            if (parsedOptions.length === 0) {
              parsedOptions = deepFindOptions(group);
            }
            break;
          case 4:
            type = 'mcq_multiple';
            parsedOptions = extractOptions(options);
            if (parsedOptions.length === 0) {
              parsedOptions = deepFindOptions(group);
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
      // Extract data-params JSON and parse options when possible
      const paramRegex = /data-params="([^"]+)"/g;
      let match;
      let index = 0;

      while ((match = paramRegex.exec(html)) !== null && index < 200) {
        const raw = match[1].replace(/&quot;/g, '"');
        if (!raw.includes("[")) continue;
        const decoded = raw.replace(/\\u003c/g, "<").replace(/\\u003e/g, ">");
        try {
          const parsed = JSON.parse(decoded);
          if (!Array.isArray(parsed)) continue;
          const maybeText = parsed.find((v: any) => typeof v === "string");
          if (!maybeText || maybeText.length < 3) continue;
          const options = deepFindOptions(parsed);
          questions.push({
            type: options.length > 0 ? "mcq_single" : "short_answer",
            prompt: maybeText.replace(/<[^>]+>/g, "").trim(),
            options: options.length > 0 ? options : undefined,
            maxMarks: options.length > 0 ? 1 : 2,
          });
          index++;
        } catch {
          // ignore
        }
      }
    }
  } catch (e) {
    console.error('Error parsing Google Form:', e);
  }
  
  return questions;
}

function extractFormInfo(formUrl: string): { formId: string; url: string } | null {
  const match = extractFormId(formUrl);
  if (!match) return null;
  const isEForm = /\/d\/e\//.test(formUrl) || /\/forms\/d\/e\//.test(formUrl);
  const url = isEForm
    ? `https://docs.google.com/forms/d/e/${match}/viewform`
    : `https://docs.google.com/forms/d/${match}/viewform`;
  return { formId: match, url };
}

function extractFormId(formUrl: string): string | null {
  const patterns = [
    /\/forms\/d\/e\/([a-zA-Z0-9-_]+)/,
    /\/forms\/d\/([a-zA-Z0-9-_]+)/,
    /\/d\/e\/([a-zA-Z0-9-_]+)/,
    /\/d\/([a-zA-Z0-9-_]+)/,
  ];
  for (const pattern of patterns) {
    const match = formUrl.match(pattern);
    if (match?.[1]) return match[1];
  }
  return null;
}

function extractFormData(html: string): any[] | null {
  const marker = 'FB_PUBLIC_LOAD_DATA_';
  const markerIndex = html.indexOf(marker);
  if (markerIndex === -1) return null;

  const afterMarker = html.slice(markerIndex);
  const startIndex = afterMarker.indexOf('[');
  if (startIndex === -1) return null;

  let depth = 0;
  let endIndex = -1;
  for (let i = startIndex; i < afterMarker.length; i += 1) {
    const ch = afterMarker[i];
    if (ch === '[') depth += 1;
    if (ch === ']') {
      depth -= 1;
      if (depth === 0) {
        endIndex = i + 1;
        break;
      }
    }
  }

  if (endIndex === -1) return null;
  const jsonText = afterMarker.slice(startIndex, endIndex);
  return JSON.parse(jsonText);
}

function collectQuestionGroups(formData: any[]): any[] {
  const groups: any[] = [];
  const seen = new Set<string>();

  const visit = (node: any) => {
    if (!Array.isArray(node)) return;

    if (
      node.length >= 4 &&
      typeof node[1] === 'string' &&
      typeof node[3] === 'number'
    ) {
      const key = `${node[1]}:${node[3]}`;
      if (!seen.has(key)) {
        seen.add(key);
        groups.push(node);
      }
    }

    node.forEach((child) => visit(child));
  };

  visit(formData);
  return groups;
}

function extractOptions(options: any): string[] {
  if (!Array.isArray(options)) return [];

  if (Array.isArray(options[0]) && Array.isArray(options[0][0])) {
    return options[0].map((opt: any) => opt?.[0] || '').filter(Boolean);
  }

  if (Array.isArray(options[0]) && typeof options[0][0] === 'string') {
    return options.map((opt: any) => opt?.[0] || '').filter(Boolean);
  }

  if (typeof options[0] === 'string') {
    return options.filter(Boolean);
  }

  return [];
}

function deepFindOptions(node: any): string[] {
  const results: string[] = [];
  const visit = (value: any) => {
    if (Array.isArray(value)) {
      if (value.length > 0 && value.every((v) => typeof v === "string")) {
        value.forEach((v) => {
          if (v && v.length < 200) results.push(v);
        });
      } else if (
        value.length > 0 &&
        value.every(
          (v) => Array.isArray(v) && typeof v[0] === "string",
        )
      ) {
        value.forEach((v) => {
          if (v[0] && v[0].length < 200) results.push(v[0]);
        });
      } else {
        value.forEach(visit);
      }
    }
  };
  visit(node);
  return Array.from(new Set(results)).filter(Boolean);
}
