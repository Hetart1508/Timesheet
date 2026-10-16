const escapeHtml = (value) => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

const layout = (heading, content, action) => `<!doctype html>
<html><body style="margin:0;background:#f6f8fb;font-family:Arial,sans-serif;color:#1f2937">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" style="max-width:560px;background:#fff;border:1px solid #e5e7eb;border-radius:14px">
<tr><td style="padding:32px"><div style="color:#4f9cf9;font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase">Timesheet Management</div>
<h1 style="font-size:24px;margin:18px 0 12px">${heading}</h1>${content}${action || ''}
<p style="margin:28px 0 0;color:#6b7280;font-size:13px;line-height:1.6">If you did not request this, you can safely ignore this message.</p>
</td></tr></table></td></tr></table></body></html>`;

const actionButton = (label, url) => `<p style="margin:24px 0"><a href="${escapeHtml(url)}" style="display:inline-block;background:#4f9cf9;color:#fff;text-decoration:none;padding:12px 18px;border-radius:9px;font-weight:700">${label}</a></p>`;

export const templates = {
  verification({ name, otp, expiresInMinutes }) {
    return {
      subject: `${otp} is your Timesheet verification code`,
      text: `Hello ${name},\n\nYour Timesheet Management verification code is ${otp}. It expires in ${expiresInMinutes} minutes and can be used once.`,
      html: layout('Verify your email', `<p>Hello ${escapeHtml(name)},</p><p style="line-height:1.7">Enter this one-time code in Timesheet Management. It expires in ${expiresInMinutes} minutes.</p><div style="margin:24px 0;padding:16px;text-align:center;background:#eef6ff;border-radius:10px;color:#1f2937;font-size:32px;font-weight:800;letter-spacing:10px">${escapeHtml(otp)}</div>`),
    };
  },
  welcome({ name }) {
    return {
      subject: 'Welcome to Timesheet Management',
      text: `Hello ${name},\n\nYour email is verified. You can now sign in to Timesheet Management.`,
      html: layout('Your account is ready', `<p>Hello ${escapeHtml(name)},</p><p style="line-height:1.7">Your email has been verified. You can now sign in and create your daily timesheets.</p>`),
    };
  },
  passwordReset({ name, url }) {
    return {
      subject: 'Reset your Timesheet Management password',
      text: `Hello ${name},\n\nReset your password using this link (valid for 30 minutes):\n${url}`,
      html: layout('Reset your password', `<p>Hello ${escapeHtml(name)},</p><p style="line-height:1.7">Use the button below to choose a new password. This one-time link expires in 30 minutes.</p>`, actionButton('Reset password', url)),
    };
  },
  passwordChanged({ name }) {
    return {
      subject: 'Your Timesheet Management password changed',
      text: `Hello ${name},\n\nYour password was changed and all existing sessions were signed out.`,
      html: layout('Password changed', `<p>Hello ${escapeHtml(name)},</p><p style="line-height:1.7">Your password was changed successfully and all existing sessions were signed out. Contact an administrator if this was not you.</p>`),
    };
  },
};
