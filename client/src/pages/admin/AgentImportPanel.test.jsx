import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AgentImportPanel from './AgentImportPanel.jsx';
import { adminApi } from '../../api/admin.js';

vi.mock('../../api/admin.js', () => ({
  adminApi: {
    agentInvitations: vi.fn(), previewAgentImport: vi.fn(), commitAgentImport: vi.fn(),
  },
}));
vi.mock('../../api/client.js', () => ({ errorMessage: (error) => error.message }));

afterEach(() => { cleanup(); vi.clearAllMocks(); });
beforeEach(() => {
  vi.spyOn(window, 'confirm').mockReturnValue(true);
  adminApi.agentInvitations.mockResolvedValue([]);
  adminApi.previewAgentImport.mockResolvedValue({
    summary: { totalRows: 1, validRows: 1, errorRows: 0 },
    rows: [{ rowNumber: 2, fullName: 'Asha Patel', email: 'asha@example.com', errors: [] }],
  });
  adminApi.commitAgentImport.mockResolvedValue({ importId: 1, totalRows: 1, sentCount: 1, failedCount: 0, rows: [] });
});

describe('AgentImportPanel', () => {
  it('previews a workbook, confirms sending invitations, and refreshes pending invitations', async () => {
    render(<AgentImportPanel />);
    const file = new File(['workbook'], 'agents.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    fireEvent.change(document.querySelector('input[type="file"]'), { target: { files: [file] } });
    fireEvent.click(screen.getByRole('button', { name: /Preview and validate/ }));

    expect(await screen.findByText('asha@example.com')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Import and send setup links/ }));

    await waitFor(() => expect(adminApi.commitAgentImport).toHaveBeenCalledWith(file));
    expect(window.confirm).toHaveBeenCalled();
    expect(await screen.findByText(/1 emails sent; 0 failed/)).toBeInTheDocument();
    expect(adminApi.agentInvitations).toHaveBeenCalledTimes(2);
  });
});