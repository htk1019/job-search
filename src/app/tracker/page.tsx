'use client';

import { JobTable } from '@/components/tracker/job-table';
import { useLocale } from '@/components/layout/locale-context';

export default function TrackerPage() {
  const { t } = useLocale();
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">{t('trackerTitle')}</h2>
        <p className="text-muted-foreground">{t('trackerDesc')}</p>
      </div>
      <JobTable />
    </div>
  );
}
