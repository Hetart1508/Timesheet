import { api } from './client.js';

const data = (response) => response.data.data;
export const adminApi = {
  dashboard: async () => data(await api.get('/admin/dashboard')),
  listTimesheets: async (params) => data(await api.get('/admin/timesheets', { params })),
  workCalendar: async (month) => data(await api.get('/admin/work-calendar', { params: { month } })),
    workCalendar: async (month, agentId) => data(await api.get('/admin/work-calendar', { params: agentId ? { month, agentId } : { month } })),
  getTimesheet: async (id) => data(await api.get(`/admin/timesheets/${id}`)).timesheet,
  reviewTimesheet: async (id, decision, comment) => data(await api.post(`/admin/timesheets/${id}/review`, { decision, comment })).timesheet,
  listAgents: async (params) => data(await api.get('/admin/agents', { params })),
  setAgentStatus: async (id, status) => data(await api.patch(`/admin/agents/${id}/status`, { status })),
  listCompanies: async (params) => data(await api.get('/admin/companies', { params })),
  createCompany: async (company) => data(await api.post('/companies', company)).company,
  updateCompanyDetails: async (id, company) => data(await api.put(`/companies/${id}`, company)).company,
  deleteCompany: async (id) => data(await api.delete(`/companies/${id}`)).company,
  updateCompany: async (id, changes) => data(await api.patch(`/admin/companies/${id}`, changes)),
  listAudits: async (params) => data(await api.get('/admin/audits', { params })),
  analytics: async (params) => data(await api.get('/admin/analytics', { params })),
  exportTimesheets: async (format, params) => api.get(`/admin/exports/timesheets.${format}`, { params, responseType: 'blob' }),
  downloadInvoice: async (agentId, month) => api.get(`/admin/invoices/${agentId}`, { params: { month }, responseType: 'blob' }),
};
