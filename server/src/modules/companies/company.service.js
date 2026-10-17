import { AppError } from '../../utils/app-error.js';
import { normalizeName } from '../../utils/normalize.js';
import { utcToIstTime } from '../../utils/business-time.js';

export class CompanyService {
  constructor(repository) { this.repository = repository; }

  async list(filters) {
    const result = await this.repository.list(filters);
    return { companies: result.rows.map(this.toPublic), pagination: { page: filters.page, pageSize: filters.pageSize, total: result.total } };
  }

  async listMine(agentId, filters) {
    const result = await this.repository.listMine(agentId, filters);
    return { companies: result.rows.map(this.toPublic), pagination: { page: filters.page, pageSize: filters.pageSize, total: result.total } };
  }

  toPublic(company) {
    return {
      id: Number(company.id), companyName: company.company_name, address: company.address,
      contactPerson: company.contact_person || '', contactPhone: company.contact_phone || '',
      notes: company.notes || '', status: company.status, reviewStatus: company.review_status,
    };
  }

  async create(input, user, request = {}) {
    const companyName = normalizeName(input.companyName);
    const normalizedName = companyName.toLowerCase();
    const companyId = await this.repository.transaction(async (connection) => {
      const duplicate = await this.repository.findDuplicate(normalizedName, connection);
      if (duplicate) throw new AppError(409, 'COMPANY_EXISTS', `A company named ${duplicate.company_name} already exists`);
      const id = await this.repository.create({ ...input, companyName, normalizedName, userId: user.id, reviewStatus: user.role === 'ADMIN' ? 'APPROVED' : 'PENDING' }, connection);
      await this.repository.audit({ userId: user.id, companyId: id, after: { companyName, reviewStatus: user.role === 'ADMIN' ? 'APPROVED' : 'PENDING' }, ipAddress: request.ip }, connection);
      return id;
    });
    return this.toPublic(await this.repository.findById(companyId));
  }

  async update(id, input, user, request = {}) {
    const companyName = normalizeName(input.companyName); const normalizedName = companyName.toLowerCase();
    await this.repository.transaction(async (connection) => {
      const before = await this.repository.findForUpdate(id, connection);
      if (!before) throw new AppError(404, 'COMPANY_NOT_FOUND', 'Company not found');
      this.assertCanManage(before, user);
      const duplicate = await this.repository.findDuplicate(normalizedName, connection);
      if (duplicate && Number(duplicate.id) !== Number(id)) throw new AppError(409, 'COMPANY_EXISTS', `A company named ${duplicate.company_name} already exists`);
      await this.repository.update(id, { ...input, companyName, normalizedName }, connection);
      await this.repository.audit({ userId: user.id, companyId: id, action: 'COMPANY_UPDATED', before: this.auditDetails(before), after: this.auditDetails({ ...before, company_name: companyName, address: input.address, contact_person: input.contactPerson, contact_phone: input.contactPhone, notes: input.notes }), ipAddress: request.ip }, connection);
    });
    return this.toPublic(await this.repository.findById(id));
  }

  async delete(id, user, request = {}) {
    await this.repository.transaction(async (connection) => {
      const company = await this.repository.findForUpdate(id, connection);
      if (!company) throw new AppError(404, 'COMPANY_NOT_FOUND', 'Company not found');
      this.assertCanManage(company, user);
      if (company.status === 'INACTIVE') return;
      await this.repository.deactivate(id, connection);
      await this.repository.audit({ userId: user.id, companyId: id, action: 'COMPANY_DELETED', before: { status: company.status }, after: { status: 'INACTIVE' }, ipAddress: request.ip }, connection);
    });
    return this.toPublic(await this.repository.findById(id));
  }

  assertCanManage(company, user) {
    if (user.role === 'ADMIN') return;
    if (user.role !== 'AGENT' || Number(company.created_by) !== Number(user.id)) {
      throw new AppError(404, 'COMPANY_NOT_FOUND', 'Company not found');
    }
    if (company.review_status !== 'PENDING' || company.status !== 'ACTIVE') {
      throw new AppError(409, 'COMPANY_LOCKED', 'Only active companies pending review can be changed by their creator');
    }
  }

  auditDetails(company) {
    return { companyName: company.company_name, address: company.address, contactPerson: company.contact_person || '', contactPhone: company.contact_phone || '', notes: company.notes || '' };
  }

  async visits(id) {
    const company = await this.repository.findById(id); if (!company) throw new AppError(404, 'COMPANY_NOT_FOUND', 'Company not found');
    return (await this.repository.visits(id)).map((row) => ({ id: Number(row.id), workDate: String(row.work_date).slice(0, 10), agentName: row.agent_name, agentEmail: row.agent_email, contactPerson: row.contact_person, purpose: row.purpose, visitNotes: row.visit_notes, checkInTime: utcToIstTime(row.check_in_at), checkOutTime: utcToIstTime(row.check_out_at), duration: { minutes: Number(row.duration_minutes), hours: Math.round(Number(row.duration_minutes) / 60 * 100) / 100 } }));
  }
}
