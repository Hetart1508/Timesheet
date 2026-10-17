import { ChevronFirst, ChevronLast, ChevronLeft, ChevronRight } from 'lucide-react';

function pageNumbers(page, pageCount) {
  if (pageCount <= 5) return Array.from({ length: pageCount }, (_, index) => index + 1);
  if (page <= 3) return [1, 2, 3, 4, 'ellipsis-end', pageCount];
  if (page >= pageCount - 2) return [1, 'ellipsis-start', pageCount - 3, pageCount - 2, pageCount - 1, pageCount];
  return [1, 'ellipsis-start', page - 1, page, page + 1, 'ellipsis-end', pageCount];
}

export default function TablePagination({ page, pageSize, total, onPageChange, onPageSizeChange, label }) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const firstRecord = total ? (page - 1) * pageSize + 1 : 0;
  const lastRecord = Math.min(page * pageSize, total);

  return <footer className="table-pagination">
    <span>Showing {firstRecord} to {lastRecord} of {total} entries</span>
    <div className="table-pagination-controls">
      <label>Rows <select aria-label={`${label} per page`} value={pageSize} onChange={(event) => onPageSizeChange(Number(event.target.value))}>
        <option value={25}>25</option><option value={50}>50</option><option value={100}>100</option>
      </select></label>
      <nav className="table-page-nav" aria-label={`${label} pagination`}>
        <button className="page-button" aria-label="First page" disabled={page <= 1} onClick={() => onPageChange(1)}><ChevronFirst /></button>
        <button className="page-button" aria-label="Previous page" disabled={page <= 1} onClick={() => onPageChange(page - 1)}><ChevronLeft /></button>
        {pageNumbers(page, pageCount).map((item) => typeof item === 'number'
          ? <button className={`page-button${item === page ? ' current' : ''}`} aria-label={`Go to page ${item}`} aria-current={item === page ? 'page' : undefined} key={item} onClick={() => onPageChange(item)}>{item}</button>
          : <span className="page-ellipsis" key={item}>…</span>)}
        <button className="page-button" aria-label="Next page" disabled={page >= pageCount} onClick={() => onPageChange(page + 1)}><ChevronRight /></button>
        <button className="page-button" aria-label="Last page" disabled={page >= pageCount} onClick={() => onPageChange(pageCount)}><ChevronLast /></button>
      </nav>
    </div>
  </footer>;
}