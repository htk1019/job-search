import { getDb } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

function ensureSettingsTable() {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
  return db;
}

export async function GET() {
  const db = ensureSettingsTable();
  const rows = db.prepare('SELECT key, value FROM settings').all() as { key: string; value: string }[];
  const settings: Record<string, string> = {};
  for (const row of rows) {
    // Mask API keys for display
    if (row.key.includes('API_KEY') || row.key.includes('api_key')) {
      settings[row.key] = row.value ? `${row.value.substring(0, 8)}...${row.value.substring(row.value.length - 4)}` : '';
      settings[`${row.key}_set`] = row.value ? 'true' : 'false';
    } else {
      settings[row.key] = row.value;
    }
  }

  // Also check env vars
  if (process.env.GEMINI_API_KEY) settings['GEMINI_API_KEY_env'] = 'true';
  if (process.env.OPENAI_API_KEY) settings['OPENAI_API_KEY_env'] = 'true';
  if (process.env.ADZUNA_APP_ID) settings['ADZUNA_APP_ID_env'] = 'true';
  if (process.env.ADZUNA_API_KEY) settings['ADZUNA_API_KEY_env'] = 'true';

  return NextResponse.json(settings);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { key, value } = body;

  if (!key) {
    return NextResponse.json({ error: 'key is required' }, { status: 400 });
  }

  const allowedKeys = ['GEMINI_API_KEY', 'OPENAI_API_KEY', 'ADZUNA_APP_ID', 'ADZUNA_API_KEY', 'AI_PROVIDER'];
  if (!allowedKeys.includes(key)) {
    return NextResponse.json({ error: 'Invalid key' }, { status: 400 });
  }

  const db = ensureSettingsTable();

  if (value) {
    db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, value);
  } else {
    db.prepare('DELETE FROM settings WHERE key = ?').run(key);
  }

  return NextResponse.json({ success: true });
}
