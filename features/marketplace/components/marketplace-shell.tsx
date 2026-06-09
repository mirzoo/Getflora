"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState, useTransition } from "react";
import { MapPin, MessageCircle, ShoppingBag, SlidersHorizontal, X } from "lucide-react";

import { AppFrame } from "@/components/layout/app-frame";
import { AppHeader } from "@/components/layout/app-header";
import { Button } from "@/components/ui/button";
import { cities, defaultCityName } from "@/features/cities/data/cities";
import { MarketplaceFilters } from "@/features/filters/components/marketplace-filters";
import { AuthModal } from "@/features/auth/components/auth-modal";
import { setCurrentUserPasswordAction, signOutAction } from "@/features/auth/actions/session";
import { CreateListingForm } from "@/features/listings/components/create-listing-form";
import { EditListingForm } from "@/features/listings/components/edit-listing-form";
import { archiveListingAction, markListingSoldAction } from "@/features/listings/actions/update-listing-status";
import { toggleFavoriteAction } from "@/features/favorites/actions/toggle-favorite";
import { ListingCard } from "@/features/listings/components/listing-card";
import { ListingDetailsModal } from "@/features/listings/components/listing-details-modal";
import { ReportListingModal } from "@/features/reports/components/report-listing-modal";
import {
  loadConversationPreviewsAction,
  loadMyListingsAction,
} from "@/features/marketplace/actions/load-user-sections";
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
const emptyConversations: ConversationPreviewModel[] = [];
const emptyListings: ListingCardModel[] = [];

