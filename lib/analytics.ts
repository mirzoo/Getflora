"use client";

export type AnalyticsEventName =
  | "auth_completed"
  | "auth_required"
  | "listing_created"
  | "listing_favorited"
  | "listing_marked_sold"
  | "listing_viewed"
  | "message_sent"
  | "photo_upload_failed"
  | "report_created"
  | "seller_contacted";

type AnalyticsEventParams = Record<string, string | number | boolean | null | undefined>;

declare global {
  interface Window {
    ym?: (
      counterId: number,
      method: "hit" | "init" | "reachGoal",
      targetOrOptions: string | Record<string, boolean>,
      params?: AnalyticsEventParams,
    ) => void;
  }
}

const yandexMetricaId = getYandexMetricaId();

export function trackAnalyticsEvent(
  eventName: AnalyticsEventName,
  params: AnalyticsEventParams = {},
) {
  if (typeof window === "undefined" || !yandexMetricaId || !window.ym) {
    return;
  }

  window.ym(yandexMetricaId, "reachGoal", eventName, removeEmptyValues(params));
}

export function getPriceRange(price: number) {
  if (price < 3000) {
    return "under_3000";
  }

  if (price < 7000) {
    return "3000_6999";
  }

  if (price < 12000) {
    return "7000_11999";
  }

  return "12000_plus";
}

function removeEmptyValues(params: AnalyticsEventParams) {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== ""),
  );
}

function getYandexMetricaId() {
  const counterId = Number(process.env.NEXT_PUBLIC_YANDEX_METRICA_ID);

  return Number.isFinite(counterId) && counterId > 0 ? counterId : null;
}
