import { getDb } from '@/lib/db';
import { getModel } from '@/lib/gemini';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { job_description, position, company } = body;

  if (!job_description) {
    return NextResponse.json({ error: 'job_description is required' }, { status: 400 });
  }

  try {
    const model = getModel();
    const prompt = `You are an expert interview coach. Generate comprehensive interview preparation materials for the following position.

POSITION: ${position || 'Not specified'}
COMPANY: ${company || 'Not specified'}

JOB DESCRIPTION:
${job_description}

Generate:
1. **10 Likely Interview Questions** — Mix of behavioral, technical, and situational questions specific to this role. For each question, provide:
   - The question
   - Why they might ask this
   - A suggested answer framework (STAR method where applicable)

2. **5 Questions to Ask the Interviewer** — Thoughtful questions that show genuine interest and research

3. **Key Topics to Prepare** — Technical concepts, tools, or knowledge areas to review

4. **Company Research Points** — What to look up about the company before the interview

Format with clear headers and numbered lists.`;

    const result = await model.generateContent(prompt);
    const output = result.response.text();

    const db = getDb();
    const stmt = db.prepare("INSERT INTO ai_outputs (type, input_data, output) VALUES ('interview_prep', ?, ?)");
    stmt.run(JSON.stringify({ position, company }), output);

    return NextResponse.json({ output });
  } catch (error) {
    return NextResponse.json(
      { error: `Gemini API error: ${error instanceof Error ? error.message : 'Unknown'}` },
      { status: 500 }
    );
  }
}
