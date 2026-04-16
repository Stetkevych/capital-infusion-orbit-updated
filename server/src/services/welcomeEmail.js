/**
 * Orbit Welcome Email Builder
 * NOT ACTIVE — ready to plug into docusignPoller.js when approved.
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
<body style="margin:0;padding:0;background-color:#f0f2f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0f2f5;padding:40px 20px;">
    <tr><td align="center">
      <table role="presentation" width="580" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">

        <tr>
          <td style="background:linear-gradient(135deg,#1e3a5f 0%,#2563eb 100%);padding:48px 40px 40px;text-align:center;">
            <img src="https://orbit-technology.com/OrbitLogo.png" alt="Orbit" width="260" style="display:block;margin:0 auto 20px;max-width:260px;" />
            <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:700;letter-spacing:-0.5px;">Welcome to Orbit</h1>
            <p style="margin:8px 0 0;color:#93b4e8;font-size:14px;font-weight:500;">by Capital Infusion</p>
          </td>
        </tr>

        <tr>
          <td style="padding:40px;">
            <p style="margin:0 0 24px;color:#1d1d1f;font-size:16px;line-height:26px;">
              Hi <strong>${firstName}</strong> — your secure space to upload documents, communicate with your financial advisor, and move your funding forward — <strong>quickly and safely</strong>.
            </p>

            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:14px;margin-bottom:24px;">
              <tr><td style="padding:20px 24px;">
                <p style="margin:0 0 8px;color:#166534;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:1px;">Your Portal Login</p>
                <p style="margin:4px 0;color:#1d1d1f;font-size:14px;"><strong>Portal:</strong> <a href="${portalUrl}" style="color:#2563eb;text-decoration:none;">${portalUrl}</a></p>
                <p style="margin:4px 0;color:#1d1d1f;font-size:14px;"><strong>Email:</strong> ${clientEmail}</p>
                <p style="margin:4px 0;color:#1d1d1f;font-size:14px;"><strong>Password:</strong> <code style="background:#dcfce7;padding:2px 8px;border-radius:6px;font-size:14px;font-weight:600;">${tempPassword}</code></p>
              </td></tr>
            </table>

            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,#eff6ff,#e0ecff);border-radius:14px;margin-bottom:28px;">
              <tr><td style="padding:20px 24px;text-align:center;">
                <p style="margin:0;color:#1e3a5f;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:1px;">Trusted by thousands of businesses</p>
                <p style="margin:8px 0 0;color:#2563eb;font-size:32px;font-weight:800;letter-spacing:-1px;">$500M+ Funded</p>
                <p style="margin:4px 0 0;color:#6b7280;font-size:13px;">to small businesses like yours</p>
              </td></tr>
            </table>

            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
              <tr><td style="padding:14px 16px;background:#f9fafb;border-radius:12px 12px 0 0;border-bottom:1px solid #f0f0f0;">
                <table role="presentation" cellpadding="0" cellspacing="0"><tr>
                  <td style="width:36px;height:36px;background:#dbeafe;border-radius:10px;text-align:center;line-height:36px;"><span style="font-size:16px;">&#128274;</span></td>
                  <td style="padding-left:14px;">
                    <p style="margin:0;color:#1d1d1f;font-size:14px;font-weight:600;">Secure Document Upload</p>
                    <p style="margin:2px 0 0;color:#6b7280;font-size:12px;">Bank-level encryption on every file</p>
                  </td>
                </tr></table>
              </td></tr>
              <tr><td style="padding:14px 16px;background:#f9fafb;border-bottom:1px solid #f0f0f0;">
                <table role="presentation" cellpadding="0" cellspacing="0"><tr>
                  <td style="width:36px;height:36px;background:#dbeafe;border-radius:10px;text-align:center;line-height:36px;"><span style="font-size:16px;">&#128100;</span></td>
                  <td style="padding-left:14px;">
                    <p style="margin:0;color:#1d1d1f;font-size:14px;font-weight:600;">Direct Access to Your Advisor</p>
                    <p style="margin:2px 0 0;color:#6b7280;font-size:12px;">One-on-one support throughout the process</p>
                  </td>
                </tr></table>
              </td></tr>
              <tr><td style="padding:14px 16px;background:#f9fafb;border-radius:0 0 12px 12px;">
                <table role="presentation" cellpadding="0" cellspacing="0"><tr>
                  <td style="width:36px;height:36px;background:#dbeafe;border-radius:10px;text-align:center;line-height:36px;"><span style="font-size:16px;">&#128172;</span></td>
                  <td style="padding-left:14px;">
                    <p style="margin:0;color:#1d1d1f;font-size:14px;font-weight:600;">Real-Time Communication</p>
                    <p style="margin:2px 0 0;color:#6b7280;font-size:12px;">Message your rep directly from the portal</p>
                  </td>
                </tr></table>
              </td></tr>
            </table>

            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#1e3a5f;border-radius:14px;margin-bottom:32px;">
              <tr><td style="padding:24px;">
                <p style="margin:0 0 4px;color:#93b4e8;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:1.5px;">Your Capital Infusion Representative</p>
                <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:12px;"><tr>
                  ${representativeHeadshot ? `<td style="width:56px;vertical-align:top;padding-right:16px;"><img src="https://orbit-technology.com${representativeHeadshot}" alt="" width="56" height="56" style="display:block;border-radius:14px;object-fit:cover;" /></td>` : ''}
                  <td style="vertical-align:top;">
                    <p style="margin:0 0 8px;color:#ffffff;font-size:20px;font-weight:700;">${representativeName}</p>
                    <table role="presentation" cellpadding="0" cellspacing="0"><tr>
                      <td style="padding-right:24px;">
                        <p style="margin:0;color:#93b4e8;font-size:12px;">Phone</p>
                        <p style="margin:2px 0 0;color:#ffffff;font-size:14px;font-weight:500;">${representativePhone}</p>
                      </td>
                      <td>
                        <p style="margin:0;color:#93b4e8;font-size:12px;">Email</p>
                        <p style="margin:2px 0 0;color:#ffffff;font-size:14px;font-weight:500;">${representativeEmail}</p>
                      </td>
                    </tr></table>
                  </td>
                </tr></table>
              </td></tr>
            </table>

            <p style="margin:0 0 20px;color:#6b7280;font-size:14px;text-align:center;">We're here to make this fast and simple.</p>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr><td align="center">
                <a href="https://orbit-technology.com" style="display:inline-block;background:linear-gradient(135deg,#2563eb,#1d4ed8);color:#ffffff;font-size:16px;font-weight:700;text-decoration:none;padding:16px 48px;border-radius:14px;letter-spacing:0.3px;box-shadow:0 4px 14px rgba(37,99,235,0.35);">
                  Continue Your Application &rarr;
                </a>
              </td></tr>
            </table>
          </td>
        </tr>

        <tr>
          <td style="padding:28px 40px;background:#f9fafb;border-top:1px solid #e5e7eb;text-align:center;">
            <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 16px;">
              <tr>
                <td style="padding:0 10px;">
                  <a href="https://instagram.com/mrcapitalinfusion" style="text-decoration:none;">
                    <table role="presentation" cellpadding="0" cellspacing="0"><tr>
                      <td style="width:40px;height:40px;background:#f0f0f0;border-radius:10px;text-align:center;line-height:40px;">
                        <span style="font-size:18px;">&#128247;</span>
                      </td>
                    </tr></table>
                  </a>
                </td>
                <td style="padding:0 10px;">
                  <a href="https://linkedin.com/company/capital-infusion" style="text-decoration:none;">
                    <table role="presentation" cellpadding="0" cellspacing="0"><tr>
                      <td style="width:40px;height:40px;background:#0077b5;border-radius:10px;text-align:center;line-height:40px;">
                        <span style="color:#ffffff;font-size:16px;font-weight:800;">in</span>
                      </td>
                    </tr></table>
                  </a>
                </td>
                <td style="padding:0 10px;">
                  <a href="https://youtube.com/@capitalinfusion" style="text-decoration:none;">
                    <table role="presentation" cellpadding="0" cellspacing="0"><tr>
                      <td style="width:40px;height:40px;background:#ff0000;border-radius:10px;text-align:center;line-height:40px;">
                        <span style="color:#ffffff;font-size:16px;">&#9654;</span>
                      </td>
                    </tr></table>
                  </a>
                </td>
              </tr>
            </table>
            <p style="margin:0;color:#9ca3af;font-size:12px;">Follow us for funding insights & updates</p>
            <p style="margin:16px 0 0;color:#d1d5db;font-size:11px;">Capital Infusion &middot; Inc 5000 Company &middot; Encrypted Software</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

module.exports = { buildWelcomeEmail };
