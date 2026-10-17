import { AppError } from '../../utils/app-error.js';
import { normalizeName } from '../../utils/normalize.js';
import { utcToIstTime } from '../../utils/business-time.js';

export class CompanyService {
  constructor(repository) { this.repository = repository; }

  async list(filters) {
    const result = await this.repository.list(filters);
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
      const duplicate = await this.repository.findDuplicate(normalizedName, connection);
      if (duplicate && Number(duplicate.id) !== Number(id)) throw new AppError(409, 'COMPANY_EXISTS', `A company named ${duplicate.company_name} already exists`);
      const before = await this.repository.update(id, { ...input, companyName, normalizedName }, connection);
      if (!before) throw new AppError(404, 'COMPANY_NOT_FOUND', 'Company not found');
      await this.repository.audit({ userId: user.id, companyId: id, action: 'COMPANY_UPDATED', after: { companyName }, ipAddress: request.ip }, connection);
    });
    return this.toPublic(await this.repository.findById(id));
  }

  async visits(id) {
    const company = await this.repository.findById(id); if (!company) throw new AppError(404, 'COMPANY_NOT_FOUND', 'Company not found');
    return (await this.repository.visits(id)).map((row) => ({ id: Number(row.id), workDate: String(row.work_date).slice(0, 10), agentName: row.agent_name, agentEmail: row.agent_email, contactPerson: row.contact_person, purpose: row.purpose, visitNotes: row.visit_notes, checkInTime: utcToIstTime(row.check_in_at), checkOutTime: utcToIstTime(row.check_out_at), duration: { minutes: Number(row.duration_minutes), hours: Math.round(Number(row.duration_minutes) / 60 * 100) / 100 } }));
  }
}
