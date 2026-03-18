import { useState, useRef, useEffect } from "react";
import { TRAVIS_COUNTY_ZCTAS, APH_COLORS } from "../../lib/constants";
import { useHealthData } from "../../hooks/useHealthData";
import { formatValue } from "../../lib/formatters";

const ZCTA_COLORS = [APH_COLORS.blue, APH_COLORS.green, APH_COLORS.orange];

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

  return (
    <div className="w-full max-w-md">
      {/* Input */}
      <div className="relative">
        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-aph-dark-gray text-xl">
          search
        </span>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(e.target.value.trim().length > 0);
          }}
          onFocus={() => {
            if (query.trim()) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder={
            atMax
              ? `Maximum ${maxSelections} zip codes selected`
              : "Type a zip code to search..."
          }
          disabled={atMax}
          className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-aph-light-gray/60
            bg-white text-aph-dark-blue placeholder:text-aph-dark-gray/60
            focus:outline-none focus:ring-2 focus:ring-aph-blue/40 focus:border-aph-blue
            disabled:opacity-50 disabled:cursor-not-allowed
            font-geist text-sm"
        />

        {/* Dropdown */}
        {isOpen && filtered.length > 0 && !atMax && (
          <div
            ref={dropdownRef}
            className="absolute z-50 mt-1 w-full bg-white rounded-lg border border-aph-light-gray/60
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
                  className={`w-full text-left px-4 py-2.5 flex items-center justify-between
                    text-sm font-geist transition-colors
                    ${index === highlightedIndex ? "bg-aph-light-blue text-aph-dark-blue" : "text-aph-dark-blue hover:bg-aph-light-blue/50"}`}
                >
                  <span className="font-semibold">{zcta}</span>
                  {le !== null && le !== undefined && (
                    <span className="text-xs text-aph-dark-gray">
                      Life Exp: {formatValue(le, "years")}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* No results */}
        {isOpen &&
          query.trim().length > 0 &&
          filtered.length === 0 &&
          !atMax && (
            <div
              ref={dropdownRef}
              className="absolute z-50 mt-1 w-full bg-white rounded-lg border border-aph-light-gray/60
              shadow-lg px-4 py-3"
            >
              <p className="text-sm text-aph-dark-gray text-center">
                No matching zip codes in Travis County
              </p>
            </div>
          )}
      </div>

      {/* Selected chips */}
      {selectedZctas.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3">
          {selectedZctas.map((zcta, index) => (
            <span
              key={zcta}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm
                font-semibold text-white shadow-sm"
              style={{ backgroundColor: ZCTA_COLORS[index] || APH_COLORS.blue }}
            >
              {zcta}
              <button
                type="button"
                onClick={() => onRemove(zcta)}
                className="ml-0.5 hover:opacity-80 transition-opacity"
                aria-label={`Remove ${zcta}`}
              >
                <span className="material-symbols-outlined text-base leading-none">
                  close
                </span>
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
