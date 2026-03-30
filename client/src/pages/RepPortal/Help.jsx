import React, { useState } from 'react';
import { BookOpen, Download, ChevronDown, ChevronRight, CheckCircle2 } from 'lucide-react';

const SECTIONS = [
  {
    title: 'Getting Started',
    icon: '🚀',
    steps: [
      { label: 'Log In', detail: 'Go to the platform URL. Click Rep / Admin Login. Enter your email and password.' },
      { label: 'Your Dashboard', detail: 'After login you land on your Dashboard showing clients missing documents, recent uploads, pending requests, and activity.' },
    ],
  },
  {
    title: 'Adding a Client',
    icon: '👤',
    steps: [
      { label: 'Go to Clients', detail: 'Click Clients in the left sidebar.' },
      { label: 'Click Add Client', detail: 'Click the blue Add Client button in the top right.' },
      { label: 'Fill in the form', detail: 'Enter business name, owner name, email, phone, industry, state, and requested amount. Business name, owner name, and email are required.' },
      { label: 'Save', detail: 'Click Add Client. The client appears in your list immediately and is assigned to you.' },
    ],
  },
  {
    title: 'Logging a Deal',
    icon: '📊',
    steps: [
      { label: 'Go to Deal Log', detail: 'Click Deal Log in the left sidebar.' },
      { label: 'Click Log Deal', detail: 'Click the blue Log Deal button.' },
      { label: 'Fill in deal details', detail: 'Select the client, choose the lender, enter requested/approved/funded amounts, factor rate (payback auto-calculates), position (1st/2nd/3rd), and stage.' },
      { label: 'Save', detail: 'Click Log Deal. This feeds your Analytics tab automatically over time.' },
      { label: 'Update stage anytime', detail: 'In the Deal Log table, click the pencil icon next to any deal to update its stage as it progresses.' },
    ],
  },
  {
    title: 'Uploading Documents',
    icon: '📁',
    steps: [
      { label: 'Go to Secure Upload', detail: 'Click Secure Upload in the sidebar. Select the client from the dropdown.' },
      { label: 'Select a category', detail: 'Click the document category in the left panel (ID, Application, Bank Statements, etc.).' },
      { label: 'Upload the file', detail: 'Drag and drop the file or click to browse. Files go directly to secure AWS S3 storage.' },
      { label: 'Or upload from Client Profile', detail: 'Open a client → Documents tab → click Upload in any folder to upload directly into that category.' },
    ],
  },
  {
    title: 'Requesting Missing Documents',
    icon: '📨',
    steps: [
      { label: 'Open a Client Profile', detail: 'Click any client from the Clients page.' },
      { label: 'See the missing docs alert', detail: 'If any document categories are empty, a red alert appears at the top listing them.' },
      { label: 'Click Request via Email', detail: 'Click the Request via Email button next to any missing category. The client gets an email immediately with a direct upload link.' },
      { label: 'Or use the Remind button', detail: 'On the Clients list, hover over any client row and click Remind. Select the document type, add an optional message, and send.' },
    ],
  },
  {
    title: 'Sending Document Requests',
    icon: '🔔',
    steps: [
      { label: 'Go to Requests', detail: 'Click Requests in the sidebar.' },
      { label: 'Click New Request', detail: 'Click the New Request button.' },
      { label: 'Fill in the form', detail: 'Select the client, document type, write instructions, and set a due date.' },
      { label: 'Send', detail: 'Click Send Request & Notify Client. The client receives an email with a direct upload link.' },
      { label: 'Track status', detail: 'All pending and completed requests are listed on this page. Click Mark Done when fulfilled.' },
    ],
  },
  {
    title: 'Running Auto-Underwriting',
    icon: '⚡',
    steps: [
      { label: 'Go to Underwriting', detail: 'Click Underwriting in the sidebar.' },
      { label: 'Select a client', detail: 'Choose the client from the dropdown.' },
      { label: 'Run Analysis', detail: 'Click Run Analysis. The system analyzes uploaded bank statements and documents via AWS Textract.' },
      { label: 'Review results', detail: 'See the decision (Approve/Review/Decline), confidence score, max offer amount, factor rate, and a 7-point checklist.' },
    ],
  },
  {
    title: 'Analytics',
    icon: '📈',
    steps: [
      { label: 'Go to Analytics', detail: 'Click Analytics in the sidebar.' },
      { label: 'Overview tab', detail: 'See your KPI cards (Total Funded, Funded Deals, Avg Deal Size, Approval Rate) and monthly trend charts.' },
      { label: 'Lenders tab', detail: 'See funded volume by lender, lender distribution, and a full performance table with approval rates and factor rates.' },
      { label: 'Pipeline tab', detail: 'See deals by stage, stage summary, and your recent deals table.' },
      { label: 'Data grows over time', detail: 'The more deals you log, the richer your analytics become. Data is stored in AWS and aggregates automatically.' },
    ],
  },
  {
    title: 'Tips & Best Practices',
    icon: '💡',
    steps: [
      { label: 'Always log deals', detail: 'Even declined ones. Every data point improves your analytics over time.' },
      { label: 'Request docs through the platform', detail: 'It creates a paper trail and the client gets a direct upload link — no back-and-forth.' },
      { label: 'Check missing docs before calling', detail: 'The missing docs alert on each client profile tells you exactly what\'s needed.' },
      { label: 'Update deal stages as they progress', detail: 'Submitted → Approved → Funded keeps your dashboard and analytics accurate.' },
      { label: 'Use the Remind button', detail: 'Hover over any client row in the Clients list to send a quick reminder without opening their profile.' },
    ],
  },
];

