import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Brain, RefreshCw, AlertTriangle, Sparkles } from 'lucide-react';
import { useAiOrderEval } from '@/hooks/useAiOrderEval';
import { format } from 'date-fns';

interface AIOrderRiskCardProps {
  orderId: string;
  aiRtoRiskScore?: number | null;
  aiRtoRiskLabel?: string | null;
  aiNotes?: string | null;
  aiLastEvaluatedAt?: string | null;
}

export function AIOrderRiskCard({
  orderId,
  aiRtoRiskScore,
  aiRtoRiskLabel,
  aiNotes,
  aiLastEvaluatedAt,
}: AIOrderRiskCardProps) {
  const { mutate: evaluateOrder, isPending } = useAiOrderEval();

  const handleEvaluate = () => {
    evaluateOrder(orderId);
  };

  const getRiskColor = (score: number | null | undefined) => {
    if (!score) return 'bg-muted text-muted-foreground';
    if (score >= 70) return 'bg-red-500/10 text-red-700 dark:text-red-400';
    if (score >= 40) return 'bg-amber-500/10 text-amber-700 dark:text-amber-400';
    return 'bg-green-500/10 text-green-700 dark:text-green-400';
  };

  const getLabelColor = (label: string | null | undefined) => {
    if (!label) return 'secondary';
    if (label === 'High') return 'destructive';
    if (label === 'Medium') return 'secondary';
    return 'outline';
  };

  const getLabelIcon = (label: string | null | undefined) => {
    if (label === 'High') return '🚨';
    if (label === 'Medium') return '⚠️';
    return '✅';
  };

  return (
    <Card className="border-orange-500/20 bg-gradient-to-br from-orange-500/5 to-transparent">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            <CardTitle className="text-lg">RTO Risk Analysis (AI)</CardTitle>
          </div>
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            Powered by AI
          </span>
        </div>
        <CardDescription>
          AI-powered return-to-origin risk prediction and verification checklist
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Evaluation Status */}
        {aiLastEvaluatedAt && (
          <div className="text-xs text-muted-foreground">
            Last analyzed: {format(new Date(aiLastEvaluatedAt), 'PPp')}
          </div>
        )}

        {/* Risk Score and Label */}
        {aiRtoRiskScore !== null && aiRtoRiskScore !== undefined && aiRtoRiskLabel ? (
          <div className="grid grid-cols-2 gap-4">
            <div className={`p-4 rounded-lg ${getRiskColor(aiRtoRiskScore)}`}>
              <div className="text-sm font-medium mb-1">Risk Score</div>
              <div className="text-3xl font-bold">{aiRtoRiskScore}</div>
              <div className="text-xs opacity-75">out of 100</div>
            </div>
            <div className="p-4 rounded-lg bg-muted/50">
              <div className="text-sm font-medium mb-2">Risk Level</div>
              <Badge variant={getLabelColor(aiRtoRiskLabel)} className="text-base px-3 py-1">
                {getLabelIcon(aiRtoRiskLabel)} {aiRtoRiskLabel}
              </Badge>
            </div>
          </div>
        ) : (
          <Alert>
            <Brain className="h-4 w-4" />
            <AlertDescription>
              No RTO risk analysis yet. Click "Run AI Check" to analyze this order.
            </AlertDescription>
          </Alert>
        )}

        {/* Staff Notes */}
        {aiNotes && (
          <div className="space-y-2">
            <div className="text-sm font-medium flex items-center gap-2">
              📋 Verification Checklist
            </div>
            <div className="p-4 bg-background/50 rounded-lg border border-border">
              <p className="text-sm whitespace-pre-wrap">{aiNotes}</p>
            </div>
          </div>
        )}

        {/* Evaluate Button */}
        <Button
          onClick={handleEvaluate}
          disabled={isPending}
          className="w-full"
          variant={aiRtoRiskScore ? 'outline' : 'default'}
        >
          {isPending ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <Brain className="mr-2 h-4 w-4" />
              {aiRtoRiskScore ? 'Re-run AI Check' : 'Run AI Check'}
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}