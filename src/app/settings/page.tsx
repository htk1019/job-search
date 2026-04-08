'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Key, Database, Save, CheckCircle, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { useLocale } from '@/components/layout/locale-context';

interface Settings {
  [key: string]: string;
}

export default function SettingsPage() {
  const { t } = useLocale();
  const [settings, setSettings] = useState<Settings>({});
  const [geminiKey, setGeminiKey] = useState('');
  const [openaiKey, setOpenaiKey] = useState('');
  const [adzunaAppId, setAdzunaAppId] = useState('');
  const [adzunaApiKey, setAdzunaApiKey] = useState('');
  const [provider, setProvider] = useState('auto');
  const [showGemini, setShowGemini] = useState(false);
  const [showOpenai, setShowOpenai] = useState(false);
  const [saving, setSaving] = useState('');

  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then(data => {
      setSettings(data);
      if (data.AI_PROVIDER) setProvider(data.AI_PROVIDER);
    });
  }, []);

  const saveKey = async (key: string, value: string, label: string) => {
    setSaving(key);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value }),
      });
      if (res.ok) {
        toast.success(`${label} 저장 완료`);
        // Refresh settings
        const data = await (await fetch('/api/settings')).json();
        setSettings(data);
        // Clear input after save
        if (key === 'GEMINI_API_KEY') setGeminiKey('');
        if (key === 'OPENAI_API_KEY') setOpenaiKey('');
        if (key === 'ADZUNA_APP_ID') setAdzunaAppId('');
        if (key === 'ADZUNA_API_KEY') setAdzunaApiKey('');
      } else {
        toast.error('저장 실패');
      }
    } catch {
      toast.error('저장 실패');
    } finally {
      setSaving('');
    }
  };

  const deleteKey = async (key: string, label: string) => {
    setSaving(key);
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value: '' }),
      });
      toast.success(`${label} 삭제됨`);
      const data = await (await fetch('/api/settings')).json();
      setSettings(data);
    } catch {
      toast.error('삭제 실패');
    } finally {
      setSaving('');
    }
  };

  const isKeySet = (key: string) => settings[`${key}_set`] === 'true' || settings[`${key}_env`] === 'true';
  const getKeyDisplay = (key: string) => {
    if (settings[key] && settings[`${key}_set`] === 'true') return settings[key];
    if (settings[`${key}_env`] === 'true') return '(환경변수에서 로드됨)';
    return '';
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">{t('settingsTitle')}</h2>
        <p className="text-muted-foreground">{t('settingsDesc')}</p>
      </div>

      <div className="grid gap-6 max-w-2xl">
        {/* AI Provider Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Key className="h-4 w-4" />
              AI Provider
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Provider selector */}
            <div className="space-y-2">
              <Label>사용할 AI 선택</Label>
              <Select value={provider} onValueChange={(v) => {
                if (!v) return;
                setProvider(v);
                saveKey('AI_PROVIDER', v === 'auto' ? '' : v, 'AI Provider');
              }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">자동 (Gemini 우선)</SelectItem>
                  <SelectItem value="gemini">Gemini (gemini-3-flash-preview)</SelectItem>
                  <SelectItem value="openai">OpenAI (gpt-5.4-mini)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Gemini API Key */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Gemini API Key</Label>
                {isKeySet('GEMINI_API_KEY') && (
                  <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 text-xs">
                    <CheckCircle className="h-3 w-3 mr-1" />설정됨
                  </Badge>
                )}
              </div>
              {isKeySet('GEMINI_API_KEY') && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted rounded px-3 py-2">
                  <span className="font-mono">{getKeyDisplay('GEMINI_API_KEY')}</span>
                  <Button variant="ghost" size="sm" className="h-6 text-xs text-destructive" onClick={() => deleteKey('GEMINI_API_KEY', 'Gemini API Key')}>
                    삭제
                  </Button>
                </div>
              )}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    type={showGemini ? 'text' : 'password'}
                    value={geminiKey}
                    onChange={(e) => setGeminiKey(e.target.value)}
                    placeholder="AIza..."
                  />
                  <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" onClick={() => setShowGemini(!showGemini)}>
                    {showGemini ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <Button onClick={() => saveKey('GEMINI_API_KEY', geminiKey, 'Gemini API Key')} disabled={!geminiKey || saving === 'GEMINI_API_KEY'}>
                  <Save className="h-4 w-4 mr-1" />저장
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="text-primary underline">Google AI Studio</a>에서 무료 발급
              </p>
            </div>

            {/* OpenAI API Key */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>OpenAI API Key</Label>
                {isKeySet('OPENAI_API_KEY') && (
                  <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 text-xs">
                    <CheckCircle className="h-3 w-3 mr-1" />설정됨
                  </Badge>
                )}
              </div>
              {isKeySet('OPENAI_API_KEY') && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted rounded px-3 py-2">
                  <span className="font-mono">{getKeyDisplay('OPENAI_API_KEY')}</span>
                  <Button variant="ghost" size="sm" className="h-6 text-xs text-destructive" onClick={() => deleteKey('OPENAI_API_KEY', 'OpenAI API Key')}>
                    삭제
                  </Button>
                </div>
              )}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    type={showOpenai ? 'text' : 'password'}
                    value={openaiKey}
                    onChange={(e) => setOpenaiKey(e.target.value)}
                    placeholder="sk-..."
                  />
                  <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" onClick={() => setShowOpenai(!showOpenai)}>
                    {showOpenai ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <Button onClick={() => saveKey('OPENAI_API_KEY', openaiKey, 'OpenAI API Key')} disabled={!openaiKey || saving === 'OPENAI_API_KEY'}>
                  <Save className="h-4 w-4 mr-1" />저장
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-primary underline">OpenAI Platform</a>에서 발급
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Adzuna Keys */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Key className="h-4 w-4" />
              채용 검색 API (선택사항)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Adzuna App ID</Label>
                {isKeySet('ADZUNA_APP_ID') && (
                  <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 text-xs">설정됨</Badge>
                )}
              </div>
              <div className="flex gap-2">
                <Input value={adzunaAppId} onChange={(e) => setAdzunaAppId(e.target.value)} placeholder="App ID" />
                <Button onClick={() => saveKey('ADZUNA_APP_ID', adzunaAppId, 'Adzuna App ID')} disabled={!adzunaAppId || saving === 'ADZUNA_APP_ID'}>
                  <Save className="h-4 w-4 mr-1" />저장
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Adzuna API Key</Label>
                {isKeySet('ADZUNA_API_KEY') && (
                  <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 text-xs">설정됨</Badge>
                )}
              </div>
              <div className="flex gap-2">
                <Input value={adzunaApiKey} onChange={(e) => setAdzunaApiKey(e.target.value)} placeholder="API Key" />
                <Button onClick={() => saveKey('ADZUNA_API_KEY', adzunaApiKey, 'Adzuna API Key')} disabled={!adzunaApiKey || saving === 'ADZUNA_API_KEY'}>
                  <Save className="h-4 w-4 mr-1" />저장
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                <a href="https://developer.adzuna.com/" target="_blank" rel="noopener noreferrer" className="text-primary underline">developer.adzuna.com</a>에서 무료 발급
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Data Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Database className="h-4 w-4" />
              {t('data')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {t('dataDbInfo')} <code className="bg-muted px-1 rounded">data/job-search.db</code>
            </p>
            <p className="text-sm text-muted-foreground">
              API 키는 로컬 데이터베이스에 저장되며 외부로 전송되지 않습니다.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
