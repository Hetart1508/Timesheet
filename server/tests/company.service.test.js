import { describe, expect, it, vi } from 'vitest';
import { CompanyService } from '../src/modules/companies/company.service.js';

const pendingCompany = (overrides = {}) => ({
  id: 7,
  company_name: 'Northwind Labs',
  company_name_normalized: 'northwind labs',
  address: '14 Market Street',
  contact_person: 'Asha Patel',
  contact_phone: '555-0100',
  notes: 'Regional office',
  status: 'ACTIVE',
  review_status: 'PENDING',
  created_by: 2,
  ...overrides,
});

function makeService(company = pendingCompany()) {
  const state = { company, audits: [], created: null };
  const repository = {
    transaction: (work) => work({}),
    listMine: vi.fn(async () => ({ rows: [state.company], total: 1 })),
    findDuplicate: vi.fn(async () => null),
    findById: vi.fn(async () => state.company),
    findForUpdate: vi.fn(async () => state.company),
    create: vi.fn(async (data) => { state.created = data; return 7; }),
    update: vi.fn(async (_id, data) => { state.company = { ...state.company, company_name: data.companyName, address: data.address, contact_person: data.contactPerson, contact_phone: data.contactPhone, notes: data.notes }; }),
    deactivate: vi.fn(async () => { state.company = { ...state.company, status: 'INACTIVE' }; }),
    audit: vi.fn(async (data) => { state.audits.push(data); }),
  };
  return { service: new CompanyService(repository), repository, state };
}

const agent = { id: 2, role: 'AGENT' };
const admin = { id: 1, role: 'ADMIN' };
const companyInput = { companyName: 'Northwind Labs', address: '14 Market Street', contactPerson: 'Asha Patel', contactPhone: '555-0100', notes: 'Regional office' };

describe('CompanyService CRUD access', () => {
  it('creates Agent companies as pending and lists the creator’s records', async () => {
    const { service, repository, state } = makeService();
    await service.create(companyInput, agent);
    expect(state.created).toMatchObject({ userId: 2, reviewStatus: 'PENDING', normalizedName: 'northwind labs' });
    expect(repository.audit).toHaveBeenCalledWith(expect.objectContaining({ companyId: 7, userId: 2, after: { companyName: 'Northwind Labs', reviewStatus: 'PENDING' } }), expect.anything());
    const mine = await service.listMine(2, { search: '', page: 1, pageSize: 20 });
    expect(mine.companies[0]).toMatchObject({ id: 7, reviewStatus: 'PENDING', status: 'ACTIVE' });
  });

  it('creates Admin companies as approved directory entries', async () => {
    const { service, state } = makeService();
    await service.create(companyInput, admin);
    expect(state.created).toMatchObject({ userId: 1, reviewStatus: 'APPROVED' });
  });

  it('allows an Agent to edit and deactivate their own pending company', async () => {
    const { service, repository, state } = makeService();
    await service.update(7, { ...companyInput, companyName: 'Northwind Labs West' }, agent);
    expect(repository.update).toHaveBeenCalledWith(7, expect.objectContaining({ companyName: 'Northwind Labs West' }), expect.anything());
    await service.delete(7, agent);
    expect(state.company.status).toBe('INACTIVE');
    expect(state.audits.map((audit) => audit.action)).toEqual(['COMPANY_UPDATED', 'COMPANY_DELETED']);
  });

  it('prevents Agents from changing another Agent’s or an approved company', async () => {
    const otherOwner = makeService(pendingCompany({ created_by: 9 }));
    await expect(otherOwner.service.delete(7, agent)).rejects.toMatchObject({ statusCode: 404, code: 'COMPANY_NOT_FOUND' });

    const approved = makeService(pendingCompany({ review_status: 'APPROVED' }));
    await expect(approved.service.update(7, companyInput, agent)).rejects.toMatchObject({ statusCode: 409, code: 'COMPANY_LOCKED' });
  });

  it('allows Admins to edit approved companies and deactivate them', async () => {
    const { service, state } = makeService(pendingCompany({ review_status: 'APPROVED' }));
    await service.update(7, companyInput, admin);
    await service.delete(7, admin);
    expect(state.company.status).toBe('INACTIVE');
  });
});