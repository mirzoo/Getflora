"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MapPin, MessageCircle, ShoppingBag, SlidersHorizontal, X } from "lucide-react";

import { AppFrame } from "@/components/layout/app-frame";
import { AppHeader } from "@/components/layout/app-header";
import { Button } from "@/components/ui/button";
import { cities, defaultCityName } from "@/features/cities/data/cities";
import { MarketplaceFilters } from "@/features/filters/components/marketplace-filters";
import { signInAction, signOutAction, signUpAction } from "@/features/auth/actions/session";
import { CreateListingForm } from "@/features/listings/components/create-listing-form";
import { EditListingForm } from "@/features/listings/components/edit-listing-form";
import { archiveListingAction, markListingSoldAction } from "@/features/listings/actions/update-listing-status";
import { toggleFavoriteAction } from "@/features/favorites/actions/toggle-favorite";
import { ListingCard } from "@/features/listings/components/listing-card";
import { ListingDetailsModal } from "@/features/listings/components/listing-details-modal";
import { cn } from "@/lib/utils";
import type { MarketplaceFiltersState } from "@/types/filters";
import type { ConversationPreviewModel } from "@/types/conversation";
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

type MarketplaceView = "marketplace" | "messages" | "favorites" | "sell" | "my-listings";

const selectedCityStorageKey = "getflora:selected-city";

type MarketplaceShellProps = {
  initialView?: MarketplaceView;
  initialListings: ListingCardModel[];
  initialFavoriteListingIds: string[];
  initialConversations: ConversationPreviewModel[];
  initialMyListings: ListingCardModel[];
  initialUser: {
    id: string;
    name: string;
    email: string | null;
  } | null;
  shouldOpenAuth?: boolean;
  shouldOpenAccount?: boolean;
};

