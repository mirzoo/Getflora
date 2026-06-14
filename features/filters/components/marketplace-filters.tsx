"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";

import chevronDownIcon from "@/assets/icon/icn_m_chevron-down.svg";
import chevronUpIcon from "@/assets/icon/icn_m_chevron-up.svg";
import xFillIcon from "@/assets/icon/icn_m_x-fill.svg";
import { ButtonBox } from "@/components/ui/button-box";
import { MenuPopover, MenuPopoverOption, MenuPopoverSlot } from "@/components/ui/menu-popover";
import {
  colorOptions,
  flowerTypeOptions,
  freshnessOptions,
  listingTypeOptions,
  sortOptions,
} from "@/features/filters/constants";
import type { MarketplaceFiltersState } from "@/types/filters";
import type { ListingColor } from "@/types/listing";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";

export type ToolbarFilterKey = "sort" | "price" | "flowers" | "colors" | "freshness";

type MarketplaceFiltersProps = {
  filters: MarketplaceFiltersState;
  onChange: (filters: MarketplaceFiltersState) => void;
  variant?: "panel" | "toolbar";
};

export function MarketplaceFilters({
  filters,
  onChange,
  variant = "panel",
}: MarketplaceFiltersProps) {
  const [activeToolbarKey, setActiveToolbarKey] = useState<ToolbarFilterKey | null>(null);
  const [draftToolbarFilters, setDraftToolbarFilters] = useState(filters);
  const [flowerSearch, setFlowerSearch] = useState("");
  const [colorSearch, setColorSearch] = useState("");
  const toolbarRef = useRef<HTMLDivElement | null>(null);

  function patchFilters(patch: Partial<MarketplaceFiltersState>) {
    const nextFilters = { ...filters, ...patch };

    onChange(nextFilters);
    setDraftToolbarFilters(nextFilters);
  }

  function patchDraftToolbarFilters(patch: Partial<MarketplaceFiltersState>) {
    setDraftToolbarFilters((current) => ({ ...current, ...patch }));
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

  function toggleDraftFlower(flower: string) {
    const flowerTypes = draftToolbarFilters.flowerTypes.includes(flower)
      ? draftToolbarFilters.flowerTypes.filter((item) => item !== flower)
      : [...draftToolbarFilters.flowerTypes, flower];

    patchDraftToolbarFilters({ flowerTypes });
  }

  function toggleDraftColor(color: ListingColor) {
    const colors = draftToolbarFilters.colors.includes(color)
      ? draftToolbarFilters.colors.filter((item) => item !== color)
      : [...draftToolbarFilters.colors, color];

    patchDraftToolbarFilters({ colors });
  }

  function closePopover() {
    setActiveToolbarKey(null);
  }

  function togglePopover(key: ToolbarFilterKey) {
    setDraftToolbarFilters(filters);
    setActiveToolbarKey((current) => (current === key ? null : key));
  }

  function applyToolbarDraft() {
    onChange(draftToolbarFilters);
    closePopover();
  }

  useEffect(() => {
    if (!activeToolbarKey) {
      setDraftToolbarFilters(filters);
    }
  }, [activeToolbarKey, filters]);

  useEffect(() => {
    if (variant !== "toolbar" || !activeToolbarKey) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if (!toolbarRef.current?.contains(event.target as Node)) {
        closePopover();
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closePopover();
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeToolbarKey, variant]);

  const filteredFlowerOptions = useMemo(
    () => filterBySearch(flowerTypeOptions, flowerSearch),
    [flowerSearch],
  );
  const filteredColorOptions = useMemo(
    () =>
      colorOptions.filter((color) =>
        normalizeSearchValue(color.label).includes(normalizeSearchValue(colorSearch)),
      ),
    [colorSearch],
  );

  if (variant === "toolbar") {
    const sortLabel = filters.sort === "date"
      ? "Сначала недавние"
      : sortOptions.find((option) => option.value === filters.sort)?.label ?? "Сначала недавние";
    const freshnessLabel =
      freshnessOptions.find((option) => option.value === filters.freshness)?.label ?? "Свежесть";
    const priceLabel = getToolbarPriceLabel(filters.minPrice, filters.maxPrice);
    const hasPriceFilter = Boolean(filters.minPrice || filters.maxPrice);
    const hasSortFilter = filters.sort !== "date";
    const hasFlowerFilter = filters.flowerTypes.length > 0;
    const hasColorFilter = filters.colors.length > 0;
    const hasFreshnessFilter = Boolean(filters.freshness);

    return (
      <div ref={toolbarRef} className="flex flex-wrap items-center justify-center gap-2">
        <MenuPopoverSlot
          popover={
            <MenuPopover className="w-[180px] p-0 shadow-[0_4px_12px_rgb(0_0_0/0.18)]">
              {sortOptions.map((option) => (
                <MenuPopoverOption
                  key={option.value}
                  selected={filters.sort === option.value}
                  onClick={() => {
                    patchFilters({ sort: option.value });
                    closePopover();
                  }}
                >
                  {option.label}
                </MenuPopoverOption>
              ))}
            </MenuPopover>
          }
          showPopover={activeToolbarKey === "sort"}
        >
          <ToolbarSelect
            label={sortLabel}
            selected={hasSortFilter}
            active={activeToolbarKey === "sort"}
            onClear={hasSortFilter ? () => patchFilters({ sort: "date" }) : undefined}
            onClick={() => togglePopover("sort")}
          />
        </MenuPopoverSlot>

        <MenuPopoverSlot
          popover={
            <MenuPopover className="w-[323px] p-4 shadow-[0_4px_12px_rgb(0_0_0/0.18)]">
              <div className="grid grid-cols-2 gap-2">
                <PriceInput
                  prefix="от"
                  placeholder="от 0 ₽"
                  value={draftToolbarFilters.minPrice}
                  onChange={(value) => patchDraftToolbarFilters({ minPrice: value })}
                />
                <PriceInput
                  prefix="до"
                  placeholder="до 50 000 ₽+"
                  value={draftToolbarFilters.maxPrice}
                  onChange={(value) => patchDraftToolbarFilters({ maxPrice: value })}
                />
              </div>
              <ButtonBox className="mt-4" onClick={applyToolbarDraft}>
                Показать
              </ButtonBox>
            </MenuPopover>
          }
          showPopover={activeToolbarKey === "price"}
        >
          <ToolbarSelect
            label={priceLabel}
            selected={hasPriceFilter}
            active={activeToolbarKey === "price"}
            onClear={hasPriceFilter ? () => patchFilters({ minPrice: "", maxPrice: "" }) : undefined}
            onClick={() => togglePopover("price")}
          />
        </MenuPopoverSlot>

        <MenuPopoverSlot
          popover={
            <MenuPopover>
              <ToolbarSearch
                value={flowerSearch}
                onChange={setFlowerSearch}
              />
              <div className="max-h-[280px] overflow-y-auto">
                {filteredFlowerOptions.map((flower) => (
                  <ToolbarCheckboxOption
                    key={flower}
                    checked={draftToolbarFilters.flowerTypes.includes(flower)}
                    onClick={() => toggleDraftFlower(flower)}
                  >
                    {flower}
                  </ToolbarCheckboxOption>
                ))}
              </div>
              <ToolbarPopoverFooter onClick={applyToolbarDraft} />
            </MenuPopover>
          }
          showPopover={activeToolbarKey === "flowers"}
        >
          <ToolbarSelect
            label={hasFlowerFilter ? `Цветы в составе: ${filters.flowerTypes.length}` : "Цветы в составе"}
            selected={hasFlowerFilter}
            active={activeToolbarKey === "flowers"}
            onClear={hasFlowerFilter ? () => patchFilters({ flowerTypes: [] }) : undefined}
            onClick={() => togglePopover("flowers")}
          />
        </MenuPopoverSlot>

        <MenuPopoverSlot
          popover={
            <MenuPopover>
              <ToolbarSearch
                value={colorSearch}
                onChange={setColorSearch}
              />
              <div className="max-h-[280px] overflow-y-auto">
                {filteredColorOptions.map((color) => (
                  <ToolbarCheckboxOption
                    key={color.value}
                    checked={draftToolbarFilters.colors.includes(color.value)}
                    onClick={() => toggleDraftColor(color.value)}
                  >
                    {color.label}
                  </ToolbarCheckboxOption>
                ))}
              </div>
              <ToolbarPopoverFooter onClick={applyToolbarDraft} />
            </MenuPopover>
          }
          showPopover={activeToolbarKey === "colors"}
        >
          <ToolbarSelect
            label={hasColorFilter ? `Цвет букета: ${filters.colors.length}` : "Цвет букета"}
            selected={hasColorFilter}
            active={activeToolbarKey === "colors"}
            onClear={hasColorFilter ? () => patchFilters({ colors: [] }) : undefined}
            onClick={() => togglePopover("colors")}
          />
        </MenuPopoverSlot>

        <MenuPopoverSlot
          popover={
            <MenuPopover className="pt-0">
              <div>
                {freshnessOptions.map((option) => (
                  <ToolbarCheckboxOption
                    key={option.value}
                    checked={draftToolbarFilters.freshness === option.value}
                    onClick={() =>
                      patchDraftToolbarFilters({
                        freshness: draftToolbarFilters.freshness === option.value ? null : option.value,
                      })
                    }
                  >
                    {option.label}
                  </ToolbarCheckboxOption>
                ))}
              </div>
              <ToolbarPopoverFooter onClick={applyToolbarDraft} />
            </MenuPopover>
          }
          showPopover={activeToolbarKey === "freshness"}
        >
          <ToolbarSelect
            label={freshnessLabel}
            selected={hasFreshnessFilter}
            active={activeToolbarKey === "freshness"}
            onClear={hasFreshnessFilter ? () => patchFilters({ freshness: null }) : undefined}
            onClick={() => togglePopover("freshness")}
          />
        </MenuPopoverSlot>
      </div>
    );
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

function ToolbarSearch({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="m-4 mb-2 flex h-12 items-center gap-2 rounded-2xl bg-gf-bg-alt px-4 py-1.5">
      <span className="size-5 text-gf-text-secondary" aria-hidden="true">
        <svg viewBox="0 0 20 20" fill="none" className="size-5">
          <path
            d="M9.166 15.833a6.667 6.667 0 1 0 0-13.333 6.667 6.667 0 0 0 0 13.333ZM17.5 17.5l-3.625-3.625"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.7"
          />
        </svg>
      </span>
      <input
        className="min-w-0 flex-1 bg-transparent text-gf-body-m font-normal leading-[normal] text-gf-text-primary outline-none placeholder:text-gf-text-secondary"
        value={value}
        placeholder="Поиск"
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function ToolbarCheckboxOption({
  checked,
  onClick,
  children,
}: {
  checked: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      className="flex w-full items-center gap-2 px-4 py-3 text-left text-gf-body-m font-normal leading-[normal] text-gf-text-primary transition-colors hover:bg-gf-bg-alt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gf-bg-accent"
      type="button"
      onClick={onClick}
    >
      <span
        className={cn(
          "grid size-5 shrink-0 place-items-center rounded-md border border-gf-border transition-colors",
          checked ? "border-gf-bg-accent bg-gf-bg-accent text-white" : "bg-transparent",
        )}
        aria-hidden="true"
      >
        {checked ? <CheckIcon className="size-4" /> : null}
      </span>
      <span className="min-w-0 flex-1">{children}</span>
    </button>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M20 6L9 17L4 12"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

function ToolbarPopoverFooter({ onClick }: { onClick: () => void }) {
  return (
    <div className="border-t border-gf-border p-4">
      <ButtonBox onClick={onClick}>
        Показать
      </ButtonBox>
    </div>
  );
}

function ToolbarSelect({
  label,
  selected,
  active,
  onClear,
  onClick,
}: {
  label: string;
  selected: boolean;
  active: boolean;
  onClear?: () => void;
  onClick?: () => void;
}) {
  return (
    <button
      className={getToolbarChipClassName({
        selected,
        active,
        className: "gap-0.5 py-3 pl-4 pr-3",
      })}
      type="button"
      onClick={onClick}
    >
      <span className="min-w-0 truncate">{label}</span>
      <ToolbarTrailingIcon
        selected={selected}
        active={active}
        onClear={
          selected && !active && onClear
            ? (event) => {
                event.stopPropagation();
                onClear();
              }
            : undefined
        }
      />
    </button>
  );
}

function ToolbarTrailingIcon({
  selected,
  active,
  onClear,
}: {
  selected: boolean;
  active: boolean;
  onClear?: (event: React.SyntheticEvent<HTMLSpanElement>) => void;
}) {
  if (selected && !active) {
    return (
      <span
        className="inline-flex size-5 shrink-0 items-center justify-end text-gf-text-tertiary"
        onClick={(event) => {
          if (onClear) {
            onClear(event);
          }
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onClear?.(event);
          }
        }}
        role={onClear ? "button" : undefined}
        tabIndex={onClear ? 0 : undefined}
        aria-label="Сбросить фильтр"
      >
        <span
          className="size-4 bg-current"
          style={{
            maskImage: `url(${xFillIcon.src})`,
            maskPosition: "center",
            maskRepeat: "no-repeat",
            maskSize: "16px 16px",
            WebkitMaskImage: `url(${xFillIcon.src})`,
            WebkitMaskPosition: "center",
            WebkitMaskRepeat: "no-repeat",
            WebkitMaskSize: "16px 16px",
          }}
          aria-hidden="true"
        />
      </span>
    );
  }

  return (
    <span className="inline-flex size-5 shrink-0 items-center justify-center">
      <Image
        src={active ? chevronUpIcon : chevronDownIcon}
        alt=""
        aria-hidden="true"
        className="size-5"
      />
    </span>
  );
}

function getToolbarChipClassName({
  selected,
  active,
  className,
}: {
  selected: boolean;
  active: boolean;
  className?: string;
}) {
  return cn(
    "inline-flex h-[39px] items-center justify-center rounded-2xl text-gf-body-xs font-medium leading-[normal] text-gf-text-primary shadow-[inset_0_0_0_1px_var(--gf-border-normal)] transition-colors hover:bg-[#f2f2f2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gf-bg-accent",
    selected ? "bg-gf-bg-alt shadow-none" : "bg-gf-bg-base",
    active && "shadow-[inset_0_0_0_1px_var(--gf-bg-accent)]",
    className,
  );
}

function filterBySearch(options: string[], query: string) {
  const normalizedQuery = normalizeSearchValue(query);

  if (!normalizedQuery) {
    return options;
  }

  return options.filter((option) => normalizeSearchValue(option).includes(normalizedQuery));
}

function normalizeSearchValue(value: string) {
  return value.trim().toLocaleLowerCase("ru-RU");
}

function getToolbarPriceLabel(minPrice: string, maxPrice: string) {
  const min = Number(minPrice);
  const max = Number(maxPrice);
  const hasMin = Number.isFinite(min) && min > 0;
  const hasMax = Number.isFinite(max) && max > 0;

  if (hasMin && hasMax) {
    return `${formatPrice(min)} — ${formatPrice(max)}`;
  }

  if (hasMin) {
    return `от ${formatPrice(min)}`;
  }

  if (hasMax) {
    return `до ${formatPrice(max)}`;
  }

  return "Цена";
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
  const inputWidth = isFloating
    ? `${Math.max(formattedValue.length, 1)}ch`
    : "100%";

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
          style={{ width: inputWidth }}
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
