'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Pencil } from 'lucide-react';
import type { Job } from '@/types';
import { useLocale } from '@/components/layout/locale-context';

interface JobFormProps {
  job?: Job;
  onSuccess: () => void;
}

const defaultForm = {
  company: '',
  position: '',
  url: '',
  status: 'saved',
  notes: '',
  date_applied: '',
  follow_up: '',
  salary_min: '',
  salary_max: '',
  location: '',
  remote: false,
};

export function JobForm({ job, onSuccess }: JobFormProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { t } = useLocale();
  const [form, setForm] = useState(
    job
      ? {
          company: job.company,
          position: job.position,
          url: job.url || '',
          status: job.status,
          notes: job.notes || '',
          date_applied: job.date_applied || '',
          follow_up: job.follow_up || '',
          salary_min: job.salary_min?.toString() || '',
          salary_max: job.salary_max?.toString() || '',
          location: job.location || '',
          remote: job.remote,
        }
      : defaultForm
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const payload = {
      ...form,
      salary_min: form.salary_min ? parseInt(form.salary_min) : null,
      salary_max: form.salary_max ? parseInt(form.salary_max) : null,
      url: form.url || null,
      notes: form.notes || null,
      date_applied: form.date_applied || null,
      follow_up: form.follow_up || null,
      location: form.location || null,
    };

    const url = job ? `/api/jobs/${job.id}` : '/api/jobs';
    const method = job ? 'PUT' : 'POST';

    await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    setLoading(false);
    setOpen(false);
    if (!job) setForm(defaultForm);
    onSuccess();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {job ? (
        <DialogTrigger render={<Button variant="ghost" size="icon" />}>
          <Pencil className="h-4 w-4" />
        </DialogTrigger>
      ) : (
        <DialogTrigger render={<Button />}>
          <Plus className="h-4 w-4 mr-2" />
          {t('addJob')}
        </DialogTrigger>
      )}
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{job ? t('editJob') : t('addNewJob')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="company">{t('company')} *</Label>
              <Input
                id="company"
                value={form.company}
                onChange={(e) => setForm({ ...form, company: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="position">{t('position')} *</Label>
              <Input
                id="position"
                value={form.position}
                onChange={(e) => setForm({ ...form, position: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="url">{t('jobUrl')}</Label>
            <Input
              id="url"
              type="url"
              value={form.url}
              onChange={(e) => setForm({ ...form, url: e.target.value })}
              placeholder="https://..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('status')}</Label>
              <Select value={form.status} onValueChange={(v) => { if (v) setForm({ ...form, status: v }); }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="saved">{t('saved')}</SelectItem>
                  <SelectItem value="applied">{t('applied')}</SelectItem>
                  <SelectItem value="interviewing">{t('interviewing')}</SelectItem>
                  <SelectItem value="offer">{t('offer')}</SelectItem>
                  <SelectItem value="rejected">{t('rejected')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">{t('location')}</Label>
              <Input
                id="location"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date_applied">{t('dateApplied')}</Label>
              <Input
                id="date_applied"
                type="date"
                value={form.date_applied}
                onChange={(e) => setForm({ ...form, date_applied: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="follow_up">{t('followUpDate')}</Label>
              <Input
                id="follow_up"
                type="date"
                value={form.follow_up}
                onChange={(e) => setForm({ ...form, follow_up: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="salary_min">{t('salaryMin')}</Label>
              <Input
                id="salary_min"
                type="number"
                value={form.salary_min}
                onChange={(e) => setForm({ ...form, salary_min: e.target.value })}
                placeholder="50000"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="salary_max">{t('salaryMax')}</Label>
              <Input
                id="salary_max"
                type="number"
                value={form.salary_max}
                onChange={(e) => setForm({ ...form, salary_max: e.target.value })}
                placeholder="80000"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="remote"
              checked={form.remote}
              onChange={(e) => setForm({ ...form, remote: e.target.checked })}
              className="h-4 w-4"
            />
            <Label htmlFor="remote">{t('remote')}</Label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">{t('notes')}</Label>
            <Textarea
              id="notes"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {t('cancel')}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? t('saving') : job ? t('update') : t('addJob')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
