import { getDb } from '@/lib/db';
import { getModel } from '@/lib/gemini';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { resume_id, job_description } = body;

  if (!resume_id || !job_description) {
    return NextResponse.json({ error: 'resume_id and job_description are required' }, { status: 400 });
  }

  const db = getDb();
  const resume = db.prepare('SELECT content FROM resumes WHERE id = ?').get(resume_id) as { content: string } | undefined;
  if (!resume) {
    return NextResponse.json({ error: 'Resume not found' }, { status: 404 });
  }

  try {
    const model = getModel();
    const prompt = `You are an expert career development advisor. Analyze the skill gap between the candidate's current profile and the target job.

CANDIDATE'S RESUME:
${resume.content}

TARGET JOB DESCRIPTION:
${job_description}

Provide a detailed skill gap analysis:

1. **Current Strengths** — Skills the candidate already has that are relevant
2. **Critical Gaps** — Must-have skills that are missing (prioritized by importance)
3. **Nice-to-Have Gaps** — Optional skills worth developing
4. **Learning Path** — For each critical gap, suggest:
   - Specific courses, certifications, or resources
   - Estimated time to acquire the skill
   - How to demonstrate the skill (projects, portfolio, etc.)
5. **Quick Wins** — Skills that could be acquired in under 2 weeks
6. **Timeline** — Realistic timeline to become a strong candidate for this role
7. **Interim Steps** — Similar roles that could serve as stepping stones

Be specific with resource recommendations (actual course names, platforms, certifications).`;

    const result = await model.generateContent(prompt);
    const output = result.response.text();

    const stmt = db.prepare("INSERT INTO ai_outputs (type, input_data, output) VALUES ('skill_gap', ?, ?)");
    stmt.run(JSON.stringify({ resume_id }), output);

    return NextResponse.json({ output });
  } catch (error) {
    return NextResponse.json(
      { error: `Gemini API error: ${error instanceof Error ? error.message : 'Unknown'}` },
      { status: 500 }
    );
  }
}
