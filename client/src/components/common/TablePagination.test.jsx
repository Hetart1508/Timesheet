import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import TablePagination from './TablePagination.jsx';

afterEach(cleanup);

describe('table pagination', () => {
  it('shows the entry range and navigates to numbered and last pages', () => {
    const onPageChange = vi.fn();
    render(<TablePagination page={2} pageSize={10} total={191} label="Timesheets" onPageChange={onPageChange} />);

    expect(screen.getByText('Showing 11 to 20 of 191 entries')).toBeInTheDocument();
    expect(screen.getByText('10 per page')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Go to page 3' }));
    expect(onPageChange).toHaveBeenCalledWith(3);
    fireEvent.click(screen.getByRole('button', { name: 'Last page' }));
    expect(onPageChange).toHaveBeenLastCalledWith(20);
  });

  it('keeps the page size fixed and disables backward navigation on page one', () => {
    render(<TablePagination page={1} pageSize={10} total={30} label="Audit records" onPageChange={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'First page' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    expect(screen.getByText('Showing 1 to 10 of 30 entries')).toBeInTheDocument();
  });
});