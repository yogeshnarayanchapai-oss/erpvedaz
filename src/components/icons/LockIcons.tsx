import { cn } from '@/lib/utils';

interface IconProps {
  className?: string;
}

/**
 * Filled lock icon — closed shackle centered above solid body.
 */
export function LockFilledIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 20 22"
      fill="currentColor"
      className={cn('w-4 h-4', className)}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Shackle - closed, centered */}
      <path
        d="M6 9V6.5a4 4 0 1 1 8 0V9"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.8"
        strokeLinecap="round"
      />
      {/* Body */}
      <rect x="3" y="9" width="14" height="11" rx="2.5" fill="currentColor" />
    </svg>
  );
}

/**
 * Filled unlock icon — shackle swung open to the right, solid body.
 * Matches reference: shackle anchored on left, swings UP and to the RIGHT.
 */
export function UnlockFilledIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 22 22"
      fill="currentColor"
      className={cn('w-4 h-4', className)}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Shackle - open, anchored at left side of body, swinging up-right */}
      <path
        d="M6 9V6.5a4 4 0 0 1 8 0"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.8"
        strokeLinecap="round"
      />
      {/* Body - slightly shifted left to show shackle extending right */}
      <rect x="3" y="9" width="14" height="11" rx="2.5" fill="currentColor" />
    </svg>
  );
}
