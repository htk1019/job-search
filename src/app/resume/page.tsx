'use client';

import { useState, useEffect, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, FileText, Target, PenTool, Loader2, CheckCircle, XCircle, Copy, Check, Clock, Trash2, Sparkles, ExternalLink, Download } from 'lucide-react';
import { toast } from 'sonner';
import { useLocale } from '@/components/layout/locale-context';
import { format } from 'date-fns';
import ReactMarkdown from 'react-markdown';

interface ResumeInfo {
  id: number;
  filename: string;
  created_at: string;
}

interface MatchAnalysis {
  score: number;
  matched_skills: string[];
  missing_skills: string[];
  suggestions: string[];
  summary: string;
}

export default function ResumePage() {
  const { t } = useLocale();
  const [resume, setResume] = useState<ResumeInfo | null>(null);
  const [uploading, setUploading] = useState(false);
  const [justUploaded, setJustUploaded] = useState(false);

  const [jobDescription, setJobDescription] = useState('');
  const [company, setCompany] = useState('');
  const [position, setPosition] = useState('');

  const [matching, setMatching] = useState(false);
  const [rewriting, setRewriting] = useState(false);
  const [matchResult, setMatchResult] = useState<MatchAnalysis | null>(null);
  const [rewriteResult, setRewriteResult] = useState('');
  const [copied, setCopied] = useState(false);

  // Recommendations
  const [loadingRecs, setLoadingRecs] = useState(false);
  const [recommendations, setRecommendations] = useState<Array<{
    id: string; title: string; company: string; location: string;
    source: string; url: string; match_score: number; reason: string;
  }>>([]);
  const [recKeywords, setRecKeywords] = useState<string[]>([]);

  const fetchResume = useCallback(async () => {
    const res = await fetch('/api/resume/upload');
    const data = await res.json();
    setResume(data.length > 0 ? data[0] : null);
  }, []);

  useEffect(() => { fetchResume(); }, [fetchResume]);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch('/api/resume/upload', { method: 'POST', body: formData });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || t('uploadFailed'));
      } else {
        toast.success(t('resumeUploaded'));
        await fetchResume();
        setJustUploaded(true);
        setTimeout(() => setJustUploaded(false), 3000);
      }
    } catch {
      toast.error(t('uploadFailed'));
    } finally {
      setUploading(false);
    }
  }, [fetchResume, t]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'], 'text/plain': ['.txt'], 'text/markdown': ['.md'] },
    maxFiles: 1,
  });

  const handleMatch = async () => {
    if (!resume || !jobDescription) { toast.error(t('selectResumeAndDesc')); return; }
    setMatching(true); setMatchResult(null);
    try {
      const res = await fetch('/api/resume/match', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resume_id: resume.id, job_description: jobDescription }),
      });
      const data = await res.json();
      if (data.error) toast.error(data.error);
      else setMatchResult(data);
    } catch { toast.error(t('matchFailed')); }
    finally { setMatching(false); }
  };

  const handleRewrite = async () => {
    if (!resume || !jobDescription) { toast.error(t('selectResumeAndDesc')); return; }
    setRewriting(true); setRewriteResult('');
    try {
      const res = await fetch('/api/resume/rewrite', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resume_id: resume.id, job_description: jobDescription, company, position }),
      });
      const data = await res.json();
      if (data.error) toast.error(data.error);
      else setRewriteResult(data.rewritten_resume);
    } catch { toast.error(t('rewriteFailed')); }
    finally { setRewriting(false); }
  };

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
    toast.success(t('copiedToClipboard'));
  };

  const fetchRecommendations = async () => {
    if (!resume) { toast.error('이력서를 먼저 업로드해주세요'); return; }
    setLoadingRecs(true);
    setRecommendations([]);
    try {
      const res = await fetch('/api/resume/recommend', { method: 'POST' });
      const data = await res.json();
      if (data.error) { toast.error(data.error); }
      else {
        setRecommendations(data.recommendations || []);
        setRecKeywords(data.keywords || []);
      }
    } catch { toast.error('추천 공고 검색 실패'); }
    finally { setLoadingRecs(false); }
  };

  const downloadPdf = async (text: string) => {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const margin = 15;
    const maxWidth = doc.internal.pageSize.getWidth() - margin * 2;
    const lineHeight = 6;
    let y = margin;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    // Simple markdown-to-text for PDF
    const cleaned = text
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/^#+\s*/gm, '')
      .replace(/^[-*]\s/gm, '• ');

    for (const line of cleaned.split('\n')) {
      if (y > doc.internal.pageSize.getHeight() - margin) { doc.addPage(); y = margin; }
      const trimmed = line.trim();
      if (trimmed.match(/^[A-Z\s]{4,}$/) || trimmed.match(/^[가-힣\s]{3,}$/)) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        y += 2;
      } else {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
      }
      const wrapped = doc.splitTextToSize(trimmed || ' ', maxWidth);
      for (const wl of wrapped) {
        if (y > doc.internal.pageSize.getHeight() - margin) { doc.addPage(); y = margin; }
        doc.text(wl, margin, y);
        y += lineHeight;
      }
    }
    doc.save(`resume_${company || 'tailored'}.pdf`);
    toast.success('PDF 다운로드 완료');
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">{t('resumeTitle')}</h2>
        <p className="text-muted-foreground">{t('resumeDesc')}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4">
          {/* My Resume Card */}
          <Card className={justUploaded ? 'ring-2 ring-green-500 transition-all duration-500' : ''}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{t('uploadResume')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Current resume status */}
              {resume ? (
                <div className="flex items-center gap-3 p-3 rounded-lg border border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
                  <div className="shrink-0 w-10 h-10 rounded-lg bg-green-500 text-white flex items-center justify-center">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{resume.filename}</p>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {format(new Date(resume.created_at), 'yyyy-MM-dd HH:mm')}
                    </div>
                  </div>
                  <CheckCircle className="h-5 w-5 text-green-500 shrink-0" />
                </div>
              ) : (
                <div className="flex items-center gap-3 p-3 rounded-lg border border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950">
                  <div className="shrink-0 w-10 h-10 rounded-lg bg-yellow-500 text-white flex items-center justify-center">
                    <Upload className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">이력서를 업로드해주세요</p>
                    <p className="text-xs text-yellow-600 dark:text-yellow-400">검색 및 분석 기능 사용에 필요합니다</p>
                  </div>
                </div>
              )}

              {/* Upload zone */}
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all duration-300 ${
                  justUploaded ? 'border-green-500 bg-green-500/10' :
                  isDragActive ? 'border-primary bg-primary/10 scale-[1.02]' :
                  'border-muted-foreground/25 hover:border-primary/50 hover:bg-primary/5'
                }`}
              >
                <input {...getInputProps()} />
                {uploading ? (
                  <Loader2 className="h-8 w-8 mx-auto animate-spin text-primary" />
                ) : justUploaded ? (
                  <div className="space-y-1">
                    <CheckCircle className="h-8 w-8 mx-auto text-green-500" />
                    <p className="text-sm font-medium text-green-500">{t('resumeUploaded')}</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <Upload className="h-6 w-6 mx-auto text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">{resume ? '새 이력서로 교체' : t('dropFileHere')}</p>
                    <p className="text-xs text-muted-foreground/60">PDF, TXT, MD</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Job Details */}
          <Card>
            <CardHeader><CardTitle className="text-base">{t('jobDetails')}</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-xs">{t('company')}</Label>
                <Input value={company} onChange={(e) => setCompany(e.target.value)} placeholder={t('companyName')} />
              </div>
              <div>
                <Label className="text-xs">{t('position')}</Label>
                <Input value={position} onChange={(e) => setPosition(e.target.value)} placeholder={t('jobTitle')} />
              </div>
              <div>
                <Label className="text-xs">{t('jobDescriptionRequired')}</Label>
                <Textarea value={jobDescription} onChange={(e) => setJobDescription(e.target.value)} placeholder={t('pasteJobDesc')} rows={8} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: Results */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="match">
            <TabsList className="mb-4">
              <TabsTrigger value="recommend"><Sparkles className="h-4 w-4 mr-2" />추천 공고</TabsTrigger>
              <TabsTrigger value="match"><Target className="h-4 w-4 mr-2" />{t('matchScore')}</TabsTrigger>
              <TabsTrigger value="rewrite"><PenTool className="h-4 w-4 mr-2" />{t('resumeRewrite')}</TabsTrigger>
            </TabsList>

            <TabsContent value="recommend" className="space-y-4">
              <Button onClick={fetchRecommendations} disabled={loadingRecs || !resume} className="w-full">
                {loadingRecs ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
                {loadingRecs ? '이력서 분석 후 추천 공고 검색 중...' : '내 이력서에 맞는 공고 찾기'}
              </Button>

              {!resume && (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  이력서를 먼저 업로드해주세요
                </div>
              )}

              {recKeywords.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-muted-foreground">검색 키워드:</span>
                  {recKeywords.map((kw, i) => (
                    <Badge key={i} variant="outline" className="text-xs">{kw}</Badge>
                  ))}
                </div>
              )}

              {recommendations.length > 0 && (
                <div className="space-y-3">
                  {recommendations.map((rec, i) => (
                    <Card key={rec.id || i} className="hover:shadow-md transition-shadow">
                      <CardContent className="pt-4 pb-4">
                        <div className="flex items-start gap-4">
                          {/* Score */}
                          <div className={`shrink-0 w-14 h-14 rounded-xl flex flex-col items-center justify-center ${
                            rec.match_score >= 80 ? 'bg-green-100 dark:bg-green-900' :
                            rec.match_score >= 60 ? 'bg-yellow-100 dark:bg-yellow-900' :
                            'bg-red-100 dark:bg-red-900'
                          }`}>
                            <span className={`text-lg font-bold ${getScoreColor(rec.match_score)}`}>{rec.match_score}</span>
                            <span className="text-[10px] text-muted-foreground">점</span>
                          </div>

                          {/* Job info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <Badge className={`text-[10px] ${
                                rec.source === '사람인' ? 'bg-blue-500 text-white' :
                                rec.source === '원티드' ? 'bg-indigo-500 text-white' :
                                rec.source === 'eFinancial' ? 'bg-amber-600 text-white' :
                                'bg-emerald-500 text-white'
                              }`}>{rec.source}</Badge>
                              <a href={rec.url} target="_blank" rel="noopener noreferrer"
                                className="font-medium text-sm hover:text-primary hover:underline truncate">
                                {rec.title}
                              </a>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">{rec.company} · {rec.location}</p>
                            <p className="text-xs text-muted-foreground mt-1">{rec.reason}</p>
                          </div>

                          {/* Link */}
                          <a href={rec.url} target="_blank" rel="noopener noreferrer">
                            <Button variant="outline" size="sm" className="shrink-0 text-xs rounded-full">
                              <ExternalLink className="h-3 w-3 mr-1" />공고
                            </Button>
                          </a>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="match" className="space-y-4">
              <Button onClick={handleMatch} disabled={matching || !resume || !jobDescription} className="w-full">
                {matching ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Target className="h-4 w-4 mr-2" />}
                {matching ? t('analyzing') : t('analyzeMatch')}
              </Button>

              {!resume && (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  이력서를 먼저 업로드해주세요
                </div>
              )}

              {matchResult && (
                <div className="space-y-4">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <div className={`text-6xl font-bold ${getScoreColor(matchResult.score)}`}>{matchResult.score}%</div>
                        <p className="text-muted-foreground mt-1">{t('matchScore')}</p>
                      </div>
                      <p className="text-center mt-4 text-sm">{matchResult.summary}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />{t('matchedSkills')} ({matchResult.matched_skills.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {matchResult.matched_skills.map((s, i) => <Badge key={i} variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">{s}</Badge>)}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        <XCircle className="h-4 w-4 text-red-500" />{t('missingSkills')} ({matchResult.missing_skills.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {matchResult.missing_skills.map((s, i) => <Badge key={i} variant="secondary" className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300">{s}</Badge>)}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-base">{t('suggestions')}</CardTitle></CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {matchResult.suggestions.map((s, i) => <li key={i} className="text-sm flex gap-2"><span className="text-primary font-bold">{i + 1}.</span>{s}</li>)}
                      </ul>
                    </CardContent>
                  </Card>
                </div>
              )}
            </TabsContent>

            <TabsContent value="rewrite" className="space-y-4">
              <Button onClick={handleRewrite} disabled={rewriting || !resume || !jobDescription} className="w-full">
                {rewriting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <PenTool className="h-4 w-4 mr-2" />}
                {rewriting ? t('rewriting') : t('rewriteResume')}
              </Button>

              {!resume && (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  이력서를 먼저 업로드해주세요
                </div>
              )}

              {rewriteResult && (
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-base">{t('tailoredResume')}</CardTitle>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => copyToClipboard(rewriteResult)}>
                        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        {copied ? t('copied') : t('copy')}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => downloadPdf(rewriteResult)}>
                        <Download className="h-4 w-4 mr-1" />PDF
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="prose prose-sm dark:prose-invert max-w-none max-h-[600px] overflow-y-auto bg-muted p-4 rounded-lg">
                      <ReactMarkdown>{rewriteResult}</ReactMarkdown>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
