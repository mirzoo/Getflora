"use client";

import Image from "next/image";
import { X } from "lucide-react";
import { forwardRef, useEffect, useMemo, useRef, useState } from "react";

import chevronDownIcon from "@/assets/icon/icn_m_chevron-down.svg";
import chevronUpIcon from "@/assets/icon/icn_m_chevron-up.svg";
import xFillIcon from "@/assets/icon/icn_m_x-fill.svg";
import { ButtonBox } from "@/components/ui/button-box";
import { MenuPopover, MenuPopoverOption, MenuPopoverSlot } from "@/components/ui/menu-popover";
import {
  flowerTypeOptions,
  freshnessOptions,
  listingTypeOptions,
  sortOptions,
} from "@/features/filters/constants";
import type { MarketplaceFiltersState } from "@/types/filters";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";

export type ToolbarFilterKey = "sort" | "price" | "flowers" | "freshness";

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
  const toolbarRef = useRef<HTMLDivElement | null>(null);
  const mobileSheetRef = useRef<HTMLDivElement | null>(null);

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

  function toggleDraftFlower(flower: string) {
    const flowerTypes = draftToolbarFilters.flowerTypes.includes(flower)
      ? draftToolbarFilters.flowerTypes.filter((item) => item !== flower)
      : [...draftToolbarFilters.flowerTypes, flower];

    patchDraftToolbarFilters({ flowerTypes });
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
      const target = event.target as Node;

      if (
        !toolbarRef.current?.contains(target) &&
        !mobileSheetRef.current?.contains(target)
      ) {
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
    const hasFreshnessFilter = Boolean(filters.freshness);
    const activeToolbarTitle = getToolbarSheetTitle(activeToolbarKey);

    return (
      <>
        <div
          ref={toolbarRef}
          className="-mx-4 mt-2 flex w-[calc(100%+32px)] max-w-[100vw] items-center justify-start gap-2 overflow-x-auto px-4 [scrollbar-width:none] md:-mx-10 md:mt-0 md:w-[calc(100%+80px)] md:max-w-[100vw] md:flex-nowrap md:justify-start md:px-10 lg:mx-0 lg:w-full lg:max-w-full lg:justify-center lg:overflow-visible lg:px-0 [&::-webkit-scrollbar]:hidden"
        >
          <MenuPopoverSlot
            popover={
              <MenuPopover className="hidden w-[180px] p-0 shadow-[0_4px_12px_rgb(0_0_0/0.18)] md:block">
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
              <MenuPopover className="hidden w-[323px] p-4 shadow-[0_4px_12px_rgb(0_0_0/0.18)] md:block">
                <ToolbarPriceFields
                  minPrice={draftToolbarFilters.minPrice}
                  maxPrice={draftToolbarFilters.maxPrice}
                  onMinPriceChange={(value) => patchDraftToolbarFilters({ minPrice: value })}
                  onMaxPriceChange={(value) => patchDraftToolbarFilters({ maxPrice: value })}
                />
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
              <MenuPopover className="hidden md:block">
                <ToolbarFlowersContent
                  flowerSearch={flowerSearch}
                  filteredFlowerOptions={filteredFlowerOptions}
                  selectedFlowers={draftToolbarFilters.flowerTypes}
                  onFlowerSearchChange={setFlowerSearch}
                  onFlowerClick={toggleDraftFlower}
                />
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
              <MenuPopover className="hidden pt-0 md:block">
                <ToolbarFreshnessContent
                  selectedFreshness={draftToolbarFilters.freshness}
                  onFreshnessClick={(value) =>
                    patchDraftToolbarFilters({
                      freshness: draftToolbarFilters.freshness === value ? null : value,
                    })
                  }
                />
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

        {activeToolbarKey ? (
          <ToolbarBottomSheet
            ref={mobileSheetRef}
            title={activeToolbarTitle}
            onClose={closePopover}
          >
            {activeToolbarKey === "sort" ? (
              sortOptions.map((option) => (
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
              ))
            ) : null}
            {activeToolbarKey === "price" ? (
              <>
                <div className="p-4">
                  <ToolbarPriceFields
                    minPrice={draftToolbarFilters.minPrice}
                    maxPrice={draftToolbarFilters.maxPrice}
                    onMinPriceChange={(value) => patchDraftToolbarFilters({ minPrice: value })}
                    onMaxPriceChange={(value) => patchDraftToolbarFilters({ maxPrice: value })}
                  />
                </div>
                <ToolbarPopoverFooter onClick={applyToolbarDraft} />
              </>
            ) : null}
            {activeToolbarKey === "flowers" ? (
              <>
                <ToolbarFlowersContent
                  flowerSearch={flowerSearch}
                  filteredFlowerOptions={filteredFlowerOptions}
                  selectedFlowers={draftToolbarFilters.flowerTypes}
                  onFlowerSearchChange={setFlowerSearch}
                  onFlowerClick={toggleDraftFlower}
                />
                <ToolbarPopoverFooter onClick={applyToolbarDraft} />
              </>
            ) : null}
            {activeToolbarKey === "freshness" ? (
              <>
                <ToolbarFreshnessContent
                  selectedFreshness={draftToolbarFilters.freshness}
                  onFreshnessClick={(value) =>
                    patchDraftToolbarFilters({
                      freshness: draftToolbarFilters.freshness === value ? null : value,
                    })
                  }
                />
                <ToolbarPopoverFooter onClick={applyToolbarDraft} />
              </>
            ) : null}
          </ToolbarBottomSheet>
        ) : null}
      </>
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

function ToolbarPriceFields({
  minPrice,
  maxPrice,
  onMinPriceChange,
  onMaxPriceChange,
}: {
  minPrice: string;
  maxPrice: string;
  onMinPriceChange: (value: string) => void;
  onMaxPriceChange: (value: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <PriceInput
        prefix="от"
        placeholder="от 0 ₽"
        value={minPrice}
        onChange={onMinPriceChange}
      />
      <PriceInput
        prefix="до"
        placeholder="до 50 000 ₽+"
        value={maxPrice}
        onChange={onMaxPriceChange}
      />
    </div>
  );
}

function ToolbarFlowersContent({
  flowerSearch,
  filteredFlowerOptions,
  selectedFlowers,
  onFlowerSearchChange,
  onFlowerClick,
}: {
  flowerSearch: string;
  filteredFlowerOptions: string[];
  selectedFlowers: string[];
  onFlowerSearchChange: (value: string) => void;
  onFlowerClick: (flower: string) => void;
}) {
  return (
    <>
      <ToolbarSearch
        value={flowerSearch}
        onChange={onFlowerSearchChange}
      />
      <div className="max-h-[280px] overflow-y-auto">
        {filteredFlowerOptions.map((flower) => (
          <ToolbarCheckboxOption
            key={flower}
            checked={selectedFlowers.includes(flower)}
            onClick={() => onFlowerClick(flower)}
          >
            {flower}
          </ToolbarCheckboxOption>
        ))}
      </div>
    </>
  );
}

function ToolbarFreshnessContent({
  selectedFreshness,
  onFreshnessClick,
}: {
  selectedFreshness: MarketplaceFiltersState["freshness"];
  onFreshnessClick: (value: NonNullable<MarketplaceFiltersState["freshness"]>) => void;
}) {
  return (
    <div>
      {freshnessOptions.map((option) => (
        <ToolbarCheckboxOption
          key={option.value}
          checked={selectedFreshness === option.value}
          onClick={() => onFreshnessClick(option.value)}
        >
          {option.label}
        </ToolbarCheckboxOption>
      ))}
    </div>
  );
}

const ToolbarBottomSheet = forwardRef<HTMLDivElement, {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}>(function ToolbarBottomSheet({
  title,
  children,
  onClose,
}, ref) {
  return (
    <div className="fixed inset-0 z-[70] grid place-items-end bg-black/40 md:hidden">
      <button
        className="absolute inset-0 cursor-default"
        type="button"
        aria-label="Закрыть фильтр"
        onClick={onClose}
      />
      <div
        ref={ref}
        className="relative z-10 max-h-[82vh] w-full overflow-hidden rounded-t-[28px] bg-gf-bg-base shadow-[0_-12px_40px_rgb(0_0_0/0.18)]"
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="flex min-h-14 items-center justify-between gap-4 border-b border-gf-border px-4">
          <h2 className="text-gf-body-m font-bold leading-[normal] text-gf-text-primary">
            {title}
          </h2>
          <button
            className="grid size-10 shrink-0 place-items-center rounded-full bg-gf-bg-alt text-gf-text-primary transition-colors hover:bg-[#f2f2f2]"
            type="button"
            aria-label="Закрыть"
            onClick={onClose}
          >
            <X className="size-5" />
          </button>
        </div>
        <div className="max-h-[calc(82vh-56px)] overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
});

function getToolbarSheetTitle(key: ToolbarFilterKey | null) {
  switch (key) {
    case "sort":
      return "Сортировка";
    case "price":
      return "Цена";
    case "flowers":
      return "Цветы в составе";
    case "freshness":
      return "Свежесть";
    default:
      return "Фильтр";
  }
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
    "inline-flex h-[39px] shrink-0 items-center justify-center rounded-2xl text-gf-body-xs font-medium leading-[normal] text-gf-text-primary transition-colors hover:bg-[#f2f2f2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gf-bg-accent md:shadow-[inset_0_0_0_1px_var(--gf-border-normal)]",
    selected ? "bg-gf-bg-alt shadow-none" : "bg-gf-bg-alt md:bg-gf-bg-base",
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
