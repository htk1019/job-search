import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const statusStyles: Record<string, string> = {
  saved: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  applied: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  interviewing: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
  offer: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  rejected: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <Badge variant="secondary" className={cn('capitalize', statusStyles[status])}>
      {status}
    </Badge>
  );
}
