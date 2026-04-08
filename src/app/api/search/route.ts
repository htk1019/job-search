import { NextRequest, NextResponse } from 'next/server';
import { generateText } from '@/lib/ai';

interface JobResult {
  id: string;
  title: string;
  company: string;
  location: string;
  source: string;
  url: string;
  type: string;
  experience: string;
  salary: string;
  deadline: string;
  description: string;
}

function stripTags(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim();
}

// Detect if query contains Korean characters
function hasKorean(text: string): boolean {
  return /[\uAC00-\uD7AF\u1100-\u11FF]/.test(text);
}

// Translate Korean to English via Gemini
async function translateToEnglish(koreanText: string): Promise<string> {
  try {
    const result = await generateText(
      `Translate this Korean job search keyword to the most common English equivalent used in job postings. Return ONLY the English keyword(s), nothing else.\n\nKorean: ${koreanText}`
    );
    return result.text.trim();
  } catch {
    return koreanText;
  }
}

async function searchAdzuna(q: string): Promise<JobResult[]> {
  const appId = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_API_KEY;
  if (!appId || !appKey) return [];

  try {
    const url = new URL('https://api.adzuna.com/v1/api/jobs/us/search/1');
    url.searchParams.set('app_id', appId);
    url.searchParams.set('app_key', appKey);
    url.searchParams.set('what', q);
    url.searchParams.set('results_per_page', '15');

    const res = await fetch(url.toString(), { next: { revalidate: 0 } });
    if (!res.ok) return [];
    const data = await res.json();

    return (data.results || []).map((r: Record<string, unknown>, i: number) => ({
      id: `adzuna-${r.id || i}`,
      title: r.title || '',
      company: (r.company as Record<string, string>)?.display_name || '',
      location: (r.location as Record<string, string>)?.display_name || '',
      source: 'Adzuna',
      url: (r.redirect_url as string) || '',
      type: r.contract_time === 'full_time' ? 'Full-time' : r.contract_time === 'part_time' ? 'Part-time' : '-',
      experience: '-',
      salary: r.salary_min && r.salary_max
        ? `$${Math.round(r.salary_min as number).toLocaleString()} - $${Math.round(r.salary_max as number).toLocaleString()}`
        : '-',
      deadline: '-',
      description: (r.description as string || '').substring(0, 300),
    }));
  } catch {
    return [];
  }
}

async function searchEFinancialCareers(q: string): Promise<JobResult[]> {
  try {
    const url = `https://job-search-api.efinancialcareers.com/v1/efc/jobs/search?culture=us&q=${encodeURIComponent(q)}&pageSize=15&page=1`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
      },
      next: { revalidate: 0 },
    });
    if (!res.ok) return [];
    const data = await res.json();

    return (data.data || []).map((r: Record<string, unknown>, i: number) => {
      const loc = r.jobLocation as Record<string, string> | undefined;
      const posted = r.postedDate ? new Date(r.postedDate as string) : null;
      const now = new Date();
      let timeAgo = '-';
      if (posted) {
        const diffMs = now.getTime() - posted.getTime();
        const diffH = Math.floor(diffMs / (1000 * 60 * 60));
        const diffD = Math.floor(diffH / 24);
        if (diffD > 0) timeAgo = `${diffD}일 전`;
        else if (diffH > 0) timeAgo = `${diffH}시간 전`;
        else timeAgo = '방금';
      }

      return {
        id: `efc-${r.id || i}`,
        title: (r.title as string) || '',
        company: (r.companyName as string) || (r.clientBrandName as string) || '',
        location: loc ? `${loc.city || ''}, ${loc.country || ''}`.replace(/^,\s*/, '') : '-',
        source: 'eFinancial',
        url: r.detailsPageUrl
          ? `https://www.efinancialcareers.com${r.detailsPageUrl}`
          : '',
        type: (r.employmentType as string) || '-',
        experience: '-',
        salary: (r.salary as string) || '-',
        deadline: timeAgo,
        description: (r.summary as string || '').replace(/<[^>]*>/g, '').substring(0, 300),
      };
    });
  } catch {
    return [];
  }
}

