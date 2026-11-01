import { useEffect, useRef, useState } from 'react';
import { searchPlaces } from '../services/places';
import { inputClass } from './FormField.jsx';

const DEBOUNCE_MS = 350;
const MIN_QUERY_LENGTH = 3;

// Search-as-you-type place picker. Calls onSelect({ name, address, latitude,
// longitude }) when the user picks a result (click, or arrow keys + Enter).
export default function PlaceSearch({ id, onSelect, placeholder = 'Search for your area, street or landmark' }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);
  const [status, setStatus] = useState('');
  const skipNextSearch = useRef(false);

  useEffect(() => {
    if (skipNextSearch.current) {
      skipNextSearch.current = false;
      return undefined;
    }
    const trimmed = query.trim();
    if (trimmed.length < MIN_QUERY_LENGTH) {
      setResults([]);
      setStatus('');
      return undefined;
    }

    // Each keystroke cancels the previous pending/in-flight search, so results
    // for an old query can never overwrite results for the current one.
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setStatus('Searching...');
      try {
        const places = await searchPlaces(trimmed, controller.signal);
        setResults(places);
        setHighlighted(places.length ? 0 : -1);
        setIsOpen(true);
        setStatus(places.length ? '' : 'No places found. Try a nearby landmark or area name.');
      } catch (err) {
        if (err.name !== 'AbortError') setStatus('Place search is unavailable right now. Use your current location instead.');
      }
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  function choose(place) {
    skipNextSearch.current = true;
    setQuery(place.name);
    setIsOpen(false);
    setResults([]);
    setStatus('');
    onSelect(place);
  }

  function handleKeyDown(e) {
    if (!isOpen || results.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlighted((h) => (h + 1) % results.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlighted((h) => (h - 1 + results.length) % results.length);
    } else if (e.key === 'Enter' && highlighted >= 0) {
      e.preventDefault(); // don't submit the surrounding form
      choose(results[highlighted]);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  }

  return (
    <div className="relative">
      <input
        id={id}
        type="search"
        autoComplete="off"
        role="combobox"
        aria-expanded={isOpen}
        aria-controls={`${id}-results`}
        placeholder={placeholder}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => results.length && setIsOpen(true)}
        // Delay so a click on a result registers before the list closes.
        onBlur={() => setTimeout(() => setIsOpen(false), 150)}
        className={inputClass}
      />
      {isOpen && results.length > 0 && (
        <ul
          id={`${id}-results`}
          role="listbox"
          className="absolute z-10 mt-1 max-h-72 w-full overflow-auto rounded-md border bg-white py-1 text-sm shadow-lg"
        >
          {results.map((place, i) => (
            <li
              key={place.id}
              role="option"
              aria-selected={i === highlighted}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => choose(place)}
              onMouseEnter={() => setHighlighted(i)}
              className={`cursor-pointer px-3 py-2 ${i === highlighted ? 'bg-emerald-50' : ''}`}
            >
              <p className="font-medium text-gray-800">{place.name}</p>
              <p className="text-xs text-gray-500">{place.address}</p>
            </li>
          ))}
        </ul>
      )}
      {status && <p className="mt-1 text-xs text-gray-500">{status}</p>}
    </div>
  );
}
