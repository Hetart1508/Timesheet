import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import WorkCalendarPage from './WorkCalendarPage.jsx';
import { adminApi } from '../../api/admin.js';
import { currentBusinessDate, formatBusinessDate } from '../../utils/business-time.js';

vi.mock('../../api/admin.js', () => ({ adminApi: { workCalendar: vi.fn(), listAgents: vi.fn() } }));
vi.mock('../../context/AuthContext.jsx', () => ({
  useAuth: () => ({ user: { role: 'ADMIN', fullName: 'Morgan Admin' }, logout: vi.fn() }),
}));

afterEach(cleanup);
beforeEach(() => {
  adminApi.workCalendar.mockReset();
  adminApi.listAgents.mockReset();
  adminApi.workCalendar.mockImplementation(async (month) => ({
    month,
    agents: [{
      id: 4,
      fullName: 'Asha Patel',
      status: 'ACTIVE',
      approvedHoursByDate: { [`${month}-03`]: 1.5, [`${month}-04`]: 7.5 },
    }],
  }));
});

describe('Admin Work Calendar', () => {
  it('colors approved hours by intensity and loads the selected month', async () => {
    render(<MemoryRouter><WorkCalendarPage /></MemoryRouter>);
    const month = currentBusinessDate().slice(0, 7);
    const lowHoursDate = `${month}-03`;
    const highHoursDate = `${month}-04`;

    expect(await screen.findByRole('table', { name: /Approved Agent hours/ })).toBeInTheDocument();
    expect(adminApi.workCalendar).toHaveBeenCalledWith(month, undefined);
    expect(screen.getByLabelText(`Asha Patel, ${formatBusinessDate(lowHoursDate)}, 1.5 approved hours`)).toHaveClass('intensity-low');
    expect(screen.getByLabelText(`Asha Patel, ${formatBusinessDate(highHoursDate)}, 7.5 approved hours`)).toHaveClass('intensity-highest');
    const cell = screen.getByLabelText(`Asha Patel, ${formatBusinessDate(lowHoursDate)}, 1.5 approved hours`);
    expect(cell.closest('td')).not.toHaveClass('weekend');
    fireEvent.mouseEnter(cell);
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('loads the previous month when the month navigation is used', async () => {
    render(<MemoryRouter><WorkCalendarPage /></MemoryRouter>);
    await screen.findByRole('table', { name: /Approved Agent hours/ });

    const [year, month] = currentBusinessDate().slice(0, 7).split('-').map(Number);
    const previous = new Date(Date.UTC(year, month - 2, 1));
    const previousMonth = `${previous.getUTCFullYear()}-${String(previous.getUTCMonth() + 1).padStart(2, '0')}`;
    const initialCallCount = adminApi.workCalendar.mock.calls.length;
    fireEvent.click(screen.getByRole('button', { name: 'Previous month' }));

    expect(screen.getByLabelText('Calendar month')).toHaveValue(previousMonth);
    expect(adminApi.workCalendar).toHaveBeenCalledTimes(initialCallCount);
    fireEvent.click(screen.getByRole('button', { name: 'Apply filters' }));
    await waitFor(() => expect(adminApi.workCalendar).toHaveBeenLastCalledWith(previousMonth, undefined));
  });

  it('debounces Agent suggestions and applies the selected Agent on Enter', async () => {
    adminApi.listAgents.mockResolvedValue({ agents: [{ id: 9, fullName: 'Asha Patel', email: 'asha@example.com' }] });
    render(<MemoryRouter><WorkCalendarPage /></MemoryRouter>);
    const month = currentBusinessDate().slice(0, 7);
    const search = screen.getByRole('combobox', { name: 'Search Agents' });

    fireEvent.change(search, { target: { value: 'Asha' } });
    expect(adminApi.listAgents).not.toHaveBeenCalled();
    fireEvent.click(await screen.findByRole('option', { name: /Asha Patel/ }));
    expect(search).toHaveValue('Asha Patel');
    expect(adminApi.workCalendar).toHaveBeenCalledTimes(1);

    fireEvent.submit(search.closest('form'));
    await waitFor(() => expect(adminApi.workCalendar).toHaveBeenLastCalledWith(month, '9'));
    const cell = await screen.findByLabelText(`Asha Patel, ${formatBusinessDate(`${month}-03`)}, 1.5 approved hours`);
    fireEvent.mouseEnter(cell);
    expect(screen.getByRole('tooltip')).toHaveTextContent('1.5 hours');
    expect(screen.getByRole('tooltip')).toHaveTextContent(formatBusinessDate(`${month}-03`));
  });
});