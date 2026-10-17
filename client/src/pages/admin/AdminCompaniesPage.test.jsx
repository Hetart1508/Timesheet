import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AdminCompaniesPage from './AdminCompaniesPage.jsx';
import { adminApi } from '../../api/admin.js';

vi.mock('../../api/admin.js', () => ({
  adminApi: {
    listCompanies: vi.fn(), createCompany: vi.fn(), updateCompanyDetails: vi.fn(),
    deleteCompany: vi.fn(), updateCompany: vi.fn(),
  },
}));
vi.mock('../../api/client.js', () => ({ errorMessage: (error) => error.message }));
vi.mock('../../context/AuthContext.jsx', () => ({
  useAuth: () => ({ user: { role: 'ADMIN', fullName: 'Morgan Admin' }, logout: async () => {} }),
}));

const company = { id: 7, companyName: 'Northwind Labs', address: '14 Market Street', contactPerson: '', contactPhone: '', notes: '', status: 'ACTIVE', reviewStatus: 'APPROVED', creatorName: 'Taylor Agent', visitCount: 2 };
const companyResult = { companies: [company], pagination: { page: 1, pageSize: 100, total: 1 } };

afterEach(() => { cleanup(); vi.restoreAllMocks(); });
beforeEach(() => {
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  adminApi.listCompanies.mockResolvedValue(companyResult);
  adminApi.createCompany.mockResolvedValue(company);
  adminApi.updateCompanyDetails.mockResolvedValue(company);
  adminApi.deleteCompany.mockResolvedValue({ ...company, status: 'INACTIVE' });
  adminApi.updateCompany.mockResolvedValue({});
});

describe('Admin company management', () => {
  it('creates an approved directory entry', async () => {
    render(<MemoryRouter><AdminCompaniesPage /></MemoryRouter>);
    await screen.findByText('Northwind Labs');
    expect(adminApi.listCompanies).toHaveBeenCalledWith({ pageSize: 100 });
    fireEvent.click(screen.getByRole('button', { name: 'Add company' }));
    fireEvent.change(screen.getByLabelText('Company name'), { target: { value: 'Contoso Field' } });
    fireEvent.change(screen.getByLabelText('Address'), { target: { value: '2 Main Street' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create company' }));
    await waitFor(() => expect(adminApi.createCompany).toHaveBeenCalledWith(expect.objectContaining({ companyName: 'Contoso Field', address: '2 Main Street' })));
  });

  it('edits and soft-deletes an existing company', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<MemoryRouter><AdminCompaniesPage /></MemoryRouter>);
    await screen.findByText('Northwind Labs');
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    fireEvent.change(screen.getByLabelText('Address'), { target: { value: '3 Main Street' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() => expect(adminApi.updateCompanyDetails).toHaveBeenCalledWith(7, expect.objectContaining({ address: '3 Main Street' })));
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(adminApi.deleteCompany).toHaveBeenCalledWith(7));
  });
});