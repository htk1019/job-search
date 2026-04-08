import { getDb } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const db = getDb();
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const q = searchParams.get('q');
  const sort = searchParams.get('sort') || 'updated_at';
  const order = searchParams.get('order') || 'DESC';

  let sql = 'SELECT * FROM jobs WHERE 1=1';
  const params: string[] = [];

  if (status) {
    sql += ' AND status = ?';
    params.push(status);
  }
  if (q) {
    sql += ' AND (company LIKE ? OR position LIKE ? OR notes LIKE ?)';
    const like = `%${q}%`;
    params.push(like, like, like);
  }

  const allowedSorts = ['company', 'position', 'status', 'date_applied', 'updated_at', 'created_at'];
  const sortCol = allowedSorts.includes(sort) ? sort : 'updated_at';
  const sortOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
  sql += ` ORDER BY ${sortCol} ${sortOrder}`;

  const jobs = db.prepare(sql).all(...params);
  return NextResponse.json(jobs);
}

export async function POST(request: NextRequest) {
  const db = getDb();
  const body = await request.json();

  const { company, position, url, status, notes, date_applied, follow_up, salary_min, salary_max, location, remote } = body;

  if (!company || !position) {
    return NextResponse.json({ error: 'Company and position are required' }, { status: 400 });
  }

  const stmt = db.prepare(`
    INSERT INTO jobs (company, position, url, status, notes, date_applied, follow_up, salary_min, salary_max, location, remote)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const result = stmt.run(
    company, position, url || null, status || 'saved', notes || null,
    date_applied || null, follow_up || null, salary_min || null, salary_max || null,
    location || null, remote ? 1 : 0
  );

  const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(result.lastInsertRowid);
  return NextResponse.json(job, { status: 201 });
}
