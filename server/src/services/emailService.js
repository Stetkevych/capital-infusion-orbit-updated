const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');

const ses = new SESClient({ region: process.env.AWS_REGION || 'us-east-1' });
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@capitalinfusion.com';
const PLATFORM_URL = process.env.FRONTEND_URL || 'https://main.d2iq2t6ose4q0u.amplifyapp.com';

async function sendWelcomeEmail({ to, name, envelopeId, subject }) {
  const firstName = name.split(' ')[0];
  const registerUrl = `${PLATFORM_URL}/register?email=${encodeURIComponent(to)}&source=docusign&ref=${envelopeId}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f5f5f7; margin: 0; padding: 0; }
    .container { max-width: 560px; margin: 40px auto; background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
    .header { background: #0071e3; padding: 32px; text-align: center; }
    .header h1 { color: #fff; margin: 0; font-size: 22px; font-weight: 600; letter-spacing: -0.3px; }
    .header p { color: rgba(255,255,255,0.8); margin: 6px 0 0; font-size: 14px; }
    .body { padding: 36px 32px; }
    .body h2 { color: #1d1d1f; font-size: 18px; font-weight: 600; margin: 0 0 12px; }
    .body p { color: #424245; font-size: 14px; line-height: 1.6; margin: 0 0 16px; }
    .cta { display: block; background: #0071e3; color: #fff; text-decoration: none; text-align: center; padding: 14px 24px; border-radius: 10px; font-size: 15px; font-weight: 600; margin: 24px 0; }
    .doc-box { background: #f5f5f7; border-radius: 10px; padding: 16px; margin: 20px 0; }
    .doc-box p { margin: 0; font-size: 13px; color: #6e6e73; }
    .doc-box strong { color: #1d1d1f; }
    .footer { padding: 20px 32px; border-top: 1px solid #f2f2f7; text-align: center; }
    .footer p { color: #86868b; font-size: 12px; margin: 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Capital Infusion</h1>
      <p>Merchant Cash Advance Platform</p>
    </div>
    <div class="body">
      <h2>Welcome, ${firstName}!</h2>
      <p>Your agreement has been successfully signed. The next step is to create your secure merchant account on our platform so you can track your application, upload documents, and stay updated on your funding status.</p>

      <div class="doc-box">
        <p><strong>Document:</strong> ${subject}</p>
        <p><strong>Status:</strong> ✅ Completed &amp; Signed</p>
        <p><strong>Reference:</strong> ${envelopeId}</p>
      </div>

      <p>Click below to set up your account — it only takes 2 minutes:</p>

      <a href="${registerUrl}" class="cta">Create My Account →</a>

      <p style="font-size:13px; color:#86868b;">This link is unique to your application. If you have any questions, contact your assigned representative directly.</p>
    </div>
    <div class="footer">
      <p>Capital Infusion · Merchant Cash Advance Platform</p>
      <p style="margin-top:4px;">This email was sent because you completed a DocuSign agreement.</p>
    </div>
  </div>
</body>
</html>`;

  const command = new SendEmailCommand({
    Source: `Capital Infusion <${FROM_EMAIL}>`,
    Destination: { ToAddresses: [to] },
    Message: {
      Subject: { Data: `Welcome to Capital Infusion — Create Your Account` },
      Body: {
        Html: { Data: html },
        Text: {
          Data: `Welcome ${firstName}! Your agreement is signed. Create your account here: ${registerUrl}`,
        },
      },
    },
  });

  try {
    const result = await ses.send(command);
    console.log(`[Email] Welcome email sent to ${to} | MessageId: ${result.MessageId}`);
    return result;
  } catch (err) {
    console.error(`[Email] Failed to send to ${to}:`, err.message);
    throw err;
  }
}

module.exports = { sendWelcomeEmail };
