"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { MessageCircle, Search, ShoppingBag, SlidersHorizontal, X } from "lucide-react";

import { AppFrame } from "@/components/layout/app-frame";
import { AppHeader } from "@/components/layout/app-header";
import { Button } from "@/components/ui/button";
import { ButtonBox } from "@/components/ui/button-box";
import { cities, defaultCityName, featuredCities } from "@/features/cities/data/cities";
import { freshnessOptions } from "@/features/filters/constants";
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
  freshness: null,
};

type MarketplaceView = "marketplace" | "messages" | "favorites" | "sell" | "my-listings";

type MarketplaceToastState = {
  id: number;
  message: string;
  variant: ToastVariant;
};

type ToastVariant = "positive" | "info";

const selectedCityStorageKey = "getflora:selected-city";
const emptyConversations: ConversationPreviewModel[] = [];
const emptyListings: ListingCardModel[] = [];
const toastDurationMs = 3000;
const toastExitDurationMs = 200;
const listingsPerPage = 9;

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
  const [toast, setToast] = useState<MarketplaceToastState | null>(null);
  const [activeView, setActiveView] = useState<MarketplaceView>(initialView);
  const [hasLoadedConversations, setHasLoadedConversations] = useState(initialConversations.length > 0);
  const [hasLoadedMyListings, setHasLoadedMyListings] = useState(initialMyListings.length > 0);
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);
  const [isLoadingMyListings, setIsLoadingMyListings] = useState(false);
  const [currentListingPage, setCurrentListingPage] = useState(1);
  const [loadedListingPages, setLoadedListingPages] = useState(1);
  const [, startFavoriteTransition] = useTransition();
  const [, startListingStatusTransition] = useTransition();
  const closeToast = useCallback((toastId: number) => {
    setToast((current) => (current?.id === toastId ? null : current));
  }, []);

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
    const freshnessOption = freshnessOptions.find((option) => option.value === filters.freshness);

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
      .filter((listing) => {
        if (!freshnessOption) {
          return true;
        }

        const belowMax =
          freshnessOption.maxScoreExclusive === undefined ||
          listing.freshnessScore < freshnessOption.maxScoreExclusive;

        return listing.freshnessScore >= freshnessOption.minScore && belowMax;
      })
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

  const totalListingPages = Math.ceil(visibleListings.length / listingsPerPage);
  const displayedMarketplaceListings = useMemo(() => {
    const startIndex = Math.max(0, currentListingPage - loadedListingPages) * listingsPerPage;
    const endIndex = startIndex + loadedListingPages * listingsPerPage;

    return visibleListings.slice(startIndex, endIndex);
  }, [currentListingPage, loadedListingPages, visibleListings]);
  const hasMoreMarketplaceListings = currentListingPage < totalListingPages;

  useEffect(() => {
    setCurrentListingPage(1);
    setLoadedListingPages(1);
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
      <MarketplaceToast toast={toast} onClose={closeToast} />

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

      <section className="mb-8 mt-7 grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
        <div className="space-y-3">
          {activeView === "marketplace" ? (
            <button
              className="flex items-center gap-2 text-left text-gf-h3 font-bold tracking-normal text-gf-text-primary transition-opacity hover:opacity-75"
              type="button"
              onClick={() => setIsCityModalOpen(true)}
              aria-label="Выбрать город"
            >
              <MarkerPinIcon className="size-7 shrink-0" />
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
              <>
                <ListingsGrid
                  listings={displayedMarketplaceListings}
                  favorites={favorites}
                  currentUserId={currentUser?.id}
                  onOpen={setSelectedListing}
                  onToggleFavorite={handleToggleFavorite}
                />
                <MarketplacePagination
                  currentPage={currentListingPage}
                  hasMore={hasMoreMarketplaceListings}
                  totalPages={totalListingPages}
                  onLoadMore={() => {
                    setCurrentListingPage((current) => Math.min(current + 1, totalListingPages));
                    setLoadedListingPages((current) => current + 1);
                  }}
                  onPageChange={(page) => {
                    setCurrentListingPage(page);
                    setLoadedListingPages(1);
                    scrollPageToTop();
                  }}
                />
              </>
            ) : (
              <div className="flex min-h-[360px] flex-col items-center justify-center text-center">
                <h2 className="text-gf-body-l font-bold leading-[normal] text-gf-text-primary">
                  Пока нет букетов на продажу
                </h2>
                <p className="mt-2 max-w-[420px] text-gf-body-m font-normal leading-[normal] text-gf-text-secondary [font-weight:400]">
                  В этом городе ещё нет активных объявлений. Загляните позже или попробуйте
                  изменить фильтры
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
          onLocationError={(message) => {
            setToast({
              id: Date.now(),
              message,
              variant: "info",
            });
          }}
          onClose={() => setIsCityModalOpen(false)}
        />
      ) : null}

      {isAuthModalOpen ? (
        <AuthModal
          onAuthenticated={(user) => {
            setCurrentUser(user);
            setActiveView("marketplace");
            setIsAuthModalOpen(false);
            setToast({
              id: Date.now(),
              message: "Авторизация успешна",
              variant: "positive",
            });
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

function scrollPageToTop() {
  window.scrollTo({
    top: 0,
    behavior: "smooth",
  });
}

function MarketplaceToast({
  toast,
  onClose,
}: {
  toast: MarketplaceToastState | null;
  onClose: (toastId: number) => void;
}) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!toast) {
      setIsVisible(false);
      return;
    }

    setIsVisible(false);
    const frame = window.requestAnimationFrame(() => {
      setIsVisible(true);
    });
    const hideTimer = window.setTimeout(() => {
      setIsVisible(false);
    }, toastDurationMs);
    const closeTimer = window.setTimeout(() => {
      onClose(toast.id);
    }, toastDurationMs + toastExitDurationMs);

    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(hideTimer);
      window.clearTimeout(closeTimer);
    };
  }, [onClose, toast]);

  if (!toast) {
    return null;
  }

  return (
    <div
      className={cn(
        "fixed left-1/2 top-8 z-[90] flex min-h-12 -translate-x-1/2 items-center gap-2.5 rounded-full bg-gf-bg-base py-3 pl-4 pr-[18px] shadow-[0_4px_16px_rgb(0_0_0/0.16)] transition-all duration-200 ease-out",
        isVisible ? "translate-y-0 opacity-100" : "-translate-y-4 opacity-0",
      )}
      role="status"
      aria-live="polite"
    >
      <ToastIcon
        variant={toast.variant}
        className={cn("size-6 shrink-0", toastColorByVariant[toast.variant])}
      />
      <p className="text-gf-body-m font-normal leading-[normal] text-gf-text-primary">
        {toast.message}
      </p>
    </div>
  );
}

const toastColorByVariant = {
  positive: "text-gf-status-positive",
  info: "text-gf-status-info",
} satisfies Record<ToastVariant, string>;

function ToastIcon({
  variant,
  className,
}: {
  variant: ToastVariant;
  className?: string;
}) {
  const path =
    variant === "positive"
      ? "M7.5 12L10.5 15L16.5 9M22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12Z"
      : "M12 8V12M12 16H12.01M22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12Z";

  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d={path}
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
      />
    </svg>
  );
}

function MarkerPinIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 28 28"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M16.4997 11.0835C16.4997 9.70278 15.3804 8.5835 13.9997 8.5835C12.6191 8.58367 11.4997 9.70289 11.4997 11.0835C11.4997 12.4641 12.6191 13.5833 13.9997 13.5835C15.3804 13.5835 16.4997 12.4642 16.4997 11.0835ZM24.3336 11.6665C24.3336 15.2371 22.3397 17.8173 20.2633 19.98C19.7411 20.5239 19.2008 21.053 18.6794 21.5659C18.1539 22.0827 17.6461 22.5831 17.1676 23.0874C16.2064 24.1004 15.4115 25.0792 14.8942 26.1138C14.7248 26.4526 14.3784 26.6665 13.9997 26.6665C13.621 26.6664 13.2745 26.4525 13.1051 26.1138C12.5878 25.0793 11.7929 24.1003 10.8317 23.0874C10.3532 22.5832 9.84535 22.0826 9.31998 21.5659C8.79856 21.0531 8.25915 20.5239 7.73697 19.98C5.66052 17.8173 3.66666 15.2371 3.66666 11.6665C3.66683 5.95982 8.29298 1.33367 13.9997 1.3335C19.7065 1.3335 24.3335 5.95971 24.3336 11.6665Z"
        fill="currentColor"
      />
    </svg>
  );
}

