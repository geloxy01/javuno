import HeaderPopover, { HEADER_BUTTON } from "./HeaderPopover";
import { FilterIcon, SearchIcon } from "./uiIcons";
import { XIcon } from "./icons";
import { DUE_OPTIONS, EMPTY_FILTERS, countActiveFilters } from "../lib/filters";

const heading =
  "mb-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400";
const row =
  "flex cursor-pointer items-center gap-2 rounded-lg px-1.5 py-1 text-sm hover:bg-slate-100 dark:hover:bg-slate-700";

function toggle(list, id) {
  return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
}

function FiltersPanel({ filters, onFilters, labels, members }) {
  const active = countActiveFilters(filters) > 0;

  return (
    <div className="space-y-4">
      <section>
        <h5 className={heading}>Labels</h5>
        {labels.length === 0 ? (
          <p className="text-sm text-slate-400">No labels on this board yet.</p>
        ) : (
          <ul className="space-y-0.5">
            {labels.map((label) => (
              <li key={label.id}>
                <label className={row}>
                  <input
                    type="checkbox"
                    checked={filters.labels.includes(label.id)}
                    onChange={() =>
                      onFilters({
                        ...filters,
                        labels: toggle(filters.labels, label.id),
                      })
                    }
                    className="accent-javuno"
                  />
                  <span
                    style={{ background: label.color }}
                    className="h-4 w-8 shrink-0 rounded"
                  />
                  <span className="truncate">
                    {label.name || "Unnamed label"}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h5 className={heading}>Members</h5>
        <ul className="space-y-0.5">
          <li>
            <label className={row}>
              <input
                type="checkbox"
                checked={filters.members.includes("none")}
                onChange={() =>
                  onFilters({
                    ...filters,
                    members: toggle(filters.members, "none"),
                  })
                }
                className="accent-javuno"
              />
              <span>No members</span>
            </label>
          </li>
          {members.map((m) => (
            <li key={m.uid}>
              <label className={row}>
                <input
                  type="checkbox"
                  checked={filters.members.includes(m.uid)}
                  onChange={() =>
                    onFilters({
                      ...filters,
                      members: toggle(filters.members, m.uid),
                    })
                  }
                  className="accent-javuno"
                />
                <span className="truncate">{m.displayName}</span>
              </label>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h5 className={heading}>Due date</h5>
        <ul className="space-y-0.5">
          {DUE_OPTIONS.map((option) => (
            <li key={option.value}>
              <label className={row}>
                <input
                  type="radio"
                  name="due-filter"
                  checked={filters.due === option.value}
                  onChange={() => onFilters({ ...filters, due: option.value })}
                  className="accent-javuno"
                />
                <span>{option.label}</span>
              </label>
            </li>
          ))}
        </ul>
      </section>

      {active && (
        <button
          type="button"
          onClick={() => onFilters(EMPTY_FILTERS)}
          className="btn-secondary w-full !py-2"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}

export default function BoardToolbar({
  searchRef,
  query,
  onQuery,
  filters,
  onFilters,
  labels,
  members,
  matchCount,
  totalCount,
  active,
  onClear,
}) {
  const filterCount = countActiveFilters(filters);

  function handleKeyDown(e) {
    if (e.key === "Escape") {
      e.preventDefault();
      if (query) onQuery("");
      else e.currentTarget.blur();
    }
  }

  return (
    <div className="relative z-20 flex flex-wrap items-center gap-2 bg-black/15 px-3 py-2 sm:px-4">
      <HeaderPopover
        align="left"
        label="Filter cards"
        title="Filter cards"
        buttonClassName={`${HEADER_BUTTON} !py-1.5`}
        trigger={
          <>
            <FilterIcon />
            <span>Filter</span>
            {filterCount > 0 && (
              <span className="rounded-full bg-white px-1.5 text-xs font-bold text-javuno-dark">
                {filterCount}
              </span>
            )}
          </>
        }
      >
        <FiltersPanel
          filters={filters}
          onFilters={onFilters}
          labels={labels}
          members={members}
        />
      </HeaderPopover>

      <div className="relative min-w-[9rem] flex-1 sm:max-w-xs">
        <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/80" />
        <input
          ref={searchRef}
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search cards  ( / )"
          aria-label="Search cards"
          className="w-full rounded-lg bg-white/20 py-1.5 pl-8 pr-8 text-sm text-white outline-none transition placeholder:text-white/70 focus:bg-white focus:text-slate-800 focus:ring-2 focus:ring-white/80 focus:placeholder:text-slate-400"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              onQuery("");
              searchRef.current?.focus();
            }}
            aria-label="Clear search"
            className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-1 text-white/80 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/80"
          >
            <XIcon className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {active && (
        <div className="flex items-center gap-2 text-xs font-medium text-white">
          <span>
            {matchCount} of {totalCount} {totalCount === 1 ? "card" : "cards"}{" "}
            match
          </span>
          <button
            type="button"
            onClick={onClear}
            className="rounded-lg bg-white/20 px-2 py-1 font-semibold transition hover:bg-white/30 focus:outline-none focus:ring-2 focus:ring-white/80"
          >
            Clear
          </button>
        </div>
      )}
    </div>
  );
}
