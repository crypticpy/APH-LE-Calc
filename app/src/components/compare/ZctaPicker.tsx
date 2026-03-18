import { useState, useRef, useEffect } from "react";
import { TRAVIS_COUNTY_ZCTAS, APH_COLORS } from "../../lib/constants";
import { useHealthData } from "../../hooks/useHealthData";
import { formatValue } from "../../lib/formatters";

const ZCTA_COLORS = [APH_COLORS.blue, APH_COLORS.green, APH_COLORS.orange];

const POPULAR_ZIPS: { label: string; zip: string }[] = [
  { label: "Downtown", zip: "78701" },
  { label: "East Austin", zip: "78702" },
  { label: "South Austin", zip: "78704" },
  { label: "West Lake", zip: "78746" },
  { label: "Pflugerville", zip: "78660" },
  { label: "North Austin", zip: "78758" },
  { label: "Round Rock", zip: "78681" },
  { label: "Manor", zip: "78653" },
];

interface ZctaPickerProps {
  selectedZctas: string[];
  onAdd: (zcta: string) => void;
  onRemove: (zcta: string) => void;
  maxSelections: number;
}

export default function ZctaPicker({
  selectedZctas,
  onAdd,
  onRemove,
  maxSelections,
}: ZctaPickerProps) {
  const { healthData } = useHealthData();
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const filtered = query.trim()
    ? TRAVIS_COUNTY_ZCTAS.filter(
        (z) => z.includes(query.trim()) && !selectedZctas.includes(z),
      )
    : [];

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Reset highlight when filtered list changes
  useEffect(() => {
    setHighlightedIndex(0);
  }, [filtered.length]);

  function handleSelect(zcta: string) {
    onAdd(zcta);
    setQuery("");
    setIsOpen(false);
    inputRef.current?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!isOpen || filtered.length === 0) {
      if (e.key === "Enter" && filtered.length > 0) {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      handleSelect(filtered[highlightedIndex]);
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  }

  const atMax = selectedZctas.length >= maxSelections;
  const remaining = Math.max(0, 2 - selectedZctas.length);

  // Quick-pick zips: filter out already-selected ones
  const availableQuickPicks = POPULAR_ZIPS.filter(
    (p) => !selectedZctas.includes(p.zip),
  );

  return (
    <div className="w-full">
      {/* Step indicators */}
      <div className="flex items-center gap-3 mb-4">
        {[1, 2, 3].map((step) => {
          const isFilled = selectedZctas.length >= step;
          const isCurrent = selectedZctas.length === step - 1;
          const zcta = selectedZctas[step - 1];
          return (
            <div key={step} className="flex items-center gap-2">
              {step > 1 && (
                <div
                  className={`w-6 h-px ${isFilled ? "bg-aph-blue" : "bg-aph-light-gray"}`}
                />
              )}
              <div
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  isFilled
                    ? "text-white shadow-sm"
                    : isCurrent
                      ? "bg-aph-light-blue text-aph-blue border-2 border-aph-blue/30"
                      : "bg-gray-50 text-aph-dark-gray/50 border border-dashed border-aph-light-gray"
                }`}
                style={
                  isFilled
                    ? {
                        backgroundColor:
                          ZCTA_COLORS[step - 1] || APH_COLORS.blue,
                      }
                    : undefined
                }
              >
                {isFilled ? (
                  <>
                    {zcta}
                    <button
                      type="button"
                      onClick={() => onRemove(zcta)}
                      className="hover:opacity-80 transition-opacity"
                      aria-label={`Remove ${zcta}`}
                    >
                      <span className="material-symbols-outlined text-sm leading-none">
                        close
                      </span>
                    </button>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-sm">
                      {step <= 2 ? "add_circle" : "add"}
                    </span>
                    {step <= 2 ? `Zip ${step}` : "Optional"}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Status message */}
      {!atMax && (
        <p className="text-sm text-aph-dark-gray mb-3">
          {selectedZctas.length === 0 && (
            <>
              <span className="material-symbols-outlined text-sm align-text-bottom mr-1 text-aph-blue">
                arrow_downward
              </span>
              Pick your first zip code to get started
            </>
          )}
          {selectedZctas.length === 1 && (
            <>
              <span className="material-symbols-outlined text-sm align-text-bottom mr-1 text-aph-orange">
                add_circle
              </span>
              Add one more to start comparing
            </>
          )}
          {selectedZctas.length === 2 && (
            <>
              <span className="material-symbols-outlined text-sm align-text-bottom mr-1 text-aph-green">
                check_circle
              </span>
              Comparison ready! Add a 3rd zip code or scroll down to see
              results.
            </>
          )}
        </p>
      )}

      {/* Search input */}
      {!atMax && (
        <div className="relative mb-4">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-aph-dark-gray text-xl">
            search
          </span>
          <input
            ref={inputRef}
            type="text"
            inputMode="numeric"
            value={query}
            onChange={(e) => {
              const val = e.target.value.replace(/[^0-9]/g, "").slice(0, 5);
              setQuery(val);
              setIsOpen(val.trim().length > 0);
            }}
            onFocus={() => {
              if (query.trim()) setIsOpen(true);
            }}
            onKeyDown={handleKeyDown}
            placeholder={
              selectedZctas.length === 0
                ? "Enter a 5-digit zip code (e.g. 78701)"
                : `Add ${remaining > 0 ? "another" : "a 3rd"} zip code...`
            }
            className="w-full max-w-md pl-10 pr-4 py-3 rounded-lg border-2 border-aph-blue/30
              bg-white text-aph-dark-blue placeholder:text-aph-dark-gray/50
              focus:outline-none focus:ring-2 focus:ring-aph-blue/40 focus:border-aph-blue
              font-semibold text-lg"
            aria-label="Search zip codes"
          />

          {/* Dropdown */}
          {isOpen && filtered.length > 0 && (
            <div
              ref={dropdownRef}
              className="absolute z-50 mt-1 w-full max-w-md bg-white rounded-lg border border-aph-light-gray/60
                shadow-lg max-h-60 overflow-y-auto"
            >
              {filtered.slice(0, 20).map((zcta, index) => {
                const data = healthData?.zctas[zcta];
                const le = data?.lifeExpectancy;
                return (
                  <button
                    key={zcta}
                    type="button"
                    onClick={() => handleSelect(zcta)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    className={`w-full text-left px-4 py-3 flex items-center justify-between
                      text-sm font-geist transition-colors border-b border-aph-light-gray/20 last:border-b-0
                      ${index === highlightedIndex ? "bg-aph-light-blue text-aph-dark-blue" : "text-aph-dark-blue hover:bg-aph-light-blue/50"}`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-aph-blue text-lg">
                        add_circle
                      </span>
                      <span className="font-bold text-base">{zcta}</span>
                    </div>
                    {le !== null && le !== undefined && (
                      <span className="text-xs text-aph-dark-gray bg-gray-50 px-2 py-0.5 rounded">
                        LE: {formatValue(le, "years")} yrs
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* No results */}
          {isOpen && query.trim().length > 0 && filtered.length === 0 && (
            <div
              ref={dropdownRef}
              className="absolute z-50 mt-1 w-full max-w-md bg-white rounded-lg border border-aph-light-gray/60
                shadow-lg px-4 py-3"
            >
              <p className="text-sm text-aph-dark-gray text-center">
                {selectedZctas.includes(query)
                  ? "This zip code is already selected"
                  : "No matching zip codes in Travis County"}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Quick-pick popular neighborhoods */}
      {!atMax && availableQuickPicks.length > 0 && (
        <div>
          <p className="text-xs text-aph-dark-gray mb-2">
            Or pick a neighborhood:
          </p>
          <div className="flex flex-wrap gap-2">
            {availableQuickPicks.map(({ label, zip }) => (
              <button
                key={zip}
                type="button"
                onClick={() => handleSelect(zip)}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm
                  border border-aph-blue/25 text-aph-blue bg-white
                  hover:bg-aph-blue hover:text-white active:scale-[0.97]
                  transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">add</span>
                {label}
                <span className="text-xs opacity-70">{zip}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Max reached message */}
      {atMax && (
        <p className="text-sm text-aph-dark-gray mt-1">
          <span className="material-symbols-outlined text-sm align-text-bottom mr-1 text-aph-green">
            check_circle
          </span>
          Maximum {maxSelections} zip codes selected. Remove one to swap.
        </p>
      )}
    </div>
  );
}
