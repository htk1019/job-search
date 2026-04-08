import { getDb } from '@/lib/db';
import { getModel } from '@/lib/gemini';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { title, company, location, source, url } = body;

  // Get latest resume
  const db = getDb();
  const resume = db.prepare('SELECT content FROM resumes ORDER BY created_at DESC LIMIT 1').get() as { content: string } | undefined;

  try {
    const model = getModel();

    // Try to fetch job page for more details
    let pageContent = '';
    if (url && !url.includes('adzuna')) {
      try {
        const res = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept-Language': 'ko-KR,ko;q=0.9',
          },
          signal: AbortSignal.timeout(5000),
        });
        if (res.ok) {
          const html = await res.text();
          // Extract text content, strip tags
          pageContent = html
            .replace(/<script[\s\S]*?<\/script>/gi, '')
            .replace(/<style[\s\S]*?<\/style>/gi, '')
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .substring(0, 5000);
        }
      } catch { /* ignore fetch errors */ }
    }

    const prompt = `당신은 전문 채용 분석가입니다. 다음 채용 공고를 분석해주세요.

채용 제목: ${title}
회사: ${company}
위치: ${location}
출처: ${source}
${pageContent ? `\n채용 페이지 내용:\n${pageContent}` : ''}

${resume ? `\n지원자 이력서:\n${resume.content}` : ''}

다음 JSON 형식으로 분석 결과를 제공해주세요:
{
  "requirements": ["요구사항1", "요구사항2", ...],
  ${resume ? '"match_score": <0-100 숫자>,' : '"match_score": null,'}
  ${resume ? '"analysis": "<이력서와 채용 공고의 적합도에 대한 상세 분석 (한국어, 3-5문장)>",' : '"analysis": "<이 포지션에 대한 일반적 분석 (한국어)>",'}
  "improvements": ["보완이 필요한 영역1", "보완이 필요한 영역2", ...]
}

한국어로 작성하되, 기술 용어는 영어 그대로 사용해도 됩니다.
JSON만 반환하세요.`;

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json' },
    });

    const analysis = JSON.parse(result.response.text());
    return NextResponse.json(analysis);
  } catch (error) {
    return NextResponse.json(
      { error: `Gemini API error: ${error instanceof Error ? error.message : 'Unknown'}` },
      { status: 500 }
    );
  }
}
