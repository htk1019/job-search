'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Key, Database, Info } from 'lucide-react';
import { useLocale } from '@/components/layout/locale-context';

export default function SettingsPage() {
  const { t } = useLocale();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">{t('settingsTitle')}</h2>
        <p className="text-muted-foreground">{t('settingsDesc')}</p>
      </div>

      <div className="grid gap-6 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Key className="h-4 w-4" />
              {t('apiConfig')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">{t('geminiApiKey')}</p>
                <p className="text-xs text-muted-foreground">{t('geminiApiDesc')}</p>
              </div>
              <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                {t('configured')}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">{t('adzunaApi')}</p>
                <p className="text-xs text-muted-foreground">{t('adzunaApiDesc')}</p>
              </div>
              <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300">
                {t('optional')}
              </Badge>
            </div>
            <div className="bg-muted rounded-lg p-3 text-sm">
              <p className="font-medium mb-1 flex items-center gap-1">
                <Info className="h-3 w-3" /> {t('howToConfigure')}
              </p>
              <p className="text-muted-foreground">
                {t('configInstructions')} <code className="bg-background px-1 rounded">.env.local</code> {t('configFile')}
              </p>
              <pre className="mt-2 bg-background p-2 rounded text-xs overflow-x-auto">
{`GEMINI_API_KEY=your-key-here
ADZUNA_APP_ID=your-app-id
ADZUNA_API_KEY=your-api-key`}
              </pre>
              <p className="text-muted-foreground mt-2">
                {t('getFreeKey')}{' '}
                <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="text-primary underline">
                  Google AI Studio
                </a>
              </p>
            </div>
          </CardContent>
        </Card>

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
              {t('dataUploadsInfo')} <code className="bg-muted px-1 rounded">public/uploads/</code>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