type MarketplaceShellProps = {
  initialView?: MarketplaceView;
  initialListings: ListingCardModel[];
  initialFavoriteListingIds: string[];
  initialConversations?: ConversationPreviewModel[];
  initialMyListings?: ListingCardModel[];
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
  initialConversations = emptyConversations,
  initialMyListings = emptyListings,
  initialUser,
  shouldOpenAuth = false,
  shouldOpenAccount = false,
}: MarketplaceShellProps) {
  const [selectedCity, setSelectedCity] = useState(defaultCityName);
  const [listings, setListings] = useState(initialListings);
  const [filters, setFilters] = useState(initialFilters);
  const [favorites, setFavorites] = useState<string[]>(initialFavoriteListingIds);
  const [conversations, setConversations] = useState(initialConversations);
  const [myListings, setMyListings] = useState(initialMyListings);
  const [selectedListing, setSelectedListing] = useState<ListingCardModel | null>(null);
  const [reportingListing, setReportingListing] = useState<ListingCardModel | null>(null);
  const [editingListing, setEditingListing] = useState<ListingCardModel | null>(null);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [isCityModalOpen, setIsCityModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(shouldOpenAuth);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(shouldOpenAccount && Boolean(initialUser));
  const [currentUser, setCurrentUser] = useState(initialUser);
  const [activeView, setActiveView] = useState<MarketplaceView>(initialView);
  const [hasLoadedConversations, setHasLoadedConversations] = useState(initialConversations.length > 0);
  const [hasLoadedMyListings, setHasLoadedMyListings] = useState(initialMyListings.length > 0);
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);
  const [isLoadingMyListings, setIsLoadingMyListings] = useState(false);
  const [, startFavoriteTransition] = useTransition();
  const [, startListingStatusTransition] = useTransition();

  useEffect(() => {
    setCurrentUser(initialUser);
    setFavorites(initialFavoriteListingIds);
    setConversations(initialConversations);
    setMyListings(initialMyListings);
  }, [initialUser, initialFavoriteListingIds, initialConversations, initialMyListings]);

  useEffect(() => {
    if (currentUser) {
      return;
    }

    setHasLoadedConversations(false);
    setHasLoadedMyListings(false);
  }, [currentUser]);

  useEffect(() => {
    if (activeView !== "messages" || !currentUser || hasLoadedConversations || isLoadingConversations) {
      return;
    }

    let isCurrent = true;
    setIsLoadingConversations(true);

    void loadConversationPreviewsAction()
      .then((loadedConversations) => {
        if (!isCurrent) {
          return;
        }

        setConversations(loadedConversations);
        setHasLoadedConversations(true);
      })
      .catch((error) => {
        console.error("Failed to load conversations.", error);
      })
      .finally(() => {
        if (isCurrent) {
          setIsLoadingConversations(false);
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [activeView, currentUser, hasLoadedConversations, isLoadingConversations]);

  useEffect(() => {
    if (activeView !== "my-listings" || !currentUser || hasLoadedMyListings || isLoadingMyListings) {
      return;
    }

    let isCurrent = true;
    setIsLoadingMyListings(true);

    void loadMyListingsAction()
      .then((loadedMyListings) => {
        if (!isCurrent) {
          return;
        }

        setMyListings(loadedMyListings);
        setHasLoadedMyListings(true);
      })
      .catch((error) => {
        console.error("Failed to load my listings.", error);
      })
      .finally(() => {
        if (isCurrent) {
          setIsLoadingMyListings(false);
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [activeView, currentUser, hasLoadedMyListings, isLoadingMyListings]);

  useEffect(() => {
    const savedCity = readSelectedCityFromStorage();

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

      <section className="mb-7 grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
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
            <Button className="md:hidden" onClick={handleSellClick}>
              <ShoppingBag className="size-4" />
              Продать
            </Button>
          ) : null}
          {activeView === "marketplace" ? (
            <Button className="md:hidden" variant="secondary" onClick={() => setIsFiltersOpen(true)}>
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
          {isLoadingConversations ? (
            <LoadingState title="Загружаем сообщения" />
          ) : (
            <MessagesSection conversations={conversations} />
          )}
        </ContentGrid>
      ) : null}

      {activeView === "my-listings" ? (
        <ContentGrid>
          {isLoadingMyListings ? (
            <LoadingState title="Загружаем объявления" />
          ) : myListings.length ? (
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
          className="fixed inset-0 z-40 bg-black/30 md:hidden"
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
            saveSelectedCityToStorage(city);
            setIsCityModalOpen(false);
          }}
          onClose={() => setIsCityModalOpen(false)}
        />
      ) : null}

      {isAuthModalOpen ? (
        <AuthModal
          onAuthenticated={(user) => {
            setCurrentUser(user);
            setIsAuthModalOpen(false);
          }}
          onClose={() => {
            setIsAuthModalOpen(false);
          }}
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
            setHasLoadedConversations(false);
            setHasLoadedMyListings(false);
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
        onReport={(listing) => {
          setReportingListing(listing);
        }}
      />

      {reportingListing ? (
        <ReportListingModal
          listingId={reportingListing.id}
          listingTitle={reportingListing.title}
          isAuthenticated={Boolean(currentUser)}
          onClose={() => setReportingListing(null)}
          onRequireAuth={() => {
            setReportingListing(null);
            handleRequireAuth();
          }}
        />
      ) : null}
    </AppFrame>
  );
}

function readSelectedCityFromStorage() {
  try {
    return window.localStorage.getItem(selectedCityStorageKey);
  } catch (error) {
    console.warn("Selected city storage is unavailable.", error);
    return null;
  }
}

function saveSelectedCityToStorage(city: string) {
  try {
    window.localStorage.setItem(selectedCityStorageKey, city);
  } catch (error) {
    console.warn("Selected city storage is unavailable.", error);
  }
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
      className="fixed inset-0 z-50 grid place-items-end bg-black/30 p-0 md:place-items-center md:p-5"
      onClick={onClose}
    >
      <button
        className="absolute inset-0 cursor-default"
        type="button"
        aria-label="Закрыть окно"
        onClick={onClose}
      />
      <div
        className="relative z-10 w-full rounded-t-[28px] bg-background p-5 shadow-2xl md:max-w-md md:rounded-[28px]"
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
  const [password, setPassword] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");

  return (
    <div
      className="fixed inset-0 z-[60] grid place-items-end bg-black/30 p-0 md:place-items-center md:p-5"
      onClick={onClose}
    >
      <button
        className="absolute inset-0 cursor-default"
        type="button"
        aria-label="Закрыть окно"
        onClick={onClose}
      />
      <div
        className="relative z-10 w-full rounded-t-[28px] bg-background p-5 shadow-2xl md:max-w-md md:rounded-[28px]"
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
          <form
            className="rounded-2xl border border-border p-4"
            onSubmit={(event) => {
              event.preventDefault();
              setPasswordError("");
              setPasswordMessage("");

              const formData = new FormData(event.currentTarget);

              startTransition(async () => {
                const result = await setCurrentUserPasswordAction(formData);

                if (!result.ok) {
                  setPasswordError(result.error);
                  return;
                }

                setPassword("");
                setPasswordMessage("Пароль сохранён.");
              });
            }}
          >
            <label className="grid gap-2 text-sm font-medium">
              Пароль
              <input
                className="h-12 rounded-2xl border border-input bg-background px-4 text-sm outline-none transition-colors focus:border-primary"
                name="password"
                type="password"
                autoComplete="new-password"
                minLength={8}
                placeholder="Новый пароль"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>
            {passwordError ? <p className="mt-2 text-sm text-destructive">{passwordError}</p> : null}
            {passwordMessage ? <p className="mt-2 text-sm text-muted-foreground">{passwordMessage}</p> : null}
            <Button className="mt-3 w-full" type="submit" disabled={isPending || password.length < 8}>
              {isPending ? "Сохраняем..." : "Задать пароль"}
            </Button>
          </form>
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
      className="fixed inset-0 z-[65] grid place-items-end bg-black/30 p-0 md:place-items-center md:p-5"
      onClick={onClose}
    >
      <button
        className="absolute inset-0 cursor-default"
        type="button"
        aria-label="Закрыть окно"
        onClick={onClose}
      />
      <div
        className="relative z-10 max-h-[92vh] w-full overflow-y-auto rounded-t-[28px] bg-background p-5 shadow-2xl md:max-w-3xl md:rounded-[28px]"
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
    <div className="grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
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
        <div className="grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
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
    <section className="grid gap-8 md:grid-cols-[minmax(0,1fr)_280px]">
      <div className="min-w-0">{children}</div>
      <aside className="hidden md:block">{aside}</aside>
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

function LoadingState({ title }: { title: string }) {
  return (
    <div className="rounded-[24px] border border-border p-8">
      <h2 className="text-xl font-bold">{title}</h2>
      <p className="mt-2 text-muted-foreground">Пожалуйста, подождите.</p>
    </div>
  );
}
