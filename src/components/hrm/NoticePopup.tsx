import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Bell, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useActiveNoticesForUser, useDismissNotice } from '@/hooks/useActiveNotices';
import { FormattedDate } from '@/components/FormattedDate';

export function NoticePopup() {
  const { data: notices = [], isLoading } = useActiveNoticesForUser();
  const dismissNotice = useDismissNotice();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (notices.length > 0 && !isLoading) {
      setIsOpen(true);
      setCurrentIndex(0);
    }
  }, [notices.length, isLoading]);

  if (isLoading || notices.length === 0) return null;

  const currentNotice = notices[currentIndex];
  if (!currentNotice) return null;

  const handleDismiss = async () => {
    await dismissNotice.mutateAsync(currentNotice.id);
    if (notices.length === 1) {
      setIsOpen(false);
    } else if (currentIndex >= notices.length - 1) {
      setCurrentIndex(0);
    }
  };

  const handleDismissAll = async () => {
    for (const notice of notices) {
      await dismissNotice.mutateAsync(notice.id);
    }
    setIsOpen(false);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : notices.length - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev < notices.length - 1 ? prev + 1 : 0));
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              <DialogTitle>{currentNotice.title}</DialogTitle>
            </div>
            {notices.length > 1 && (
              <span className="text-sm text-muted-foreground">
                {currentIndex + 1} / {notices.length}
              </span>
            )}
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            <FormattedDate date={currentNotice.start_date} />
            {currentNotice.end_date && (
              <> - <FormattedDate date={currentNotice.end_date} /></>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {currentNotice.message && (
            <p className="text-sm text-foreground whitespace-pre-wrap">
              {currentNotice.message}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between pt-4 border-t">
          <div className="flex gap-2">
            {notices.length > 1 && (
              <>
                <Button variant="outline" size="icon" onClick={handlePrev}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={handleNext}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
          <div className="flex gap-2">
            {notices.length > 1 && (
              <Button variant="ghost" size="sm" onClick={handleDismissAll}>
                Dismiss All
              </Button>
            )}
            <Button size="sm" onClick={handleDismiss} disabled={dismissNotice.isPending}>
              <X className="h-4 w-4 mr-1" />
              Dismiss
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
