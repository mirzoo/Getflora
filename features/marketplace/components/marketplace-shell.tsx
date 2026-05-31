"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { MapPin, MessageCircle, ShoppingBag, SlidersHorizontal, X } from "lucide-react";

import { AppFrame } from "@/components/layout/app-frame";
import { AppHeader } from "@/components/layout/app-header";
import { Button } from "@/components/ui/button";
import { cities, defaultCityName } from "@/features/cities/data/cities";
import { MarketplaceFilters } from "@/features/filters/components/marketplace-filters";
import { CreateListingForm } from "@/features/listings/components/create-listing-form";
import { ListingCard } from "@/features/listings/components/listing-card";
import { ListingDetailsModal } from "@/features/listings/components/listing-details-modal";
import { mockListings } from "@/features/listings/data/mock-listings";
import { cn } from "@/lib/utils";
import type { MarketplaceFiltersState } from "@/types/filters";
import type { ListingCardModel } from "@/types/listing";

const initialFilters: MarketplaceFiltersState = {
  listingType: "sale",
  sort: "date",
  flowerTypes: [],
  minPrice: "",
  maxPrice: "",
  colors: [],
  minFreshness: null,
};

type MarketplaceView = "marketplace" | "messages" | "favorites";

type MarketplaceShellProps = {
  initialView?: MarketplaceView;
  shouldOpenAuth?: boolean;
  shouldOpenSell?: boolean;
};

