"use client";

import { useState } from "react";

import {
  colorOptions,
  flowerTypeOptions,
  freshnessOptions,
  listingTypeOptions,
  sortOptions,
} from "@/features/filters/constants";
import type { MarketplaceFiltersState } from "@/types/filters";
import type { ListingColor } from "@/types/listing";
import { cn } from "@/lib/utils";

type MarketplaceFiltersProps = {
  filters: MarketplaceFiltersState;
  onChange: (filters: MarketplaceFiltersState) => void;
};

export function MarketplaceFilters({
  filters,
  onChange,
}: MarketplaceFiltersProps) {
  function patchFilters(patch: Partial<MarketplaceFiltersState>) {
    onChange({ ...filters, ...patch });
  }

  function toggleFlower(flower: string) {
    const flowerTypes = filters.flowerTypes.includes(flower)
      ? filters.flowerTypes.filter((item) => item !== flower)
      : [...filters.flowerTypes, flower];

    patchFilters({ flowerTypes });
  }

  function toggleColor(color: ListingColor) {
    const colors = filters.colors.includes(color)
      ? filters.colors.filter((item) => item !== color)
      : [...filters.colors, color];

    patchFilters({ colors });
  }

  return (
    <div className="space-y-6">
      <div className="grid h-12 grid-cols-2 rounded-2xl bg-gf-bg-alt p-0.5">
        {listingTypeOptions.map((option) => (
          <button
            key={option.value}
            className={cn(
              "inline-flex h-full items-center justify-center rounded-[14px] px-3 text-gf-body-m leading-[normal] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gf-bg-accent",
              filters.listingType === option.value
                ? "bg-gf-bg-base font-medium text-gf-text-primary shadow-[0_2px_8px_rgb(0_0_0/0.08)]"
                : "font-normal text-gf-text-secondary",
            )}
            type="button"
            onClick={() => patchFilters({ listingType: option.value })}
          >
            {option.label}
          </button>
        ))}
      </div>

      <FilterGroup title="Сортировать:">
        {sortOptions.map((option) => (
          <FilterChip
            key={option.value}
            selected={filters.sort === option.value}
            onClick={() => patchFilters({ sort: option.value })}
          >
            {option.label}
          </FilterChip>
        ))}
      </FilterGroup>

      <FilterGroup title="Цветы:">
        {flowerTypeOptions.map((flower) => (
          <FilterChip
            key={flower}
            selected={filters.flowerTypes.includes(flower)}
            onClick={() => toggleFlower(flower)}
          >
            {flower}
          </FilterChip>
        ))}
      </FilterGroup>

      <FilterGroup title="Цена:">
        <div className="grid grid-cols-2 gap-2">
          <PriceInput
            prefix="от"
            placeholder="от 0 ₽"
            value={filters.minPrice}
            onChange={(value) => patchFilters({ minPrice: value })}
          />
          <PriceInput
            prefix="до"
            placeholder="до 50 000 ₽"
            value={filters.maxPrice}
            onChange={(value) => patchFilters({ maxPrice: value })}
          />
        </div>
      </FilterGroup>

      <FilterGroup title="Цвет букета:" contentClassName="gap-2">
        {colorOptions.map((color) => (
          <button
            key={color.value}
            className={cn(
              "size-[38px] rounded-full border border-border ring-offset-2 transition",
              color.className,
              filters.colors.includes(color.value) && "ring-2 ring-primary",
            )}
            type="button"
            aria-label={color.label}
            onClick={() => toggleColor(color.value)}
          />
        ))}
      </FilterGroup>

      <FilterGroup title="Свежесть:">
        {freshnessOptions.map((option) => (
          <FilterChip
            key={option.value}
            selected={filters.freshness === option.value}
            onClick={() =>
              patchFilters({
                freshness: filters.freshness === option.value ? null : option.value,
              })
            }
          >
            {option.label}
          </FilterChip>
        ))}
      </FilterGroup>
    </div>
  );
}

