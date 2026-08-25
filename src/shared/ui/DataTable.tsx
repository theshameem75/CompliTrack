import { ChevronFirst, ChevronLast, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useT } from "../../lib/i18n/LocalizationProvider";

export type Column<T> = { key: string; header: ReactNode; render: (row: T) => ReactNode };

export function DataTable<T>({ columns, getRowId, initialPageSize = 10, pageSizeOptions = [5, 10, 20], paginated = false, rows }: {
  columns: Column<T>[];
  getRowId?: (row: T, index: number) => string;
  initialPageSize?: number;
  pageSizeOptions?: number[];
  paginated?: boolean;
  rows: T[];
}) {
  const { t } = useT();
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const visibleRows = useMemo(() => paginated ? rows.slice(page * pageSize, page * pageSize + pageSize) : rows, [page, pageSize, paginated, rows]);

  useEffect(() => {
    setPage((current) => Math.min(current, pageCount - 1));
  }, [pageCount]);

  const start = rows.length ? page * pageSize + 1 : 0;
  const end = Math.min((page + 1) * pageSize, rows.length);

  return (
    <div className="data-table-card">
      <div className="table-shell">
        <table>
          <thead>
            <tr>{columns.map((column) => <th key={column.key}>{column.header}</th>)}</tr>
          </thead>
          <tbody>
            {visibleRows.map((row, index) => (
              <tr key={getRowId?.(row, page * pageSize + index) ?? String((row as Record<string, unknown>).ItemId ?? (row as Record<string, unknown>).itemId ?? (row as Record<string, unknown>).id ?? index)}>
                {columns.map((column) => <td key={column.key}>{column.render(row)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {paginated ? <div className="pagination">
        <span className="pagination-count">{t("pagination.showing")} {start}–{end} {t("pagination.of")} {rows.length}</span>
        <div className="pagination-controls">
          <label className="pagination-size">{t("pagination.rowsPerPage")}
            <select value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(0); }}>
              {pageSizeOptions.map((size) => <option key={size} value={size}>{size}</option>)}
            </select>
          </label>
          <span className="pagination-page">{t("pagination.page")} {page + 1} {t("pagination.of")} {pageCount}</span>
          <div className="pagination-buttons">
            <button aria-label={t("pagination.first")} className="table-nav-button" disabled={page === 0} onClick={() => setPage(0)}><ChevronFirst size={16} /></button>
            <button aria-label={t("pagination.previous")} className="table-nav-button" disabled={page === 0} onClick={() => setPage((value) => Math.max(0, value - 1))}><ChevronLeft size={16} /></button>
            <button aria-label={t("pagination.next")} className="table-nav-button" disabled={page >= pageCount - 1} onClick={() => setPage((value) => Math.min(pageCount - 1, value + 1))}><ChevronRight size={16} /></button>
            <button aria-label={t("pagination.last")} className="table-nav-button" disabled={page >= pageCount - 1} onClick={() => setPage(pageCount - 1)}><ChevronLast size={16} /></button>
          </div>
        </div>
      </div> : null}
    </div>
  );
}
