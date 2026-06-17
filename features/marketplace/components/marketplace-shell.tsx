"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { StaticImageData } from "next/image";
import type { ChangeEvent, ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { Search, X } from "lucide-react";

import getfloraBigLogo from "@/assets/icon/logo-getflora-big.svg";
import getfloraSmallLogo from "@/assets/icon/logo-getflora-small.svg";
import handIcon from "@/assets/icon/icn_m_hand.svg";
import markerPinIcon from "@/assets/icon/icn_m_marker-pin-02.svg";
import messageDotsCircleIcon from "@/assets/icon/icn_m_message-dots-circle.svg";
import plusCircleIcon from "@/assets/icon/icn_m_plus-circle.svg";
import shoppingBagIcon from "@/assets/icon/icn_m_shopping-bag-03.svg";
import userIcon from "@/assets/icon/icn_m_user-02.svg";
import { AppFrame } from "@/components/layout/app-frame";
import { AppHeader } from "@/components/layout/app-header";
import { Button } from "@/components/ui/button";
import { ButtonBox } from "@/components/ui/button-box";
import { cities, defaultCityName, featuredCities } from "@/features/cities/data/cities";
import { listingTypeOptions } from "@/features/filters/constants";
import { MarketplaceFilters } from "@/features/filters/components/marketplace-filters";
import { AuthModal } from "@/features/auth/components/auth-modal";
import {
  createProfileAvatarUploadAction,
  deleteCurrentAccountAction,
  signOutAction,
  updateCurrentUserAvatarAction,
} from "@/features/auth/actions/session";
import { CreateListingForm } from "@/features/listings/components/create-listing-form";
import { EditListingForm } from "@/features/listings/components/edit-listing-form";
import { archiveListingAction, markListingSoldAction } from "@/features/listings/actions/update-listing-status";
import { ListingCard } from "@/features/listings/components/listing-card";
import { ListingDetailsModal } from "@/features/listings/components/listing-details-modal";
import { matchesFreshnessFilter } from "@/features/listings/utils/freshness";
import { ReportListingModal } from "@/features/reports/components/report-listing-modal";
import {
  loadConversationPreviewsAction,
  loadMyListingsAction,
} from "@/features/marketplace/actions/load-user-sections";
import { trackAnalyticsEvent } from "@/lib/analytics";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { MarketplaceFiltersState } from "@/types/filters";
import type { ConversationPreviewModel } from "@/types/conversation";
import type { ListingCardModel } from "@/types/listing";
import type { CurrentUserModel } from "@/features/auth/services/current-user";

const initialFilters: MarketplaceFiltersState = {
  listingType: "sale",
  sort: "date",
  flowerTypes: [],
  minPrice: "",
  maxPrice: "",
  colors: [],
  freshness: null,
};

type MarketplaceView = "marketplace" | "messages" | "sell" | "my-listings" | "account";

type MarketplaceToastState = {
  id: number;
  message: string;
  variant: ToastVariant;
};

type ToastVariant = "positive" | "info";

const selectedCityStorageKey = "getflora:selected-city";
const activeViewSessionStorageKey = "getflora:active-view";
const emptyConversations: ConversationPreviewModel[] = [];
const emptyListings: ListingCardModel[] = [];
const toastDurationMs = 3000;
const toastExitDurationMs = 200;
const listingsPerPage = 12;

type MarketplaceShellProps = {
  initialView?: MarketplaceView;
  initialListings: ListingCardModel[];
  initialConversations?: ConversationPreviewModel[];
  initialMyListings?: ListingCardModel[];
  initialUser: CurrentUserModel | null;
  shouldOpenAuth?: boolean;
};

type MobileNavItem = {
  label: string;
  active: boolean;
  icon: StaticImageData;
  onClick: () => void;
};

type ActiveViewSessionState = {
  view: MarketplaceView;
  listingType?: MarketplaceFiltersState["listingType"];
};

export function MarketplaceShell({
  initialView = "marketplace",
  initialListings,
  initialConversations = emptyConversations,
  initialMyListings = emptyListings,
  initialUser,
  shouldOpenAuth = false,
}: MarketplaceShellProps) {
  const router = useRouter();
  const [selectedCity, setSelectedCity] = useState(defaultCityName);
  const [listings, setListings] = useState(initialListings);
  const [filters, setFilters] = useState(initialFilters);
  const [conversations, setConversations] = useState(initialConversations);
  const [myListings, setMyListings] = useState(initialMyListings);
  const [selectedListing, setSelectedListing] = useState<ListingCardModel | null>(null);
  const [reportingListing, setReportingListing] = useState<ListingCardModel | null>(null);
  const [editingListing, setEditingListing] = useState<ListingCardModel | null>(null);
  const [isCityModalOpen, setIsCityModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(shouldOpenAuth);
  const [currentUser, setCurrentUser] = useState(initialUser);
  const [toast, setToast] = useState<MarketplaceToastState | null>(null);
  const [activeView, setActiveView] = useState<MarketplaceView>(initialView);
  const [hasLoadedConversations, setHasLoadedConversations] = useState(initialConversations.length > 0);
  const [hasLoadedMyListings, setHasLoadedMyListings] = useState(initialMyListings.length > 0);
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);
  const [isLoadingMyListings, setIsLoadingMyListings] = useState(false);
  const [currentListingPage, setCurrentListingPage] = useState(1);
  const [loadedListingPages, setLoadedListingPages] = useState(1);
  const [, startListingStatusTransition] = useTransition();
  const closeToast = useCallback((toastId: number) => {
    setToast((current) => (current?.id === toastId ? null : current));
  }, []);
  const activateView = useCallback((view: MarketplaceView) => {
    setActiveView(view);
    saveActiveViewToSession({
      view,
      listingType: view === "marketplace" ? "sale" : undefined,
    });
    router.replace(getMarketplaceViewHref(view), {
      scroll: false,
    });
  }, [router]);

  useEffect(() => {
    if (window.location.pathname !== "/" || window.location.search) {
      return;
    }

    const savedView = readActiveViewFromSession();

    if (!savedView) {
      return;
    }

    const savedListingType = savedView.listingType;

    if (savedListingType) {
      setFilters((current) => ({ ...current, listingType: savedListingType }));
    }

    if (savedView.view === "marketplace") {
      return;
    }

    if (!currentUser && (savedView.view === "messages" || savedView.view === "sell" || savedView.view === "account")) {
      setIsAuthModalOpen(true);
      return;
    }

    setActiveView(savedView.view);
  }, [currentUser]);

  useEffect(() => {
    setCurrentUser(initialUser);
    setConversations(initialConversations);
    setMyListings(initialMyListings);
  }, [initialUser, initialConversations, initialMyListings]);

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
      .filter((listing) => matchesFreshnessFilter(listing.receivedAt, listing.freshnessScore, filters.freshness))
      .sort((first, second) => {
        if (filters.sort === "price-asc") {
          return first.price - second.price;
        }

        if (filters.sort === "price-desc") {
          return second.price - first.price;
        }

        if (filters.sort === "date-asc") {
          return getListingPublishedTime(first) - getListingPublishedTime(second);
        }

        return getListingPublishedTime(second) - getListingPublishedTime(first);
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

  function handleCreateListing(listing: ListingCardModel) {
    setListings((current) => [listing, ...current]);
    setMyListings((current) => [listing, ...current]);
    setFilters(initialFilters);
    activateView("marketplace");
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
      trackAnalyticsEvent("auth_required", {
        source: "sell_cta",
      });
      setIsAuthModalOpen(true);
      return;
    }

    activateView("sell");
  }

  function handleMessagesClick() {
    if (!currentUser) {
      trackAnalyticsEvent("auth_required", {
        source: "messages_nav",
      });
      setIsAuthModalOpen(true);
      return;
    }

    setHasLoadedConversations(false);
    activateView("messages");
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
        return;
      }

      trackAnalyticsEvent("listing_marked_sold", {
        listingId,
        source: "my_listings",
      });
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

  return (
    <AppFrame>
      <MarketplaceToast toast={toast} onClose={closeToast} />

      <div className="hidden md:block">
        <AppHeader
          activeView={activeView}
          authLabel={currentUser ? "Аккаунт" : "Войти"}
          authUser={currentUser}
          selectedCity={selectedCity}
          onHomeClick={() => activateView("marketplace")}
          onMessagesClick={handleMessagesClick}
          onSellClick={handleSellClick}
          onCityClick={() => setIsCityModalOpen(true)}
          onAuthClick={() => {
            if (currentUser) {
              activateView("account");
              return;
            }

            setIsAuthModalOpen(true);
          }}
        />
      </div>

      {activeView === "marketplace" ? (
        <MobileMarketplaceHeader
          selectedCity={selectedCity}
          onHomeClick={() => activateView("marketplace")}
          onCityClick={() => setIsCityModalOpen(true)}
        />
      ) : null}

      {activeView !== "marketplace" && activeView !== "account" && activeView !== "sell" ? (
        <section className="mb-4 mt-0 grid gap-4 md:mb-8 md:mt-7 md:grid-cols-[1fr_auto] md:items-end">
          <h1 className="text-[30px] font-bold leading-[normal] tracking-normal md:text-4xl">
            {activeView === "messages"
              ? "Чаты"
              : activeView === "my-listings"
                ? "Мои объявления"
                : "Продать"}
          </h1>
        </section>
      ) : null}

      {activeView === "marketplace" ? (
        <div className="flex flex-1 flex-col">
          <section className="flex flex-col items-center justify-center gap-6 py-4 md:py-4 max-md:items-stretch max-md:gap-6 max-md:pb-0 max-md:pt-4">
            <div className="hidden h-12 w-full max-w-[334px] grid-cols-2 gap-0.5 overflow-hidden rounded-[20px] bg-gf-bg-alt p-0.5 md:grid">
              {listingTypeOptions.map((option) => (
                <button
                  key={option.value}
                  className={cn(
                    "inline-flex h-full items-center justify-center rounded-[18px] px-3 text-gf-body-m leading-[normal] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gf-bg-accent",
                    filters.listingType === option.value
                      ? "bg-gf-bg-base font-medium text-gf-text-primary shadow-[0_2px_4px_rgb(0_0_0/0.08)]"
                      : "font-normal text-gf-text-secondary",
                  )}
                  type="button"
                  onClick={() => setFilters((current) => ({ ...current, listingType: option.value }))}
                >
                  {option.value === "sale" ? "Купить" : "Аукцион"}
                </button>
              ))}
            </div>
            <MarketplaceFilters
              filters={filters}
              onChange={setFilters}
              variant="toolbar"
            />
          </section>

          <ContentGrid className="flex-1" contentClassName="flex flex-col">
            <div className="mt-4 flex flex-1 flex-col md:mt-6">
              {visibleListings.length ? (
                <>
                  <div
                    className={cn(
                      "flex flex-col",
                      totalListingPages <= 1 && "min-h-[560px] md:min-h-[calc(100vh-120px)]",
                    )}
                  >
                    <ListingsGrid
                      listings={displayedMarketplaceListings}
                      onOpen={setSelectedListing}
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
                  </div>
                  <MarketplaceFooter />
                </>
              ) : (
                <>
                  <div className="flex min-h-[560px] flex-col items-center justify-center text-center md:min-h-[calc(100vh-120px)]">
                    <h2 className="text-gf-body-l font-bold leading-[normal] text-gf-text-primary">
                      Пока нет букетов на продажу
                    </h2>
                    <p className="mt-2 max-w-[420px] text-gf-body-m font-normal leading-[normal] text-gf-text-secondary [font-weight:400]">
                      В этом городе ещё нет активных объявлений. Загляните позже или попробуйте
                      изменить фильтры
                    </p>
                  </div>
                  <MarketplaceFooter />
                </>
              )}
            </div>
          </ContentGrid>
        </div>
      ) : null}

      {activeView === "messages" ? (
        <ContentGrid className="flex-1" contentClassName="flex min-h-[560px] flex-col">
          <MessagesSection conversations={conversations} isLoading={isLoadingConversations} />
        </ContentGrid>
      ) : null}

      {activeView === "my-listings" ? (
        <ContentGrid className="flex-1" contentClassName="flex min-h-[560px] flex-col">
          {isLoadingMyListings ? (
            <LoadingState title="Загружаем объявления" />
          ) : myListings.length ? (
            <MyListingsSection
              listings={myListings}
              onOpen={setSelectedListing}
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

      {activeView === "account" && currentUser ? (
        <AccountSection
          user={currentUser}
          onUpdateUser={setCurrentUser}
          onSignOut={() => {
            setCurrentUser(null);
            setConversations([]);
            setMyListings([]);
            setHasLoadedConversations(false);
            setHasLoadedMyListings(false);
            activateView("marketplace");
          }}
          onToast={(message, variant = "info") => {
            setToast({
              id: Date.now(),
              message,
              variant,
            });
          }}
        />
      ) : null}

      {activeView === "sell" ? (
        <ContentGrid className="flex-1" contentClassName="flex min-h-[560px] flex-col">
          <CreateListingForm
            city={selectedCity}
            sellerName={currentUser?.name}
            sellerEmail={currentUser?.email}
            onCreate={handleCreateListing}
          />
        </ContentGrid>
      ) : null}

      <MobileBottomNav
        activeView={activeView}
        listingType={filters.listingType}
        onMarketplaceClick={() => {
          setFilters((current) => ({ ...current, listingType: "sale" }));
          activateView("marketplace");
        }}
        onAuctionClick={() => {
          setFilters((current) => ({ ...current, listingType: "auction" }));
          activateView("marketplace");
          saveActiveViewToSession({
            view: "marketplace",
            listingType: "auction",
          });
        }}
        onSellClick={handleSellClick}
        onMessagesClick={handleMessagesClick}
        onAccountClick={() => {
          if (currentUser) {
            activateView("account");
            return;
          }

          setIsAuthModalOpen(true);
        }}
      />

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
            trackAnalyticsEvent("auth_completed", {
              source: "auth_modal",
            });
            setCurrentUser(user);
            activateView("marketplace");
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

      {editingListing ? (
        <EditListingModal
          listing={editingListing}
          onClose={() => setEditingListing(null)}
          onUpdate={handleUpdateListing}
        />
      ) : null}

      <ListingDetailsModal
        listing={selectedListing}
        isAuthenticated={Boolean(currentUser)}
        isOwnListing={Boolean(currentUser && selectedListing?.sellerId === currentUser.id)}
        onClose={() => setSelectedListing(null)}
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

function readActiveViewFromSession(): ActiveViewSessionState | null {
  try {
    const value = window.sessionStorage.getItem(activeViewSessionStorageKey);

    if (!value) {
      return null;
    }

    const parsed = JSON.parse(value) as {
      view?: MarketplaceView;
      listingType?: MarketplaceFiltersState["listingType"];
    };

    if (!parsed.view || !["marketplace", "messages", "sell", "my-listings", "account"].includes(parsed.view)) {
      return null;
    }

    const listingType: MarketplaceFiltersState["listingType"] | undefined =
      parsed.listingType === "auction" ? "auction" : parsed.listingType === "sale" ? "sale" : undefined;

    return {
      view: parsed.view,
      listingType,
    };
  } catch (error) {
    console.warn("Active view session storage is unavailable.", error);
    return null;
  }
}

function saveActiveViewToSession(value: ActiveViewSessionState) {
  try {
    window.sessionStorage.setItem(activeViewSessionStorageKey, JSON.stringify(value));
  } catch (error) {
    console.warn("Active view session storage is unavailable.", error);
  }
}

function getMarketplaceViewHref(view: MarketplaceView) {
  if (view === "messages" || view === "my-listings") {
    return `/?view=${view}`;
  }

  if (view === "sell") {
    return "/?sell=1";
  }

  if (view === "account") {
    return "/?account=1";
  }

  return "/";
}

function getListingPublishedTime(listing: ListingCardModel) {
  if (!listing.publishedAt) {
    return 0;
  }

  const time = new Date(listing.publishedAt).getTime();

  return Number.isFinite(time) ? time : 0;
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
        className="relative z-10 max-h-[92vh] w-full overflow-y-auto rounded-t-[32px] bg-gf-bg-base px-4 pb-8 pt-8 shadow-2xl md:min-h-[362px] md:max-w-[840px] md:rounded-[32px] md:px-8"
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
            "relative mt-8 flex h-12 items-center gap-3 rounded-2xl bg-gf-bg-alt px-3 text-gf-text-secondary",
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

function AccountSection({
  user,
  onUpdateUser,
  onSignOut,
  onToast,
}: {
  user: CurrentUserModel;
  onUpdateUser: (user: CurrentUserModel) => void;
  onSignOut: () => void;
  onToast: (message: string, variant?: ToastVariant) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [previewUrl, setPreviewUrl] = useState("");
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const avatarUrl = previewUrl || user.avatarUrl;
  const initial = getUserInitial(user);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  function handleAvatarChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      onToast("Загрузите фото в формате JPG, PNG или WebP.", "info");
      return;
    }

    const nextPreviewUrl = URL.createObjectURL(file);
    setPreviewUrl((current) => {
      if (current) {
        URL.revokeObjectURL(current);
      }

      return nextPreviewUrl;
    });

    startTransition(async () => {
      try {
        const upload = await createProfileAvatarUploadAction({
          contentType: file.type,
          size: file.size,
        });

        if (!upload.ok) {
          setPreviewUrl("");
          onToast(upload.error, "info");
          URL.revokeObjectURL(nextPreviewUrl);
          return;
        }

        const response = await fetch(upload.uploadUrl, {
          method: "PUT",
          body: file,
          headers: {
            "Content-Type": file.type,
          },
        });

        if (!response.ok) {
          setPreviewUrl("");
          onToast("Не удалось загрузить фото в хранилище. Попробуйте позже.", "info");
          URL.revokeObjectURL(nextPreviewUrl);
          return;
        }

        const result = await updateCurrentUserAvatarAction(upload.imageUrl);

        if (!result.ok) {
          setPreviewUrl("");
          onToast(result.error, "info");
          URL.revokeObjectURL(nextPreviewUrl);
          return;
        }

        onUpdateUser(result.user);
        setPreviewUrl("");
        URL.revokeObjectURL(nextPreviewUrl);
      } catch (error) {
        console.error("Failed to upload avatar.", error);
        setPreviewUrl("");
        onToast("Не удалось загрузить фото профиля. Попробуйте позже.", "info");
        URL.revokeObjectURL(nextPreviewUrl);
      }
    });
  }

  function handleSignOut() {
    startTransition(async () => {
      await signOutAction();
      onSignOut();
    });
  }

  function handleDeleteAccount() {
    startTransition(async () => {
      const result = await deleteCurrentAccountAction();

      if (!result.ok) {
        setIsDeleteConfirmOpen(false);
        onToast(result.error, "info");
        return;
      }

      onSignOut();
    });
  }

  return (
    <section className="mt-[60px] flex flex-1 flex-col items-center">
      <div className="flex w-full max-w-[334px] flex-col items-center gap-6">
        <label className="relative block size-[200px] cursor-pointer overflow-visible">
          <input className="sr-only" type="file" accept="image/*" onChange={handleAvatarChange} />
          <span className="grid size-[200px] place-items-center overflow-hidden rounded-full bg-gf-bg-alt text-gf-h2 font-bold leading-[normal] text-gf-text-primary">
            {avatarUrl ? (
              // User avatars can come from storage/CDN URLs outside Next image config.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarUrl}
                alt=""
                aria-hidden="true"
                className="size-full object-cover"
              />
            ) : (
              initial
            )}
          </span>
          <span className="absolute bottom-3 right-3 grid size-10 place-items-center rounded-full bg-white text-gf-text-primary">
            <Camera01Icon className="size-6" />
          </span>
        </label>

        <div className="w-full text-center">
          <h2 className="text-gf-h3 font-bold leading-[normal] text-gf-text-primary">
            {user.name}
          </h2>
          <p className="mt-2 text-gf-body-m font-normal leading-[normal] text-gf-text-secondary">
            {user.email}
          </p>
        </div>

        <div className="grid w-full grid-cols-2 gap-3">
          <Button
            className="h-[51px] rounded-2xl px-4 text-gf-body-m font-medium leading-[normal]"
            variant="secondary"
            type="button"
            disabled={isPending}
            onClick={handleSignOut}
          >
            {isPending ? "Выходим..." : "Выйти"}
          </Button>
          <Button
            className="h-[51px] rounded-2xl bg-gf-status-negative-pale px-4 text-gf-body-m font-medium leading-[normal] text-gf-text-negative hover:bg-gf-status-negative-pale-hover"
            variant="secondary"
            type="button"
            disabled={isPending}
            onClick={() => setIsDeleteConfirmOpen(true)}
          >
            Удалить аккаунт
          </Button>
        </div>
      </div>

      <div className="mt-[52px] flex min-h-[471px] w-full flex-col items-center justify-center border-t border-gf-border text-center">
        <h2 className="text-gf-body-l font-bold leading-[normal] text-gf-text-primary">
          Здесь появятся ваши объявления
        </h2>
        <p className="mt-2 max-w-[420px] text-gf-body-m font-normal leading-[normal] text-gf-text-secondary">
          Добавьте букет на продажу, и он будет отображаться тут
        </p>
      </div>

      {isDeleteConfirmOpen ? (
        <DeleteAccountModal
          isPending={isPending}
          onCancel={() => setIsDeleteConfirmOpen(false)}
          onConfirm={handleDeleteAccount}
        />
      ) : null}
    </section>
  );
}

function DeleteAccountModal({
  isPending,
  onCancel,
  onConfirm,
}: {
  isPending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[70] grid place-items-end bg-black/60 p-0 backdrop-blur-[8px] md:place-items-center md:p-5"
      onClick={onCancel}
    >
      <button
        className="absolute inset-0 cursor-default"
        type="button"
        aria-label="Закрыть окно"
        onClick={onCancel}
      />
      <div
        className="relative z-10 w-full rounded-t-[32px] bg-gf-bg-base p-6 shadow-2xl md:max-w-[432px] md:rounded-[32px]"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 className="text-gf-body-l font-bold leading-[normal] text-gf-text-primary">
          Удалить аккаунт?
        </h2>
        <p className="mt-2 text-gf-body-m font-normal leading-[normal] text-gf-text-secondary">
          Удалить аккаунт навсегда? Это действие нельзя отменить.
        </p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <Button
            variant="secondary"
            type="button"
            disabled={isPending}
            onClick={onCancel}
          >
            Отмена
          </Button>
          <Button
            className="bg-[#FEECEC] text-gf-text-negative hover:bg-[#FDE2E2]"
            variant="secondary"
            type="button"
            disabled={isPending}
            onClick={onConfirm}
          >
            {isPending ? "Удаляем..." : "Удалить"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function getUserInitial(user: CurrentUserModel) {
  const source = user.email?.trim() || user.name.trim() || "?";

  return source.charAt(0).toUpperCase();
}

function Camera01Icon({ className }: { className?: string }) {
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
        d="M2 8.37722C2 8.0269 2 7.85174 2.01462 7.70421C2.1556 6.28127 3.28127 5.1556 4.70421 5.01462C4.85174 5 5.03636 5 5.40558 5C5.54785 5 5.61899 5 5.67939 4.99634C6.45061 4.94963 7.12595 4.46288 7.41414 3.746C7.43671 3.68986 7.45781 3.62657 7.5 3.5C7.54219 3.37343 7.56329 3.31014 7.58586 3.254C7.87405 2.53712 8.54939 2.05037 9.32061 2.00366C9.38101 2 9.44772 2 9.58114 2H14.4189C14.5523 2 14.619 2 14.6794 2.00366C15.4506 2.05037 16.126 2.53712 16.4141 3.254C16.4367 3.31014 16.4578 3.37343 16.5 3.5C16.5422 3.62657 16.5633 3.68986 16.5859 3.746C16.874 4.46288 17.5494 4.94963 18.3206 4.99634C18.381 5 18.4521 5 18.5944 5C18.9636 5 19.1483 5 19.2958 5.01462C20.7187 5.1556 21.8444 6.28127 21.9854 7.70421C22 7.85174 22 8.0269 22 8.37722V16.2C22 17.8802 22 18.7202 21.673 19.362C21.3854 19.9265 20.9265 20.3854 20.362 20.673C19.7202 21 18.8802 21 17.2 21H6.8C5.11984 21 4.27976 21 3.63803 20.673C3.07354 20.3854 2.6146 19.9265 2.32698 19.362C2 18.7202 2 17.8802 2 16.2V8.37722Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 16.5C14.2091 16.5 16 14.7091 16 12.5C16 10.2909 14.2091 8.5 12 8.5C9.79086 8.5 8 10.2909 8 12.5C8 14.7091 9.79086 16.5 12 16.5Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
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
  onOpen,
}: {
  listings: ListingCardModel[];
  onOpen: (listing: ListingCardModel) => void;
}) {
  return (
    <div className="mx-auto grid w-full max-w-[1232px] grid-cols-2 justify-start gap-x-3 gap-y-6 md:grid-cols-2 md:gap-x-6 md:gap-y-10 min-[1000px]:grid-cols-[repeat(3,minmax(0,290px))] min-[1400px]:grid-cols-[repeat(4,minmax(0,1fr))]">
      {listings.map((listing) => (
        <ListingCard
          key={listing.id}
          listing={listing}
          onOpen={() => {
            if (listing.status === "sold") {
              return;
            }

            onOpen(listing);
          }}
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
      className="mb-[50px] mt-10 flex items-center justify-center gap-2"
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

const footerColumns = [
  {
    title: "Города",
    links: ["Москва", "Санкт-Петербург", "Казань", "Екатеринбург", "Сочи"],
  },
  {
    title: "О нас",
    links: ["Что делаем", "Что нового"],
  },
  {
    title: "Для продавцов",
    links: ["Как продавать", "Советы по ценам", "Правила продавца"],
  },
  {
    title: "Для покупателей",
    links: ["Как делать ставки", "Как проверить букет", "FAQ"],
  },
] as const;

function MarketplaceFooter({ className }: { className?: string }) {
  return (
    <footer
      className={cn(
        "-mb-28 ml-[calc(50%-50vw)] mr-[calc(50%-50vw)] mt-[60px] bg-gf-bg-alt pb-32 pt-10 text-gf-body-s font-normal leading-[normal] text-gf-text-secondary md:-mb-6 md:py-10",
        className,
      )}
    >
      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-10 px-5 md:px-[104px]">
        <div className="grid gap-10 md:grid-cols-[320px_repeat(4,minmax(0,1fr))]">
          <div className="flex flex-col items-start gap-4">
            <Image
              src={getfloraBigLogo}
              alt="Getflora"
              className="h-12 w-auto"
            />
            <p className="max-w-[320px] text-gf-body-s font-normal leading-[normal] text-gf-text-secondary">
              Маркетплейс для продажи и покупки цветочных букетов. Дайте цветам вторую жизнь.
            </p>
          </div>

          {footerColumns.map((column) => (
            <FooterColumn key={column.title} title={column.title} links={column.links} />
          ))}
        </div>

        <div className="flex flex-col gap-4 md:flex-row md:items-start">
          <p className="text-gf-body-s font-normal leading-[normal] text-gf-text-secondary md:flex-1">
            © 2026 Getflora
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <FooterLink href="/offer">Оферта</FooterLink>
            <span aria-hidden="true">•</span>
            <FooterLink href="/terms">Условия</FooterLink>
            <span aria-hidden="true">•</span>
            <FooterLink href="/privacy">Конфиденциальность</FooterLink>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: readonly string[];
}) {
  return (
    <section>
      <h2 className="text-gf-body-s font-bold leading-[normal] text-gf-text-primary">
        {title}
      </h2>
      <div className="mt-3 grid gap-2">
        {links.map((link) => (
          <FooterLink key={link} href="#">
            {link}
          </FooterLink>
        ))}
      </div>
    </section>
  );
}

function FooterLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Link
      className="text-gf-body-s font-normal leading-[normal] text-gf-text-secondary transition-colors hover:text-gf-text-primary"
      href={href}
    >
      {children}
    </Link>
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
  onOpen,
  onEdit,
  onArchive,
  onMarkSold,
}: {
  listings: ListingCardModel[];
  onOpen: (listing: ListingCardModel) => void;
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
        onOpen={onOpen}
        onEdit={onEdit}
        onArchive={onArchive}
        onMarkSold={onMarkSold}
      />

      <MyListingsGroup
        title="Проданные"
        description="Остаются здесь 48 часов, потом удаляются автоматически."
        emptyTitle="Проданных объявлений пока нет"
        emptyDescription="Когда отметите букет как проданный, он появится в этом блоке."
        listings={soldListings}
        onOpen={onOpen}
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
          onOpen={onOpen}
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
  onOpen,
  onEdit,
  onArchive,
  onMarkSold,
}: {
  title: string;
  description: string;
  emptyTitle: string;
  emptyDescription: string;
  listings: ListingCardModel[];
  onOpen: (listing: ListingCardModel) => void;
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
                onOpen={onOpen}
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
        Продано. Скроется через 48 часов.
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

function MobileMarketplaceHeader({
  selectedCity,
  onHomeClick,
  onCityClick,
}: {
  selectedCity: string;
  onHomeClick: () => void;
  onCityClick: () => void;
}) {
  return (
    <header className="flex items-center justify-between md:hidden">
      <button
        className="relative size-12 shrink-0"
        type="button"
        aria-label="На главную"
        onClick={onHomeClick}
      >
        <Image src={getfloraSmallLogo} alt="Getflora" fill sizes="48px" className="object-contain" />
      </button>

      <button
        className="inline-flex h-12 items-center gap-1 rounded-2xl bg-gf-bg-alt px-4 text-gf-body-m font-medium leading-[normal] text-gf-text-primary"
        type="button"
        onClick={onCityClick}
      >
        <Image src={markerPinIcon} alt="" width={20} height={20} className="size-5" />
        {selectedCity}
      </button>
    </header>
  );
}

function MobileBottomNav({
  activeView,
  listingType,
  onMarketplaceClick,
  onAuctionClick,
  onSellClick,
  onMessagesClick,
  onAccountClick,
}: {
  activeView: MarketplaceView;
  listingType: MarketplaceFiltersState["listingType"];
  onMarketplaceClick: () => void;
  onAuctionClick: () => void;
  onSellClick: () => void;
  onMessagesClick: () => void;
  onAccountClick: () => void;
}) {
  const items: MobileNavItem[] = [
    {
      label: "Купить",
      icon: shoppingBagIcon,
      active: activeView === "marketplace" && listingType === "sale",
      onClick: onMarketplaceClick,
    },
    {
      label: "Аукцион",
      icon: handIcon,
      active: activeView === "marketplace" && listingType === "auction",
      onClick: onAuctionClick,
    },
    {
      label: "Продать",
      icon: plusCircleIcon,
      active: activeView === "sell" || activeView === "my-listings",
      onClick: onSellClick,
    },
    {
      label: "Чаты",
      icon: messageDotsCircleIcon,
      active: activeView === "messages",
      onClick: onMessagesClick,
    },
    {
      label: "Профиль",
      icon: userIcon,
      active: activeView === "account",
      onClick: onAccountClick,
    },
  ];

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 border-t border-gf-border bg-white/95 backdrop-blur-[10px] md:hidden"
      aria-label="Нижняя навигация"
    >
      <div className="flex w-full items-start">
        {items.map((item) => (
          <MobileBottomNavButton key={item.label} item={item} />
        ))}
      </div>
    </nav>
  );
}

function MobileBottomNavButton({ item }: { item: MobileNavItem }) {
  return (
    <button
      className={cn(
        "flex min-w-0 flex-1 flex-col items-center pb-2 pt-1 text-[10px] font-medium leading-[normal]",
        item.active ? "text-gf-text-action" : "text-gf-text-secondary",
      )}
      type="button"
      onClick={item.onClick}
    >
      <span className="grid size-8 place-items-center">
        <span
          className="size-5 bg-current"
          style={{
            maskImage: `url(${item.icon.src})`,
            maskPosition: "center",
            maskRepeat: "no-repeat",
            maskSize: "20px 20px",
            WebkitMaskImage: `url(${item.icon.src})`,
            WebkitMaskPosition: "center",
            WebkitMaskRepeat: "no-repeat",
            WebkitMaskSize: "20px 20px",
          }}
          aria-hidden="true"
        />
      </span>
      <span className="min-w-0 truncate">{item.label}</span>
    </button>
  );
}

function ContentGrid({
  children,
  aside = null,
  className,
  contentClassName,
}: {
  children: ReactNode;
  aside?: ReactNode | null;
  className?: string;
  contentClassName?: string;
}) {
  return (
    <section className={cn("grid gap-8", aside && "md:grid-cols-[minmax(0,1fr)_280px]", className)}>
      <div className={cn("min-w-0", contentClassName)}>{children}</div>
      {aside ? <aside className="hidden md:block">{aside}</aside> : null}
    </section>
  );
}

function MessagesSection({
  conversations,
  isLoading,
}: {
  conversations: ConversationPreviewModel[];
  isLoading: boolean;
}) {
  const selectedConversation = conversations[0] ?? null;

  return (
    <>
      <section className="-mx-4 flex flex-1 flex-col md:hidden">
        {isLoading ? (
          <LoadingState title="Загружаем чаты" />
        ) : conversations.length ? (
          <div className="flex flex-col items-start">
            {conversations.map((conversation) => (
              <ConversationPreviewCard
                key={conversation.id}
                conversation={conversation}
                isActive={false}
              />
            ))}
          </div>
        ) : (
          <MessagesEmptyState />
        )}
      </section>

      <section className="hidden flex-1 gap-6 md:grid md:grid-cols-[minmax(220px,280px)_minmax(0,1fr)] lg:grid-cols-[minmax(300px,360px)_minmax(0,1fr)] xl:grid-cols-[420px_minmax(0,728px)] xl:justify-center xl:gap-8">
        {isLoading ? (
          <LoadingState title="Загружаем чаты" />
        ) : selectedConversation ? (
          <>
            <div className="flex flex-col items-start">
              {conversations.map((conversation, index) => (
                <ConversationPreviewCard
                  key={conversation.id}
                  conversation={conversation}
                  isActive={index === 0}
                />
              ))}
            </div>
            <ConversationPreviewPanel conversation={selectedConversation} />
          </>
        ) : (
          <MessagesEmptyState className="col-span-full" />
        )}
      </section>
    </>
  );
}

function MessagesEmptyState({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex min-h-[480px] flex-1 flex-col items-center justify-center px-4 text-center md:min-h-[560px]",
        className,
      )}
    >
      <h2 className="text-gf-body-l font-bold leading-[normal] text-gf-text-primary">
        Сообщений пока нет
      </h2>
      <p className="mt-2 max-w-[340px] text-gf-body-m font-normal leading-[normal] text-gf-text-secondary">
        Откройте объявление и нажмите Купить, чтобы начать чат с продавцом
      </p>
    </div>
  );
}

function ConversationPreviewCard({
  conversation,
  isActive,
}: {
  conversation: ConversationPreviewModel;
  isActive: boolean;
}) {
  return (
    <Link
      className={cn(
        "flex w-full items-center gap-3 rounded-[32px] p-4 transition-colors hover:bg-gf-bg-alt",
        isActive && "md:bg-gf-bg-alt",
      )}
      href={`/messages/${conversation.listingId}?conversation=${conversation.id}`}
    >
      <ConversationAvatar conversation={conversation} size="list" />

      <div className="min-w-0 text-gf-body-m leading-[normal]">
        <p className="truncate font-bold text-gf-text-primary">{conversation.participantName}</p>
        <p className="truncate font-normal text-gf-text-primary">
          {conversation.listingTitle} · {formatPrice(conversation.listingPrice)}
        </p>
        <p className="truncate font-normal text-gf-text-secondary">{conversation.lastMessage}</p>
      </div>
    </Link>
  );
}

function ConversationPreviewPanel({ conversation }: { conversation: ConversationPreviewModel }) {
  return (
    <div className="flex min-h-[520px] flex-col overflow-hidden rounded-[40px] border border-gf-border bg-gf-bg-base xl:min-h-[714px]">
      <div className="flex items-center gap-3 border-b border-gf-border p-6">
        <ConversationAvatar conversation={conversation} size="header" />
        <div className="min-w-0 text-gf-body-m leading-[normal] text-gf-text-primary">
          <p className="truncate font-bold">{conversation.participantName}</p>
          <p className="truncate font-normal">
            {conversation.listingTitle} · {formatPrice(conversation.listingPrice)}
          </p>
        </div>
      </div>

      <div className="flex flex-1 flex-col justify-end gap-4 px-6 py-8">
        {conversation.recentMessages.length ? (
          conversation.recentMessages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "flex items-end gap-2",
                message.isOwn ? "justify-end" : "justify-start",
              )}
            >
              {!message.isOwn ? (
                <ParticipantAvatar avatarUrl={conversation.participantAvatarUrl} name={conversation.participantName} />
              ) : null}
              {message.isOwn ? <MessageTime value={message.createdAt} /> : null}
              <MessageBubble tone={message.isOwn ? "own" : "other"}>{message.body}</MessageBubble>
              {!message.isOwn ? <MessageTime value={message.createdAt} /> : null}
            </div>
          ))
        ) : (
          <p className="text-center text-gf-body-s text-gf-text-secondary">
            Напишите первое сообщение
          </p>
        )}
      </div>

      <OpenConversationLink conversation={conversation} />
    </div>
  );
}

function ConversationAvatar({
  conversation,
  size,
}: {
  conversation: ConversationPreviewModel;
  size: "list" | "header";
}) {
  const frameSize = size === "list" ? "size-16" : "size-16";
  const participantBorder = size === "list" ? "border-gf-bg-base group-hover:border-gf-bg-alt" : "border-white";

  return (
    <div className={cn("group relative shrink-0 rounded-2xl", frameSize)}>
      {conversation.listingImageUrl ? (
        <Image
          src={conversation.listingImageUrl}
          alt=""
          fill
          sizes="64px"
          className="rounded-2xl object-cover"
        />
      ) : (
        <div className="grid size-full place-items-center rounded-2xl bg-gf-bg-accent-opposite text-gf-body-m font-bold text-gf-text-action">
          {conversation.listingTitle.trim().charAt(0).toUpperCase() || "Б"}
        </div>
      )}
      <div
        className={cn(
          "absolute left-10 top-10 overflow-hidden rounded-full border-2 transition-colors",
          participantBorder,
        )}
      >
        <ParticipantAvatar avatarUrl={conversation.participantAvatarUrl} name={conversation.participantName} />
      </div>
    </div>
  );
}
function ParticipantAvatar({ avatarUrl, name }: { avatarUrl: string | null; name: string }) {
  return (
    <div className="grid size-8 shrink-0 place-items-center overflow-hidden rounded-full bg-gf-bg-alt text-gf-body-s font-bold text-gf-text-primary">
      {avatarUrl ? (
        <Image src={avatarUrl} alt="" width={32} height={32} className="size-full object-cover" />
      ) : (
        name.trim().charAt(0).toUpperCase() || "?"
      )}
    </div>
  );
}

function MessageBubble({
  children,
  tone,
  className,
}: {
  children: ReactNode;
  tone: "own" | "other";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "max-w-[70%] rounded-2xl px-4 py-3 text-gf-body-m font-normal leading-[normal] text-gf-text-primary",
        tone === "own" ? "bg-gf-bg-accent-opposite" : "bg-gf-bg-alt",
        className,
      )}
    >
      {children}
    </div>
  );
}

function MessageTime({ value }: { value?: string }) {
  const label = value
    ? new Intl.DateTimeFormat("ru-RU", {
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(value))
    : "12:30";

  return (
    <span className="self-end py-3 text-gf-body-m font-normal leading-[normal] text-gf-text-secondary">
      {label}
    </span>
  );
}

function OpenConversationLink({ conversation }: { conversation: ConversationPreviewModel }) {
  return (
    <div className="border-t border-gf-bg-alt p-6">
      <Button asChild className="w-full rounded-2xl">
        <Link href={`/messages/${conversation.listingId}?conversation=${conversation.id}`}>
          Открыть чат
        </Link>
      </Button>
    </div>
  );
}

function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
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
