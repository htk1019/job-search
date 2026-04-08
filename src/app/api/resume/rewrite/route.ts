import { getDb } from '@/lib/db';
import { generateText } from '@/lib/ai';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { resume_id, job_description, company, position, language } = body;

  const db = getDb();
  let resume;
  if (resume_id) {
    resume = db.prepare('SELECT * FROM resumes WHERE id = ?').get(resume_id) as { id: number; content: string } | undefined;
  } else {
    // Get latest resume
    resume = db.prepare('SELECT * FROM resumes ORDER BY created_at DESC LIMIT 1').get() as { id: number; content: string } | undefined;
  }

  if (!resume) {
    return NextResponse.json({ error: '이력서를 먼저 업로드해주세요', needs_resume: true }, { status: 400 });
  }

  if (!job_description) {
    return NextResponse.json({ error: 'job_description is required' }, { status: 400 });
  }

  const lang = language || 'en';
  const langInstructions = lang === 'ko'
    ? '한국어로 이력서를 작성하세요. 기술 용어는 영어를 병기할 수 있습니다.'
    : 'Write the resume in English.';

  try {
    const prompt = `You are an expert resume writer and career coach. Rewrite the following resume to be perfectly tailored for the specific job and company below.

ORIGINAL RESUME:
${resume.content}

TARGET COMPANY: ${company || 'Not specified'}
TARGET POSITION: ${position || 'Not specified'}

JOB DESCRIPTION / REQUIREMENTS:
${job_description}

Instructions:
1. Reorganize and rewrite the resume content to highlight the most relevant experience and skills for this specific role
2. Use keywords and terminology from the job description naturally throughout
3. Quantify achievements where possible
4. Tailor the professional summary/objective specifically for this company and role
5. Prioritize experiences and skills that directly match the job requirements
6. Maintain a professional, ATS-friendly format
7. Keep it concise (ideally 1-2 pages worth of content)
8. ${langInstructions}

Use clear section headers: PROFESSIONAL SUMMARY, CORE COMPETENCIES, EXPERIENCE, EDUCATION, SKILLS, CERTIFICATIONS.
Format the resume cleanly with bullet points for achievements.`;

    const result = await generateText(prompt);
    const rewrittenResume = result.text;

    const stmt = db.prepare(
      "INSERT INTO ai_outputs (type, input_data, output) VALUES ('resume_rewrite', ?, ?)"
    );
    stmt.run(
      JSON.stringify({ resume_id: resume.id, company, position, language: lang }),
      rewrittenResume
    );

    return NextResponse.json({ rewritten_resume: rewrittenResume });
  } catch (error) {
    return NextResponse.json(
      { error: `Gemini API error: ${error instanceof Error ? error.message : 'Unknown'}` },
      { status: 500 }
    );
  }
}
