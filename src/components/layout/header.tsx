'use client';

import { useTheme } from 'next-themes';
import { Moon, Sun, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';
import { useLocale } from './locale-context';

export function Header() {
  const { theme, setTheme } = useTheme();
  const { locale, setLocale, t } = useLocale();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  return (
    <header className="flex h-14 items-center justify-end gap-2 border-b px-6">
      {mounted && (
        <>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocale(locale === 'en' ? 'ko' : 'en')}
            className="gap-1.5"
          >
            <Globe className="h-4 w-4" />
            {locale === 'en' ? t('korean') : t('english')}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            {theme === 'dark' ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
          </Button>
        </>
      )}
    </header>
  );
}
