import { getDb } from '@/lib/db';
import { getModel } from '@/lib/gemini';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { job_description } = body;

  if (!job_description) {
    return NextResponse.json({ error: 'job_description is required' }, { status: 400 });
  }

  try {
    const model = getModel();
    const prompt = `You are an expert career analyst. Analyze the following job description in detail.

JOB DESCRIPTION:
${job_description}

Provide a comprehensive analysis including:

1. **Role Summary** — What this role actually involves day-to-day
2. **Required Skills** — Categorized as Must-Have vs Nice-to-Have
3. **Experience Level** — Entry/Mid/Senior and estimated years needed
4. **Red Flags** — Any concerning language (unrealistic expectations, vague responsibilities, etc.)
5. **Green Flags** — Positive indicators (growth opportunity, good benefits, clear expectations)
6. **Salary Estimate** — Based on the role, skills, and market data (give a range)
7. **Company Culture Hints** — What the language suggests about work environment
8. **Application Tips** — Specific advice for applying to this particular role

Be candid and practical.`;

    const result = await model.generateContent(prompt);
    const output = result.response.text();

    const db = getDb();
    const stmt = db.prepare("INSERT INTO ai_outputs (type, input_data, output) VALUES ('job_analysis', ?, ?)");
    stmt.run(JSON.stringify({ job_description: job_description.substring(0, 500) }), output);

    return NextResponse.json({ output });
  } catch (error) {
    return NextResponse.json(
      { error: `Gemini API error: ${error instanceof Error ? error.message : 'Unknown'}` },
      { status: 500 }
    );
  }
}
