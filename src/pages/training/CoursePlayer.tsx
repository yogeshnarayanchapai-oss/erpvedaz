import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  ArrowLeft, CheckCircle, Circle, Play, Video, FileText, 
  BookOpen, Clock, Award, ChevronRight 
} from 'lucide-react';
import { 
  useTrainingCourse, 
  useCourseLessons, 
  useEnrollment,
  useLessonCompletions,
  useMarkLessonComplete,
  useUpdateEnrollment,
  useCourseQuiz,
  useEnrollUsers,
} from '@/hooks/useTraining';
import { useAuth } from '@/contexts/AuthContext';

export default function CoursePlayer() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const { data: course, isLoading: courseLoading } = useTrainingCourse(slug || '');
  const { data: lessons } = useCourseLessons(course?.id || '');
  const { data: enrollment } = useEnrollment(course?.id || '');
  const { data: completions } = useLessonCompletions(course?.id || '');
  const { data: quiz } = useCourseQuiz(course?.id || '');
  
  const markComplete = useMarkLessonComplete();
  const updateEnrollment = useUpdateEnrollment();
  const enrollUsers = useEnrollUsers();

  const [currentLessonIndex, setCurrentLessonIndex] = useState(0);

  const completedLessonIds = new Set(completions?.map(c => c.lesson_id));
  const currentLesson = lessons?.[currentLessonIndex];
  const isCurrentLessonCompleted = currentLesson ? completedLessonIds.has(currentLesson.id) : false;
  const allLessonsCompleted = lessons?.length ? lessons.every(l => completedLessonIds.has(l.id)) : false;

  const progressPercent = lessons?.length
    ? Math.round((completedLessonIds.size / lessons.length) * 100)
    : 0;

  useEffect(() => {
    if (course && user && !enrollment && !enrollUsers.isPending) {
      enrollUsers.mutate({ courseId: course.id, userIds: [user.id] });
    }
  }, [course, user, enrollment]);

  useEffect(() => {
    if (enrollment && progressPercent !== enrollment.progress_percent) {
      const newStatus = progressPercent === 0 
        ? 'NOT_STARTED' 
        : progressPercent === 100 && !quiz
        ? 'COMPLETED'
        : 'IN_PROGRESS';
      
      updateEnrollment.mutate({
        id: enrollment.id,
        progress_percent: progressPercent,
        status: newStatus,
        started_at: enrollment.started_at || new Date().toISOString(),
        completed_at: newStatus === 'COMPLETED' ? new Date().toISOString() : null,
      });
    }
  }, [progressPercent, enrollment]);

  const handleMarkComplete = async () => {
    if (!currentLesson || !course) return;
    await markComplete.mutateAsync({ lessonId: currentLesson.id, courseId: course.id });
    
    if (currentLessonIndex < (lessons?.length || 0) - 1) {
      setCurrentLessonIndex(currentLessonIndex + 1);
    }
  };

  if (courseLoading) {
    return <div className="text-center py-8 text-muted-foreground">Loading course...</div>;
  }

  if (!course) {
    return <div className="text-center py-8 text-muted-foreground">Course not found</div>;
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/training/my-courses')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-foreground">{course.title}</h1>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Badge variant="outline">{course.category}</Badge>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" /> {course.estimated_minutes} min
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">{progressPercent}% complete</span>
          <Progress value={progressPercent} className="w-24" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Lessons</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[calc(100vh-300px)]">
              <div className="p-2 space-y-1">
                {lessons?.map((lesson, index) => {
                  const isCompleted = completedLessonIds.has(lesson.id);
                  const isCurrent = index === currentLessonIndex;
                  
                  return (
                    <button
                      key={lesson.id}
                      onClick={() => setCurrentLessonIndex(index)}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${
                        isCurrent
                          ? 'bg-primary/10 text-primary'
                          : 'hover:bg-muted'
                      }`}
                    >
                      {isCompleted ? (
                        <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                      ) : (
                        <Circle className={`h-5 w-5 flex-shrink-0 ${isCurrent ? 'text-primary' : 'text-muted-foreground'}`} />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className={`text-sm font-medium truncate ${isCompleted ? 'text-muted-foreground' : ''}`}>
                          {lesson.title}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          {lesson.video_url && <Video className="h-3 w-3" />}
                          {lesson.content_markdown && <FileText className="h-3 w-3" />}
                        </div>
                      </div>
                      {isCurrent && <ChevronRight className="h-4 w-4 flex-shrink-0" />}
                    </button>
                  );
                })}

                {quiz && (
                  <button
                    onClick={() => navigate(`/training/courses/${slug}/quiz`)}
                    disabled={!allLessonsCompleted}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${
                      allLessonsCompleted
                        ? 'hover:bg-muted'
                        : 'opacity-50 cursor-not-allowed'
                    }`}
                  >
                    <Award className={`h-5 w-5 flex-shrink-0 ${allLessonsCompleted ? 'text-yellow-500' : 'text-muted-foreground'}`} />
                    <div className="flex-1">
                      <div className="text-sm font-medium">Take Quiz</div>
                      <div className="text-xs text-muted-foreground">
                        {allLessonsCompleted ? 'Ready to attempt' : 'Complete all lessons first'}
                      </div>
                    </div>
                  </button>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardContent className="pt-6">
            {currentLesson ? (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold">{currentLesson.title}</h2>
                  {isCurrentLessonCompleted && (
                    <Badge className="bg-green-500">
                      <CheckCircle className="h-3 w-3 mr-1" /> Completed
                    </Badge>
                  )}
                </div>

                {currentLesson.video_url && (
                  <div className="aspect-video bg-black rounded-lg overflow-hidden">
                    {currentLesson.video_url.includes('youtube') ? (
                      <iframe
                        className="w-full h-full"
                        src={currentLesson.video_url.replace('watch?v=', 'embed/')}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    ) : (
                      <video
                        className="w-full h-full"
                        controls
                        src={currentLesson.video_url}
                      />
                    )}
                  </div>
                )}

                {currentLesson.content_markdown && (
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <div className="whitespace-pre-wrap bg-muted/50 p-6 rounded-lg">
                      {currentLesson.content_markdown}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentLessonIndex(Math.max(0, currentLessonIndex - 1))}
                    disabled={currentLessonIndex === 0}
                  >
                    Previous
                  </Button>

                  <div className="flex items-center gap-2">
                    {!isCurrentLessonCompleted && (
                      <Button onClick={handleMarkComplete} disabled={markComplete.isPending}>
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Mark as Completed
                      </Button>
                    )}
                    
                    {currentLessonIndex < (lessons?.length || 0) - 1 ? (
                      <Button
                        onClick={() => setCurrentLessonIndex(currentLessonIndex + 1)}
                      >
                        Next Lesson
                      </Button>
                    ) : quiz && allLessonsCompleted ? (
                      <Button onClick={() => navigate(`/training/courses/${slug}/quiz`)}>
                        <Award className="mr-2 h-4 w-4" />
                        Take Quiz
                      </Button>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <BookOpen className="h-12 w-12 mx-auto mb-4" />
                <p>No lessons available for this course yet.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
