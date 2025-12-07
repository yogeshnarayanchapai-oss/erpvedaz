import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { useTrainingCourses, useTrainingReports } from '@/hooks/useTraining';
import { ALL_ROLES } from '@/hooks/useStaff';
import { format } from 'date-fns';

export default function KnowledgeCenterReports() {
  const [filterCourseId, setFilterCourseId] = useState<string>('all');
  const [filterRole, setFilterRole] = useState<string>('all');

  const { data: courses } = useTrainingCourses();
  const { data: reports, isLoading } = useTrainingReports({
    courseId: filterCourseId !== 'all' ? filterCourseId : undefined,
    role: filterRole !== 'all' ? filterRole : undefined,
  });

  const stats = {
    totalEnrollments: reports?.length || 0,
    completed: reports?.filter(r => r.status === 'COMPLETED').length || 0,
    inProgress: reports?.filter(r => r.status === 'IN_PROGRESS').length || 0,
    notStarted: reports?.filter(r => r.status === 'NOT_STARTED').length || 0,
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Training Reports</h1>
        <p className="text-muted-foreground">View staff training progress and completion rates</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.totalEnrollments}</div>
            <div className="text-sm text-muted-foreground">Total Enrollments</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-500">{stats.completed}</div>
            <div className="text-sm text-muted-foreground">Completed</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-blue-500">{stats.inProgress}</div>
            <div className="text-sm text-muted-foreground">In Progress</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-muted-foreground">{stats.notStarted}</div>
            <div className="text-sm text-muted-foreground">Not Started</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-4">
            <CardTitle className="flex-1">Staff Training Progress</CardTitle>
            <Select value={filterCourseId} onValueChange={setFilterCourseId}>
              <SelectTrigger className="w-[200px]"><SelectValue placeholder="Filter by Course" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Courses</SelectItem>
                {courses?.map(course => (
                  <SelectItem key={course.id} value={course.id}>{course.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterRole} onValueChange={setFilterRole}>
              <SelectTrigger className="w-[150px]"><SelectValue placeholder="Filter by Role" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                {ALL_ROLES.map(role => (
                  <SelectItem key={role} value={role}>{role}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading reports...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Staff Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Started</TableHead>
                  <TableHead>Completed</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reports?.map(report => (
                  <TableRow key={report.id}>
                    <TableCell>
                      <div className="font-medium">{report.profile?.name}</div>
                      <div className="text-sm text-muted-foreground">{report.profile?.email}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{report.profile?.role}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{report.course?.title}</div>
                      <div className="text-sm text-muted-foreground">{report.course?.category}</div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={report.progress_percent} className="w-20" />
                        <span className="text-sm">{report.progress_percent}%</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          report.status === 'COMPLETED'
                            ? 'default'
                            : report.status === 'IN_PROGRESS'
                            ? 'secondary'
                            : 'outline'
                        }
                      >
                        {report.status.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {report.started_at
                        ? format(new Date(report.started_at), 'MMM d, yyyy')
                        : '-'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {report.completed_at
                        ? format(new Date(report.completed_at), 'MMM d, yyyy')
                        : '-'}
                    </TableCell>
                  </TableRow>
                ))}
                {!reports?.length && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No training data found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
