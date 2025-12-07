import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { 
  ArrowLeft, Award, CheckCircle, XCircle, HelpCircle, 
  ChevronLeft, ChevronRight, Send, Trophy 
} from 'lucide-react';
import { 
  useTrainingCourse, 
  useCourseQuiz,
  useQuizQuestions,
  useMyQuizAttempts,
  useSubmitQuizAttempt,
} from '@/hooks/useTraining';

export default function CourseQuiz() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  
  const { data: course } = useTrainingCourse(slug || '');
  const { data: quiz } = useCourseQuiz(course?.id || '');
  const { data: questions } = useQuizQuestions(quiz?.id || '');
  const { data: attempts } = useMyQuizAttempts(quiz?.id || '');
  
  const submitQuiz = useSubmitQuizAttempt();

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [showResults, setShowResults] = useState(false);
  const [quizResult, setQuizResult] = useState<{ passed: boolean; score: number; total: number } | null>(null);

  const currentQuestion = questions?.[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === (questions?.length || 0) - 1;
  const answeredCount = Object.keys(answers).length;
  const progressPercent = questions?.length ? (answeredCount / questions.length) * 100 : 0;

  const handleAnswerSelect = (questionId: string, optionIndex: number) => {
    setAnswers(prev => ({ ...prev, [questionId]: optionIndex }));
  };

  const handleSubmit = async () => {
    if (!quiz || !course) return;
    
    const result = await submitQuiz.mutateAsync({
      quizId: quiz.id,
      answers,
      courseId: course.id,
    });
    
    setQuizResult({ passed: result.passed, score: result.score, total: result.total });
    setShowResults(true);
  };

  const lastAttempt = attempts?.[0];
  const hasPassed = lastAttempt?.passed || quizResult?.passed;

  if (!course || !quiz) {
    return <div className="text-center py-8 text-muted-foreground">Loading quiz...</div>;
  }

  if (showResults && quizResult) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
        <Card>
          <CardContent className="pt-6 text-center">
            {quizResult.passed ? (
              <>
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-500/20 mb-4">
                  <Trophy className="h-10 w-10 text-green-500" />
                </div>
                <h2 className="text-2xl font-bold text-green-500 mb-2">Congratulations!</h2>
                <p className="text-muted-foreground mb-4">You passed the quiz!</p>
              </>
            ) : (
              <>
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-destructive/20 mb-4">
                  <XCircle className="h-10 w-10 text-destructive" />
                </div>
                <h2 className="text-2xl font-bold text-destructive mb-2">Not Quite</h2>
                <p className="text-muted-foreground mb-4">You didn't pass this time. Try again!</p>
              </>
            )}

            <div className="flex items-center justify-center gap-8 py-6 border-y">
              <div>
                <div className="text-3xl font-bold">{quizResult.score}</div>
                <div className="text-sm text-muted-foreground">Your Score</div>
              </div>
              <div className="text-2xl text-muted-foreground">/</div>
              <div>
                <div className="text-3xl font-bold">{quizResult.total}</div>
                <div className="text-sm text-muted-foreground">Total Marks</div>
              </div>
            </div>

            <div className="flex items-center justify-center gap-4 mt-6">
              {quizResult.passed ? (
                <>
                  <Button variant="outline" onClick={() => navigate('/training/my-courses')}>
                    Back to Courses
                  </Button>
                  <Button onClick={() => navigate('/training/certificates')}>
                    <Award className="mr-2 h-4 w-4" />
                    View Certificate
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="outline" onClick={() => navigate(`/training/courses/${slug}`)}>
                    Review Lessons
                  </Button>
                  <Button onClick={() => {
                    setShowResults(false);
                    setAnswers({});
                    setCurrentQuestionIndex(0);
                    setQuizResult(null);
                  }}>
                    Try Again
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (hasPassed && !showResults) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-500/20 mb-4">
              <CheckCircle className="h-10 w-10 text-green-500" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Quiz Already Passed!</h2>
            <p className="text-muted-foreground mb-4">
              You've already completed this quiz with a passing score.
            </p>
            
            {lastAttempt && (
              <div className="flex items-center justify-center gap-8 py-6 border-y">
                <div>
                  <div className="text-3xl font-bold text-green-500">{lastAttempt.score}</div>
                  <div className="text-sm text-muted-foreground">Your Score</div>
                </div>
                <div className="text-2xl text-muted-foreground">/</div>
                <div>
                  <div className="text-3xl font-bold">{quiz.total_marks}</div>
                  <div className="text-sm text-muted-foreground">Total Marks</div>
                </div>
              </div>
            )}

            <div className="flex items-center justify-center gap-4 mt-6">
              <Button variant="outline" onClick={() => navigate('/training/my-courses')}>
                Back to Courses
              </Button>
              <Button onClick={() => navigate('/training/certificates')}>
                <Award className="mr-2 h-4 w-4" />
                View Certificate
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/training/courses/${slug}`)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-foreground">{quiz.title}</h1>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Pass Mark: {quiz.pass_marks}/{quiz.total_marks}</span>
          </div>
        </div>
      </div>

      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between text-sm mb-2">
            <span>Question {currentQuestionIndex + 1} of {questions?.length}</span>
            <span>{answeredCount} answered</span>
          </div>
          <Progress value={progressPercent} />
        </CardContent>
      </Card>

      {currentQuestion && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-primary" />
              <Badge variant="outline">{currentQuestion.type}</Badge>
            </div>
            <CardTitle className="text-lg mt-2">{currentQuestion.question_text}</CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={answers[currentQuestion.id]?.toString() ?? ''}
              onValueChange={value => handleAnswerSelect(currentQuestion.id, parseInt(value))}
            >
              {(currentQuestion.options as string[]).map((option, index) => (
                <div
                  key={index}
                  className={`flex items-center space-x-3 p-4 rounded-lg border transition-colors ${
                    answers[currentQuestion.id] === index
                      ? 'border-primary bg-primary/5'
                      : 'hover:bg-muted/50'
                  }`}
                >
                  <RadioGroupItem value={index.toString()} id={`option-${index}`} />
                  <Label htmlFor={`option-${index}`} className="flex-1 cursor-pointer">
                    {option}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
          disabled={currentQuestionIndex === 0}
        >
          <ChevronLeft className="mr-2 h-4 w-4" />
          Previous
        </Button>

        {isLastQuestion ? (
          <Button
            onClick={handleSubmit}
            disabled={answeredCount < (questions?.length || 0) || submitQuiz.isPending}
          >
            <Send className="mr-2 h-4 w-4" />
            Submit Quiz
          </Button>
        ) : (
          <Button
            onClick={() => setCurrentQuestionIndex(currentQuestionIndex + 1)}
          >
            Next
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="py-4">
          <div className="flex flex-wrap gap-2">
            {questions?.map((q, index) => (
              <button
                key={q.id}
                onClick={() => setCurrentQuestionIndex(index)}
                className={`w-10 h-10 rounded-lg font-medium transition-colors ${
                  index === currentQuestionIndex
                    ? 'bg-primary text-primary-foreground'
                    : answers[q.id] !== undefined
                    ? 'bg-green-500/20 text-green-500'
                    : 'bg-muted hover:bg-muted/80'
                }`}
              >
                {index + 1}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