export function MarketplaceShell({
  initialView = "marketplace",
  shouldOpenAuth = false,
  shouldOpenSell = false,
}: MarketplaceShellProps) {
  const [selectedCity, setSelectedCity] = useState(defaultCityName);
  const [listings, setListings] = useState(mockListings);
  const [filters, setFilters] = useState(initialFilters);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [selectedListing, setSelectedListing] = useState<ListingCardModel | null>(null);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCityModalOpen, setIsCityModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(shouldOpenAuth || shouldOpenSell);
  const [authNextAction, setAuthNextAction] = useState<"sell" | null>(
    shouldOpenSell ? "sell" : null,
  );
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeView, setActiveView] = useState<MarketplaceView>(initialView);

  const visibleListings = useMemo(() => {
    const minPrice = Number(filters.minPrice) || 0;
    const maxPrice = Number(filters.maxPrice) || Infinity;

    return listings
      .filter((listing) => listing.city === selectedCity)
      .filter((listing) => filters.listingType === "all" || listing.type === filters.listingType)
      .filter((listing) => listing.price >= minPrice && listing.price <= maxPrice)
      .filter((listing) =>
        filters.flowerTypes.length
          ? filters.flowerTypes.some((flower) => listing.flowerTypes.includes(flower))
          : true,
      )
      .filter((listing) =>
        filters.colors.length ? filters.colors.some((color) => listing.colors.includes(color)) : true,
      )
      .filter((listing) =>
        filters.minFreshness ? listing.freshnessScore >= filters.minFreshness : true,
      )
      .sort((first, second) => {
        if (filters.sort === "price-asc") {
          return first.price - second.price;
        }

        if (filters.sort === "price-desc") {
          return second.price - first.price;
        }

        if (filters.sort === "freshness") {
          return second.freshnessScore - first.freshnessScore;
        }

        return 0;
      });
  }, [filters, listings, selectedCity]);

  const favoriteListings = useMemo(
    () => listings.filter((listing) => favorites.includes(listing.id)),
    [favorites, listings],
  );

  function handleToggleFavorite(listingId: string) {
    setFavorites((current) =>
      current.includes(listingId)
        ? current.filter((favoriteId) => favoriteId !== listingId)
        : [...current, listingId],
    );
  }

  function handleCreateListing(listing: ListingCardModel) {
    setListings((current) => [listing, ...current]);
    setIsCreateOpen(false);
    setFilters(initialFilters);
  }

  function handleSellClick() {
    setActiveView("marketplace");

    if (isAuthenticated) {
      setIsCreateOpen(true);
      return;
    }

    setAuthNextAction("sell");
    setIsAuthModalOpen(true);
  }

  function handleAuthComplete() {
    setIsAuthenticated(true);
    setIsAuthModalOpen(false);

    if (authNextAction === "sell") {
      setIsCreateOpen(true);
    }

    setAuthNextAction(null);
  }

  const selectedListingIsFavorite = selectedListing
    ? favorites.includes(selectedListing.id)
    : false;

  return (
    <AppFrame>
      <AppHeader
        activeView={activeView}
        authLabel={isAuthenticated ? "Аккаунт" : "Войти"}
        onHomeClick={() => setActiveView("marketplace")}
        onFavoritesClick={() => {
          setActiveView("favorites");
          setIsCreateOpen(false);
        }}
        onMessagesClick={() => {
          setActiveView("messages");
          setIsCreateOpen(false);
        }}
        onSellClick={handleSellClick}
        onAuthClick={() => {
          setAuthNextAction(null);
          setIsAuthModalOpen(true);
        }}
      />

      <section className="mb-7 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
        <div className="space-y-3">
          {activeView === "marketplace" ? (
            <button
              className="flex items-center gap-3 text-left text-4xl font-bold tracking-normal transition-opacity hover:opacity-75"
              type="button"
              onClick={() => setIsCityModalOpen(true)}
              aria-label="Выбрать город"
            >
              <MapPin className="size-8 fill-current" />
              {selectedCity}
            </button>
          ) : (
            <h1 className="text-4xl font-bold tracking-normal">
              {activeView === "messages" ? "Сообщения" : "Избранные"}
            </h1>
          )}
        </div>

        <div className="flex gap-2">
          <Button className="sm:hidden" onClick={handleSellClick}>
            <ShoppingBag className="size-4" />
            Продать
          </Button>
          {activeView === "marketplace" ? (
            <Button className="lg:hidden" variant="secondary" onClick={() => setIsFiltersOpen(true)}>
            <SlidersHorizontal className="size-4" />
            Фильтры
          </Button>
          ) : null}
        </div>
      </section>

      {activeView === "marketplace" && isCreateOpen ? (
        <section className="mb-8">
          <CreateListingForm city={selectedCity} onCreate={handleCreateListing} />
        </section>
      ) : null}

      {activeView === "marketplace" ? (
        <ContentGrid
          aside={
            <div className="sticky top-6">
              <MarketplaceFilters
                filters={filters}
                onChange={setFilters}
              />
            </div>
          }
        >
          <div>
            {visibleListings.length ? (
              <ListingsGrid
                listings={visibleListings}
                favorites={favorites}
                onOpen={setSelectedListing}
                onToggleFavorite={handleToggleFavorite}
              />
            ) : (
              <div className="rounded-[24px] border border-border p-8">
                <h2 className="text-xl font-bold">Ничего не найдено</h2>
                <p className="mt-2 text-muted-foreground">
                  Попробуйте выбрать другой город или изменить фильтры.
                </p>
              </div>
            )}
          </div>
        </ContentGrid>
      ) : null}

      {activeView === "favorites" ? (
        <ContentGrid>
          {favoriteListings.length ? (
            <ListingsGrid
              listings={favoriteListings}
              favorites={favorites}
              onOpen={setSelectedListing}
              onToggleFavorite={handleToggleFavorite}
            />
          ) : (
            <EmptyState
              title="В избранном пока пусто"
              description="Нажмите на сердечко у букета, чтобы он появился здесь."
            />
          )}
        </ContentGrid>
      ) : null}

      {activeView === "messages" ? (
        <ContentGrid>
          <MessagesSection listings={listings} />
        </ContentGrid>
      ) : null}

      {isFiltersOpen ? (
        <div
          className="fixed inset-0 z-40 bg-black/30 lg:hidden"
          onClick={() => setIsFiltersOpen(false)}
        >
          <div
            className="ml-auto h-full w-[min(360px,92vw)] overflow-y-auto bg-background p-5 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-xl font-bold">Фильтры</h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsFiltersOpen(false)}
                aria-label="Закрыть фильтры"
              >
                <X className="size-5" />
              </Button>
            </div>
            <MarketplaceFilters
              filters={filters}
              onChange={setFilters}
            />
          </div>
        </div>
      ) : null}

      {isCityModalOpen ? (
        <CityPickerModal
          selectedCity={selectedCity}
          onSelect={(city) => {
            setSelectedCity(city);
            setIsCityModalOpen(false);
          }}
          onClose={() => setIsCityModalOpen(false)}
        />
      ) : null}

      {isAuthModalOpen ? (
        <AuthModal
          onClose={() => {
            setIsAuthModalOpen(false);
            setAuthNextAction(null);
          }}
          onComplete={handleAuthComplete}
        />
      ) : null}

      <ListingDetailsModal
        listing={selectedListing}
        isFavorite={selectedListingIsFavorite}
        onClose={() => setSelectedListing(null)}
        onToggleFavorite={handleToggleFavorite}
      />
    </AppFrame>
  );
}

