import { getDb } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const db = getDb();
  const body = await request.json();
  const { company, position, url, location, salary_min, salary_max, notes } = body;

  if (!company || !position) {
    return NextResponse.json({ error: 'Company and position are required' }, { status: 400 });
  }

  const stmt = db.prepare(`
    INSERT INTO jobs (company, position, url, status, location, salary_min, salary_max, notes)
    VALUES (?, ?, ?, 'saved', ?, ?, ?, ?)
  `);

  const result = stmt.run(
    company, position, url || null, location || null,
    salary_min || null, salary_max || null, notes || null
  );

  const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(result.lastInsertRowid);
  return NextResponse.json(job, { status: 201 });
}
