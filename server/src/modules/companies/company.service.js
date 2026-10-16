import { AppError } from '../../utils/app-error.js';
import { normalizeName } from '../../utils/normalize.js';

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
}
