import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { BookOpen, Clock, Play, CheckCircle, ArrowRight } from 'lucide-react';
import { useMyEnrollments, useTrainingCourses, TrainingCourse, TrainingEnrollment } from '@/hooks/useTraining';

export default function MyCourses() {
  const navigate = useNavigate();
  const { data: enrollments, isLoading: enrollmentsLoading } = useMyEnrollments();
  const { data: allCourses, isLoading: coursesLoading } = useTrainingCourses(true);

  const isLoading = enrollmentsLoading || coursesLoading;

  const enrolledCourseIds = new Set(enrollments?.map(e => e.course_id));
  
  const assignedCourses = enrollments || [];
  const optionalCourses = allCourses?.filter(c => !enrolledCourseIds.has(c.id)) || [];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'IN_PROGRESS':
        return <Play className="h-5 w-5 text-blue-500" />;
      default:
        return <BookOpen className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <Badge className="bg-green-500">Completed</Badge>;
      case 'IN_PROGRESS':
        return <Badge variant="secondary">In Progress</Badge>;
      default:
        return <Badge variant="outline">Not Started</Badge>;
    }
  };

  const CourseCard = ({ 
    course, 
    enrollment 
  }: { 
    course: TrainingCourse; 
    enrollment?: TrainingEnrollment;
  }) => (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="pt-6">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-primary/10 rounded-lg">
            {enrollment ? getStatusIcon(enrollment.status) : <BookOpen className="h-5 w-5 text-primary" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold text-foreground truncate">{course.title}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-xs">{course.category}</Badge>
                  <Badge variant="secondary" className="text-xs">{course.level}</Badge>
                </div>
              </div>
              {enrollment && getStatusBadge(enrollment.status)}
            </div>
            
            {course.description && (
              <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                {course.description}
              </p>
            )}

            <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {course.estimated_minutes} min
              </span>
              {course.is_mandatory && (
                <Badge variant="destructive" className="text-xs">Mandatory</Badge>
              )}
            </div>

            {enrollment && (
              <div className="mt-4">
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-medium">{enrollment.progress_percent}%</span>
                </div>
                <Progress value={enrollment.progress_percent} className="h-2" />
              </div>
            )}

            <div className="mt-4">
              <Button
                onClick={() => navigate(`/training/courses/${course.slug}`)}
                className="w-full"
                variant={enrollment?.status === 'COMPLETED' ? 'outline' : 'default'}
              >
                {enrollment?.status === 'COMPLETED' ? (
                  <>Review Course</>
                ) : enrollment?.status === 'IN_PROGRESS' ? (
                  <>Continue <ArrowRight className="ml-2 h-4 w-4" /></>
                ) : (
                  <>Start Course <ArrowRight className="ml-2 h-4 w-4" /></>
                )}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">My Training</h1>
        <p className="text-muted-foreground">Complete your assigned courses and explore optional training</p>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Loading courses...</div>
      ) : (
        <>
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Assigned Courses
              {assignedCourses.length > 0 && (
                <Badge variant="secondary">{assignedCourses.length}</Badge>
              )}
            </h2>
            
            {assignedCourses.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {assignedCourses.map(enrollment => (
                  <CourseCard
                    key={enrollment.id}
                    course={enrollment.course!}
                    enrollment={enrollment}
                  />
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="text-center py-8 text-muted-foreground">
                  No courses assigned to you yet.
                </CardContent>
              </Card>
            )}
          </div>

          {optionalCourses.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-muted-foreground" />
                Optional Courses
                <Badge variant="outline">{optionalCourses.length}</Badge>
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {optionalCourses.map(course => (
                  <CourseCard key={course.id} course={course} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
