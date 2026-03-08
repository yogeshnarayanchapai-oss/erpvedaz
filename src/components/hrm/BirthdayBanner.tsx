import { Cake } from 'lucide-react';

interface BirthdayBannerProps {
  /** For staff: their own name. For admin: list of staff names with birthdays today */
  names: string[];
  /** true = the logged-in user's own birthday */
  isSelf?: boolean;
}

export function BirthdayBanner({ names, isSelf }: BirthdayBannerProps) {
  if (!names.length) return null;

  if (isSelf) {
    return (
      <div className="rounded-xl bg-gradient-to-r from-amber-400 via-orange-400 to-pink-500 p-4 text-white shadow-lg animate-fade-in">
        <div className="flex items-center gap-3">
          <Cake className="w-8 h-8 shrink-0" />
          <div>
            <p className="text-lg font-bold">🎉 Happy Birthday, {names[0]}! 🎂</p>
            <p className="text-sm text-white/90">Wishing you a wonderful day filled with joy and happiness!</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500 p-3 text-white shadow-lg animate-fade-in">
      <div className="flex items-center gap-3">
        <Cake className="w-6 h-6 shrink-0" />
        <p className="text-sm font-medium">
          🎂 Today is <strong>{names.join(', ')}</strong>'s birthday! Wish them a happy birthday! 🎉
        </p>
      </div>
    </div>
  );
}
