import { getDb } from '@/lib/db';
import { getModel } from '@/lib/gemini';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { resume_id, job_description, job_id } = body;

  if (!resume_id) {
    return NextResponse.json({ error: 'resume_id is required' }, { status: 400 });
  }

  const db = getDb();
  const resume = db.prepare('SELECT * FROM resumes WHERE id = ?').get(resume_id) as { id: number; content: string } | undefined;
  if (!resume) {
    return NextResponse.json({ error: 'Resume not found' }, { status: 404 });
  }

  let description = job_description;
  if (job_id && !description) {
    const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(job_id) as { notes: string } | undefined;
    if (job) description = job.notes;
  }

  if (!description) {
    return NextResponse.json({ error: 'job_description or job_id with notes is required' }, { status: 400 });
  }

  try {
    const model = getModel();
    const prompt = `You are an expert recruiter and resume analyst. Analyze how well the following resume matches the job description.

RESUME:
${resume.content}

JOB DESCRIPTION:
${description}

Provide your analysis as a JSON object with this exact structure:
{
  "score": <number 0-100 representing match percentage>,
  "matched_skills": [<list of skills from the resume that match the job requirements>],
  "missing_skills": [<list of skills required by the job but missing from the resume>],
  "suggestions": [<list of specific, actionable suggestions to improve the resume for this job>],
  "summary": "<2-3 sentence overall assessment>"
}

Be thorough and specific. Return ONLY valid JSON, no markdown or extra text.`;

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
      },
    });

    const responseText = result.response.text();
    const analysis = JSON.parse(responseText);

    // Save to database
    const stmt = db.prepare(
      'INSERT INTO match_results (resume_id, job_id, job_description, match_score, analysis) VALUES (?, ?, ?, ?, ?)'
    );
    stmt.run(resume_id, job_id || null, description, analysis.score, JSON.stringify(analysis));

    return NextResponse.json(analysis);
  } catch (error) {
    return NextResponse.json(
      { error: `Gemini API error: ${error instanceof Error ? error.message : 'Unknown'}` },
      { status: 500 }
    );
  }
}
