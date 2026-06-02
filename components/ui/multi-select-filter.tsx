'use client';

import { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Check, ChevronDown, X } from 'lucide-react';

export interface MultiSelectOption {
  value: string;
  label: string;
  sublabel?: string;
}

interface MultiSelectFilterProps {
  options: MultiSelectOption[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  className?: string;
  maxBadges?: number;
}

export function MultiSelectFilter({
  options,
  selected,
  onChange,
  placeholder = 'All',
  searchPlaceholder = 'Search…',
  className,
  maxBadges = 2,
}: MultiSelectFilterProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = options.filter((o) =>
    o.label.toLowerCase().includes(search.toLowerCase()) ||
    o.sublabel?.toLowerCase().includes(search.toLowerCase())
  );

  function toggle(value: string) {
    onChange(
      selected.includes(value)
        ? selected.filter((v) => v !== value)
        : [...selected, value]
    );
  }

  function clear(e: React.MouseEvent) {
    e.stopPropagation();
    onChange([]);
  }

  const selectedLabels = selected.map(
    (v) => options.find((o) => o.value === v)?.label ?? v
  );

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) setSearch(''); }}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn('h-9 gap-1 min-w-[120px] max-w-[220px] justify-between font-normal', className)}
        >
          <span className="flex items-center gap-1 flex-1 min-w-0 overflow-hidden">
            {selected.length === 0 ? (
              <span className="text-muted-foreground truncate">{placeholder}</span>
            ) : selected.length <= maxBadges ? (
              selectedLabels.map((l, i) => (
                <Badge key={i} variant="secondary" className="text-xs py-0 px-1.5 shrink-0">{l}</Badge>
              ))
            ) : (
              <>
                {selectedLabels.slice(0, maxBadges).map((l, i) => (
                  <Badge key={i} variant="secondary" className="text-xs py-0 px-1.5 shrink-0">{l}</Badge>
                ))}
                <Badge variant="secondary" className="text-xs py-0 px-1.5 shrink-0">
                  +{selected.length - maxBadges}
                </Badge>
              </>
            )}
          </span>
          <span className="flex items-center gap-0.5 shrink-0">
            {selected.length > 0 && (
              <span
                role="button"
                onClick={clear}
                className="text-muted-foreground hover:text-foreground p-0.5 rounded"
              >
                <X className="h-3 w-3" />
              </span>
            )}
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          </span>
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-56 p-0" align="start">
        <div className="p-2 border-b">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={searchPlaceholder}
            className="h-7 text-sm"
            autoFocus
          />
        </div>
        <div className="max-h-56 overflow-y-auto p-1">
          {filtered.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-3">No results</p>
          ) : (
            filtered.map((option) => {
              const isSelected = selected.includes(option.value);
              return (
                <button
                  key={option.value}
                  className="flex items-center gap-2 w-full rounded-sm px-2 py-1.5 text-sm hover:bg-accent transition-colors text-left"
                  onClick={() => toggle(option.value)}
                >
                  <div className={cn(
                    'flex h-4 w-4 items-center justify-center rounded border shrink-0',
                    isSelected ? 'bg-primary border-primary text-primary-foreground' : 'border-input'
                  )}>
                    {isSelected && <Check className="h-3 w-3" />}
                  </div>
                  <span className="flex-1 truncate">{option.label}</span>
                  {option.sublabel && (
                    <span className="text-xs text-muted-foreground truncate">{option.sublabel}</span>
                  )}
                </button>
              );
            })
          )}
        </div>
        {selected.length > 0 && (
          <div className="border-t p-1">
            <button
              className="w-full text-xs text-muted-foreground hover:text-foreground text-center py-1"
              onClick={() => onChange([])}
            >
              Clear all
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
