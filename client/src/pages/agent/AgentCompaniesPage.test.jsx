import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AgentCompaniesPage from './AgentCompaniesPage.jsx';
import { agentApi } from '../../api/timesheets.js';

vi.mock('../../api/timesheets.js', () => ({
  agentApi: {
    listMyCompanies: vi.fn(), createCompany: vi.fn(), updateCompany: vi.fn(), deleteCompany: vi.fn(),
  },
}));
vi.mock('../../api/client.js', () => ({ errorMessage: (error) => error.message }));
vi.mock('../../context/AuthContext.jsx', () => ({
  useAuth: () => ({ user: { role: 'AGENT', fullName: 'Taylor Agent' }, logout: async () => {} }),
}));

const pendingCompany = { id: 7, companyName: 'Northwind Labs', address: '14 Market Street', contactPerson: '', contactPhone: '', notes: '', status: 'ACTIVE', reviewStatus: 'PENDING' };
const companyResult = { companies: [pendingCompany], pagination: { page: 1, pageSize: 50, total: 1 } };

afterEach(() => { cleanup(); vi.restoreAllMocks(); });
beforeEach(() => {
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  agentApi.listMyCompanies.mockResolvedValue(companyResult);
  agentApi.createCompany.mockResolvedValue(pendingCompany);
  agentApi.updateCompany.mockResolvedValue(pendingCompany);
  agentApi.deleteCompany.mockResolvedValue({ ...pendingCompany, status: 'INACTIVE' });
});

describe('Agent company management', () => {
  it('automatically searches owned companies after typing', async () => {
    render(<MemoryRouter><AgentCompaniesPage /></MemoryRouter>);
    await screen.findByText('Northwind Labs');
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search your companies' }), { target: { value: 'Northwind' } });
    await waitFor(() => expect(agentApi.listMyCompanies).toHaveBeenLastCalledWith({ search: 'Northwind', pageSize: 50 }));
    expect(screen.queryByRole('button', { name: 'Search' })).not.toBeInTheDocument();
  });

  it('creates a company submission', async () => {
    render(<MemoryRouter><AgentCompaniesPage /></MemoryRouter>);
    await screen.findByText('Northwind Labs');
    fireEvent.change(screen.getByLabelText('Company name'), { target: { value: 'Contoso Field' } });
    fireEvent.change(screen.getByLabelText('Address'), { target: { value: '2 Main Street' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create company' }));
    await waitFor(() => expect(agentApi.createCompany).toHaveBeenCalledWith(expect.objectContaining({ companyName: 'Contoso Field', address: '2 Main Street' })));
  });

  it('edits and deletes an owned pending company', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<MemoryRouter><AgentCompaniesPage /></MemoryRouter>);
    await screen.findByText('Northwind Labs');
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    fireEvent.change(screen.getByLabelText('Address'), { target: { value: '3 Main Street' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() => expect(agentApi.updateCompany).toHaveBeenCalledWith(7, expect.objectContaining({ address: '3 Main Street' })));
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(agentApi.deleteCompany).toHaveBeenCalledWith(7));
  });
});