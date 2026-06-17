"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui";
import { Icon } from "@/components/icon";
import { debounce } from "@/lib/utils/debounce";
import { cn } from "@/lib/utils";

interface RotatingSearchInputProps {
  value?: string;
  onSearch: (value: string) => void;
  words: string[];
  debounceDelay?: number;
  className?: string;
}

export function RotatingSearchInput({
  value,
  onSearch,
  words,
  debounceDelay = 300,
  className,
}: RotatingSearchInputProps) {
  const [internalValue, setInternalValue] = useState(value ?? "");
  const [index, setIndex] = useState(0);
  const [withTransition, setWithTransition] = useState(true);
  const latestOnSearchRef = useRef(onSearch);
  const debouncedSearchRef = useRef<(((val: string) => void) & { cancel: () => void }) | null>(
    null
  );

  useEffect(() => {
    latestOnSearchRef.current = onSearch;
  }, [onSearch]);

  useEffect(() => {
    const fn = debounce((val: unknown): void => {
      if (typeof val === "string") {
        latestOnSearchRef.current(val);
      }
    }, debounceDelay);
    debouncedSearchRef.current = fn;
    return (): void => {
      fn.cancel();
    };
  }, [debounceDelay]);

  // Sync controlled value when prop changes
  useEffect(() => {
    if (value === undefined) return;
    const timer = setTimeout(() => setInternalValue(value), 0);
    return (): void => clearTimeout(timer);
  }, [value]);

  const extendedWords = useMemo(() => {
    if (words.length === 0) return [];
    return [...words, words[0]];
  }, [words]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setWithTransition(false);
      setIndex(0);
    }, 0);
    return (): void => clearTimeout(timer);
  }, [words.length]);

  useEffect(() => {
    if (words.length === 0) return;
    const id = setInterval(() => {
      setWithTransition(true);
      setIndex((prev) => prev + 1);
    }, 2500);
    return (): void => clearInterval(id);
  }, [words.length]);

  useEffect(() => {
    if (index === words.length) {
      const timer = setTimeout(() => {
        setWithTransition(false);
        setIndex(0);
      }, 2000);
      return (): void => clearTimeout(timer);
    }
  }, [index, words.length]);

  useEffect(() => {
    if (words.length === 0 || index <= words.length) return;
    const timer = setTimeout(() => {
      setWithTransition(false);
      setIndex(0);
    }, 0);
    return (): void => clearTimeout(timer);
  }, [index, words.length]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const val = e.target.value;
    setInternalValue(val);
    debouncedSearchRef.current?.(val);
  };

  return (
    <div className={cn("relative", className)}>
      {!internalValue && words.length > 0 && (
        <div className="absolute left-8 top-1/2 -translate-y-1/2 h-5 overflow-hidden text-muted-foreground pointer-events-none text-xs z-10 flex items-start gap-1">
          <span className="h-5 leading-5 shrink-0">Search by</span>
          <div
            style={{
              transform: `translateY(-${index * 20}px)`,
              transition: withTransition ? "transform 2s cubic-bezier(0.4, 0, 0.2, 1)" : "none",
            }}
          >
            {extendedWords.map((item, i) => (
              <div key={`${item}-${i}`} className="h-5 leading-5">
                {item}
              </div>
            ))}
          </div>
        </div>
      )}
      <Icon
        name="search"
        className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground"
      />
      <Input
        type="text"
        aria-label="Search transactions"
        value={internalValue}
        placeholder=""
        onChange={handleChange}
        className="h-8 pl-8 text-xs bg-muted/50"
      />
    </div>
  );
}
