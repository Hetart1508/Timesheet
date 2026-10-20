import { describe, expect, it, vi } from 'vitest';
import { EmailService } from '../src/services/email/email.service.js';
import { FakeRepository } from './helpers/fake-auth.js';

const config = {
  DEV_EMAIL_MODE: false,
  BREVO_API_KEY: 'test-api-key',
  BREVO_SENDER_NAME: 'Timesheet Management',
  BREVO_SENDER_EMAIL: 'sender@example.com',
  APP_BASE_URL: 'http://localhost:5173',
  EMAIL_OTP_TTL_MINUTES: 10,
};

describe('Brevo email delivery', () => {
  it('uses the transactional email endpoint and marks successful delivery', async () => {
    const repository = new FakeRepository();
    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({ messageId: 'brevo-id' }) }));
    const service = new EmailService(repository, fetchMock, config);
    const result = await service.sendVerification({ id: 1, email: 'asha@example.com', fullName: 'Asha Patel' }, 'raw-token');
    expect(result).toMatchObject({ delivered: true, messageId: 'brevo-id' });
    expect(fetchMock).toHaveBeenCalledWith('https://api.brevo.com/v3/smtp/email', expect.objectContaining({ method: 'POST' }));
    expect(repository.notifications[0]).toMatchObject({ status: 'SENT', payload: null });
  });

  it('persists a safe failure status without throwing into the account transaction', async () => {
    const repository = new FakeRepository();
    const service = new EmailService(repository, async () => ({ ok: false, status: 429 }), config);
    const result = await service.sendPasswordReset({ id: 1, email: 'asha@example.com', fullName: 'Asha Patel' }, 'raw-token');
    expect(result).toEqual({ delivered: false });
    expect(repository.notifications[0]).toMatchObject({ status: 'FAILED', payload: null });
  });

  it('sends Agent setup links as tracked invitation emails', async () => {
    const repository = new FakeRepository();
    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({ messageId: 'invite-id' }) }));
    const service = new EmailService(repository, fetchMock, config);
    const result = await service.sendAgentInvitation(
      { id: 7, fullName: 'Asha Patel', email: 'asha@example.com' },
      'https://app.example.com/accept-invitation?token=secret',
    );

    expect(result).toMatchObject({ delivered: true, messageId: 'invite-id' });
    expect(repository.notifications[0]).toMatchObject({ status: 'SENT', type: 'AGENT_INVITATION', entityType: 'AGENT_INVITATION', entityId: 7 });
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).textContent).toContain('https://app.example.com/accept-invitation?token=secret');
  });
});