export function MarketplaceShell({
  initialView = "marketplace",
  initialListings,
  initialFavoriteListingIds,
  initialConversations,
  initialMyListings,
  initialUser,
  shouldOpenAuth = false,
  shouldOpenAccount = false,
}: MarketplaceShellProps) {
  const router = useRouter();
  const [selectedCity, setSelectedCity] = useState(defaultCityName);
  const [listings, setListings] = useState(initialListings);
  const [filters, setFilters] = useState(initialFilters);
  const [favorites, setFavorites] = useState<string[]>(initialFavoriteListingIds);
  const [conversations, setConversations] = useState(initialConversations);
  const [myListings, setMyListings] = useState(initialMyListings);
  const [selectedListing, setSelectedListing] = useState<ListingCardModel | null>(null);
  const [editingListing, setEditingListing] = useState<ListingCardModel | null>(null);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [isCityModalOpen, setIsCityModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(shouldOpenAuth);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(shouldOpenAccount && Boolean(initialUser));
  const [currentUser, setCurrentUser] = useState(initialUser);
  const [activeView, setActiveView] = useState<MarketplaceView>(initialView);
  const [, startFavoriteTransition] = useTransition();
  const [, startListingStatusTransition] = useTransition();

  useEffect(() => {
    setCurrentUser(initialUser);
    setFavorites(initialFavoriteListingIds);
    setConversations(initialConversations);
    setMyListings(initialMyListings);
  }, [initialUser, initialFavoriteListingIds, initialConversations, initialMyListings]);

  useEffect(() => {
    const savedCity = window.localStorage.getItem(selectedCityStorageKey);

    if (savedCity && cities.some((city) => city.name === savedCity)) {
      setSelectedCity(savedCity);
    }
  }, []);

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
    if (!currentUser) {
      setIsAuthModalOpen(true);
      return;
    }

    const wasFavorite = favorites.includes(listingId);

    setFavorites((current) =>
      current.includes(listingId)
        ? current.filter((favoriteId) => favoriteId !== listingId)
        : [...current, listingId],
    );

    startFavoriteTransition(async () => {
      try {
        await toggleFavoriteAction(listingId);
      } catch (error) {
        console.error("Failed to toggle favorite.", error);
        setFavorites((current) =>
          wasFavorite
            ? [...new Set([...current, listingId])]
            : current.filter((favoriteId) => favoriteId !== listingId),
        );
      }
    });
  }

  function handleCreateListing(listing: ListingCardModel) {
    setListings((current) => [listing, ...current]);
    setMyListings((current) => [listing, ...current]);
    setFilters(initialFilters);
    setActiveView("marketplace");
  }

  function handleUpdateListing(updatedListing: ListingCardModel) {
    setListings((current) =>
      current.map((listing) => listing.id === updatedListing.id ? updatedListing : listing),
    );
    setMyListings((current) =>
      current.map((listing) => listing.id === updatedListing.id ? updatedListing : listing),
    );
    setSelectedListing((current) => current?.id === updatedListing.id ? updatedListing : current);
    setEditingListing(null);
  }

  function handleSellClick() {
    if (!currentUser) {
      setIsAuthModalOpen(true);
      return;
    }

    setActiveView("sell");
  }

  function handleAuthComplete(user: NonNullable<MarketplaceShellProps["initialUser"]>) {
    setCurrentUser(user);
    setIsAuthModalOpen(false);
    router.refresh();
  }

  function handleRequireAuth() {
    setIsAuthModalOpen(true);
  }

  function handleArchiveListing(listingId: string) {
    const previousListings = listings;
    const previousMyListings = myListings;

    setListings((current) => current.filter((listing) => listing.id !== listingId));
    setMyListings((current) => current.filter((listing) => listing.id !== listingId));
    setSelectedListing((current) => current?.id === listingId ? null : current);

    startListingStatusTransition(async () => {
      const result = await archiveListingAction(listingId);

      if (!result.ok) {
        console.error(result.error);
        setListings(previousListings);
        setMyListings(previousMyListings);
      }
    });
  }

  function handleMarkListingSold(listingId: string) {
    const previousListings = listings;
    const previousMyListings = myListings;

    setListings((current) => current.filter((listing) => listing.id !== listingId));
    setMyListings((current) =>
      current.map((listing) =>
        listing.id === listingId
          ? {
              ...listing,
              status: "sold",
            }
          : listing,
      ),
    );
    setSelectedListing((current) => current?.id === listingId ? null : current);

    startListingStatusTransition(async () => {
      const result = await markListingSoldAction(listingId);

      if (!result.ok) {
        console.error(result.error);
        setListings(previousListings);
        setMyListings(previousMyListings);
      }
    });
  }

  const selectedListingIsFavorite = selectedListing
    ? favorites.includes(selectedListing.id)
    : false;

  return (
    <AppFrame>
      <AppHeader
        activeView={activeView}
        authLabel={currentUser ? "Аккаунт" : "Войти"}
        onHomeClick={() => setActiveView("marketplace")}
        onFavoritesClick={() => setActiveView("favorites")}
        onMessagesClick={() => setActiveView("messages")}
        onSellClick={handleSellClick}
        onAuthClick={() => {
          if (currentUser) {
            setIsAccountModalOpen(true);
            return;
          }

          setIsAuthModalOpen(true);
        }}
      />

      <section className="mb-7 grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
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
              {activeView === "messages"
                ? "Сообщения"
                : activeView === "favorites"
                  ? "Избранные"
                  : activeView === "my-listings"
                    ? "Мои объявления"
                    : "Продать"}
            </h1>
          )}
        </div>

        <div className="flex gap-2">
          {activeView !== "sell" ? (
            <Button className="lg:hidden" onClick={handleSellClick}>
              <ShoppingBag className="size-4" />
              Продать
            </Button>
          ) : null}
          {activeView === "marketplace" ? (
            <Button className="lg:hidden" variant="secondary" onClick={() => setIsFiltersOpen(true)}>
            <SlidersHorizontal className="size-4" />
            Фильтры
          </Button>
          ) : null}
        </div>
      </section>

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
              currentUserId={currentUser?.id}
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
              currentUserId={currentUser?.id}
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
          <MessagesSection conversations={conversations} />
        </ContentGrid>
      ) : null}

      {activeView === "my-listings" ? (
        <ContentGrid>
          {myListings.length ? (
            <MyListingsSection
              listings={myListings}
              favorites={favorites}
              currentUserId={currentUser?.id}
              onOpen={setSelectedListing}
              onToggleFavorite={handleToggleFavorite}
              onEdit={setEditingListing}
              onArchive={handleArchiveListing}
              onMarkSold={handleMarkListingSold}
            />
          ) : (
            <EmptyState
              title="У вас пока нет объявлений"
              description="Нажмите Продать и опубликуйте первый букет."
            />
          )}
        </ContentGrid>
      ) : null}

      {activeView === "sell" ? (
        <ContentGrid>
          <CreateListingForm
            city={selectedCity}
            sellerName={currentUser?.name}
            sellerEmail={currentUser?.email}
            onCreate={handleCreateListing}
          />
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
            window.localStorage.setItem(selectedCityStorageKey, city);
            setIsCityModalOpen(false);
          }}
          onClose={() => setIsCityModalOpen(false)}
        />
      ) : null}

      {isAuthModalOpen ? (
        <AuthModal
          onClose={() => {
            setIsAuthModalOpen(false);
          }}
          onComplete={handleAuthComplete}
        />
      ) : null}

      {isAccountModalOpen && currentUser ? (
        <AccountModal
          user={currentUser}
          onClose={() => setIsAccountModalOpen(false)}
          onOpenMyListings={() => {
            setIsAccountModalOpen(false);
            setActiveView("my-listings");
          }}
          onSignOut={() => {
            setCurrentUser(null);
            setFavorites([]);
            setConversations([]);
            setMyListings([]);
            setIsAccountModalOpen(false);
            setActiveView("marketplace");
          }}
        />
      ) : null}

      {editingListing ? (
        <EditListingModal
          listing={editingListing}
          onClose={() => setEditingListing(null)}
          onUpdate={handleUpdateListing}
        />
      ) : null}

      <ListingDetailsModal
        listing={selectedListing}
        isFavorite={selectedListingIsFavorite}
        isAuthenticated={Boolean(currentUser)}
        isOwnListing={Boolean(currentUser && selectedListing?.sellerId === currentUser.id)}
        onClose={() => setSelectedListing(null)}
        onToggleFavorite={handleToggleFavorite}
        onRequireAuth={handleRequireAuth}
        onEdit={(listing) => {
          setSelectedListing(null);
          setEditingListing(listing);
        }}
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
      className="fixed inset-0 z-50 grid place-items-end bg-black/30 p-0 lg:place-items-center lg:p-5"
      onClick={onClose}
    >
      <button
        className="absolute inset-0 cursor-default"
        type="button"
        aria-label="Закрыть окно"
        onClick={onClose}
      />
      <div
        className="relative z-10 w-full rounded-t-[28px] bg-background p-5 shadow-2xl lg:max-w-md lg:rounded-[28px]"
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
  onComplete: (user: NonNullable<MarketplaceShellProps["initialUser"]>) => void;
}) {
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const isSignUp = mode === "sign-up";

  return (
    <div
      className="fixed inset-0 z-[70] grid place-items-end bg-black/30 p-0 lg:place-items-center lg:p-5"
      onClick={onClose}
    >
      <button
        className="absolute inset-0 cursor-default"
        type="button"
        aria-label="Закрыть окно"
        onClick={onClose}
      />
      <form
        className="relative z-10 w-full rounded-t-[28px] bg-background p-5 shadow-2xl lg:max-w-md lg:rounded-[28px]"
        onClick={(event) => event.stopPropagation()}
        onSubmit={(event) => {
          event.preventDefault();
          setError("");

          const formData = new FormData(event.currentTarget);

          startTransition(async () => {
            const result = isSignUp ? await signUpAction(formData) : await signInAction(formData);

            if (!result.ok) {
              setError(result.error);
              return;
            }

            onComplete(result.user);
          });
        }}
      >
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">{isSignUp ? "Зарегистрироваться" : "Войти"}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {isSignUp
                ? "Создайте аккаунт с паролем. Magic link добавим после домена и HTTPS."
                : "Войдите по email и паролю, чтобы публиковать букеты и писать продавцам."}
            </p>
          </div>
          <Button variant="ghost" size="icon" type="button" onClick={onClose} aria-label="Закрыть">
            <X className="size-5" />
          </Button>
        </div>

        <div className="grid gap-3">
          <input
            className="h-11 rounded-xl bg-muted px-3 outline-none focus:ring-2 focus:ring-primary"
            name="email"
            placeholder="you@example.com"
            type="email"
            required
          />
          {isSignUp ? (
            <input
              className="h-11 rounded-xl bg-muted px-3 outline-none focus:ring-2 focus:ring-primary"
              name="name"
              placeholder="Имя"
              required
            />
          ) : null}
          <input
            className="h-11 rounded-xl bg-muted px-3 outline-none focus:ring-2 focus:ring-primary"
            name="password"
            placeholder="Пароль"
            type="password"
            minLength={8}
            required
          />
          {error ? <p className="text-sm text-primary">{error}</p> : null}
          <Button type="submit" disabled={isPending}>
            {isPending ? "Проверяем..." : isSignUp ? "Создать аккаунт" : "Войти"}
          </Button>
          <Button
            variant="ghost"
            type="button"
            onClick={() => {
              setError("");
              setMode(isSignUp ? "sign-in" : "sign-up");
            }}
          >
            {isSignUp ? "Уже есть аккаунт" : "Создать аккаунт"}
          </Button>
        </div>
      </form>
    </div>
  );
}

