import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import TablePagination from './TablePagination.jsx';

afterEach(cleanup);

describe('table pagination', () => {
  it('shows the entry range and navigates to numbered and last pages', () => {
    const onPageChange = vi.fn();
    render(<TablePagination page={2} pageSize={25} total={191} label="Timesheets" onPageChange={onPageChange} onPageSizeChange={vi.fn()} />);

    expect(screen.getByText('Showing 26 to 50 of 191 entries')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Go to page 3' }));
    expect(onPageChange).toHaveBeenCalledWith(3);
    fireEvent.click(screen.getByRole('button', { name: 'Last page' }));
    expect(onPageChange).toHaveBeenLastCalledWith(8);
  });

  it('changes the requested page size and disables backward navigation on page one', () => {
    const onPageSizeChange = vi.fn();
    render(<TablePagination page={1} pageSize={25} total={30} label="Audit records" onPageChange={vi.fn()} onPageSizeChange={onPageSizeChange} />);

    expect(screen.getByRole('button', { name: 'First page' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled();
    fireEvent.change(screen.getByRole('combobox', { name: 'Audit records per page' }), { target: { value: '50' } });
    expect(onPageSizeChange).toHaveBeenCalledWith(50);
  });
});