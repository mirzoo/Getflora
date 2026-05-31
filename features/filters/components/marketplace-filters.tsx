"use client";

import { Button } from "@/components/ui/button";
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
      <div className="grid grid-cols-2 rounded-full bg-muted p-1">
        {listingTypeOptions.map((option) => (
          <Button
            key={option.value}
            variant={filters.listingType === option.value ? "secondary" : "ghost"}
            className={cn(filters.listingType === option.value && "bg-background shadow-sm")}
            onClick={() => patchFilters({ listingType: option.value })}
          >
            {option.label}
          </Button>
        ))}
      </div>

      <FilterGroup title="Сортировать:">
        {sortOptions.map((option) => (
          <Button
            key={option.value}
            variant={filters.sort === option.value ? "secondary" : "outline"}
            size="sm"
            onClick={() => patchFilters({ sort: option.value })}
          >
            {option.label}
          </Button>
        ))}
      </FilterGroup>

      <FilterGroup title="Цветы:">
        {flowerTypeOptions.map((flower) => (
          <Button
            key={flower}
            variant={filters.flowerTypes.includes(flower) ? "secondary" : "outline"}
            size="sm"
            onClick={() => toggleFlower(flower)}
          >
            {flower}
          </Button>
        ))}
      </FilterGroup>

      <FilterGroup title="Цена:">
        <div className="grid grid-cols-2 gap-2">
          <input
            className="h-11 rounded-xl bg-muted px-3 text-sm outline-none focus:ring-2 focus:ring-primary"
            inputMode="numeric"
            placeholder="от 0 ₽"
            value={formatPriceInput(filters.minPrice, "от")}
            onChange={(event) =>
              patchFilters({ minPrice: event.target.value.replace(/\D/g, "") })
            }
          />
          <input
            className="h-11 rounded-xl bg-muted px-3 text-sm outline-none focus:ring-2 focus:ring-primary"
            inputMode="numeric"
            placeholder="до 50 000 ₽"
            value={formatPriceInput(filters.maxPrice, "до")}
            onChange={(event) =>
              patchFilters({ maxPrice: event.target.value.replace(/\D/g, "") })
            }
          />
        </div>
      </FilterGroup>

      <FilterGroup title="Цвет букета:">
        {colorOptions.map((color) => (
          <button
            key={color.value}
            className={cn(
              "size-6 rounded-full border border-border ring-offset-2 transition",
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
          <Button
            key={option}
            variant={filters.minFreshness === option ? "secondary" : "outline"}
            size="sm"
            onClick={() =>
              patchFilters({
                minFreshness: filters.minFreshness === option ? null : option,
              })
            }
          >
            &gt;{option}
          </Button>
        ))}
      </FilterGroup>
    </div>
  );
}

function formatPriceInput(value: string, prefix: "от" | "до") {
  return value ? `${prefix} ${value} ₽` : "";
}

function FilterGroup({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="mb-3 text-sm font-bold">{title}</h2>
      <div className="flex flex-wrap gap-2">{children}</div>
    </section>
  );
}