function CityPickerModal({
  selectedCity,
  onSelect,
  onClose,
}: {
  selectedCity: string;
  onSelect: (city: string) => void;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-end bg-black/30 p-0 sm:place-items-center sm:p-5"
      onClick={onClose}
    >
      <button
        className="absolute inset-0 cursor-default"
        type="button"
        aria-label="Закрыть окно"
        onClick={onClose}
      />
      <div
        className="relative z-10 w-full rounded-t-[28px] bg-background p-5 shadow-2xl sm:max-w-md sm:rounded-[28px]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">Выберите город</h2>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Закрыть">
            <X className="size-5" />
          </Button>
        </div>

        <div className="grid gap-2">
          {cities.map((city) => (
            <button
              key={city.id}
              className={cn(
                "flex items-center justify-between rounded-2xl px-4 py-3 text-left transition-colors hover:bg-muted",
                selectedCity === city.name && "bg-muted font-bold",
              )}
              type="button"
              onClick={() => onSelect(city.name)}
            >
              <span>{city.name}</span>
              {selectedCity === city.name ? <MapPin className="size-4" /> : null}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function AuthModal({
  onClose,
  onComplete,
}: {
  onClose: () => void;
  onComplete: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-end bg-black/30 p-0 sm:place-items-center sm:p-5"
      onClick={onClose}
    >
      <button
        className="absolute inset-0 cursor-default"
        type="button"
        aria-label="Закрыть окно"
        onClick={onClose}
      />
      <form
        className="relative z-10 w-full rounded-t-[28px] bg-background p-5 shadow-2xl sm:max-w-md sm:rounded-[28px]"
        onClick={(event) => event.stopPropagation()}
        onSubmit={(event) => {
          event.preventDefault();
          onComplete();
        }}
      >
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">Войти или зарегистрироваться</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Нужна учетная запись, чтобы продавать букеты и писать продавцам.
            </p>
          </div>
          <Button variant="ghost" size="icon" type="button" onClick={onClose} aria-label="Закрыть">
            <X className="size-5" />
          </Button>
        </div>

        <div className="grid gap-3">
          <input
            className="h-11 rounded-xl bg-muted px-3 outline-none focus:ring-2 focus:ring-primary"
            name="phone"
            placeholder="Телефон"
            type="tel"
            required
          />
          <input
            className="h-11 rounded-xl bg-muted px-3 outline-none focus:ring-2 focus:ring-primary"
            name="name"
            placeholder="Имя"
            required
          />
          <Button type="submit">Продолжить</Button>
        </div>
      </form>
    </div>
  );
}

function ListingsGrid({
  listings,
  favorites,
  onOpen,
  onToggleFavorite,
}: {
  listings: ListingCardModel[];
  favorites: string[];
  onOpen: (listing: ListingCardModel) => void;
  onToggleFavorite: (listingId: string) => void;
}) {
  return (
    <div className="grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
      {listings.map((listing) => (
        <ListingCard
          key={listing.id}
          listing={listing}
          isFavorite={favorites.includes(listing.id)}
          onOpen={onOpen}
          onToggleFavorite={onToggleFavorite}
        />
      ))}
    </div>
  );
}

function ContentGrid({
  children,
  aside = <div aria-hidden="true" />,
}: {
  children: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <section className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_280px]">
      <div className="min-w-0">{children}</div>
      <aside className="hidden lg:block">{aside}</aside>
    </section>
  );
}

function MessagesSection({ listings }: { listings: ListingCardModel[] }) {
  const activeChats = listings.slice(0, 4);

  return (
    <section className="grid gap-3">
      {activeChats.map((listing) => (
        <Link
          key={listing.id}
          className="flex items-center justify-between gap-4 rounded-[24px] border border-border p-4 transition-colors hover:bg-muted"
          href={`/messages/${listing.id}?seller=${listing.sellerId ?? listing.sellerName}`}
        >
          <div className="min-w-0">
            <p className="font-bold">{listing.sellerName}</p>
            <p className="truncate text-sm text-muted-foreground">{listing.title}</p>
          </div>
          <MessageCircle className="size-5 shrink-0 text-muted-foreground" />
        </Link>
      ))}
    </section>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-[24px] border border-border p-8">
      <h2 className="text-xl font-bold">{title}</h2>
      <p className="mt-2 text-muted-foreground">{description}</p>
    </div>
  );
}