function AccountModal({
  user,
  onClose,
  onOpenMyListings,
  onSignOut,
}: {
  user: NonNullable<MarketplaceShellProps["initialUser"]>;
  onClose: () => void;
  onOpenMyListings: () => void;
  onSignOut: () => void;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <div
      className="fixed inset-0 z-[60] grid place-items-end bg-black/30 p-0 lg:place-items-center lg:p-5"
      onClick={onClose}
    >
      <button
        className="absolute inset-0 cursor-default"
        type="button"
        aria-label="Закрыть окно"
        onClick={onClose}
      />
      <div
        className="relative z-10 w-full rounded-t-[28px] bg-background p-5 shadow-2xl lg:max-w-md lg:rounded-[28px]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">Аккаунт</h2>
            <p className="mt-1 text-sm text-muted-foreground">Текущая учетная запись.</p>
          </div>
          <Button variant="ghost" size="icon" type="button" onClick={onClose} aria-label="Закрыть">
            <X className="size-5" />
          </Button>
        </div>

        <div className="grid gap-3">
          <div className="rounded-2xl bg-muted p-4">
            <p className="text-xs text-muted-foreground">Имя</p>
            <strong>{user.name}</strong>
          </div>
          <div className="rounded-2xl bg-muted p-4">
            <p className="text-xs text-muted-foreground">Email</p>
            <strong>{user.email}</strong>
          </div>
          <Button type="button" onClick={onOpenMyListings}>
            <ShoppingBag className="size-4" />
            Мои объявления
          </Button>
          <Button
            variant="secondary"
            type="button"
            disabled={isPending}
            onClick={() => {
              startTransition(async () => {
                await signOutAction();
                onSignOut();
              });
            }}
          >
            {isPending ? "Выходим..." : "Выйти"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function EditListingModal({
  listing,
  onClose,
  onUpdate,
}: {
  listing: ListingCardModel;
  onClose: () => void;
  onUpdate: (listing: ListingCardModel) => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[65] grid place-items-end bg-black/30 p-0 lg:place-items-center lg:p-5"
      onClick={onClose}
    >
      <button
        className="absolute inset-0 cursor-default"
        type="button"
        aria-label="Закрыть окно"
        onClick={onClose}
      />
      <div
        className="relative z-10 max-h-[92vh] w-full overflow-y-auto rounded-t-[28px] bg-background p-5 shadow-2xl lg:max-w-3xl lg:rounded-[28px]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex justify-end">
          <Button variant="ghost" size="icon" type="button" onClick={onClose} aria-label="Закрыть">
            <X className="size-5" />
          </Button>
        </div>
        <EditListingForm listing={listing} onCancel={onClose} onUpdate={onUpdate} />
      </div>
    </div>
  );
}

function ListingsGrid({
  listings,
  favorites,
  currentUserId,
  onOpen,
  onToggleFavorite,
}: {
  listings: ListingCardModel[];
  favorites: string[];
  currentUserId?: string;
  onOpen: (listing: ListingCardModel) => void;
  onToggleFavorite: (listingId: string) => void;
}) {
  return (
    <div className="grid gap-7 lg:grid-cols-3">
      {listings.map((listing) => (
        <ListingCard
          key={listing.id}
          listing={listing}
          isFavorite={favorites.includes(listing.id)}
          canToggleFavorite={listing.sellerId !== currentUserId}
          onOpen={onOpen}
          onToggleFavorite={onToggleFavorite}
        />
      ))}
    </div>
  );
}

function MyListingsSection({
  listings,
  favorites,
  currentUserId,
  onOpen,
  onToggleFavorite,
  onEdit,
  onArchive,
  onMarkSold,
}: {
  listings: ListingCardModel[];
  favorites: string[];
  currentUserId?: string;
  onOpen: (listing: ListingCardModel) => void;
  onToggleFavorite: (listingId: string) => void;
  onEdit: (listing: ListingCardModel) => void;
  onArchive: (listingId: string) => void;
  onMarkSold: (listingId: string) => void;
}) {
  const activeListings = listings.filter((listing) => listing.status === "active");
  const soldListings = listings.filter((listing) => listing.status === "sold");
  const otherListings = listings.filter(
    (listing) => listing.status !== "active" && listing.status !== "sold",
  );

  return (
    <div className="space-y-10">
      <MyListingsGroup
        title="Активные"
        description="Видны покупателям в маркетплейсе."
        emptyTitle="Активных объявлений нет"
        emptyDescription="Опубликуйте букет или проверьте проданные объявления ниже."
        listings={activeListings}
        favorites={favorites}
        currentUserId={currentUserId}
        onOpen={onOpen}
        onToggleFavorite={onToggleFavorite}
        onEdit={onEdit}
        onArchive={onArchive}
        onMarkSold={onMarkSold}
      />

      <MyListingsGroup
        title="Проданные"
        description="Остаются здесь 24 часа, потом удаляются автоматически."
        emptyTitle="Проданных объявлений пока нет"
        emptyDescription="Когда отметите букет как проданный, он появится в этом блоке."
        listings={soldListings}
        favorites={favorites}
        currentUserId={currentUserId}
        onOpen={onOpen}
        onToggleFavorite={onToggleFavorite}
        onEdit={onEdit}
        onArchive={onArchive}
        onMarkSold={onMarkSold}
      />

      {otherListings.length ? (
        <MyListingsGroup
          title="Неактивные"
          description="Снятые, истекшие или заблокированные объявления."
          emptyTitle=""
          emptyDescription=""
          listings={otherListings}
          favorites={favorites}
          currentUserId={currentUserId}
          onOpen={onOpen}
          onToggleFavorite={onToggleFavorite}
          onEdit={onEdit}
          onArchive={onArchive}
          onMarkSold={onMarkSold}
        />
      ) : null}
    </div>
  );
}

function MyListingsGroup({
  title,
  description,
  emptyTitle,
  emptyDescription,
  listings,
  favorites,
  currentUserId,
  onOpen,
  onToggleFavorite,
  onEdit,
  onArchive,
  onMarkSold,
}: {
  title: string;
  description: string;
  emptyTitle: string;
  emptyDescription: string;
  listings: ListingCardModel[];
  favorites: string[];
  currentUserId?: string;
  onOpen: (listing: ListingCardModel) => void;
  onToggleFavorite: (listingId: string) => void;
  onEdit: (listing: ListingCardModel) => void;
  onArchive: (listingId: string) => void;
  onMarkSold: (listingId: string) => void;
}) {
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b pb-3">
        <div>
          <h2 className="text-xl font-bold">{title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
        <span className="text-sm font-medium text-muted-foreground">
          {listings.length}
        </span>
      </div>

      {listings.length ? (
        <div className="grid gap-7 lg:grid-cols-3">
          {listings.map((listing) => (
            <div key={listing.id} className="grid gap-3">
              <ListingStatusNotice status={listing.status} />
              <ListingCard
                listing={listing}
                isFavorite={favorites.includes(listing.id)}
                canToggleFavorite={listing.sellerId !== currentUserId}
                onOpen={onOpen}
                onToggleFavorite={onToggleFavorite}
              />
              {listing.status === "active" ? (
                <div className="grid gap-2 sm:grid-cols-3">
                  <Button
                    variant="secondary"
                    type="button"
                    onClick={() => onEdit(listing)}
                  >
                    Редактировать
                  </Button>
                  <Button
                    type="button"
                    onClick={() => onMarkSold(listing.id)}
                  >
                    Продано
                  </Button>
                  <Button
                    variant="secondary"
                    type="button"
                    onClick={() => onArchive(listing.id)}
                  >
                    Снять
                  </Button>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      ) : (
        <EmptyState title={emptyTitle} description={emptyDescription} />
      )}
    </section>
  );
}

function ListingStatusNotice({ status }: { status: ListingCardModel["status"] }) {
  if (status === "active") {
    return (
      <div className="rounded-lg bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">
        Активно. Покупатели видят объявление.
      </div>
    );
  }

  if (status === "sold") {
    return (
      <div className="rounded-lg bg-muted px-4 py-3 text-sm font-bold">
        Продано. Скроется через 24 часа.
      </div>
    );
  }

  if (status === "expired") {
    return (
      <div className="rounded-lg bg-muted px-4 py-3 text-sm font-bold">
        Снято или истек срок публикации.
      </div>
    );
  }

  if (status === "blocked") {
    return (
      <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm font-bold text-destructive">
        Заблокировано модерацией.
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-muted px-4 py-3 text-sm font-bold">
      Черновик.
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

function MessagesSection({ conversations }: { conversations: ConversationPreviewModel[] }) {
  return (
    <section className="grid gap-3">
      {conversations.length ? conversations.map((conversation) => (
        <Link
          key={conversation.id}
          className="flex items-center justify-between gap-4 rounded-[24px] border border-border p-4 transition-colors hover:bg-muted"
          href={`/messages/${conversation.listingId}`}
        >
          <div className="min-w-0">
            <p className="font-bold">{conversation.participantName}</p>
            <p className="text-xs text-muted-foreground">
              {conversation.participantRole === "seller" ? "Продавец" : "Покупатель"}
            </p>
            <p className="truncate text-sm text-muted-foreground">{conversation.listingTitle}</p>
            <p className="truncate text-sm text-muted-foreground">{conversation.lastMessage}</p>
          </div>
          <MessageCircle className="size-5 shrink-0 text-muted-foreground" />
        </Link>
      )) : (
        <EmptyState
          title="Сообщений пока нет"
          description="Откройте объявление и нажмите Купить, чтобы начать чат с продавцом."
        />
      )}
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
