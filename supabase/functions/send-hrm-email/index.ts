import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

// Resend sandbox restriction: can only send to the verified account email
// Until a custom domain is verified at resend.com/domains, all emails go to the owner
const SANDBOX_EMAIL = "yogeshnarayanchapai@gmail.com";

async function sendEmail(to: string[], subject: string, html: string) {
  // In sandbox mode, redirect all emails to the verified owner email
  // Once you verify a domain, remove this override and update the 'from' address
  const safeRecipients = to.map(email => SANDBOX_EMAIL);
  const uniqueRecipients = [...new Set(safeRecipients)];

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: "HR System <onboarding@resend.dev>",
      to: uniqueRecipients,
      subject: `[To: ${to.join(', ')}] ${subject}`,
      html,
    }),
  });
  
  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Resend API error: ${error}`);
  }
  
  return res.json();
}



const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface HRMEmailRequest {
  type: 
    | 'LEAVE_REQUEST' 
    | 'LEAVE_APPROVED' 
    | 'LEAVE_REJECTED'
    | 'DOCUMENT_APPROVED'
    | 'DOCUMENT_REJECTED'
    | 'PAYROLL_CREATED'
    | 'PAYROLL_PAID'
    | 'LEAVE_QUOTA_UPDATED'
    | 'ATTENDANCE_CHECKIN'
    | 'ASSET_ASSIGNED';
  to: string[];
  employeeName: string;
  details: Record<string, any>;
  companyName?: string;
  linkUrl?: string;
}

function getEmailContent(request: HRMEmailRequest): { subject: string; html: string } {
  const { type, employeeName, details, companyName = 'HR Team', linkUrl } = request;
  
  const baseStyles = `
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px; }
      .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
      .header { background: linear-gradient(135deg, #3b82f6, #1d4ed8); color: white; padding: 24px; text-align: center; }
      .header h1 { margin: 0; font-size: 24px; }
      .content { padding: 24px; color: #333; }
      .content p { line-height: 1.6; margin: 12px 0; }
      .detail-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 16px; margin: 16px 0; }
      .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0; }
      .detail-row:last-child { border-bottom: none; }
      .detail-label { color: #64748b; font-size: 14px; }
      .detail-value { color: #1e293b; font-weight: 500; }
      .btn { display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin-top: 16px; }
      .footer { background: #f8fafc; padding: 16px 24px; text-align: center; color: #64748b; font-size: 12px; }
      .status-approved { color: #16a34a; font-weight: bold; }
      .status-rejected { color: #dc2626; font-weight: bold; }
    </style>
  `;

  let subject = '';
  let bodyContent = '';

  switch (type) {
    case 'LEAVE_REQUEST':
      subject = `New Leave Request from ${employeeName}`;
      bodyContent = `
        <p><strong>${employeeName}</strong> has submitted a leave request.</p>
        <div class="detail-box">
          <div class="detail-row"><span class="detail-label">Leave Type</span><span class="detail-value">${details.leaveType || 'N/A'}</span></div>
          <div class="detail-row"><span class="detail-label">From</span><span class="detail-value">${details.startDate || 'N/A'}</span></div>
          <div class="detail-row"><span class="detail-label">To</span><span class="detail-value">${details.endDate || 'N/A'}</span></div>
          <div class="detail-row"><span class="detail-label">Days</span><span class="detail-value">${details.days || 'N/A'}</span></div>
          <div class="detail-row"><span class="detail-label">Reason</span><span class="detail-value">${details.reason || 'Not specified'}</span></div>
        </div>
        ${linkUrl ? `<a href="${linkUrl}" class="btn">Review Request</a>` : ''}
      `;
      break;

    case 'LEAVE_APPROVED':
      subject = `Your Leave Request has been Approved ✓`;
      bodyContent = `
        <p>Hi <strong>${employeeName}</strong>,</p>
        <p>Great news! Your leave request has been <span class="status-approved">approved</span>.</p>
        <div class="detail-box">
          <div class="detail-row"><span class="detail-label">Leave Type</span><span class="detail-value">${details.leaveType || 'N/A'}</span></div>
          <div class="detail-row"><span class="detail-label">From</span><span class="detail-value">${details.startDate || 'N/A'}</span></div>
          <div class="detail-row"><span class="detail-label">To</span><span class="detail-value">${details.endDate || 'N/A'}</span></div>
          <div class="detail-row"><span class="detail-label">Days</span><span class="detail-value">${details.days || 'N/A'}</span></div>
          <div class="detail-row"><span class="detail-label">Approved By</span><span class="detail-value">${details.approvedBy || 'Admin'}</span></div>
        </div>
        ${linkUrl ? `<a href="${linkUrl}" class="btn">View Details</a>` : ''}
      `;
      break;

    case 'LEAVE_REJECTED':
      subject = `Your Leave Request has been Rejected`;
      bodyContent = `
        <p>Hi <strong>${employeeName}</strong>,</p>
        <p>Unfortunately, your leave request has been <span class="status-rejected">rejected</span>.</p>
        <div class="detail-box">
          <div class="detail-row"><span class="detail-label">Leave Type</span><span class="detail-value">${details.leaveType || 'N/A'}</span></div>
          <div class="detail-row"><span class="detail-label">From</span><span class="detail-value">${details.startDate || 'N/A'}</span></div>
          <div class="detail-row"><span class="detail-label">To</span><span class="detail-value">${details.endDate || 'N/A'}</span></div>
          <div class="detail-row"><span class="detail-label">Reason</span><span class="detail-value">${details.rejectionReason || 'Not specified'}</span></div>
        </div>
        <p>Please contact your manager if you have any questions.</p>
        ${linkUrl ? `<a href="${linkUrl}" class="btn">View Details</a>` : ''}
      `;
      break;

    case 'DOCUMENT_APPROVED':
      subject = `Your Document has been Approved ✓`;
      bodyContent = `
        <p>Hi <strong>${employeeName}</strong>,</p>
        <p>Your document has been <span class="status-approved">approved</span>.</p>
        <div class="detail-box">
          <div class="detail-row"><span class="detail-label">Document</span><span class="detail-value">${details.documentName || 'N/A'}</span></div>
          <div class="detail-row"><span class="detail-label">Approved By</span><span class="detail-value">${details.approvedBy || 'Admin'}</span></div>
        </div>
        ${linkUrl ? `<a href="${linkUrl}" class="btn">View Document</a>` : ''}
      `;
      break;

    case 'DOCUMENT_REJECTED':
      subject = `Your Document has been Rejected`;
      bodyContent = `
        <p>Hi <strong>${employeeName}</strong>,</p>
        <p>Your document has been <span class="status-rejected">rejected</span>.</p>
        <div class="detail-box">
          <div class="detail-row"><span class="detail-label">Document</span><span class="detail-value">${details.documentName || 'N/A'}</span></div>
          <div class="detail-row"><span class="detail-label">Reason</span><span class="detail-value">${details.rejectionReason || 'Not specified'}</span></div>
        </div>
        <p>Please upload a corrected version.</p>
        ${linkUrl ? `<a href="${linkUrl}" class="btn">Upload New Document</a>` : ''}
      `;
      break;

    case 'PAYROLL_CREATED':
      subject = `Your Salary Slip for ${details.month || 'this month'} is Ready`;
      bodyContent = `
        <p>Hi <strong>${employeeName}</strong>,</p>
        <p>Your salary slip has been generated.</p>
        <div class="detail-box">
          <div class="detail-row"><span class="detail-label">Month</span><span class="detail-value">${details.month || 'N/A'}</span></div>
          <div class="detail-row"><span class="detail-label">Basic Salary</span><span class="detail-value">Rs. ${details.basicSalary?.toLocaleString() || 'N/A'}</span></div>
          <div class="detail-row"><span class="detail-label">Allowances</span><span class="detail-value">Rs. ${details.allowances?.toLocaleString() || '0'}</span></div>
          <div class="detail-row"><span class="detail-label">Deductions</span><span class="detail-value">Rs. ${details.deductions?.toLocaleString() || '0'}</span></div>
          <div class="detail-row"><span class="detail-label">Net Pay</span><span class="detail-value" style="font-size: 18px; color: #16a34a;">Rs. ${details.netPay?.toLocaleString() || 'N/A'}</span></div>
        </div>
        ${linkUrl ? `<a href="${linkUrl}" class="btn">View Salary Slip</a>` : ''}
      `;
      break;

    case 'PAYROLL_PAID':
      subject = `Your Salary for ${details.month || 'this month'} has been Paid ✓`;
      bodyContent = `
        <p>Hi <strong>${employeeName}</strong>,</p>
        <p>Your salary has been <span class="status-approved">paid</span>.</p>
        <div class="detail-box">
          <div class="detail-row"><span class="detail-label">Month</span><span class="detail-value">${details.month || 'N/A'}</span></div>
          <div class="detail-row"><span class="detail-label">Amount</span><span class="detail-value" style="font-size: 18px; color: #16a34a;">Rs. ${details.netPay?.toLocaleString() || 'N/A'}</span></div>
          <div class="detail-row"><span class="detail-label">Payment Date</span><span class="detail-value">${details.paymentDate || new Date().toLocaleDateString()}</span></div>
        </div>
        ${linkUrl ? `<a href="${linkUrl}" class="btn">View Details</a>` : ''}
      `;
      break;

    case 'LEAVE_QUOTA_UPDATED':
      subject = `Your Leave Quota has been Updated`;
      bodyContent = `
        <p>Hi <strong>${employeeName}</strong>,</p>
        <p>Your leave quota has been updated for <strong>${details.month || 'this month'}</strong>.</p>
        <div class="detail-box">
          <div class="detail-row"><span class="detail-label">Month</span><span class="detail-value">${details.month || 'N/A'}</span></div>
          <div class="detail-row"><span class="detail-label">Leave Days</span><span class="detail-value">${details.maxDays || 'N/A'} days</span></div>
        </div>
        ${linkUrl ? `<a href="${linkUrl}" class="btn">View Leave Balance</a>` : ''}
      `;
      break;

    case 'ATTENDANCE_CHECKIN':
      subject = `Attendance Check-in: ${employeeName}`;
      bodyContent = `
        <p><strong>${employeeName}</strong> has checked in.</p>
        <div class="detail-box">
          <div class="detail-row"><span class="detail-label">Date</span><span class="detail-value">${details.date || new Date().toLocaleDateString()}</span></div>
          <div class="detail-row"><span class="detail-label">Time</span><span class="detail-value">${details.time || new Date().toLocaleTimeString()}</span></div>
        </div>
      `;
      break;

    case 'ASSET_ASSIGNED':
      subject = `Asset Assigned to You: ${details.assetName || 'New Asset'}`;
      bodyContent = `
        <p>Hi <strong>${employeeName}</strong>,</p>
        <p>An asset has been assigned to you.</p>
        <div class="detail-box">
          <div class="detail-row"><span class="detail-label">Asset</span><span class="detail-value">${details.assetName || 'N/A'}</span></div>
          <div class="detail-row"><span class="detail-label">Asset Code</span><span class="detail-value">${details.assetCode || 'N/A'}</span></div>
          <div class="detail-row"><span class="detail-label">Category</span><span class="detail-value">${details.category || 'N/A'}</span></div>
          <div class="detail-row"><span class="detail-label">Assigned Date</span><span class="detail-value">${details.assignedDate || new Date().toLocaleDateString()}</span></div>
        </div>
        <p>Please take good care of this asset.</p>
        ${linkUrl ? `<a href="${linkUrl}" class="btn">View Details</a>` : ''}
      `;
      break;

    default:
      subject = `HR Notification`;
      bodyContent = `<p>You have a new HR notification.</p>`;
  }

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      ${baseStyles}
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${companyName}</h1>
        </div>
        <div class="content">
          ${bodyContent}
        </div>
        <div class="footer">
          <p>This is an automated email from ${companyName}. Please do not reply directly.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return { subject, html };
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const request: HRMEmailRequest = await req.json();
    
    console.log("Sending HRM email:", { type: request.type, to: request.to, employeeName: request.employeeName });

    if (!request.to || request.to.length === 0) {
      return new Response(
        JSON.stringify({ error: "No recipients specified" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { subject, html } = getEmailContent(request);

    const emailResponse = await sendEmail(request.to, subject, html);

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-hrm-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
