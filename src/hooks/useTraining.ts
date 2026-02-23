import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useCurrentStoreId } from '@/hooks/useCurrentStoreId';
import { useIsModuleStoreWise } from '@/hooks/useModuleStoreSettings';

export type CourseLevel = 'BASIC' | 'INTERMEDIATE' | 'ADVANCED';
export type QuestionType = 'MCQ' | 'TRUE_FALSE';
export type EnrollmentStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';

export interface TrainingCourse {
  id: string;
  title: string;
  slug: string;
  category: string;
  level: CourseLevel;
  description: string | null;
  estimated_minutes: number | null;
  is_active: boolean;
  is_mandatory: boolean;
  target_roles: string[];
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface TrainingLesson {
  id: string;
  course_id: string;
  title: string;
  content_markdown: string | null;
  video_url: string | null;
  attachment_url: string | null;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export interface TrainingQuiz {
  id: string;
  course_id: string;
  title: string;
  total_marks: number;
  pass_marks: number;
  created_at: string;
  updated_at: string;
}

export interface TrainingQuestion {
  id: string;
  quiz_id: string;
  question_text: string;
  type: QuestionType;
  options: string[];
  correct_option_index: number;
  created_at: string;
}

export interface TrainingEnrollment {
  id: string;
  course_id: string;
  user_id: string;
  status: EnrollmentStatus;
  progress_percent: number;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  course?: TrainingCourse;
  profile?: { name: string; email: string; role: string };
}

export interface TrainingQuizAttempt {
  id: string;
  quiz_id: string;
  user_id: string;
  score: number;
  passed: boolean;
  answers: Record<string, number>;
  attempted_at: string;
}

export interface TrainingCertificate {
  id: string;
  course_id: string;
  user_id: string;
  certificate_code: string;
  issued_at: string;
  pdf_url: string | null;
  course?: TrainingCourse;
}

export interface LessonCompletion {
  id: string;
  lesson_id: string;
  user_id: string;
  completed_at: string;
}

// Courses hooks
export function useTrainingCourses(activeOnly = false) {
  const storeId = useCurrentStoreId();
  const filterByStore = useIsModuleStoreWise('hrm');

  return useQuery({
    queryKey: ['training-courses', storeId, filterByStore, activeOnly],
    queryFn: async () => {
      let query = supabase
        .from('training_courses')
        .select('*')
        .order('created_at', { ascending: false }) as any;
      
      if (filterByStore && storeId) query = query.eq('store_id', storeId);
      if (activeOnly) query = query.eq('is_active', true);
      
      const { data, error } = await query;
      if (error) throw error;
      return data as TrainingCourse[];
    },
    enabled: !!storeId,
  });
}

export function useTrainingCourse(slug: string) {
  return useQuery({
    queryKey: ['training-course', slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('training_courses')
        .select('*')
        .eq('slug', slug)
        .single();
      if (error) throw error;
      return data as TrainingCourse;
    },
    enabled: !!slug,
  });
}

export function useCreateCourse() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const storeId = useCurrentStoreId();

  return useMutation({
    mutationFn: async (course: Omit<TrainingCourse, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('training_courses')
        .insert({ ...course, store_id: storeId } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-courses'] });
      toast({ title: 'Course created successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to create course', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdateCourse() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<TrainingCourse> & { id: string }) => {
      const { data, error } = await supabase
        .from('training_courses')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-courses'] });
      queryClient.invalidateQueries({ queryKey: ['training-course'] });
      toast({ title: 'Course updated successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to update course', description: error.message, variant: 'destructive' });
    },
  });
}

export function useDeleteCourse() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('training_courses').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-courses'] });
      toast({ title: 'Course deleted successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to delete course', description: error.message, variant: 'destructive' });
    },
  });
}

// Lessons hooks
export function useCourseLessons(courseId: string) {
  return useQuery({
    queryKey: ['training-lessons', courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('training_lessons')
        .select('*')
        .eq('course_id', courseId)
        .order('order_index');
      if (error) throw error;
      return data as TrainingLesson[];
    },
    enabled: !!courseId,
  });
}

export function useCreateLesson() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (lesson: Omit<TrainingLesson, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('training_lessons')
        .insert(lesson)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['training-lessons', data.course_id] });
      toast({ title: 'Lesson created successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to create lesson', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdateLesson() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<TrainingLesson> & { id: string }) => {
      const { data, error } = await supabase
        .from('training_lessons')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['training-lessons', data.course_id] });
      toast({ title: 'Lesson updated successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to update lesson', description: error.message, variant: 'destructive' });
    },
  });
}

export function useDeleteLesson() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, courseId }: { id: string; courseId: string }) => {
      const { error } = await supabase.from('training_lessons').delete().eq('id', id);
      if (error) throw error;
      return courseId;
    },
    onSuccess: (courseId) => {
      queryClient.invalidateQueries({ queryKey: ['training-lessons', courseId] });
      toast({ title: 'Lesson deleted successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to delete lesson', description: error.message, variant: 'destructive' });
    },
  });
}

