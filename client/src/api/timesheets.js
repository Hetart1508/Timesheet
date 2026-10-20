import { api } from './client.js';
import { formatBusinessDate } from '../utils/business-time.js';

export const agentApi = {
  async dashboard() {
    const { data } = await api.get('/agent/dashboard');
    return data.data;
  },
  async listTimesheets(filters = {}) {
    const { data } = await api.get('/agent/timesheets', { params: filters });
    return data.data;
  },
  async startTimesheet(workDate) {
    const { data } = await api.post('/agent/timesheets', workDate ? { workDate } : {});
    return data.data.timesheet;
  },
  async getTimesheet(id) {
    const { data } = await api.get(`/agent/timesheets/${id}`);
    return data.data.timesheet;
  },
  async saveSummary(id, dailySummary) {
    const { data } = await api.put(`/agent/timesheets/${id}`, { dailySummary });
    return data.data.timesheet;
  },
  async deleteTimesheet(id) {
    await api.delete(`/agent/timesheets/${id}`);
  },
  async addVisit(timesheetId, visit) {
    const { data } = await api.post(`/agent/timesheets/${timesheetId}/visits`, visit);
    return data.data.timesheet;
  },
  async updateVisit(visitId, visit) {
    const { data } = await api.put(`/agent/visits/${visitId}`, visit);
    return data.data.timesheet;
  },
  async deleteVisit(visitId) {
    const { data } = await api.delete(`/agent/visits/${visitId}`);
    return data.data.timesheet;
  },
  async submitTimesheet(id) {
    const { data } = await api.post(`/agent/timesheets/${id}/submit`);
    return data.data.timesheet;
  },
  async listCompanies(search = '') {
    const { data } = await api.get('/companies', { params: { search, pageSize: 50 } });
    return data.data.companies;
  },
  async listMyCompanies(params = {}) {
    const { data } = await api.get('/companies/mine', { params });
    return data.data;
  },
  async createCompany(company) {
    const { data } = await api.post('/companies', company);
    return data.data.company;
  },
  async updateCompany(id, company) {
    const { data } = await api.put(`/companies/${id}`, company);
    return data.data.company;
  },
  async deleteCompany(id) {
    const { data } = await api.delete(`/companies/${id}`);
    return data.data.company;
  },
  async companyVisits(id) {
    const { data } = await api.get(`/companies/${id}/visits`);
    return data.data.visits;
  },
};

export const statusLabels = {
  DRAFT: 'Draft',
  SUBMITTED: 'Submitted',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  CHANGES_REQUESTED: 'Changes requested',
};

export function formatWorkDate(value) {
  return formatBusinessDate(value);
}

export function formatDuration(duration = {}) {
  const minutes = Number(duration.minutes || 0);
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (!hours) return `${remainder} min`;
  return remainder ? `${hours} hr ${remainder} min` : `${hours} hr`;
}
