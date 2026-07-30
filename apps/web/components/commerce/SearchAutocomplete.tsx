'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface SearchSuggestion {
  id: string;
  name: string;
  slug: string;
  category: string;
  type: 'product' | 'category' | 'brand';
}

export function SearchAutocomplete() {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Debounced search
  useEffect(() => {
    if (query.length < 2) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/search/suggest?q=${encodeURIComponent(query)}`);
        if (response.ok) {
          const data = await response.json();
          setSuggestions(data.suggestions || []);
          setIsOpen(true);
        }
      } catch (error) {
        console.error('Search suggestions error:', error);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query]);

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

  // Keyboard navigation
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
          router.push(`/product/${suggestions[selectedIndex].slug}`);
          setIsOpen(false);
          setQuery('');
        } else if (query) {
          router.push(`/search?q=${encodeURIComponent(query)}`);
          setIsOpen(false);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        break;
    }
  }

  // Save to recent searches
  function saveSearch(term: string) {
    try {
      const recent = JSON.parse(localStorage.getItem('recentSearches') || '[]');
      const updated = [term, ...recent.filter((t: string) => t !== term)].slice(0, 5);
      localStorage.setItem('recentSearches', JSON.stringify(updated));
    } catch {
      // Ignore storage errors
    }
  }

  return (
    <div ref={containerRef} className="relative w-full">
      <form action="/search" className="relative">
        <input
          ref={inputRef}
          type="search"
          name="q"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSelectedIndex(-1);
          }}
          onFocus={() => query.length >= 2 && setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search 10,500+ products..."
          autoComplete="off"
          className="w-full bg-white/[0.08] border border-white/15 rounded-sm px-3.5 py-2 text-[13.5px] outline-none focus:border-cyan placeholder:text-steel"
        />
        <button
          type="submit"
          onClick={() => {
            if (query) saveSearch(query);
          }}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-steel hover:text-cyan transition-colors"
          aria-label="Search"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </button>
        {isLoading && (
          <div className="absolute right-10 top-1/2 -translate-y-1/2">
            <svg className="animate-spin w-4 h-4 text-steel" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        )}
      </form>

      {/* Suggestions Dropdown */}
      {isOpen && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-ink-2 border border-white/10 rounded-sm shadow-lg z-50 max-h-[400px] overflow-y-auto">
          {suggestions.map((suggestion, index) => (
            <Link
              key={`${suggestion.type}-${suggestion.id}`}
              href={suggestion.type === 'product' ? `/product/${suggestion.slug}` : `/category/${suggestion.slug}`}
              className={`flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors ${
                index === selectedIndex ? 'bg-white/5' : ''
              }`}
              onClick={() => {
                saveSearch(suggestion.name);
                setIsOpen(false);
                setQuery('');
              }}
            >
              <span className={`w-6 h-6 rounded flex items-center justify-center text-[10px] font-mono ${
                suggestion.type === 'product' ? 'bg-cyan/20 text-cyan' :
                suggestion.type === 'category' ? 'bg-hydra/20 text-hydra' :
                'bg-steel/20 text-steel'
              }`}>
                {suggestion.type === 'product' ? 'P' : suggestion.type === 'category' ? 'C' : 'B'}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-porcelain truncate">{suggestion.name}</p>
                <p className="text-[11px] text-steel">{suggestion.category}</p>
              </div>
            </Link>
          ))}
          <Link
            href={`/search?q=${encodeURIComponent(query)}`}
            className="flex items-center gap-3 px-4 py-3 border-t border-white/10 hover:bg-white/5 transition-colors text-cyan"
            onClick={() => {
              saveSearch(query);
              setIsOpen(false);
            }}
          >
            <span className="w-6 h-6 flex items-center justify-center">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <span className="text-sm">See all results for &ldquo;{query}&rdquo;</span>
          </Link>
        </div>
      )}
    </div>
  );
}