async function searchSaramin(q: string): Promise<JobResult[]> {
  try {
    const url = `https://www.saramin.co.kr/zf_user/search?searchword=${encodeURIComponent(q)}&go=&flag=n&searchMode=1&searchType=search&search_done=y&search_optional_item=n`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'ko-KR,ko;q=0.9',
      },
      next: { revalidate: 0 },
    });
    if (!res.ok) return [];
    const html = await res.text();
    const results: JobResult[] = [];
    const blocks = html.split('class="area_job"');
    blocks.shift();

    for (let idx = 0; idx < blocks.length && idx < 20; idx++) {
      const block = blocks[idx];
      const titleMatch = block.match(/class="job_tit"[\s\S]*?href="([^"]*)"[\s\S]*?<span>([\s\S]*?)<\/span>/);
      if (!titleMatch) continue;

      const href = titleMatch[1].replace(/&amp;/g, '&');
      const title = stripTags(titleMatch[2]);
      const jobUrl = href.startsWith('http') ? href : `https://www.saramin.co.kr${href}`;

      const companyMatch = block.match(/class="corp_name"[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>/);
      const company = companyMatch ? stripTags(companyMatch[1]) : '';

      let location = '-', experience = '-', jobType = '-';
      const conditionMatch = block.match(/class="job_condition">([\s\S]*?)<\/div>/);
      if (conditionMatch) {
        const spans = [...conditionMatch[1].matchAll(/<span[^>]*>([\s\S]*?)<\/span>/g)]
          .map(m => stripTags(m[1]));
        if (spans.length >= 1) location = spans[0] || '-';
        if (spans.length >= 2) experience = spans[1] || '-';
        if (spans.length >= 4) jobType = spans[3] || '-';
      }

      const deadlineMatch = block.match(/class="date">([\s\S]*?)<\/span>/);
      const deadline = deadlineMatch ? stripTags(deadlineMatch[1]) : '-';

      results.push({
        id: `saramin-${idx}`, title, company, location,
        source: '사람인', url: jobUrl, type: jobType,
        experience, salary: '-', deadline, description: '',
      });
    }
    return results;
  } catch {
    return [];
  }
}

async function searchWanted(q: string): Promise<JobResult[]> {
  try {
    const url = `https://www.wanted.co.kr/api/v4/jobs?query=${encodeURIComponent(q)}&country=kr&limit=15&offset=0`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
      },
      next: { revalidate: 0 },
    });
    if (!res.ok) return [];
    const data = await res.json();

    return (data.data || []).map((r: Record<string, unknown>, i: number) => {
      const addr = r.address as Record<string, unknown> | undefined;
      const comp = r.company as Record<string, unknown> | undefined;
      return {
        id: `wanted-${r.id || i}`,
        title: (r.position as string) || '',
        company: (comp?.name as string) || '',
        location: (addr?.full_location as string) || (addr?.location as string) || '-',
        source: '원티드',
        url: `https://www.wanted.co.kr/wd/${r.id}`,
        type: '-',
        experience: r.required_experience ? `${r.required_experience}` : '-',
        salary: '-',
        deadline: r.due_time ? String(r.due_time).substring(0, 10) : '-',
        description: '',
      };
    });
  } catch {
    return [];
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q');

  if (!q) {
    return NextResponse.json({ error: 'Query required', results: [] }, { status: 400 });
  }

  // Translate Korean keywords to English for international sites
  let englishQuery = q;
  const isKorean = hasKorean(q);
  if (isKorean) {
    englishQuery = await translateToEnglish(q);
  }

  // Search Korean sites with original query, international sites with English query
  const [saraminResults, wantedResults, adzunaResults, efcResults] = await Promise.allSettled([
    searchSaramin(q),
    searchWanted(q),
    searchAdzuna(englishQuery),
    searchEFinancialCareers(englishQuery),
  ]);

  const results = [
    ...(saraminResults.status === 'fulfilled' ? saraminResults.value : []),
    ...(wantedResults.status === 'fulfilled' ? wantedResults.value : []),
    ...(efcResults.status === 'fulfilled' ? efcResults.value : []),
    ...(adzunaResults.status === 'fulfilled' ? adzunaResults.value : []),
  ];

  return NextResponse.json({
    results,
    count: results.length,
    translatedQuery: isKorean ? englishQuery : null,
    sources: {
      '전체': results.length,
      '사람인': results.filter(r => r.source === '사람인').length,
      '원티드': results.filter(r => r.source === '원티드').length,
      'eFinancial': results.filter(r => r.source === 'eFinancial').length,
      'Adzuna': results.filter(r => r.source === 'Adzuna').length,
    },
  });
}
