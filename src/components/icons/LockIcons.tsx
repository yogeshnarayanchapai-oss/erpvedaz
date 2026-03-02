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
      {/* Shackle (closed, centered) */}
      <path d="M8 10V7a4 4 0 1 1 8 0v3" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      {/* Body */}
      <rect x="5" y="10" width="14" height="10" rx="2" />
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
      {/* Shackle (open, swung to the right) */}
      <path d="M8 10V7a4 4 0 0 1 8 0" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      {/* Body */}
      <rect x="5" y="10" width="14" height="10" rx="2" />
    </svg>
  );
}