function FilterGroup({
  title,
  children,
  contentClassName,
}: {
  title: string;
  children: React.ReactNode;
  contentClassName?: string;
}) {
  return (
    <section>
      <h2 className="mb-3 text-gf-body-m font-bold leading-[normal] text-gf-text-primary">{title}</h2>
      <div className={cn("flex flex-wrap gap-1", contentClassName)}>{children}</div>
    </section>
  );
}

function PriceInput({
  prefix,
  placeholder,
  value,
  onChange,
}: {
  prefix: "от" | "до";
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const [isFocused, setIsFocused] = useState(false);
  const formattedValue = formatPriceValue(value);
  const isFloating = isFocused || value.length > 0;

  return (
    <label
      className={cn(
        "relative flex h-12 rounded-2xl bg-gf-bg-alt px-4 transition-colors hover:bg-[#f2f2f2]",
        isFloating ? "flex-col justify-center gap-0.5 py-1" : "items-center",
        value && "pr-11",
      )}
    >
      {isFloating ? (
        <span className="text-gf-body-xs leading-[normal] text-gf-text-secondary">{prefix}</span>
      ) : null}
      <div className="flex min-w-0 items-center text-gf-body-m font-normal leading-[normal] text-gf-text-primary">
        <input
          className="min-w-0 bg-transparent outline-none placeholder:text-gf-text-secondary"
          inputMode="numeric"
          placeholder={isFloating ? undefined : placeholder}
          style={{ width: isFloating ? "6ch" : "100%" }}
          value={formattedValue}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onChange={(event) => onChange(event.target.value.replace(/\D/g, ""))}
        />
        {value ? <span className="shrink-0">&nbsp;₽</span> : null}
      </div>
      {value ? (
        <button
          className="absolute right-4 top-1/2 grid size-4 -translate-y-1/2 place-items-center text-gf-text-tertiary transition-colors hover:text-gf-text-primary"
          type="button"
          aria-label="Очистить цену"
          onClick={(event) => {
            event.preventDefault();
            onChange("");
          }}
        >
          <XFillIcon className="size-4" />
        </button>
      ) : null}
    </label>
  );
}

function formatPriceValue(value: string) {
  return value.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

function XFillIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M12 1C18.0751 1 23 5.92487 23 12C23 18.0751 18.0751 23 12 23C5.92487 23 1 18.0751 1 12C1 5.92487 5.92487 1 12 1ZM15.707 8.29297C15.3165 7.90248 14.6835 7.90248 14.293 8.29297L12 10.5859L9.70703 8.29297C9.31651 7.90248 8.68349 7.90248 8.29297 8.29297C7.90245 8.68349 7.90247 9.31651 8.29297 9.70703L10.5859 12L8.29297 14.293C7.90245 14.6835 7.90247 15.3165 8.29297 15.707C8.68349 16.0976 9.31651 16.0976 9.70703 15.707L12 13.4141L14.293 15.707C14.6835 16.0976 15.3165 16.0976 15.707 15.707C16.0975 15.3165 16.0975 14.6835 15.707 14.293L13.4141 12L15.707 9.70703C16.0975 9.31651 16.0975 8.68349 15.707 8.29297Z"
        fill="currentColor"
      />
    </svg>
  );
}

function FilterChip({
  selected,
  children,
  onClick,
}: {
  selected: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      className={cn(
        "inline-flex h-[38px] items-center justify-center rounded-2xl bg-gf-bg-alt px-4 text-gf-body-xs font-normal leading-[normal] text-gf-text-primary transition-colors hover:bg-[#f2f2f2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gf-bg-accent",
        selected
          ? "bg-gf-bg-accent text-gf-text-on-accent hover:bg-gf-bg-accent-hover"
          : "",
      )}
      type="button"
      onClick={onClick}
    >
      {children}
    </button>
  );
}
