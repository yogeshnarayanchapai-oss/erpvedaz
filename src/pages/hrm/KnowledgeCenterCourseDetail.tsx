import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { 
  ArrowLeft, Plus, Edit, Trash2, BookOpen, Clock, Users, 
  CheckCircle, GripVertical, Video, FileText, HelpCircle 
} from 'lucide-react';
import { 
  useTrainingCourse, 
  useCourseLessons, 
  useCreateLesson, 
  useUpdateLesson, 
  useDeleteLesson,
  useCourseQuiz,
  useQuizQuestions,
  useCreateQuiz,
  useUpdateQuiz,
  useCreateQuestion,
  useDeleteQuestion,
  useCourseEnrollments,
  useEnrollUsers,
  useCourseStats,
  QuestionType,
} from '@/hooks/useTraining';
import { useStaff, ALL_ROLES } from '@/hooks/useStaff';
import { format } from 'date-fns';

export default function KnowledgeCenterCourseDetail() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  
  const { data: course, isLoading: courseLoading } = useTrainingCourse(slug || '');
  const { data: lessons, isLoading: lessonsLoading } = useCourseLessons(course?.id || '');
  const { data: quiz } = useCourseQuiz(course?.id || '');
  const { data: questions } = useQuizQuestions(quiz?.id || '');
  const { data: enrollments } = useCourseEnrollments(course?.id || '');
  const { data: stats } = useCourseStats(course?.id || '');
  const { data: allStaff } = useStaff();

  const createLesson = useCreateLesson();
  const updateLesson = useUpdateLesson();
  const deleteLesson = useDeleteLesson();
  const createQuiz = useCreateQuiz();
  const updateQuiz = useUpdateQuiz();
  const createQuestion = useCreateQuestion();
  const deleteQuestion = useDeleteQuestion();
  const enrollUsers = useEnrollUsers();

  const [lessonDialogOpen, setLessonDialogOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState<any>(null);
  const [lessonForm, setLessonForm] = useState({
    title: '',
    content_markdown: '',
    video_url: '',
    order_index: 0,
  });

  const [quizDialogOpen, setQuizDialogOpen] = useState(false);
  const [quizForm, setQuizForm] = useState({
    title: '',
    total_marks: 100,
    pass_marks: 60,
  });

  const [questionDialogOpen, setQuestionDialogOpen] = useState(false);
  const [questionForm, setQuestionForm] = useState({
    question_text: '',
    type: 'MCQ' as QuestionType,
    options: ['', '', '', ''],
    correct_option_index: 0,
  });

  const [enrollDialogOpen, setEnrollDialogOpen] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [enrollByRole, setEnrollByRole] = useState<string>('');

  if (courseLoading) {
    return <div className="text-center py-8 text-muted-foreground">Loading course...</div>;
  }

  if (!course) {
    return <div className="text-center py-8 text-muted-foreground">Course not found</div>;
  }

  const handleOpenLessonDialog = (lesson?: any) => {
    if (lesson) {
      setEditingLesson(lesson);
      setLessonForm({
        title: lesson.title,
        content_markdown: lesson.content_markdown || '',
        video_url: lesson.video_url || '',
        order_index: lesson.order_index,
      });
    } else {
      setEditingLesson(null);
      setLessonForm({
        title: '',
        content_markdown: '',
        video_url: '',
        order_index: (lessons?.length || 0) + 1,
      });
    }
    setLessonDialogOpen(true);
  };

  const handleSubmitLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingLesson) {
      await updateLesson.mutateAsync({ id: editingLesson.id, ...lessonForm });
    } else {
      await createLesson.mutateAsync({ ...lessonForm, course_id: course.id, attachment_url: null });
    }
    setLessonDialogOpen(false);
  };

  const handleDeleteLesson = async (id: string) => {
    if (confirm('Delete this lesson?')) {
      await deleteLesson.mutateAsync({ id, courseId: course.id });
    }
  };

  const handleSubmitQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    if (quiz) {
      await updateQuiz.mutateAsync({ id: quiz.id, ...quizForm });
    } else {
      await createQuiz.mutateAsync({ ...quizForm, course_id: course.id });
    }
    setQuizDialogOpen(false);
  };

  const handleSubmitQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quiz) return;
    await createQuestion.mutateAsync({
      quiz_id: quiz.id,
      question_text: questionForm.question_text,
      type: questionForm.type,
      options: questionForm.options.filter(o => o.trim()),
      correct_option_index: questionForm.correct_option_index,
    });
    setQuestionDialogOpen(false);
    setQuestionForm({
      question_text: '',
      type: 'MCQ',
      options: ['', '', '', ''],
      correct_option_index: 0,
    });
  };

  const handleEnrollUsers = async () => {
    let userIds = [...selectedUsers];
    if (enrollByRole && allStaff) {
      const roleUsers = allStaff.filter(s => s.role === enrollByRole).map(s => s.id);
      userIds = [...new Set([...userIds, ...roleUsers])];
    }
    if (userIds.length) {
      await enrollUsers.mutateAsync({ courseId: course.id, userIds });
      setEnrollDialogOpen(false);
      setSelectedUsers([]);
      setEnrollByRole('');
    }
  };

  const enrolledUserIds = new Set(enrollments?.map(e => e.user_id));
  const availableStaff = allStaff?.filter(s => !enrolledUserIds.has(s.id));

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/hrm/knowledge-center')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">{course.title}</h1>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Badge variant="outline">{course.category}</Badge>
            <Badge>{course.level}</Badge>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" /> {course.estimated_minutes} min
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-primary" />
              <div>
                <div className="text-2xl font-bold">{stats?.total || 0}</div>
                <div className="text-sm text-muted-foreground">Enrolled</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-8 w-8 text-green-500" />
              <div>
                <div className="text-2xl font-bold">{stats?.completed || 0}</div>
                <div className="text-sm text-muted-foreground">Completed</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <BookOpen className="h-8 w-8 text-blue-500" />
              <div>
                <div className="text-2xl font-bold">{stats?.inProgress || 0}</div>
                <div className="text-sm text-muted-foreground">In Progress</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 flex items-center justify-center text-primary font-bold text-xl">%</div>
              <div>
                <div className="text-2xl font-bold">{stats?.completionRate || 0}%</div>
                <div className="text-sm text-muted-foreground">Completion Rate</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="lessons">Lessons ({lessons?.length || 0})</TabsTrigger>
          <TabsTrigger value="quiz">Quiz</TabsTrigger>
          <TabsTrigger value="enrollments">Enrollments ({enrollments?.length || 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Course Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground whitespace-pre-wrap">
                {course.description || 'No description provided.'}
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="lessons" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={lessonDialogOpen} onOpenChange={setLessonDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => handleOpenLessonDialog()}>
                  <Plus className="mr-2 h-4 w-4" /> Add Lesson
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingLesson ? 'Edit Lesson' : 'Add New Lesson'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmitLesson} className="space-y-4">
                  <div className="grid grid-cols-4 gap-4">
                    <div className="col-span-3 space-y-2">
                      <Label>Title *</Label>
                      <Input
                        value={lessonForm.title}
                        onChange={e => setLessonForm({ ...lessonForm, title: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Order</Label>
                      <Input
                        type="number"
                        value={lessonForm.order_index}
                        onChange={e => setLessonForm({ ...lessonForm, order_index: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Video URL (optional)</Label>
                    <Input
                      value={lessonForm.video_url}
                      onChange={e => setLessonForm({ ...lessonForm, video_url: e.target.value })}
                      placeholder="https://youtube.com/..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Content (Markdown)</Label>
                    <Textarea
                      value={lessonForm.content_markdown}
                      onChange={e => setLessonForm({ ...lessonForm, content_markdown: e.target.value })}
                      rows={12}
                      placeholder="# Lesson Title&#10;&#10;Write your content here using markdown...&#10;&#10;## Section&#10;- Point 1&#10;- Point 2"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setLessonDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit">
                      {editingLesson ? 'Update' : 'Create'} Lesson
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardContent className="pt-6">
              {lessonsLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading lessons...</div>
              ) : lessons?.length ? (
                <div className="space-y-2">
                  {lessons.map((lesson, index) => (
                    <div
                      key={lesson.id}
                      className="flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/50"
                    >
                      <GripVertical className="h-4 w-4 text-muted-foreground" />
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-medium">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">{lesson.title}</div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          {lesson.video_url && <Video className="h-3 w-3" />}
                          {lesson.content_markdown && <FileText className="h-3 w-3" />}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleOpenLessonDialog(lesson)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteLesson(lesson.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No lessons yet. Add your first lesson.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="quiz" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={quizDialogOpen} onOpenChange={setQuizDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => {
                  if (quiz) {
                    setQuizForm({
                      title: quiz.title,
                      total_marks: quiz.total_marks,
                      pass_marks: quiz.pass_marks,
                    });
                  }
                  setQuizDialogOpen(true);
                }}>
                  {quiz ? <><Edit className="mr-2 h-4 w-4" /> Edit Quiz</> : <><Plus className="mr-2 h-4 w-4" /> Create Quiz</>}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{quiz ? 'Edit Quiz' : 'Create Quiz'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmitQuiz} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Quiz Title *</Label>
                    <Input
                      value={quizForm.title}
                      onChange={e => setQuizForm({ ...quizForm, title: e.target.value })}
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Total Marks</Label>
                      <Input
                        type="number"
                        value={quizForm.total_marks}
                        onChange={e => setQuizForm({ ...quizForm, total_marks: parseInt(e.target.value) || 100 })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Pass Marks</Label>
                      <Input
                        type="number"
                        value={quizForm.pass_marks}
                        onChange={e => setQuizForm({ ...quizForm, pass_marks: parseInt(e.target.value) || 60 })}
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setQuizDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit">
                      {quiz ? 'Update' : 'Create'} Quiz
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {quiz ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{quiz.title}</CardTitle>
                    <CardDescription>
                      Pass Mark: {quiz.pass_marks}/{quiz.total_marks}
                    </CardDescription>
                  </div>
                  <Dialog open={questionDialogOpen} onOpenChange={setQuestionDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm">
                        <Plus className="mr-2 h-4 w-4" /> Add Question
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add Question</DialogTitle>
                      </DialogHeader>
                      <form onSubmit={handleSubmitQuestion} className="space-y-4">
                        <div className="space-y-2">
                          <Label>Question *</Label>
                          <Textarea
                            value={questionForm.question_text}
                            onChange={e => setQuestionForm({ ...questionForm, question_text: e.target.value })}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Type</Label>
                          <Select
                            value={questionForm.type}
                            onValueChange={v => setQuestionForm({ 
                              ...questionForm, 
                              type: v as QuestionType,
                              options: v === 'TRUE_FALSE' ? ['True', 'False'] : ['', '', '', '']
                            })}
                          >
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="MCQ">Multiple Choice</SelectItem>
                              <SelectItem value="TRUE_FALSE">True/False</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Options</Label>
                          {questionForm.options.map((opt, i) => (
                            <div key={i} className="flex items-center gap-2">
                              <Checkbox
                                checked={questionForm.correct_option_index === i}
                                onCheckedChange={() => setQuestionForm({ ...questionForm, correct_option_index: i })}
                              />
                              <Input
                                value={opt}
                                onChange={e => {
                                  const newOpts = [...questionForm.options];
                                  newOpts[i] = e.target.value;
                                  setQuestionForm({ ...questionForm, options: newOpts });
                                }}
                                placeholder={`Option ${i + 1}`}
                                disabled={questionForm.type === 'TRUE_FALSE'}
                              />
                            </div>
                          ))}
                          <p className="text-xs text-muted-foreground">Check the correct answer</p>
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button type="button" variant="outline" onClick={() => setQuestionDialogOpen(false)}>
                            Cancel
                          </Button>
                          <Button type="submit">Add Question</Button>
                        </div>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                {questions?.length ? (
                  <div className="space-y-4">
                    {questions.map((q, index) => (
                      <div key={q.id} className="p-4 border rounded-lg">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <HelpCircle className="h-4 w-4 text-primary" />
                              <span className="font-medium">Q{index + 1}.</span>
                              <Badge variant="outline">{q.type}</Badge>
                            </div>
                            <p className="mb-2">{q.question_text}</p>
                            <div className="grid grid-cols-2 gap-2">
                              {(q.options as string[]).map((opt, i) => (
                                <div
                                  key={i}
                                  className={`p-2 rounded text-sm ${
                                    i === q.correct_option_index
                                      ? 'bg-green-500/20 text-green-500 border border-green-500/50'
                                      : 'bg-muted'
                                  }`}
                                >
                                  {opt}
                                </div>
                              ))}
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteQuestion.mutateAsync({ id: q.id, quizId: quiz.id })}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No questions yet. Add your first question.
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="text-center py-8 text-muted-foreground">
                No quiz created for this course yet.
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="enrollments" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={enrollDialogOpen} onOpenChange={setEnrollDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" /> Assign Staff
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Assign Staff to Course</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Assign by Role</Label>
                    <Select value={enrollByRole} onValueChange={setEnrollByRole}>
                      <SelectTrigger><SelectValue placeholder="Select a role" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">None</SelectItem>
                        {ALL_ROLES.map(role => (
                          <SelectItem key={role} value={role}>{role}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Or Select Individual Staff</Label>
                    <div className="max-h-[200px] overflow-y-auto border rounded-md p-2 space-y-1">
                      {availableStaff?.map(staff => (
                        <div key={staff.id} className="flex items-center gap-2">
                          <Checkbox
                            checked={selectedUsers.includes(staff.id)}
                            onCheckedChange={checked => {
                              setSelectedUsers(prev =>
                                checked
                                  ? [...prev, staff.id]
                                  : prev.filter(id => id !== staff.id)
                              );
                            }}
                          />
                          <span>{staff.name}</span>
                          <Badge variant="outline" className="text-xs">{staff.role}</Badge>
                        </div>
                      ))}
                      {!availableStaff?.length && (
                        <p className="text-sm text-muted-foreground">All staff already enrolled</p>
                      )}
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setEnrollDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleEnrollUsers} disabled={enrollUsers.isPending}>
                      Enroll
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Staff</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Started</TableHead>
                    <TableHead>Completed</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {enrollments?.map(enrollment => (
                    <TableRow key={enrollment.id}>
                      <TableCell>
                        <div className="font-medium">{enrollment.profile?.name}</div>
                        <div className="text-sm text-muted-foreground">{enrollment.profile?.email}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{enrollment.profile?.role}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            enrollment.status === 'COMPLETED'
                              ? 'default'
                              : enrollment.status === 'IN_PROGRESS'
                              ? 'secondary'
                              : 'outline'
                          }
                        >
                          {enrollment.status.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={enrollment.progress_percent} className="w-20" />
                          <span className="text-sm">{enrollment.progress_percent}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {enrollment.started_at
                          ? format(new Date(enrollment.started_at), 'MMM d, yyyy')
                          : '-'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {enrollment.completed_at
                          ? format(new Date(enrollment.completed_at), 'MMM d, yyyy')
                          : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                  {!enrollments?.length && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No enrollments yet
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
