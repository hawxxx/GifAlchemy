"use client";

import React from "react";
import { Search, LayoutGrid, List } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type SortOption = "recent" | "name-asc" | "name-desc" | "oldest";
export type ViewMode = "grid" | "list";

interface SearchSortBarProps {
  search: string;
  onSearchChange: (value: string) => void;
  sort: SortOption;
  onSortChange: (value: SortOption) => void;
  view: ViewMode;
  onViewChange: (value: ViewMode) => void;
}

export function SearchSortBar({
  search,
  onSearchChange,
  sort,
  onSortChange,
  view,
  onViewChange,
}: SearchSortBarProps) {
  return (
    <div className="flex items-center gap-3">
      <div className="relative flex-1 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--muted-foreground)] pointer-events-none" />
        <Input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search projects…"
          className="pl-9 bg-[var(--muted)] border-[var(--border)] focus-visible:ring-[var(--ring)]"
        />
      </div>

      <Select value={sort} onValueChange={(v) => onSortChange(v as SortOption)}>
        <SelectTrigger className="w-48 bg-[var(--muted)] border-[var(--border)]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="recent">Recently modified</SelectItem>
          <SelectItem value="name-asc">Name A–Z</SelectItem>
          <SelectItem value="name-desc">Name Z–A</SelectItem>
          <SelectItem value="oldest">Oldest first</SelectItem>
        </SelectContent>
      </Select>

      <div className="flex items-center rounded-lg border border-[var(--border)] bg-[var(--muted)] p-1 gap-0.5">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onViewChange("grid")}
          className={`h-7 w-7 rounded-md ${view === "grid" ? "bg-[var(--accent)] text-[var(--accent-foreground)]" : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"}`}
          aria-label="Grid view"
        >
          <LayoutGrid className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onViewChange("list")}
          className={`h-7 w-7 rounded-md ${view === "list" ? "bg-[var(--accent)] text-[var(--accent-foreground)]" : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"}`}
          aria-label="List view"
        >
          <List className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