// Quiz hooks
export function useCourseQuiz(courseId: string) {
  return useQuery({
    queryKey: ['training-quiz', courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('training_quizzes')
        .select('*')
        .eq('course_id', courseId)
        .maybeSingle();
      if (error) throw error;
      return data as TrainingQuiz | null;
    },
    enabled: !!courseId,
  });
}

export function useQuizQuestions(quizId: string) {
  return useQuery({
    queryKey: ['training-questions', quizId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('training_questions')
        .select('*')
        .eq('quiz_id', quizId)
        .order('created_at');
      if (error) throw error;
      return data as TrainingQuestion[];
    },
    enabled: !!quizId,
  });
}

export function useCreateQuiz() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (quiz: Omit<TrainingQuiz, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('training_quizzes')
        .insert(quiz)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['training-quiz', data.course_id] });
      toast({ title: 'Quiz created successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to create quiz', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdateQuiz() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<TrainingQuiz> & { id: string }) => {
      const { data, error } = await supabase
        .from('training_quizzes')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['training-quiz', data.course_id] });
      toast({ title: 'Quiz updated successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to update quiz', description: error.message, variant: 'destructive' });
    },
  });
}

export function useCreateQuestion() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (question: Omit<TrainingQuestion, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('training_questions')
        .insert(question)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['training-questions', data.quiz_id] });
      toast({ title: 'Question added successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to add question', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdateQuestion() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<TrainingQuestion> & { id: string }) => {
      const { data, error } = await supabase
        .from('training_questions')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['training-questions', data.quiz_id] });
      toast({ title: 'Question updated successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to update question', description: error.message, variant: 'destructive' });
    },
  });
}

export function useDeleteQuestion() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, quizId }: { id: string; quizId: string }) => {
      const { error } = await supabase.from('training_questions').delete().eq('id', id);
      if (error) throw error;
      return quizId;
    },
    onSuccess: (quizId) => {
      queryClient.invalidateQueries({ queryKey: ['training-questions', quizId] });
      toast({ title: 'Question deleted successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to delete question', description: error.message, variant: 'destructive' });
    },
  });
}

// Enrollment hooks
export function useCourseEnrollments(courseId: string) {
  return useQuery({
    queryKey: ['training-enrollments', 'course', courseId],
    queryFn: async () => {
      const { data: enrollments, error } = await supabase
        .from('training_enrollments')
        .select('*')
        .eq('course_id', courseId);
      if (error) throw error;

      // Fetch profiles separately
      const userIds = enrollments?.map(e => e.user_id) || [];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name, email, role')
        .in('id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]));
      return enrollments?.map(e => ({
        ...e,
        profile: profileMap.get(e.user_id),
      })) as (TrainingEnrollment & { profile: { name: string; email: string; role: string } })[];
    },
    enabled: !!courseId,
  });
}

export function useMyEnrollments() {
  return useQuery({
    queryKey: ['training-enrollments', 'my'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('training_enrollments')
        .select('*, course:training_courses(*)')
        .eq('user_id', user.id);
      if (error) throw error;
      return data as (TrainingEnrollment & { course: TrainingCourse })[];
    },
  });
}

export function useEnrollment(courseId: string) {
  return useQuery({
    queryKey: ['training-enrollment', courseId],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('training_enrollments')
        .select('*')
        .eq('course_id', courseId)
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      return data as TrainingEnrollment | null;
    },
    enabled: !!courseId,
  });
}

export function useEnrollUsers() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ courseId, userIds }: { courseId: string; userIds: string[] }) => {
      const enrollments = userIds.map(userId => ({
        course_id: courseId,
        user_id: userId,
        status: 'NOT_STARTED' as EnrollmentStatus,
        progress_percent: 0,
      }));
      const { data, error } = await supabase
        .from('training_enrollments')
        .upsert(enrollments, { onConflict: 'course_id,user_id' })
        .select();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, { courseId }) => {
      queryClient.invalidateQueries({ queryKey: ['training-enrollments', 'course', courseId] });
      toast({ title: 'Users enrolled successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to enroll users', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdateEnrollment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<TrainingEnrollment> & { id: string }) => {
      const { data, error } = await supabase
        .from('training_enrollments')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['training-enrollments'] });
      queryClient.invalidateQueries({ queryKey: ['training-enrollment', data.course_id] });
    },
  });
}

// Lesson completion hooks
export function useLessonCompletions(courseId: string) {
  return useQuery({
    queryKey: ['lesson-completions', courseId],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data: lessons } = await supabase
        .from('training_lessons')
        .select('id')
        .eq('course_id', courseId);

      if (!lessons?.length) return [];

      const lessonIds = lessons.map(l => l.id);
      const { data, error } = await supabase
        .from('training_lesson_completions')
        .select('*')
        .eq('user_id', user.id)
        .in('lesson_id', lessonIds);
      if (error) throw error;
      return data as LessonCompletion[];
    },
    enabled: !!courseId,
  });
}

