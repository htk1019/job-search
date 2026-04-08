'use client';

import { useState, useCallback, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Loader2, ExternalLink, Sparkles, Download, Copy, Check, FileText, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { useLocale } from '@/components/layout/locale-context';
import ReactMarkdown from 'react-markdown';
import { downloadMarkdownAsPdf } from '@/lib/pdf-download';

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
  match_score?: number | null;
}

interface SourceCounts { [key: string]: number; }

interface AnalysisData {
  requirements: string[];
  match_score: number | null;
  analysis: string;
  improvements: string[];
}

const sourceColors: Record<string, string> = {
  '사람인': 'bg-blue-500 text-white',
  '원티드': 'bg-indigo-500 text-white',
  'eFinancial': 'bg-amber-600 text-white',
  'Adzuna': 'bg-emerald-500 text-white',
};

export default function SearchPage() {
  const { locale } = useLocale();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<JobResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [translatedQuery, setTranslatedQuery] = useState<string | null>(null);
  const [sourceCounts, setSourceCounts] = useState<SourceCounts>({});
  const [activeSource, setActiveSource] = useState('전체');

  // Detail modal
  const [selectedJob, setSelectedJob] = useState<JobResult | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);

  // Resume generation
  const [genLang, setGenLang] = useState<'en' | 'ko'>('en');
  const [generatingEn, setGeneratingEn] = useState(false);
  const [generatingKo, setGeneratingKo] = useState(false);
  const [resumeEn, setResumeEn] = useState('');
  const [resumeKo, setResumeKo] = useState('');
  const [needsResume, setNeedsResume] = useState(false);
  const [copied, setCopied] = useState(false);

  // Batch analysis
  const [batchAnalyzing, setBatchAnalyzing] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 });

  const resumeRef = useRef<HTMLDivElement>(null);

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setResults([]);
    setActiveSource('전체');

    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setResults(data.results || []);
      setSourceCounts(data.sources || {});
      setTranslatedQuery(data.translatedQuery || null);
    } catch {
      toast.error('검색에 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  const filteredResults = activeSource === '전체'
    ? results
    : results.filter(r => r.source === activeSource);

  const openDetail = async (job: JobResult) => {
    setSelectedJob(job);
    setAnalysisData(null);
    setResumeEn('');
    setResumeKo('');
    setNeedsResume(false);
    setAnalyzing(true);

    try {
      const res = await fetch('/api/search/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: job.title, company: job.company,
          location: job.location, source: job.source, url: job.url,
        }),
      });
      const data = await res.json();
      if (data.error) toast.error(data.error);
      else setAnalysisData(data);
    } catch {
      toast.error('분석에 실패했습니다');
    } finally {
      setAnalyzing(false);
    }
  };

  const generateResume = async (lang: 'en' | 'ko') => {
    if (!selectedJob || !analysisData) return;
    const setGenerating = lang === 'en' ? setGeneratingEn : setGeneratingKo;
    const setResume = lang === 'en' ? setResumeEn : setResumeKo;
    setGenerating(true);
    setResume('');

    try {
      const res = await fetch('/api/resume/rewrite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job_description: `${selectedJob.title} at ${selectedJob.company}\n${analysisData.requirements?.join('\n') || ''}\n${analysisData.analysis || ''}`,
          company: selectedJob.company,
          position: selectedJob.title,
          language: lang,
        }),
      });
      const data = await res.json();
      if (data.needs_resume) {
        setNeedsResume(true);
        toast.error('이력서를 먼저 업로드해주세요');
      } else if (data.error) {
        toast.error(data.error);
      } else {
        setResume(data.rewritten_resume);
        setGenLang(lang);
      }
    } catch {
      toast.error('이력서 생성 실패');
    } finally {
      setGenerating(false);
    }
  };

  const downloadPdf = (text: string, lang: string) => {
    const filename = `resume_${lang}_${selectedJob?.company?.replace(/\s/g, '_') || 'tailored'}.pdf`;
    downloadMarkdownAsPdf(text, filename);
  };

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('클립보드에 복사됨');
  };

  const batchAnalyze = useCallback(async () => {
    const jobs = filteredResults;
    if (!jobs.length) return;
    setBatchAnalyzing(true);
    setBatchProgress({ current: 0, total: jobs.length });

    const updated = [...results];
    for (let i = 0; i < jobs.length; i++) {
      setBatchProgress({ current: i + 1, total: jobs.length });
      try {
        const res = await fetch('/api/search/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: jobs[i].title, company: jobs[i].company,
            location: jobs[i].location, source: jobs[i].source, url: jobs[i].url,
          }),
        });
        const data = await res.json();
        if (!data.error) {
          const idx = updated.findIndex(r => r.id === jobs[i].id);
          if (idx !== -1) updated[idx] = { ...updated[idx], match_score: data.match_score };
        }
      } catch { /* skip */ }
    }
    setResults([...updated]);
    setBatchAnalyzing(false);
    toast.success('적합도 분석 완료');
  }, [filteredResults, results]);

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 dark:text-green-400';
    if (score >= 60) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const currentResume = genLang === 'en' ? resumeEn : resumeKo;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold italic">Job Search Engine</h1>
        <p className="text-sm text-muted-foreground">사람인 · 원티드 · eFinancialCareers · Adzuna</p>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-3 max-w-2xl mx-auto">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="키워드 입력 (예: quant, 데이터 엔지니어, React)"
            className="pl-12 h-12 text-lg rounded-xl"
          />
        </div>
        <Button type="submit" disabled={loading} className="h-12 px-8 rounded-xl text-base">
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : '검색'}
        </Button>
      </form>

      {results.length > 0 && (
        <p className="text-center text-sm text-muted-foreground">
          총 {results.length}건 검색 완료
          {translatedQuery && (
            <span className="ml-2 text-primary">
              (해외 검색: &quot;{translatedQuery}&quot;)
            </span>
          )}
        </p>
      )}

      {/* Source Tabs + Gemini Button */}
      {results.length > 0 && (
        <div className="flex flex-wrap items-center justify-center gap-2">
          {Object.entries(sourceCounts).map(([src, count]) => (
            <button key={src} onClick={() => setActiveSource(src)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                activeSource === src ? 'bg-primary text-primary-foreground shadow-md' : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >{src} ({count})</button>
          ))}
          <Button onClick={batchAnalyze} disabled={batchAnalyzing} variant="outline"
            className="ml-4 rounded-full border-pink-400 text-pink-500 hover:bg-pink-50 dark:hover:bg-pink-950">
            {batchAnalyzing ? (<><Loader2 className="h-4 w-4 animate-spin mr-2" />{batchProgress.current} / {batchProgress.total}</>) :
              (<><Sparkles className="h-4 w-4 mr-2" />적합도 분석 (Gemini)</>)}
          </Button>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="flex flex-col items-center py-20 gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-muted-foreground">검색 중...</p>
        </div>
      ) : filteredResults.length > 0 ? (
        <div className="rounded-lg border overflow-x-auto">
          <Table className="min-w-[900px]">
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-[40px] text-center">#</TableHead>
                <TableHead className="w-[60px] text-center">적합도</TableHead>
                <TableHead className="w-[70px]">소스</TableHead>
                <TableHead>포지션 / 회사</TableHead>
                <TableHead>지역</TableHead>
                <TableHead>경력</TableHead>
                <TableHead>마감</TableHead>
                <TableHead className="w-[80px] text-center">분석</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredResults.map((job, i) => (
                <TableRow key={job.id} className="hover:bg-muted/30">
                  <TableCell className="text-center text-muted-foreground text-sm">{i + 1}</TableCell>
                  <TableCell className="text-center">
                    {job.match_score != null ? (
                      <span className={`font-bold text-sm ${getScoreColor(job.match_score)}`}>{job.match_score}</span>
                    ) : <span className="text-muted-foreground">-</span>}
                  </TableCell>
                  <TableCell>
                    <Badge className={`text-xs ${sourceColors[job.source] || 'bg-gray-500 text-white'}`}>{job.source}</Badge>
                  </TableCell>
                  <TableCell>
                    <a href={job.url} target="_blank" rel="noopener noreferrer" className="font-medium text-sm leading-tight hover:text-primary hover:underline">
                      {job.title}
                      {job.type && job.type !== '-' && <Badge variant="outline" className="ml-2 text-[10px] px-1.5 py-0">{job.type}</Badge>}
                    </a>
                    <p className="text-xs text-muted-foreground mt-0.5">{job.company}</p>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{job.location || '-'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{job.experience || '-'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{job.deadline || '-'}</TableCell>
                  <TableCell className="text-center">
                    <Button size="sm" className="text-xs rounded-full bg-indigo-600 hover:bg-indigo-700 text-white px-4" onClick={() => openDetail(job)}>상세</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : !loading && query ? (
        <div className="text-center py-20 text-muted-foreground">검색 결과가 없습니다</div>
      ) : null}

      {/* Detail + Analysis Modal */}
      <Dialog open={!!selectedJob} onOpenChange={(open) => { if (!open) setSelectedJob(null); }}>
        <DialogContent className="max-w-6xl w-[90vw] max-h-[85vh] overflow-y-auto">
          {selectedJob && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl">{selectedJob.title}</DialogTitle>
                <p className="text-sm text-muted-foreground">
                  {selectedJob.company} · {selectedJob.location} · {selectedJob.source}
                </p>
              </DialogHeader>

              {analyzing ? (
                <div className="flex flex-col items-center py-12 gap-3">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-muted-foreground text-sm">Gemini가 직무 요구사항을 상세 분석 중...</p>
                </div>
              ) : analysisData ? (
                <div className="space-y-6">
                  {/* Requirements */}
                  {analysisData.requirements?.length > 0 && (
                    <div>
                      <h3 className="font-bold text-orange-600 dark:text-orange-400 mb-2">요구사항</h3>
                      <ul className="list-disc list-inside space-y-1 text-sm">{analysisData.requirements.map((r, i) => <li key={i}>{r}</li>)}</ul>
                    </div>
                  )}

                  {/* Match Score */}
                  {analysisData.match_score != null && (
                    <div>
                      <h3 className="font-bold text-green-600 dark:text-green-400 mb-2">이력서 적합도 분석</h3>
                      <p className={`text-3xl font-bold ${getScoreColor(analysisData.match_score)}`}>{analysisData.match_score}점 / 100</p>
                    </div>
                  )}

                  {/* Analysis */}
                  {analysisData.analysis && <div className="text-sm leading-relaxed">{analysisData.analysis}</div>}

                  {/* Improvements */}
                  {analysisData.improvements?.length > 0 && (
                    <div>
                      <h3 className="font-bold text-red-600 dark:text-red-400 mb-2">보완이 필요한 영역</h3>
                      <ul className="list-disc list-inside space-y-2 text-sm">{analysisData.improvements.map((imp, i) => <li key={i}>{imp}</li>)}</ul>
                    </div>
                  )}

                  {/* Resume needs upload warning */}
                  {needsResume && (
                    <div className="flex items-center gap-3 p-4 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                      <AlertTriangle className="h-5 w-5 text-yellow-600 shrink-0" />
                      <div>
                        <p className="font-medium text-yellow-800 dark:text-yellow-200">이력서가 업로드되지 않았습니다</p>
                        <p className="text-sm text-yellow-600 dark:text-yellow-400">이력서 페이지에서 이력서를 먼저 업로드해주세요.</p>
                      </div>
                      <a href="/resume"><Button size="sm" variant="outline">업로드</Button></a>
                    </div>
                  )}

                  {/* Generated Resume */}
                  {(resumeEn || resumeKo) && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-bold text-purple-600 dark:text-purple-400">맞춤 이력서</h3>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => copyText(currentResume)}>
                            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                            {copied ? '복사됨' : '복사'}
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => downloadPdf(currentResume, genLang)}>
                            <Download className="h-4 w-4 mr-1" />PDF
                          </Button>
                        </div>
                      </div>
                      <Tabs value={genLang} onValueChange={(v) => setGenLang(v as 'en' | 'ko')}>
                        <TabsList>
                          <TabsTrigger value="en" disabled={!resumeEn}>
                            <FileText className="h-3 w-3 mr-1" />English
                          </TabsTrigger>
                          <TabsTrigger value="ko" disabled={!resumeKo}>
                            <FileText className="h-3 w-3 mr-1" />한국어
                          </TabsTrigger>
                        </TabsList>
                        <TabsContent value="en">
                          {resumeEn ? (
                            <div ref={genLang === 'en' ? resumeRef : undefined} className="prose prose-sm dark:prose-invert max-w-none bg-muted p-4 rounded-lg max-h-[400px] overflow-y-auto mt-2"><ReactMarkdown>{resumeEn}</ReactMarkdown></div>
                          ) : (
                            <p className="text-sm text-muted-foreground py-4 text-center">영문 이력서를 생성해주세요</p>
                          )}
                        </TabsContent>
                        <TabsContent value="ko">
                          {resumeKo ? (
                            <div ref={genLang === 'ko' ? resumeRef : undefined} className="prose prose-sm dark:prose-invert max-w-none bg-muted p-4 rounded-lg max-h-[400px] overflow-y-auto mt-2"><ReactMarkdown>{resumeKo}</ReactMarkdown></div>
                          ) : (
                            <p className="text-sm text-muted-foreground py-4 text-center">한국어 이력서를 생성해주세요</p>
                          )}
                        </TabsContent>
                      </Tabs>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex flex-wrap gap-3 justify-center pt-2">
                    <a href={selectedJob.url} target="_blank" rel="noopener noreferrer">
                      <Button className="rounded-full px-6 bg-indigo-600 hover:bg-indigo-700 text-white">
                        <ExternalLink className="h-4 w-4 mr-2" />공고 보러가기
                      </Button>
                    </a>
                    <Button onClick={() => generateResume('en')} disabled={generatingEn}
                      className="rounded-full px-5 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white">
                      {generatingEn ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
                      영문 이력서 생성
                    </Button>
                    <Button onClick={() => generateResume('ko')} disabled={generatingKo}
                      className="rounded-full px-5 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white">
                      {generatingKo ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
                      한글 이력서 생성
                    </Button>
                  </div>
                </div>
              ) : null}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
