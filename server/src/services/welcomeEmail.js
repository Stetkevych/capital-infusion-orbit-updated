/**
 * Orbit Welcome Email Builder
 * Clean white-scale design with Orbit branding
 */

function buildWelcomeEmail({
  firstName,
  representativeName,
  representativePhone,
  representativeEmail,
  representativeHeadshot,
  portalUrl,
  clientEmail,
  tempPassword,
}) {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f5;padding:40px 20px;">
    <tr><td align="center">
      <table role="presentation" width="580" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.04);">

        <!-- Logo Header -->
        <tr>
          <td style="padding:32px 40px 24px;text-align:center;border-bottom:1px solid #f0f0f0;">
            <img src="https://orbit-technology.com/OrbitLogo.png" alt="Orbit" width="180" style="display:block;margin:0 auto;max-width:180px;" />
          </td>
        </tr>

        <!-- Main Content -->
        <tr>
          <td style="padding:40px;">
            <h1 style="margin:0 0 16px;color:#1a1a1a;font-size:24px;font-weight:700;text-align:center;">Welcome to Orbit</h1>
            <p style="margin:0 0 24px;color:#4a4a4a;font-size:15px;line-height:24px;text-align:center;">
              Your secure space to upload documents, communicate with your representative, and move your funding forward — <strong>quickly and safely</strong>.
            </p>

            <!-- Funded Badge -->
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
              <tr><td align="center">
                <div style="display:inline-block;background:#f8f9fa;border:1px solid #e9ecef;border-radius:12px;padding:12px 24px;text-align:center;">
                  <p style="margin:0;color:#2563eb;font-size:22px;font-weight:800;">$500M+ Funded</p>
                  <p style="margin:4px 0 0;color:#6b7280;font-size:12px;">to small businesses just like yours</p>
                </div>
              </td></tr>
            </table>

            <!-- Features -->
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
              <tr>
                <td style="padding:12px 16px;border-bottom:1px solid #f5f5f5;">
                  <table role="presentation" cellpadding="0" cellspacing="0"><tr>
                    <td style="width:32px;height:32px;background:#f0f7ff;border-radius:8px;text-align:center;line-height:32px;"><span style="font-size:14px;">🔒</span></td>
                    <td style="padding-left:12px;"><p style="margin:0;color:#1a1a1a;font-size:14px;font-weight:600;">Secure Document Upload</p></td>
                  </tr></table>
                </td>
              </tr>
              <tr>
                <td style="padding:12px 16px;border-bottom:1px solid #f5f5f5;">
                  <table role="presentation" cellpadding="0" cellspacing="0"><tr>
                    <td style="width:32px;height:32px;background:#f0f7ff;border-radius:8px;text-align:center;line-height:32px;"><span style="font-size:14px;">👤</span></td>
                    <td style="padding-left:12px;"><p style="margin:0;color:#1a1a1a;font-size:14px;font-weight:600;">Direct Access to Your Representative</p></td>
                  </tr></table>
                </td>
              </tr>
              <tr>
                <td style="padding:12px 16px;">
                  <table role="presentation" cellpadding="0" cellspacing="0"><tr>
                    <td style="width:32px;height:32px;background:#f0f7ff;border-radius:8px;text-align:center;line-height:32px;"><span style="font-size:14px;">💬</span></td>
                    <td style="padding-left:12px;"><p style="margin:0;color:#1a1a1a;font-size:14px;font-weight:600;">Real-Time Communication</p></td>
                  </tr></table>
                </td>
              </tr>
            </table>

            <!-- Rep Info -->
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8f9fa;border-radius:12px;margin-bottom:28px;">
              <tr><td style="padding:20px;">
                <p style="margin:0 0 4px;color:#6b7280;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:1px;">Your Representative</p>
                <p style="margin:0 0 8px;color:#1a1a1a;font-size:18px;font-weight:700;">${representativeName}</p>
                ${representativePhone ? `<p style="margin:0 0 4px;color:#4a4a4a;font-size:13px;">📞 ${representativePhone}</p>` : ''}
                ${representativeEmail ? `<p style="margin:0;color:#4a4a4a;font-size:13px;">✉️ ${representativeEmail}</p>` : ''}
              </td></tr>
            </table>

            <!-- Login Credentials -->
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;margin-bottom:28px;">
              <tr><td style="padding:16px 20px;">
                <p style="margin:0 0 8px;color:#166534;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">Your Login</p>
                <p style="margin:4px 0;color:#1a1a1a;font-size:13px;"><strong>Email:</strong> ${clientEmail}</p>
                <p style="margin:4px 0;color:#1a1a1a;font-size:13px;"><strong>Password:</strong> <code style="background:#dcfce7;padding:2px 6px;border-radius:4px;font-size:13px;">${tempPassword}</code></p>
              </td></tr>
            </table>

            <!-- Message -->
            <p style="margin:0 0 24px;color:#4a4a4a;font-size:15px;text-align:center;line-height:22px;">
              We're here to make this fast and simple.
            </p>

            <!-- Big Blue CTA Button -->
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr><td align="center">
                <a href="${portalUrl}" style="display:inline-block;background:#2563eb;color:#ffffff;font-size:16px;font-weight:700;text-decoration:none;padding:18px 48px;border-radius:12px;letter-spacing:0.3px;">
                  Upload Your Documents Now
                </a>
              </td></tr>
            </table>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:24px 40px;background:#f8f9fa;border-top:1px solid #f0f0f0;text-align:center;">
            <p style="margin:0;color:#9ca3af;font-size:11px;">Capital Infusion · Inc 5000 Company · Encrypted Software</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

module.exports = { buildWelcomeEmail };
