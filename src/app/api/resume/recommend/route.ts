import { getDb } from '@/lib/db';
import { getModel } from '@/lib/gemini';
import { NextResponse } from 'next/server';

export async function POST() {
  const db = getDb();
  const resume = db.prepare('SELECT * FROM resumes ORDER BY created_at DESC LIMIT 1').get() as { id: number; content: string } | undefined;

  if (!resume) {
    return NextResponse.json({ error: '이력서를 먼저 업로드해주세요', needs_resume: true }, { status: 400 });
  }

  try {
    // Step 1: Extract search keywords from resume using Gemini
    const model = getModel();
    const keywordResult = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: `이 이력서에서 채용 검색에 사용할 핵심 키워드 3개를 추출해주세요. 한국어 1개, 영어 2개로 구성하세요.

이력서:
${resume.content.substring(0, 3000)}

JSON 형식으로 반환:
{"keywords": ["한국어키워드", "english_keyword1", "english_keyword2"]}` }] }],
      generationConfig: { responseMimeType: 'application/json' },
    });

    const { keywords } = JSON.parse(keywordResult.response.text());

    // Step 2: Search with each keyword
    const allResults: Array<{
      id: string; title: string; company: string; location: string;
      source: string; url: string; type: string; experience: string;
      salary: string; deadline: string;
    }> = [];

    for (const keyword of keywords) {
      try {
        const searchUrl = new URL('http://localhost:3001/api/search');
        searchUrl.searchParams.set('q', keyword);
        const res = await fetch(searchUrl.toString());
        const data = await res.json();
        if (data.results) {
          allResults.push(...data.results);
        }
      } catch { /* skip */ }
    }

    // Deduplicate by title+company
    const seen = new Set<string>();
    const unique = allResults.filter(r => {
      const key = `${r.title}|${r.company}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Step 3: Score each job against resume using Gemini
    const scored: Array<typeof unique[0] & { match_score: number; reason: string }> = [];

    // Batch analyze (max 15 to avoid rate limits)
    const toAnalyze = unique.slice(0, 15);

    const batchPrompt = `이력서와 다음 채용 공고들의 적합도를 평가해주세요.

이력서 요약:
${resume.content.substring(0, 2000)}

채용 공고 목록:
${toAnalyze.map((j, i) => `${i + 1}. ${j.title} @ ${j.company} (${j.location})`).join('\n')}

각 공고에 대해 0-100 점수와 한줄 이유를 JSON 배열로 반환:
[{"index": 1, "score": 85, "reason": "이유..."}, ...]

높은 점수부터 정렬해서 반환하세요.`;

    const scoreResult = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: batchPrompt }] }],
      generationConfig: { responseMimeType: 'application/json' },
    });

    const scores = JSON.parse(scoreResult.response.text()) as Array<{ index: number; score: number; reason: string }>;

    for (const s of scores) {
      const job = toAnalyze[s.index - 1];
      if (job) {
        scored.push({ ...job, match_score: s.score, reason: s.reason });
      }
    }

    // Sort by score descending
    scored.sort((a, b) => b.match_score - a.match_score);

    return NextResponse.json({
      keywords,
      recommendations: scored,
    });
  } catch (error) {
    return NextResponse.json(
      { error: `분석 실패: ${error instanceof Error ? error.message : 'Unknown'}` },
      { status: 500 }
    );
  }
}
