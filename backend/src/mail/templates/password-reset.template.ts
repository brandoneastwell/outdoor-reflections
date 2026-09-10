type PasswordResetTemplateContext = {
  resetUrl: string;
};

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

export const renderPasswordResetEmail = ({
  resetUrl,
}: PasswordResetTemplateContext) => {
  const escapedResetUrl = escapeHtml(resetUrl);

  return `
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Reset your Outdoor Reflections password</title>
  </head>
  <body style="margin:0; background:#f7efe9; color:#495867; font-family:Arial, Helvetica, sans-serif;">
    <div style="display:none; max-height:0; overflow:hidden; opacity:0;">
      Reset your Outdoor Reflections password. This link expires in 15 minutes.
    </div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f7efe9; border-collapse:collapse;">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px; overflow:hidden; border:1px solid #efd8cc; border-radius:24px; background:#fffaf7; border-collapse:separate;">
            <tr>
              <td style="padding:36px 32px 20px; text-align:center;">
                <p style="margin:0 0 10px; color:#c18c5d; font-size:12px; font-weight:700; letter-spacing:2.4px; text-transform:uppercase;">
                  Outdoor Reflections
                </p>
                <h1 style="margin:0; color:#ce796b; font-family:Georgia, 'Times New Roman', serif; font-size:36px; line-height:1.05; font-weight:700;">
                  Reset your password
                </h1>
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px 10px;">
                <div style="height:1px; background:#ecc8af;"></div>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 32px 8px;">
                <p style="margin:0 0 18px; color:#495867; font-size:16px; line-height:1.6;">
                  We received a request to reset the password for your Outdoor Reflections account.
                </p>
                <p style="margin:0 0 24px; color:#495867; font-size:16px; line-height:1.6;">
                  Use the button below to choose a new password. For your security, this link expires in 15 minutes.
                </p>
                <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 auto 26px; border-collapse:collapse;">
                  <tr>
                    <td align="center" style="border-radius:18px; background:#ce796b;">
                      <a href="${escapedResetUrl}" style="display:inline-block; padding:14px 26px; color:#ffffff; font-size:15px; font-weight:700; line-height:1; text-decoration:none;">
                        Reset password
                      </a>
                    </td>
                  </tr>
                </table>
                <p style="margin:0; color:#495867; font-size:14px; line-height:1.6;">
                  If the button does not work, paste this link into your browser:
                </p>
                <p style="margin:8px 0 0; word-break:break-all; color:#ce796b; font-size:13px; line-height:1.5;">
                  <a href="${escapedResetUrl}" style="color:#ce796b; text-decoration:underline;">${escapedResetUrl}</a>
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 32px 34px;">
                <div style="border-top:1px solid #ecc8af; padding-top:18px;">
                  <p style="margin:0; color:#7b8794; font-size:13px; line-height:1.6;">
                    If you did not request this, you can ignore this email and your password will stay the same.
                  </p>
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
`.trim();
};
