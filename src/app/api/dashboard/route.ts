import { getDb } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  const db = getDb();
  const totalJobs = db.prepare('SELECT COUNT(*) as count FROM jobs').get() as { count: number };
  const statusCounts = db.prepare('SELECT status, COUNT(*) as count FROM jobs GROUP BY status').all() as { status: string; count: number }[];
  const recentJobs = db.prepare('SELECT id, company, position, status, updated_at FROM jobs ORDER BY updated_at DESC LIMIT 5').all();
  const upcomingFollowUps = db.prepare(
    "SELECT id, company, position, follow_up FROM jobs WHERE follow_up IS NOT NULL AND follow_up >= date('now') ORDER BY follow_up ASC LIMIT 5"
  ).all();

  return NextResponse.json({
    totalJobs: totalJobs.count,
    statusCounts,
    recentJobs,
    upcomingFollowUps,
  });
}
