import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Brain, Copy, RefreshCw, Sparkles } from 'lucide-react';
import { useAiLeadEval } from '@/hooks/useAiLeadEval';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface AILeadIntelligenceCardProps {
  leadId: string;
  aiLeadScore?: number | null;
  aiLeadLabel?: string | null;
  aiFollowupText?: string | null;
  aiLastEvaluatedAt?: string | null;
}

export function AILeadIntelligenceCard({
  leadId,
  aiLeadScore,
  aiLeadLabel,
  aiFollowupText,
  aiLastEvaluatedAt,
}: AILeadIntelligenceCardProps) {
  const { mutate: evaluateLead, isPending } = useAiLeadEval();

  const handleEvaluate = () => {
    evaluateLead(leadId);
  };

  const handleCopyFollowup = () => {
    if (aiFollowupText) {
      navigator.clipboard.writeText(aiFollowupText);
      toast.success('Follow-up message copied to clipboard');
    }
  };

  const getScoreColor = (score: number | null | undefined) => {
    if (!score) return 'bg-muted text-muted-foreground';
    if (score >= 70) return 'bg-green-500/10 text-green-700 dark:text-green-400';
    if (score >= 40) return 'bg-amber-500/10 text-amber-700 dark:text-amber-400';
    return 'bg-slate-500/10 text-slate-700 dark:text-slate-400';
  };

  const getLabelColor = (label: string | null | undefined) => {
    if (!label) return 'secondary';
    if (label === 'Hot') return 'default';
    if (label === 'Warm') return 'secondary';
    return 'outline';
  };

  const getLabelIcon = (label: string | null | undefined) => {
    if (label === 'Hot') return '🔥';
    if (label === 'Warm') return '☀️';
    return '❄️';
  };

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg">AI Lead Intelligence</CardTitle>
          </div>
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            Powered by AI
          </span>
        </div>
        <CardDescription>
          AI-powered lead quality assessment and follow-up suggestions
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Evaluation Status */}
        {aiLastEvaluatedAt && (
          <div className="text-xs text-muted-foreground">
            Last evaluated: {format(new Date(aiLastEvaluatedAt), 'PPp')}
          </div>
        )}

        {/* Score and Label */}
        {aiLeadScore !== null && aiLeadScore !== undefined && aiLeadLabel ? (
          <div className="grid grid-cols-2 gap-4">
            <div className={`p-4 rounded-lg ${getScoreColor(aiLeadScore)}`}>
              <div className="text-sm font-medium mb-1">Lead Score</div>
              <div className="text-3xl font-bold">{aiLeadScore}</div>
              <div className="text-xs opacity-75">out of 100</div>
            </div>
            <div className="p-4 rounded-lg bg-muted/50">
              <div className="text-sm font-medium mb-2">Quality</div>
              <Badge variant={getLabelColor(aiLeadLabel)} className="text-base px-3 py-1">
                {getLabelIcon(aiLeadLabel)} {aiLeadLabel}
              </Badge>
            </div>
          </div>
        ) : (
          <Alert>
            <Brain className="h-4 w-4" />
            <AlertDescription>
              No AI evaluation yet. Click "Run AI Evaluation" to analyze this lead.
            </AlertDescription>
          </Alert>
        )}

        {/* Follow-up Message */}
        {aiFollowupText && (
          <div className="space-y-2">
            <div className="text-sm font-medium flex items-center gap-2">
              💬 Suggested Follow-up Message
            </div>
            <div className="p-4 bg-background/50 rounded-lg border border-border">
              <p className="text-sm whitespace-pre-wrap">{aiFollowupText}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyFollowup}
              className="w-full"
            >
              <Copy className="w-4 h-4 mr-2" />
              Copy Message
            </Button>
          </div>
        )}

        {/* Evaluate Button */}
        <Button
          onClick={handleEvaluate}
          disabled={isPending}
          className="w-full"
          variant={aiLeadScore ? 'outline' : 'default'}
        >
          {isPending ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Evaluating...
            </>
          ) : (
            <>
              <Brain className="mr-2 h-4 w-4" />
              {aiLeadScore ? 'Re-run AI Evaluation' : 'Run AI Evaluation'}
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}