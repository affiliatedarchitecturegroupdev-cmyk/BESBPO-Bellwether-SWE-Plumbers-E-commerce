'use client';

import { useState, useEffect, useRef, forwardRef } from 'react';

interface AddressSuggestion {
  suburb: string;
  city: string;
  province: string;
  postalCode: string;
  displayText: string;
}

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect?: (address: AddressSuggestion) => void;
  placeholder?: string;
  id?: string;
  name?: string;
  required?: boolean;
  className?: string;
}

export const AddressAutocomplete = forwardRef<HTMLInputElement, AddressAutocompleteProps>(
  function AddressAutocomplete(
    { value, onChange, onSelect, placeholder = 'Start typing suburb or city...', id, name, required, className = '' },
    ref
  ) {
    const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Debounced search
    useEffect(() => {
      if (value.length < 2) {
        setSuggestions([]);
        setIsOpen(false);
        return;
      }

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(async () => {
        setIsLoading(true);
        try {
          const response = await fetch(`/api/address/suggest?q=${encodeURIComponent(value)}`);
          if (response.ok) {
            const data = await response.json();
            setSuggestions(data.suggestions || []);
            setIsOpen(true);
          }
        } catch (error) {
          console.error('Address suggestions error:', error);
          setSuggestions([]);
        } finally {
          setIsLoading(false);
        }
      }, 250);

      return () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
      };
    }, [value]);

    // Close on click outside
    useEffect(() => {
      function handleClickOutside(event: MouseEvent) {
        if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
          setIsOpen(false);
        }
      }
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    function handleSelect(suggestion: AddressSuggestion) {
      onChange(suggestion.displayText);
      onSelect?.(suggestion);
      setIsOpen(false);
      setSelectedIndex(-1);
    }

    function handleKeyDown(e: React.KeyboardEvent) {
      if (!isOpen) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) => Math.min(prev + 1, suggestions.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) => Math.max(prev - 1, -1));
          break;
        case 'Enter':
          e.preventDefault();
          if (selectedIndex >= 0 && suggestions[selectedIndex]) {
            handleSelect(suggestions[selectedIndex]);
          }
          break;
        case 'Escape':
          setIsOpen(false);
          break;
      }
    }

    return (
      <div ref={containerRef} className={`relative ${className}`}>
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            id={id}
            name={name}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => suggestions.length > 0 && setIsOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            required={required}
            autoComplete="off"
            className="w-full border border-black/15 rounded-sm px-3 py-2 text-sm outline-none focus:border-hydra"
          />
          {isLoading && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <svg className="animate-spin w-4 h-4 text-steel" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
            </div>
          )}
        </div>

        {isOpen && suggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-black/15 rounded-sm shadow-lg z-50 max-h-[280px] overflow-y-auto">
            <div className="px-3 py-2 text-[10.5px] font-mono uppercase tracking-wide text-steel bg-black/[0.02] border-b border-black/5">
              South African Addresses
            </div>
            {suggestions.map((suggestion, index) => (
              <button
                key={`${suggestion.suburb}-${suggestion.postalCode}`}
                type="button"
                onClick={() => handleSelect(suggestion)}
                className={`w-full text-left px-3 py-2.5 text-sm hover:bg-black/[0.03] transition-colors ${
                  index === selectedIndex ? 'bg-black/[0.05]' : ''
                } ${index < suggestions.length - 1 ? 'border-b border-black/5' : ''}`}
              >
                <div className="flex items-start gap-2">
                  <svg
                    className="w-4 h-4 text-steel mt-0.5 flex-shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-ink truncate">{suggestion.suburb}</p>
                    <p className="text-xs text-steel truncate">
                      {suggestion.city}, {suggestion.province} {suggestion.postalCode}
                    </p>
                  </div>
                </div>
              </button>
            ))}
            <div className="px-3 py-2 text-[11px] text-steel bg-black/[0.02] border-t border-black/5">
              {suggestions.length} address{suggestions.length !== 1 ? 'es' : ''} found
            </div>
          </div>
        )}
      </div>
    );
  }
);

// Helper hook for extracting address components from selected suggestion
export function useAddressAutocomplete() {
  const [selectedSuggestion, setSelectedSuggestion] = useState<AddressSuggestion | null>(null);

  const onSelect = (suggestion: AddressSuggestion) => {
    setSelectedSuggestion(suggestion);
  };

  const getPostalCode = () => selectedSuggestion?.postalCode ?? '';
  const getCity = () => selectedSuggestion?.city ?? '';
  const getProvince = () => selectedSuggestion?.province ?? '';

  return {
    selectedSuggestion,
    onSelect,
    getPostalCode,
    getCity,
    getProvince,
  };
}
