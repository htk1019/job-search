import { getDb } from '@/lib/db';
import { extractTextFromPdf } from '@/lib/pdf-parse';
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get('file') as File | null;

  if (!file) {
    return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  let text: string;

  if (file.name.endsWith('.pdf')) {
    text = await extractTextFromPdf(buffer);
  } else if (file.name.endsWith('.txt') || file.name.endsWith('.md')) {
    text = buffer.toString('utf-8');
  } else {
    return NextResponse.json({ error: 'Unsupported file type. Use PDF or TXT.' }, { status: 400 });
  }

  if (!text.trim()) {
    return NextResponse.json({ error: 'Could not extract text from file' }, { status: 400 });
  }

  const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
  fs.mkdirSync(uploadsDir, { recursive: true });
  const filePath = path.join(uploadsDir, `${Date.now()}-${file.name}`);
  fs.writeFileSync(filePath, buffer);

  const db = getDb();
  const stmt = db.prepare('INSERT INTO resumes (filename, content, file_path) VALUES (?, ?, ?)');
  const result = stmt.run(file.name, text, filePath);
  const resume = db.prepare('SELECT * FROM resumes WHERE id = ?').get(result.lastInsertRowid);

  return NextResponse.json(resume, { status: 201 });
}

export async function GET() {
  const db = getDb();
  const resumes = db.prepare('SELECT id, filename, created_at FROM resumes ORDER BY created_at DESC').all();
  return NextResponse.json(resumes);
}
