'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Trash2, ExternalLink, ArrowUpDown } from 'lucide-react';
import { StatusBadge } from './status-badge';
import { JobForm } from './job-form';
import type { Job } from '@/types';
import { toast } from 'sonner';
import { useLocale } from '@/components/layout/locale-context';

export function JobTable() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const { t } = useLocale();

  const fetchJobs = useCallback(async () => {
    const params = new URLSearchParams();
    if (statusFilter !== 'all') params.set('status', statusFilter);
    const res = await fetch(`/api/jobs?${params}`);
    const data = await res.json();
    setJobs(data);
  }, [statusFilter]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const handleDelete = async (id: number) => {
    if (!confirm(t('deleteConfirm'))) return;
    await fetch(`/api/jobs/${id}`, { method: 'DELETE' });
    toast.success(t('jobDeleted'));
    fetchJobs();
  };

  const handleStatusChange = async (id: number, status: string) => {
    await fetch(`/api/jobs/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    fetchJobs();
  };

  const columns: ColumnDef<Job>[] = [
    {
      accessorKey: 'company',
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting()}>
          {t('company')} <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
    },
    {
      accessorKey: 'position',
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting()}>
          {t('position')} <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
    },
    {
      accessorKey: 'status',
      header: t('status'),
      cell: ({ row }) => (
        <Select
          value={row.original.status}
          onValueChange={(v) => { if (v) handleStatusChange(row.original.id, v); }}
        >
          <SelectTrigger className="w-[140px]">
            <StatusBadge status={row.original.status} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="saved">{t('saved')}</SelectItem>
            <SelectItem value="applied">{t('applied')}</SelectItem>
            <SelectItem value="interviewing">{t('interviewing')}</SelectItem>
            <SelectItem value="offer">{t('offer')}</SelectItem>
            <SelectItem value="rejected">{t('rejected')}</SelectItem>
          </SelectContent>
        </Select>
      ),
    },
    {
      accessorKey: 'location',
      header: t('location'),
      cell: ({ row }) => (
        <span>
          {row.original.location || '-'}
          {row.original.remote && ` (${t('remote')})`}
        </span>
      ),
    },
    {
      accessorKey: 'date_applied',
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting()}>
          {t('dateApplied')} <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => row.original.date_applied || '-',
    },
    {
      accessorKey: 'salary_min',
      header: t('salary'),
      cell: ({ row }) => {
        const { salary_min, salary_max } = row.original;
        if (!salary_min && !salary_max) return '-';
        const fmt = (n: number) => `$${(n / 1000).toFixed(0)}k`;
        if (salary_min && salary_max) return `${fmt(salary_min)} - ${fmt(salary_max)}`;
        return salary_min ? fmt(salary_min) : fmt(salary_max!);
      },
    },
    {
      id: 'actions',
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          {row.original.url && (
            <a href={row.original.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center h-8 w-8 rounded-lg hover:bg-muted">
              <ExternalLink className="h-4 w-4" />
            </a>
          )}
          <JobForm job={row.original} onSuccess={fetchJobs} />
          <Button variant="ghost" size="icon" onClick={() => handleDelete(row.original.id)}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ];

  const table = useReactTable({
    data: jobs,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2">
          <Input
            placeholder={t('searchJobs')}
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="w-64"
          />
          <Select value={statusFilter} onValueChange={(v) => { if (v) setStatusFilter(v); }}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder={t('allStatuses')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('allStatuses')}</SelectItem>
              <SelectItem value="saved">{t('saved')}</SelectItem>
              <SelectItem value="applied">{t('applied')}</SelectItem>
              <SelectItem value="interviewing">{t('interviewing')}</SelectItem>
              <SelectItem value="offer">{t('offer')}</SelectItem>
              <SelectItem value="rejected">{t('rejected')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <JobForm onSuccess={fetchJobs} />
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  {t('noJobsFound')}
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
