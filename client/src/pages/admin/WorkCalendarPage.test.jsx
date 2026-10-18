import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import WorkCalendarPage from './WorkCalendarPage.jsx';
import { adminApi } from '../../api/admin.js';
import { currentBusinessDate, formatBusinessDate } from '../../utils/business-time.js';

vi.mock('../../api/admin.js', () => ({ adminApi: { workCalendar: vi.fn() } }));
vi.mock('../../context/AuthContext.jsx', () => ({
  useAuth: () => ({ user: { role: 'ADMIN', fullName: 'Morgan Admin' }, logout: vi.fn() }),
}));

afterEach(cleanup);
beforeEach(() => {
  adminApi.workCalendar.mockReset();
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
    expect(adminApi.workCalendar).toHaveBeenCalledWith(month);
    expect(screen.getByLabelText(`Asha Patel, ${formatBusinessDate(lowHoursDate)}, 1.5 approved hours`)).toHaveClass('intensity-low');
    expect(screen.getByLabelText(`Asha Patel, ${formatBusinessDate(highHoursDate)}, 7.5 approved hours`)).toHaveClass('intensity-highest');
  });

  it('loads the previous month when the month navigation is used', async () => {
    render(<MemoryRouter><WorkCalendarPage /></MemoryRouter>);
    await screen.findByRole('table', { name: /Approved Agent hours/ });

    const [year, month] = currentBusinessDate().slice(0, 7).split('-').map(Number);
    const previous = new Date(Date.UTC(year, month - 2, 1));
    const previousMonth = `${previous.getUTCFullYear()}-${String(previous.getUTCMonth() + 1).padStart(2, '0')}`;
    fireEvent.click(screen.getByRole('button', { name: 'Previous month' }));

    await waitFor(() => expect(adminApi.workCalendar).toHaveBeenLastCalledWith(previousMonth));
    expect(screen.getByLabelText('Calendar month')).toHaveValue(previousMonth);
  });
});