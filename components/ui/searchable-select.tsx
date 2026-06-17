"use client";

import React, { useState, useRef, useEffect } from "react";
import { Search, ChevronDown, Check, X } from "lucide-react";

export interface SelectOption {
  value: string;
  label: string;
}

interface SearchableSelectProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  className?: string;
}

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "Selecione...",
  searchPlaceholder = "Digite para buscar...",
  emptyMessage = "Nenhum resultado encontrado.",
  className = ""
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  // Normalize helper to perform accent-insensitive search
  const normalize = (str: string) =>
    str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  const filteredOptions = options.filter((opt) =>
    normalize(opt.label).includes(normalize(search))
  );

  useEffect(() => {
    if (isOpen) {
      setSearch("");
      setHighlightedIndex(0);
      // Small timeout to ensure input is mounted before focusing
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === "Enter" || e.key === "ArrowDown" || e.key === " ") {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((prev) => (filteredOptions.length > 0 ? (prev + 1) % filteredOptions.length : 0));
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((prev) =>
          filteredOptions.length > 0 ? (prev - 1 + filteredOptions.length) % filteredOptions.length : 0
        );
        break;
      case "Enter":
        e.preventDefault();
        if (filteredOptions[highlightedIndex]) {
          onChange(filteredOptions[highlightedIndex].value);
          setIsOpen(false);
        }
        break;
      case "Escape":
        e.preventDefault();
        setIsOpen(false);
        break;
      case "Tab":
        setIsOpen(false);
        break;
    }
  };

  return (
    <div className={`relative w-full ${className}`} ref={containerRef} onKeyDown={handleKeyDown}>
      {/* Trigger Button */}
      <button
        type="button"
        className="flex min-h-12 w-full items-center justify-between rounded-2xl border border-stone-200 bg-white/95 px-4 text-left text-sm font-bold text-stone-750 outline-none shadow-premium-sm transition-all duration-200 focus:border-semear-green focus:ring-1 focus:ring-semear-green"
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className={selectedOption && selectedOption.value ? "text-stone-750" : "text-stone-400 font-medium"}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown className={`h-4 w-4 text-stone-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {/* Dropdown Box */}
      {isOpen && (
        <div className="absolute left-0 right-0 z-50 mt-2 max-h-72 overflow-hidden rounded-2xl border border-stone-150 bg-white shadow-premium-lg flex flex-col">
          {/* Search Input Box */}
          <div className="flex items-center border-b border-stone-100 px-3 py-2 bg-stone-50/50">
            <Search className="h-4 w-4 text-stone-400 mr-2 shrink-0" />
            <input
              ref={inputRef}
              type="text"
              className="w-full bg-transparent text-sm font-semibold text-stone-750 outline-none placeholder:text-stone-400 placeholder:font-medium"
              placeholder={searchPlaceholder}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setHighlightedIndex(0);
              }}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="rounded-full p-1 hover:bg-stone-200 text-stone-400 hover:text-stone-600 transition"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* Options List */}
          <ul className="overflow-y-auto max-h-48 py-1.5 flex-1" role="listbox">
            {filteredOptions.length === 0 ? (
              <li className="px-4 py-3 text-center text-xs font-semibold text-stone-400">
                {emptyMessage}
              </li>
            ) : (
              filteredOptions.map((option, index) => {
                const isSelected = option.value === value;
                const isHighlighted = index === highlightedIndex;

                return (
                  <li
                    key={option.value}
                    role="option"
                    aria-selected={isSelected}
                    className={`flex items-center justify-between px-4 py-2.5 text-sm font-semibold cursor-pointer transition ${
                      isSelected
                        ? "bg-semear-green-soft text-semear-green font-bold"
                        : isHighlighted
                        ? "bg-stone-50 text-stone-800"
                        : "text-stone-700 hover:bg-stone-50/50"
                    }`}
                    onClick={() => {
                      onChange(option.value);
                      setIsOpen(false);
                    }}
                    onMouseEnter={() => setHighlightedIndex(index)}
                  >
                    <span>{option.label}</span>
                    {isSelected && <Check className="h-4 w-4 text-semear-green shrink-0 ml-2" />}
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