export function useMarkLessonComplete() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ lessonId, courseId }: { lessonId: string; courseId: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('training_lesson_completions')
        .upsert({ lesson_id: lessonId, user_id: user.id }, { onConflict: 'lesson_id,user_id' })
        .select()
        .single();
      if (error) throw error;
      return { data, courseId };
    },
    onSuccess: ({ courseId }) => {
      queryClient.invalidateQueries({ queryKey: ['lesson-completions', courseId] });
    },
  });
}

// Quiz attempt hooks
export function useMyQuizAttempts(quizId: string) {
  return useQuery({
    queryKey: ['quiz-attempts', quizId],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('training_quiz_attempts')
        .select('*')
        .eq('quiz_id', quizId)
        .eq('user_id', user.id)
        .order('attempted_at', { ascending: false });
      if (error) throw error;
      return data as TrainingQuizAttempt[];
    },
    enabled: !!quizId,
  });
}

export function useSubmitQuizAttempt() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ 
      quizId, 
      answers, 
      courseId 
    }: { 
      quizId: string; 
      answers: Record<string, number>; 
      courseId: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get quiz and questions
      const { data: quiz } = await supabase
        .from('training_quizzes')
        .select('*')
        .eq('id', quizId)
        .single();
      
      const { data: questions } = await supabase
        .from('training_questions')
        .select('*')
        .eq('quiz_id', quizId);

      if (!quiz || !questions) throw new Error('Quiz not found');

      // Calculate score
      let correctCount = 0;
      questions.forEach(q => {
        if (answers[q.id] === q.correct_option_index) {
          correctCount++;
        }
      });

      const score = Math.round((correctCount / questions.length) * quiz.total_marks);
      const passed = score >= quiz.pass_marks;

      // Save attempt
      const { data: attempt, error } = await supabase
        .from('training_quiz_attempts')
        .insert({
          quiz_id: quizId,
          user_id: user.id,
          score,
          passed,
          answers,
        })
        .select()
        .single();
      if (error) throw error;

      // If passed, update enrollment and create certificate
      if (passed) {
        await supabase
          .from('training_enrollments')
          .update({ 
            status: 'COMPLETED', 
            progress_percent: 100,
            completed_at: new Date().toISOString() 
          })
          .eq('course_id', courseId)
          .eq('user_id', user.id);

        const certCode = `CERT-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
        await supabase
          .from('training_certificates')
          .upsert({
            course_id: courseId,
            user_id: user.id,
            certificate_code: certCode,
          }, { onConflict: 'course_id,user_id' });
      }

      return { attempt, passed, score, total: quiz.total_marks };
    },
    onSuccess: ({ passed, score, total }, { quizId, courseId }) => {
      queryClient.invalidateQueries({ queryKey: ['quiz-attempts', quizId] });
      queryClient.invalidateQueries({ queryKey: ['training-enrollment', courseId] });
      queryClient.invalidateQueries({ queryKey: ['training-enrollments'] });
      queryClient.invalidateQueries({ queryKey: ['training-certificates'] });
      toast({ 
        title: passed ? 'Congratulations! You passed!' : 'Quiz completed',
        description: `Score: ${score}/${total}`,
        variant: passed ? 'default' : 'destructive'
      });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to submit quiz', description: error.message, variant: 'destructive' });
    },
  });
}

// Certificate hooks
export function useMyCertificates() {
  return useQuery({
    queryKey: ['training-certificates', 'my'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('training_certificates')
        .select('*, course:training_courses(*)')
        .eq('user_id', user.id)
        .order('issued_at', { ascending: false });
      if (error) throw error;
      return data as (TrainingCertificate & { course: TrainingCourse })[];
    },
  });
}

// Reports hook
export function useTrainingReports(filters?: { courseId?: string; role?: string }) {
  return useQuery({
    queryKey: ['training-reports', filters],
    queryFn: async () => {
      let query = supabase
        .from('training_enrollments')
        .select('*, course:training_courses(*)');

      if (filters?.courseId) {
        query = query.eq('course_id', filters.courseId);
      }

      const { data: enrollments, error } = await query;
      if (error) throw error;

      // Fetch profiles separately
      const userIds = enrollments?.map(e => e.user_id) || [];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name, email, role')
        .in('id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]));
      let results = enrollments?.map(e => ({
        ...e,
        profile: profileMap.get(e.user_id),
      })) as (TrainingEnrollment & { 
        course: TrainingCourse; 
        profile: { name: string; email: string; role: string } 
      })[];

      if (filters?.role) {
        results = results.filter(e => e.profile?.role === filters.role);
      }

      return results;
    },
  });
}

// Stats hooks
export function useCourseStats(courseId: string) {
  return useQuery({
    queryKey: ['course-stats', courseId],
    queryFn: async () => {
      const { data: enrollments, error } = await supabase
        .from('training_enrollments')
        .select('*')
        .eq('course_id', courseId);
      if (error) throw error;

      const total = enrollments?.length || 0;
      const completed = enrollments?.filter(e => e.status === 'COMPLETED').length || 0;
      const inProgress = enrollments?.filter(e => e.status === 'IN_PROGRESS').length || 0;
      const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

      return { total, completed, inProgress, completionRate };
    },
    enabled: !!courseId,
  });
}
