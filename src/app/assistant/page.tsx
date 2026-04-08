'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FileText, MessageSquare, Search, TrendingUp, Loader2, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import { useLocale } from '@/components/layout/locale-context';

interface ResumeInfo { id: number; filename: string; }

export default function AssistantPage() {
  const { t } = useLocale();
  const [resumes, setResumes] = useState<ResumeInfo[]>([]);
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Cover Letter state
  const [clResumeId, setClResumeId] = useState('');
  const [clCompany, setClCompany] = useState('');
  const [clPosition, setClPosition] = useState('');
  const [clJobDesc, setClJobDesc] = useState('');

  // Interview Prep state
  const [ipCompany, setIpCompany] = useState('');
  const [ipPosition, setIpPosition] = useState('');
  const [ipJobDesc, setIpJobDesc] = useState('');

  // Job Analysis state
  const [jaJobDesc, setJaJobDesc] = useState('');

  // Skill Gap state
  const [sgResumeId, setSgResumeId] = useState('');
  const [sgJobDesc, setSgJobDesc] = useState('');

  const fetchResumes = useCallback(async () => {
    const res = await fetch('/api/resume/upload');
    setResumes(await res.json());
  }, []);

  useEffect(() => { fetchResumes(); }, [fetchResumes]);

  const callApi = async (endpoint: string, body: Record<string, unknown>) => {
    setLoading(true);
    setOutput('');
    try {
      const res = await fetch(`/api/ai/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.error) {
        toast.error(data.error);
      } else {
        setOutput(data.output);
      }
    } catch {
      toast.error(t('requestFailed'));
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success(t('copied'));
  };

  const ResumeSelector = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <Select value={value} onValueChange={(v) => { if (v) onChange(v); }}>
      <SelectTrigger>
        <SelectValue placeholder={t('selectResumeOptional')} />
      </SelectTrigger>
      <SelectContent>
        {resumes.map((r) => (
          <SelectItem key={r.id} value={r.id.toString()}>{r.filename}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">{t('assistantTitle')}</h2>
        <p className="text-muted-foreground">{t('assistantDesc')}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Input Panel */}
        <Tabs defaultValue="cover-letter">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="cover-letter" className="text-xs">
              <FileText className="h-3 w-3 mr-1" />{t('coverLetter')}
            </TabsTrigger>
            <TabsTrigger value="interview" className="text-xs">
              <MessageSquare className="h-3 w-3 mr-1" />{t('interview')}
            </TabsTrigger>
            <TabsTrigger value="analyze" className="text-xs">
              <Search className="h-3 w-3 mr-1" />{t('analyzeJob')}
            </TabsTrigger>
            <TabsTrigger value="skill-gap" className="text-xs">
              <TrendingUp className="h-3 w-3 mr-1" />{t('skillGap')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="cover-letter" className="space-y-4 mt-4">
            <Card>
              <CardHeader><CardTitle className="text-base">{t('coverLetterGen')}</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-xs">{t('resume')}</Label>
                  <ResumeSelector value={clResumeId} onChange={setClResumeId} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">{t('company')}</Label>
                    <Input value={clCompany} onChange={(e) => setClCompany(e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs">{t('position')}</Label>
                    <Input value={clPosition} onChange={(e) => setClPosition(e.target.value)} />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">{t('jobDescriptionRequired')}</Label>
                  <Textarea value={clJobDesc} onChange={(e) => setClJobDesc(e.target.value)} rows={6} />
                </div>
                <Button
                  className="w-full"
                  disabled={loading || !clJobDesc}
                  onClick={() => callApi('cover-letter', {
                    resume_id: clResumeId ? parseInt(clResumeId) : undefined,
                    company: clCompany, position: clPosition, job_description: clJobDesc,
                  })}
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  {t('generateCoverLetter')}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="interview" className="space-y-4 mt-4">
            <Card>
              <CardHeader><CardTitle className="text-base">{t('interviewPrep')}</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">{t('company')}</Label>
                    <Input value={ipCompany} onChange={(e) => setIpCompany(e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs">{t('position')}</Label>
                    <Input value={ipPosition} onChange={(e) => setIpPosition(e.target.value)} />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">{t('jobDescriptionRequired')}</Label>
                  <Textarea value={ipJobDesc} onChange={(e) => setIpJobDesc(e.target.value)} rows={6} />
                </div>
                <Button
                  className="w-full"
                  disabled={loading || !ipJobDesc}
                  onClick={() => callApi('interview-prep', {
                    company: ipCompany, position: ipPosition, job_description: ipJobDesc,
                  })}
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  {t('generateInterviewPrep')}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analyze" className="space-y-4 mt-4">
            <Card>
              <CardHeader><CardTitle className="text-base">{t('jobDescAnalysis')}</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-xs">{t('jobDescriptionRequired')}</Label>
                  <Textarea value={jaJobDesc} onChange={(e) => setJaJobDesc(e.target.value)} rows={8} />
                </div>
                <Button
                  className="w-full"
                  disabled={loading || !jaJobDesc}
                  onClick={() => callApi('analyze-job', { job_description: jaJobDesc })}
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  {t('analyzeJobBtn')}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="skill-gap" className="space-y-4 mt-4">
            <Card>
              <CardHeader><CardTitle className="text-base">{t('skillGapAnalysis')}</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-xs">{t('resume')} *</Label>
                  <ResumeSelector value={sgResumeId} onChange={setSgResumeId} />
                </div>
                <div>
                  <Label className="text-xs">{t('jobDescriptionRequired')}</Label>
                  <Textarea value={sgJobDesc} onChange={(e) => setSgJobDesc(e.target.value)} rows={6} />
                </div>
                <Button
                  className="w-full"
                  disabled={loading || !sgResumeId || !sgJobDesc}
                  onClick={() => callApi('skill-gap', {
                    resume_id: parseInt(sgResumeId), job_description: sgJobDesc,
                  })}
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  {t('analyzeSkillGap')}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Output Panel */}
        <Card className="h-fit">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">{t('aiOutput')}</CardTitle>
            {output && (
              <Button variant="ghost" size="sm" onClick={copyToClipboard}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? t('copied') : t('copy')}
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : output ? (
              <div className="whitespace-pre-wrap text-sm bg-muted p-4 rounded-lg max-h-[600px] overflow-y-auto">
                {output}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm text-center py-12">
                {t('aiOutputPlaceholder')}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
