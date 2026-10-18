import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AdminInvoicesPage from './AdminInvoicesPage.jsx';
import { adminApi } from '../../api/admin.js';

vi.mock('../../api/admin.js', () => ({
  adminApi: { listAgents: vi.fn(), downloadInvoice: vi.fn() },
}));
vi.mock('../../api/client.js', () => ({ errorMessage: (error) => error.message }));
vi.mock('../../context/AuthContext.jsx', () => ({
  useAuth: () => ({ user: { role: 'ADMIN', fullName: 'Morgan Admin' }, logout: async () => {} }),
}));

afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
beforeEach(() => {
  adminApi.listAgents.mockResolvedValue({ agents: [{ id: 7, fullName: 'Taylor Agent', email: 'taylor@example.com' }] });
  adminApi.downloadInvoice.mockResolvedValue({ data: new Blob(['%PDF-invoice']) });
  vi.stubGlobal('URL', { createObjectURL: vi.fn(() => 'blob:agent-invoice'), revokeObjectURL: vi.fn() });
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
});

describe('Admin monthly Agent invoices', () => {
  it('generates and downloads a PDF for the selected Agent and month', async () => {
    render(<MemoryRouter><AdminInvoicesPage /></MemoryRouter>);
    await screen.findByRole('option', { name: 'Taylor Agent · taylor@example.com' });
    expect(screen.getByText('INR 1,000')).toBeInTheDocument();
    expect(screen.getByText('INR 800')).toBeInTheDocument();
    expect(screen.getByText('INR 600')).toBeInTheDocument();

    fireEvent.change(screen.getByRole('combobox', { name: 'Agent' }), { target: { value: '7' } });
    fireEvent.change(screen.getByLabelText('Invoice month'), { target: { value: '2026-09' } });
    fireEvent.click(screen.getByRole('button', { name: 'Generate invoice PDF' }));

    await waitFor(() => expect(adminApi.downloadInvoice).toHaveBeenCalledWith('7', '2026-09'));
    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalled();
    expect(await screen.findByText('Invoice PDF generated for Taylor Agent (2026-09).')).toBeInTheDocument();
  });
});