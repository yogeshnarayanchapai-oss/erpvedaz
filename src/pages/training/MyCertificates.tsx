import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Award, Printer, Calendar, BookOpen } from 'lucide-react';
import { useMyCertificates } from '@/hooks/useTraining';
import { useAuth } from '@/contexts/AuthContext';
import { useBranding } from '@/hooks/useBranding';
import { format } from 'date-fns';

export default function MyCertificates() {
  const { profile } = useAuth();
  const { data: certificates, isLoading } = useMyCertificates();
  const { branding } = useBranding();

  const handlePrint = (certId: string) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const cert = certificates?.find(c => c.id === certId);
    if (!cert) return;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Certificate - ${cert.course?.title}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: 'Georgia', serif; 
              background: linear-gradient(135deg, #f5f7fa 0%, #e4e8eb 100%);
              min-height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
              padding: 20px;
            }
            .certificate {
              background: white;
              border: 8px double #1a365d;
              padding: 60px;
              max-width: 800px;
              text-align: center;
              box-shadow: 0 10px 40px rgba(0,0,0,0.1);
            }
            .header { 
              font-size: 14px; 
              letter-spacing: 4px; 
              color: #718096; 
              margin-bottom: 20px;
            }
            .title { 
              font-size: 48px; 
              color: #1a365d; 
              margin-bottom: 30px;
              font-weight: normal;
            }
            .subtitle { 
              font-size: 18px; 
              color: #4a5568; 
              margin-bottom: 10px;
            }
            .name { 
              font-size: 36px; 
              color: #2d3748; 
              margin: 20px 0;
              font-style: italic;
            }
            .course { 
              font-size: 24px; 
              color: #1a365d; 
              margin: 30px 0;
              font-weight: bold;
            }
            .details { 
              font-size: 14px; 
              color: #718096; 
              margin-top: 40px;
            }
            .code {
              font-family: monospace;
              background: #f7fafc;
              padding: 8px 16px;
              border-radius: 4px;
              display: inline-block;
              margin-top: 20px;
            }
            @media print {
              body { background: white; }
              .certificate { box-shadow: none; border: 8px double #1a365d; }
            }
          </style>
        </head>
        <body>
          <div class="certificate">
            <div class="header">${branding?.brand_name || 'VAKARI VISION'}</div>
            <div class="title">Certificate of Completion</div>
            <div class="subtitle">This is to certify that</div>
            <div class="name">${profile?.name}</div>
            <div class="subtitle">has successfully completed the course</div>
            <div class="course">${cert.course?.title}</div>
            <div class="details">
              <p>Issued on ${format(new Date(cert.issued_at), 'MMMM d, yyyy')}</p>
            </div>
            <div class="code">Certificate ID: ${cert.certificate_code}</div>
          </div>
          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">My Certificates</h1>
        <p className="text-muted-foreground">View and download your course completion certificates</p>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Loading certificates...</div>
      ) : certificates?.length ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {certificates.map(cert => (
            <Card key={cert.id} className="overflow-hidden">
              <div className="bg-gradient-to-br from-primary/20 to-primary/5 p-8 text-center border-b">
                <Award className="h-16 w-16 mx-auto text-primary mb-2" />
                <h3 className="font-semibold text-foreground">{cert.course?.title}</h3>
                <Badge variant="outline" className="mt-2">{cert.course?.category}</Badge>
              </div>
              <CardContent className="pt-4">
                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      Issued
                    </span>
                    <span>{format(new Date(cert.issued_at), 'MMM d, yyyy')}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Certificate ID</span>
                    <code className="text-xs bg-muted px-2 py-1 rounded">{cert.certificate_code}</code>
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => handlePrint(cert.id)}
                  >
                    <Printer className="mr-2 h-4 w-4" />
                    Print
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="text-center py-12">
            <Award className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Certificates Yet</h3>
            <p className="text-muted-foreground mb-4">
              Complete courses and pass quizzes to earn certificates.
            </p>
            <Button onClick={() => window.location.href = '/training/my-courses'}>
              <BookOpen className="mr-2 h-4 w-4" />
              Browse Courses
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