function generatePDF() {
  import('jspdf').then(({ default: jsPDF }) => {
    import('jspdf-autotable').then(() => {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageW = doc.internal.pageSize.getWidth();
      let y = 20;

      // Header
      doc.setFillColor(37, 99, 235);
      doc.rect(0, 0, pageW, 30, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('Capital Infusion Platform', 15, 13);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.text('Rep User Guide', 15, 22);
      doc.setFontSize(9);
      doc.text(`Generated ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`, pageW - 15, 22, { align: 'right' });

      y = 42;

      // URL box
      doc.setFillColor(239, 246, 255);
      doc.setDrawColor(191, 219, 254);
      doc.roundedRect(15, y - 5, pageW - 30, 12, 2, 2, 'FD');
      doc.setTextColor(37, 99, 235);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('Platform URL:', 20, y + 2);
      doc.setFont('helvetica', 'normal');
      doc.text('https://main.d2iq2t6ose4q0u.amplifyapp.com', 50, y + 2);
      y += 16;

      SECTIONS.forEach(section => {
        // Check page space
        if (y > 250) { doc.addPage(); y = 20; }

        // Section header
        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(15, y - 3, pageW - 30, 10, 2, 2, 'FD');
        doc.setTextColor(17, 24, 39);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text(`${section.icon}  ${section.title}`, 20, y + 4);
        y += 14;

        section.steps.forEach((step, i) => {
          if (y > 265) { doc.addPage(); y = 20; }

          // Step number circle
          doc.setFillColor(37, 99, 235);
          doc.circle(22, y + 1, 3, 'F');
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(7);
          doc.setFont('helvetica', 'bold');
          doc.text(`${i + 1}`, 22, y + 2.5, { align: 'center' });

          // Step label
          doc.setTextColor(17, 24, 39);
          doc.setFontSize(9);
          doc.setFont('helvetica', 'bold');
          doc.text(step.label, 28, y + 2);

          // Step detail
          y += 6;
          doc.setTextColor(107, 114, 128);
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8);
          const lines = doc.splitTextToSize(step.detail, pageW - 45);
          doc.text(lines, 28, y);
          y += lines.length * 4 + 4;
        });

        y += 4;
      });

      // Footer on last page
      doc.setFillColor(37, 99, 235);
      doc.rect(0, doc.internal.pageSize.getHeight() - 12, pageW, 12, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text('Capital Infusion · Merchant Cash Advance Platform · Confidential', pageW / 2, doc.internal.pageSize.getHeight() - 5, { align: 'center' });

      doc.save('Capital_Infusion_Rep_Guide.pdf');
    });
  });
}

export default function HelpPage() {
  const [openSection, setOpenSection] = useState(0);

  return (
    <div className="p-6 space-y-5 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight flex items-center gap-2.5">
            <BookOpen size={22} className="text-blue-600" /> Help & Guide
          </h1>
          <p className="text-gray-400 text-sm mt-0.5">Everything you need to use the platform effectively</p>
        </div>
        <button
          onClick={generatePDF}
          className="flex items-center gap-2 bg-gray-900 hover:bg-gray-800 text-white text-sm px-4 py-2.5 rounded-xl transition-colors font-medium shadow-sm"
        >
          <Download size={15} /> Download PDF Guide
        </button>
      </div>

      {/* Quick reference */}
      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5">
        <p className="text-blue-700 text-xs font-medium uppercase tracking-wide mb-3">Quick Reference</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Platform URL', value: 'main.d2iq2t6ose4q0u.amplifyapp.com' },
            { label: 'Login Type', value: 'Rep / Admin Login' },
            { label: 'Support Email', value: 'alexs@capital-infusion.com' },
            { label: 'API Status', value: 'api.orbit-technology.com' },
          ].map(r => (
            <div key={r.label} className="bg-white rounded-xl p-3 border border-blue-100">
              <p className="text-blue-400 text-xs mb-0.5">{r.label}</p>
              <p className="text-gray-800 text-xs font-medium break-all">{r.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Sections */}
      <div className="space-y-2">
        {SECTIONS.map((section, si) => (
          <div key={si} className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
            <button
              onClick={() => setOpenSection(openSection === si ? -1 : si)}
              className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">{section.icon}</span>
                <span className="text-gray-900 font-semibold text-sm">{section.title}</span>
                <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{section.steps.length} steps</span>
              </div>
              {openSection === si
                ? <ChevronDown size={16} className="text-gray-400" />
                : <ChevronRight size={16} className="text-gray-400" />
              }
            </button>

            {openSection === si && (
              <div className="px-6 pb-5 border-t border-gray-50">
                <div className="space-y-4 mt-4">
                  {section.steps.map((step, i) => (
                    <div key={i} className="flex items-start gap-4">
                      <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 mt-0.5">
                        {i + 1}
                      </div>
                      <div>
                        <p className="text-gray-900 font-medium text-sm">{step.label}</p>
                        <p className="text-gray-500 text-sm mt-0.5 leading-relaxed">{step.detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Footer note */}
      <div className="bg-gray-50 border border-gray-100 rounded-2xl p-5 flex items-start gap-3">
        <CheckCircle2 size={16} className="text-green-500 shrink-0 mt-0.5" />
        <div>
          <p className="text-gray-700 text-sm font-medium">Need help?</p>
          <p className="text-gray-400 text-sm mt-0.5">Contact your admin at <span className="text-blue-600">alexs@capital-infusion.com</span> or download the PDF guide above to keep as a reference.</p>
        </div>
      </div>
    </div>
  );
}
