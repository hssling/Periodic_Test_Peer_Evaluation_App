import { NextRequest, NextResponse } from 'next/server';

// AI Question Generation API
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { script, questionCount = 5, questionTypes = ['mcq_single', 'short_answer'], difficulty = 'medium', aiProvider = 'openai' } = body;

    if (!script || script.trim().length < 50) {
      return NextResponse.json(
        { error: 'Script must be at least 50 characters' },
        { status: 400 }
      );
    }

    // Get API key from environment or request
    const apiKey = body.apiKey || process.env.OPENAI_API_KEY || process.env.GOOGLE_AI_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'AI API key not configured. Please set OPENAI_API_KEY or GOOGLE_AI_API_KEY in environment variables, or provide it in settings.' },
        { status: 400 }
      );
    }

    // Generate prompt for AI
    const prompt = buildQuestionGenerationPrompt(script, questionCount, questionTypes, difficulty);

    let questions;
    
    if (aiProvider === 'google' || apiKey.startsWith('AIza')) {
      questions = await generateWithGemini(apiKey, prompt);
    } else {
      questions = await generateWithOpenAI(apiKey, prompt);
    }

    return NextResponse.json({ questions, success: true });
  } catch (error: any) {
    console.error('AI Generation Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate questions' },
      { status: 500 }
    );
  }
}

function buildQuestionGenerationPrompt(
  script: string,
  count: number,
  types: string[],
  difficulty: string
): string {
  const typeDescriptions = {
    mcq_single: 'Multiple Choice (single answer) with 4 options',
    mcq_multiple: 'Multiple Choice (multiple answers) with 4 options',
    short_answer: 'Short Answer (expecting 1-2 sentences)',
    long_answer: 'Long Answer (expecting a paragraph or more)',
  };

  const selectedTypes = types.map(t => typeDescriptions[t as keyof typeof typeDescriptions] || t).join(', ');

  return `You are an expert educational content creator. Based on the following study material/script, generate ${count} high-quality assessment questions.

STUDY MATERIAL:
${script}

REQUIREMENTS:
- Difficulty Level: ${difficulty}
- Question Types: ${selectedTypes}
- Each question should test understanding, not just memorization
- Include a mix of recall, understanding, and application questions
- For MCQ questions, provide 4 options with one or more correct answers clearly marked
- Assign appropriate marks (1-5) based on complexity

OUTPUT FORMAT (JSON array):
[
  {
    "type": "mcq_single" | "mcq_multiple" | "short_answer" | "long_answer",
    "prompt": "Question text here",
    "options": ["Option A", "Option B", "Option C", "Option D"] (only for MCQ),
    "correctAnswer": "0" or "0,2" (index(es) of correct option(s), only for MCQ),
    "maxMarks": 2,
    "explanation": "Brief explanation of the answer"
  }
]

Generate exactly ${count} questions. Return ONLY the JSON array, no other text.`;
}

async function generateWithOpenAI(apiKey: string, prompt: string): Promise<any[]> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are an expert question generator. Always respond with valid JSON arrays only.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 4000,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'OpenAI API error');
  }

  const data = await response.json();
  const content = data.choices[0]?.message?.content || '[]';
  
  // Parse JSON from response (handle markdown code blocks)
  const jsonMatch = content.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error('Invalid response format from AI');
  
  return JSON.parse(jsonMatch[0]);
}

async function generateWithGemini(apiKey: string, prompt: string): Promise<any[]> {
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 4000,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Gemini API error');
  }

  const data = await response.json();
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
  
  // Parse JSON from response
  const jsonMatch = content.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error('Invalid response format from AI');
  
  return JSON.parse(jsonMatch[0]);
}
