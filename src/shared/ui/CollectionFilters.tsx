import { Search, SlidersHorizontal, X } from "lucide-react";
import { useEffect, useRef } from "react";
import { SelectMenu } from "./SelectMenu";
import type { SelectOption } from "./SelectMenu";

export function CollectionFilters({
  onClear,
  onSearchChange,
  onStatusChange,
  resultCount,
  resultNoun,
  search,
  searchPlaceholder,
  statusOptions,
  statusValue
}: {
  onClear: () => void;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  resultCount: number;
  resultNoun: string;
  search: string;
  searchPlaceholder: string;
  statusOptions: SelectOption[];
  statusValue: string;
}) {
  const hasFilters = Boolean(search.trim()) || statusValue !== "all";
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function focusSearch(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchRef.current?.focus();
      }
    }
    document.addEventListener("keydown", focusSearch);
    return () => document.removeEventListener("keydown", focusSearch);
  }, []);

  return <div className="collection-filters">
    <div className="collection-search">
      <span className="filter-control-label"><Search size={14} /> Search</span>
      <div className="collection-search-input">
        <Search size={18} />
        <input aria-label={searchPlaceholder} placeholder={searchPlaceholder} ref={searchRef} value={search} onChange={(event) => onSearchChange(event.target.value)} />
        {search ? <button aria-label="Clear search" type="button" onClick={() => onSearchChange("")}><X size={15} /></button> : <kbd>⌘ K</kbd>}
      </div>
    </div>

    <div className="collection-status">
      <SelectMenu label="Status" options={statusOptions} value={statusValue} onChange={onStatusChange} />
    </div>

    <div className="collection-filter-summary">
      <span className="filter-result-badge"><SlidersHorizontal size={14} /><strong>{resultCount}</strong> {resultNoun}{resultCount === 1 ? "" : "s"}</span>
      {hasFilters ? <button className="clear-filters-button" type="button" onClick={onClear}>Clear filters</button> : <span className="filter-default-label">Showing all</span>}
    </div>
  </div>;
}
