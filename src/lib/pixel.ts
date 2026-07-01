declare global {
  interface Window {
    fbq: ((...args: unknown[]) => void) & { callMethod?: (...args: unknown[]) => void; queue?: unknown[]; loaded?: boolean; version?: string; };
    _fbq: unknown;
    ttq?: { track?: (...args: unknown[]) => void; page?: () => void };
    gtag?: (...args: unknown[]) => void;
    dataLayer: unknown[];
    __googleAdsConfigs?: { conversionId: string; conversionLabel?: string | null }[];
  }
}

import { BASE } from "@/lib/api";

export interface PixelUserData {
  customerId?: number;
  name?: string;
  phone?: string;
  email?: string;
}

export interface PixelProductData {
  content_ids: (string | number)[];
  content_name: string;
  content_type: string;
  value: number;
  currency: string;
  num_items?: number;
}

// Meta standard events — everything else goes through trackCustom
const STANDARD_EVENTS = new Set([
  "PageView", "ViewContent", "Search", "AddToCart", "AddToWishlist",
  "InitiateCheckout", "AddPaymentInfo", "Purchase", "Lead", "CompleteRegistration",
]);

function eventId(eventName: string) {
  return `${eventName}.${Date.now()}.${Math.random().toString(16).slice(2)}`;
}

function cookie(name: string) {
  if (typeof document === "undefined") return "";
  return document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${name}=`))
    ?.split("=")[1] || "";
}

function currentUrl() {
  if (typeof window === "undefined") return "";
  return window.location.href;
}

function sendServerEvent(
  eventName: string,
  id: string,
  data: PixelProductData,
  userData?: PixelUserData,
) {
  fetch(`${BASE}/tracking/events`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      eventName,
      eventId: id,
      eventSourceUrl: currentUrl(),
      customData: data,
      userData: {
        ...userData,
        fbp: cookie("_fbp"),
        fbc: cookie("_fbc"),
        ttp: cookie("_ttp"),
      },
    }),
    keepalive: true,
  }).catch(() => {});
}

export function trackPixelEvent(
  eventName: string,
  data: PixelProductData,
  userData?: PixelUserData
) {
  if (typeof window === "undefined") return;

  const id = eventId(eventName);
  const payload: Record<string, unknown> = { ...data };

  if (userData) {
    if (userData.customerId) payload.customer_id = userData.customerId;
    if (userData.name)       payload.customer_name = userData.name;
    if (userData.phone)      payload.customer_phone = userData.phone;
  }

  if (typeof window.fbq === "function") {
    const method = STANDARD_EVENTS.has(eventName) ? "track" : "trackCustom";
    window.fbq(method, eventName, payload, { eventID: id });
  }

  window.ttq?.track?.(eventName, { ...payload, event_id: id });

  if (typeof window.gtag === "function" && eventName === "Purchase") {
    const googleConfig = window.__googleAdsConfigs?.find((item) => item.conversionId && item.conversionLabel);
    window.gtag("event", "conversion", {
      send_to: googleConfig ? `${googleConfig.conversionId}/${googleConfig.conversionLabel}` : undefined,
      value: data.value,
      currency: data.currency,
      transaction_id: id,
    });
  }

  sendServerEvent(eventName, id, data, userData);
}
