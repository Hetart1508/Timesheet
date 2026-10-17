import { api } from './client.js';

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
  async createCompany(company) {
    const { data } = await api.post('/companies', company);
    return data.data.company;
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
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return value || '';
  return new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
    .format(new Date(`${value}T00:00:00`));
}

export function formatDuration(duration = {}) {
  const minutes = Number(duration.minutes || 0);
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (!hours) return `${remainder} min`;
  return remainder ? `${hours} hr ${remainder} min` : `${hours} hr`;
}
