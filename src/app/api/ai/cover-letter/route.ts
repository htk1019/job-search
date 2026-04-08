import { getDb } from '@/lib/db';
import { generateText } from '@/lib/ai';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { resume_id, job_description, company, position } = body;

  if (!job_description) {
    return NextResponse.json({ error: 'job_description is required' }, { status: 400 });
  }

  const db = getDb();
  let resumeText = '';
  if (resume_id) {
    const resume = db.prepare('SELECT content FROM resumes WHERE id = ?').get(resume_id) as { content: string } | undefined;
    if (resume) resumeText = resume.content;
  }

  try {
    const prompt = `You are an expert career coach and professional writer. Write a compelling cover letter for the following job application.

${resumeText ? `CANDIDATE'S RESUME:\n${resumeText}\n` : ''}
COMPANY: ${company || 'the company'}
POSITION: ${position || 'the position'}

JOB DESCRIPTION:
${job_description}

Write a professional, personalized cover letter that:
1. Opens with an engaging hook specific to this role/company
2. Highlights 2-3 most relevant experiences from the resume that match the job requirements
3. Shows genuine knowledge/enthusiasm about the company
4. Demonstrates cultural fit
5. Closes with a confident call to action
6. Is 3-4 paragraphs, concise but impactful

Tone: Professional yet personable. Avoid generic phrases.`;

    const result = await generateText(prompt);
    const output = result.text;

    const stmt = db.prepare("INSERT INTO ai_outputs (type, input_data, output) VALUES ('cover_letter', ?, ?)");
    stmt.run(JSON.stringify({ resume_id, company, position }), output);

    return NextResponse.json({ output });
  } catch (error) {
    return NextResponse.json(
      { error: `Gemini API error: ${error instanceof Error ? error.message : 'Unknown'}` },
      { status: 500 }
    );
  }
}
