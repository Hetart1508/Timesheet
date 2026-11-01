import { env } from '../../config/env.js';
import { logger } from '../../config/logger.js';
import { templates } from './templates.js';

export class EmailService {
  constructor(repository, fetchImplementation = fetch, config = env) {
    this.repository = repository;
    this.fetch = fetchImplementation;
    this.config = config;
  }

  async sendProviderMessage(recipient, message) {
    if (this.config.DEV_EMAIL_MODE) {
      logger.info({ recipient, subject: message.subject, developmentLink: message.developmentLink }, 'Development email generated');
      return { messageId: 'development-mode' };
    }
    if (!this.config.BREVO_API_KEY || !this.config.BREVO_SENDER_EMAIL) throw new Error('Email provider is not configured');

    const response = await this.fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': this.config.BREVO_API_KEY, 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({
        sender: { name: this.config.BREVO_SENDER_NAME, email: this.config.BREVO_SENDER_EMAIL },
        to: [{ email: recipient }],
        subject: message.subject,
        htmlContent: message.html,
        textContent: message.text,
      }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) throw new Error(`Brevo request failed with status ${response.status}`);
    return response.json();
  }

  async sendTracked({ recipient, type, entityId, entityType = 'USER', template, developmentLink }) {
    const notificationId = await this.repository.createNotification({
      recipient, type, entityType, entityId, payload: null,
    });
    try {
      const result = await this.sendProviderMessage(recipient, { ...template, developmentLink });
      await this.repository.completeNotification(notificationId, 'SENT');
      return { delivered: true, messageId: result.messageId };
    } catch (error) {
      logger.warn({ err: error, notificationId, type }, 'Transactional email delivery failed');
      await this.repository.completeNotification(notificationId, 'FAILED', String(error.message).slice(0, 500));
      return { delivered: false };
    }
  }

  sendVerification(user, otp) {
    return this.sendTracked({
      recipient: user.email,
      type: 'EMAIL_VERIFICATION',
      entityId: user.id,
      template: templates.verification({ name: user.fullName, otp, expiresInMinutes: this.config.EMAIL_OTP_TTL_MINUTES }),
      developmentLink: `Development verification OTP: ${otp}`,
    });
  }

  sendAdminLoginOtp(user, otp) {
    return this.sendTracked({
      recipient: user.email,
      type: 'ADMIN_LOGIN_OTP',
      entityId: user.id,
      template: templates.adminLogin({ name: user.fullName, otp, expiresInMinutes: this.config.EMAIL_OTP_TTL_MINUTES }),
      developmentLink: `Development Admin login OTP: ${otp}`,
    });
  }

  sendWelcome(user) {
    return this.sendTracked({ recipient: user.email, type: 'WELCOME', entityId: user.id, template: templates.welcome({ name: user.fullName, role: user.role }) });
  }

  sendPasswordReset(user, rawToken) {
    const portal = user.role === 'ADMIN' ? '&portal=admin' : '';
    const url = `${this.config.APP_BASE_URL}/reset-password?token=${encodeURIComponent(rawToken)}${portal}`;
    return this.sendTracked({ recipient: user.email, type: 'PASSWORD_RESET', entityId: user.id, template: templates.passwordReset({ name: user.fullName, url }), developmentLink: url });
  }

  sendAgentInvitation(invitation, url) {
    return this.sendTracked({
      recipient: invitation.email,
      type: 'AGENT_INVITATION',
      entityType: 'AGENT_INVITATION',
      entityId: invitation.id,
      template: templates.agentInvitation({ name: invitation.fullName, url }),
      developmentLink: url,
    });
  }

  sendPasswordChanged(user) {
    return this.sendTracked({ recipient: user.email, type: 'PASSWORD_CHANGED', entityId: user.id, template: templates.passwordChanged({ name: user.fullName }) });
  }

  sendTimesheetSubmitted(admin, timesheet) {
    const url = `${this.config.APP_BASE_URL}/admin/timesheets/${timesheet.id}`;
    return this.sendTracked({
      recipient: admin.email, type: 'TIMESHEET_SUBMITTED', entityId: timesheet.id,
      template: templates.timesheetSubmitted({ adminName: admin.full_name, agentName: timesheet.agentName, workDate: timesheet.workDate, url }),
      developmentLink: url,
    });
  }

  sendTimesheetReviewed(agent, timesheet) {
    const url = `${this.config.APP_BASE_URL}/timesheets/${timesheet.id}`;
    return this.sendTracked({
      recipient: agent.email, type: 'TIMESHEET_REVIEWED', entityId: timesheet.id,
      template: templates.timesheetReviewed({ agentName: agent.fullName, workDate: timesheet.workDate, decision: timesheet.decision, comment: timesheet.comment, url }),
      developmentLink: url,
    });
  }

  sendTimesheetConfirmation(agent, timesheet) {
    const base = `${this.config.APP_BASE_URL}/confirm-timesheet?token=${encodeURIComponent(timesheet.token)}`;
    return this.sendTracked({
      recipient: agent.email, type: 'TIMESHEET_CONFIRMATION', entityType: 'TIMESHEET', entityId: timesheet.id,
      template: templates.timesheetConfirmation({ agentName: agent.fullName, workDate: timesheet.workDate, yesUrl: `${base}&response=YES`, noUrl: `${base}&response=NO` }),
      developmentLink: base,
    });
  }
}