function CityPickerModal({
  selectedCity,
  onSelect,
  onLocationError,
  onClose,
}: {
  selectedCity: string;
  onSelect: (city: string) => void;
  onLocationError: (message: string) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [isLocating, setIsLocating] = useState(false);
  const visibleCities = useMemo(() => {
    const normalizedQuery = normalizeCitySearchValue(query);

    if (!normalizedQuery) {
      return featuredCities;
    }

    return cities
      .filter((city) => normalizeCitySearchValue(city.name).startsWith(normalizedQuery))
      .sort((firstCity, secondCity) => firstCity.name.localeCompare(secondCity.name, "ru"));
  }, [query]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  const handleDetectLocation = useCallback(() => {
    if (!("geolocation" in navigator)) {
      onLocationError("Браузер не поддерживает определение местоположения.");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nearestCity = findNearestCity(position.coords.latitude, position.coords.longitude);

        setIsLocating(false);

        if (!nearestCity) {
          onLocationError("Не удалось подобрать город по местоположению.");
          return;
        }

        onSelect(nearestCity.name);
      },
      (error) => {
        setIsLocating(false);

        if (error.code === error.PERMISSION_DENIED) {
          onLocationError("Разрешите доступ к геолокации в браузере.");
          return;
        }

        onLocationError("Не удалось определить местоположение. Попробуйте выбрать город вручную.");
      },
      {
        enableHighAccuracy: false,
        maximumAge: 300000,
        timeout: 10000,
      },
    );
  }, [onLocationError, onSelect]);

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-end bg-black/60 p-0 backdrop-blur-[8px] md:place-items-center md:p-5"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="city-picker-title"
    >
      <button
        className="absolute inset-0 cursor-default"
        type="button"
        aria-label="Закрыть окно"
        onClick={onClose}
      />
      <div
        className="relative z-10 max-h-[92vh] w-full overflow-y-auto rounded-t-[44px] bg-gf-bg-base px-8 pb-8 pt-8 shadow-2xl md:min-h-[362px] md:max-w-[840px] md:rounded-[44px]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-4">
          <h2
            id="city-picker-title"
            className="text-gf-h5 font-extrabold leading-[normal] text-gf-text-primary"
          >
            Выберите регион или город
          </h2>
          <button
            className="grid size-10 shrink-0 place-items-center rounded-full bg-gf-bg-alt text-gf-text-primary transition-colors hover:bg-[#f2f2f2]"
            type="button"
            onClick={onClose}
            aria-label="Закрыть"
          >
            <X className="size-5" />
          </button>
        </div>

        <label
          className={cn(
            "relative mt-8 flex h-12 items-center gap-3 rounded-2xl bg-gf-bg-alt px-6 text-gf-text-secondary",
            query && "pr-14",
          )}
        >
          <Search className="size-6 shrink-0" />
          <input
            className="min-w-0 flex-1 appearance-none bg-transparent text-gf-body-l font-normal leading-[normal] text-gf-text-primary outline-none placeholder:text-gf-text-secondary [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden"
            type="text"
            role="searchbox"
            placeholder="Поиск"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          {query ? (
            <button
              className="absolute right-4 top-1/2 grid size-4 -translate-y-1/2 place-items-center text-gf-text-tertiary transition-colors hover:text-gf-text-primary"
              type="button"
              aria-label="Очистить поиск города"
              onClick={(event) => {
                event.preventDefault();
                setQuery("");
              }}
            >
              <XFillIcon className="size-4" />
            </button>
          ) : null}
        </label>

        <button
          className="mt-3 inline-flex h-7 items-center gap-1 text-gf-body-m font-medium leading-[normal] text-gf-text-action transition-opacity hover:opacity-75"
          type="button"
          onClick={handleDetectLocation}
          disabled={isLocating}
          aria-busy={isLocating}
        >
          <MarkerPinIcon className="size-5 shrink-0" />
          {isLocating ? "Определяем..." : "Определить местоположение"}
        </button>
        <div className="mt-4 flex flex-wrap gap-1">
          {visibleCities.length ? (
            visibleCities.map((city) => (
              <button
                key={city.id}
                className={cn(
                  "inline-flex h-[38px] items-center justify-center rounded-2xl bg-gf-bg-alt px-4 text-gf-body-xs font-normal leading-[normal] text-gf-text-primary transition-colors hover:bg-[#f2f2f2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gf-bg-accent",
                  selectedCity === city.name &&
                    "bg-gf-bg-accent text-gf-text-on-accent hover:bg-gf-bg-accent-hover",
                )}
                type="button"
                onClick={() => onSelect(city.name)}
              >
                {city.name}
              </button>
            ))
          ) : (
            <p className="py-2 text-gf-body-m font-normal leading-[normal] text-gf-text-secondary">
              Город не найден
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function normalizeCitySearchValue(value: string) {
  return value.trim().toLowerCase().replaceAll("ё", "е");
}

function findNearestCity(latitude: number, longitude: number) {
  return cities.reduce<{
    city: (typeof cities)[number];
    distance: number;
  } | null>((nearest, city) => {
    if (!city.coordinates) {
      return nearest;
    }

    const distance = getDistanceInKilometers(
      latitude,
      longitude,
      city.coordinates.latitude,
      city.coordinates.longitude,
    );

    if (!nearest || distance < nearest.distance) {
      return {
        city,
        distance,
      };
    }

    return nearest;
  }, null)?.city;
}

function getDistanceInKilometers(
  firstLatitude: number,
  firstLongitude: number,
  secondLatitude: number,
  secondLongitude: number,
) {
  const earthRadiusInKilometers = 6371;
  const latitudeDistance = toRadians(secondLatitude - firstLatitude);
  const longitudeDistance = toRadians(secondLongitude - firstLongitude);
  const firstLatitudeInRadians = toRadians(firstLatitude);
  const secondLatitudeInRadians = toRadians(secondLatitude);
  const halfChordLength =
    Math.sin(latitudeDistance / 2) ** 2 +
    Math.cos(firstLatitudeInRadians) *
      Math.cos(secondLatitudeInRadians) *
      Math.sin(longitudeDistance / 2) ** 2;

  return (
    2 *
    earthRadiusInKilometers *
    Math.atan2(Math.sqrt(halfChordLength), Math.sqrt(1 - halfChordLength))
  );
}

function toRadians(degrees: number) {
  return (degrees * Math.PI) / 180;
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
    <div className="grid grid-cols-[repeat(auto-fit,minmax(250px,250px))] gap-x-6 gap-y-10">
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

function MarketplacePagination({
  currentPage,
  totalPages,
  hasMore,
  onPageChange,
  onLoadMore,
}: {
  currentPage: number;
  totalPages: number;
  hasMore: boolean;
  onPageChange: (page: number) => void;
  onLoadMore: () => void;
}) {
  if (totalPages <= 1) {
    return null;
  }

  const pageItems = getPaginationItems(currentPage, totalPages);

  return (
    <nav
      className="mt-10 flex items-center justify-center gap-2 pb-[50px]"
      aria-label="Пагинация объявлений"
    >
      {pageItems.map((item, index) =>
        item === "ellipsis" ? (
          <span
            key={`ellipsis-${index}`}
            className="inline-flex size-12 items-center justify-center rounded-full bg-gf-bg-alt text-gf-body-m font-medium leading-[normal] text-gf-text-primary"
            aria-hidden="true"
          >
            ...
          </span>
        ) : (
          <PaginationCircleButton
            key={item}
            active={item === currentPage}
            onClick={() => onPageChange(item)}
          >
            {item}
          </PaginationCircleButton>
        ),
      )}
      {hasMore ? (
        <ButtonBox
          className="h-12 rounded-2xl px-4"
          variant="secondary"
          width="auto"
          onClick={onLoadMore}
        >
          Еще
        </ButtonBox>
      ) : null}
    </nav>
  );
}

function PaginationCircleButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      className={cn(
        "inline-flex size-12 items-center justify-center rounded-full bg-gf-bg-alt text-gf-body-m font-medium leading-[normal] text-gf-text-primary transition-colors hover:bg-[#f2f2f2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gf-bg-accent",
        active && "bg-gf-bg-accent text-gf-text-on-accent hover:bg-gf-bg-accent-hover",
      )}
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
    >
      {children}
    </button>
  );
}

function getPaginationItems(currentPage: number, totalPages: number) {
  if (totalPages <= 3) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  if (currentPage <= 3) {
    return [1, 2, 3, "ellipsis"] as const;
  }

  return [1, "ellipsis", currentPage] as const;
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
        <div className="grid grid-cols-[repeat(auto-fit,minmax(250px,250px))] gap-7">
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
