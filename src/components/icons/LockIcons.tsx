import { cn } from '@/lib/utils';

interface IconProps {
  className?: string;
}

export function LockFilledIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={cn('w-4 h-4', className)}
    >
      <path d="M17 9V7A5 5 0 0 0 7 7v2a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2zM9 7a3 3 0 0 1 6 0v2H9V7z" />
    </svg>
  );
}

export function UnlockFilledIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={cn('w-4 h-4', className)}
    >
      <path d="M17 9H9V7a3 3 0 0 1 5.12-2.12A3 3 0 0 1 15 7h2a5 5 0 0 0-10 0v2a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2z" />
    </svg>
  );
}
