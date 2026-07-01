"use client";
import { useEffect } from "react";
import { BASE } from "@/lib/api";

interface TrackingConfig {
  metaPixels?: { pixelsId: string }[];
  tiktokPixels?: { pixelCode: string }[];
  googleAds?: { conversionId: string; conversionLabel?: string | null }[];
}

function appendScript(id: string, src: string) {
  if (document.getElementById(id)) return;
  const script = document.createElement("script");
  script.id = id;
  script.async = true;
  script.src = src;
  document.head.appendChild(script);
}

function initMeta(pixelIds: string[]) {
  if (!pixelIds.length) return;
  if (typeof window.fbq !== "function") {
    window.fbq = function (...args: unknown[]) {
      window.fbq.queue?.push(args);
    } as typeof window.fbq;
    window.fbq.queue = [];
    window.fbq.loaded = true;
    window.fbq.version = "2.0";
    window._fbq = window.fbq;
    appendScript("meta-pixel-sdk", "https://connect.facebook.net/en_US/fbevents.js");
  }
  pixelIds.forEach((id) => window.fbq("init", id));
  window.fbq("track", "PageView");
}

function initTiktok(pixelCodes: string[]) {
  if (!pixelCodes.length) return;
  pixelCodes.forEach((code) => {
    appendScript(
      `tiktok-pixel-sdk-${code}`,
      `https://analytics.tiktok.com/i18n/pixel/events.js?sdkid=${encodeURIComponent(code)}&lib=ttq`,
    );
  });
  window.ttq?.page?.();
}

function initGoogleAds(configs: NonNullable<TrackingConfig["googleAds"]>) {
  const first = configs.find((item) => item.conversionId);
  if (!first) return;
  window.__googleAdsConfigs = configs;
  appendScript("google-gtag-sdk", `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(first.conversionId)}`);
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function (...args: unknown[]) {
    window.dataLayer.push(args);
  };
  window.gtag("js", new Date());
  configs.forEach((item) => window.gtag?.("config", item.conversionId));
}

export default function MetaPixel() {
  useEffect(() => {
    fetch(`${BASE}/tracking/config`, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        const config = (json?.data || {}) as TrackingConfig;
        initMeta((config.metaPixels || []).map((item) => item.pixelsId).filter(Boolean));
        initTiktok((config.tiktokPixels || []).map((item) => item.pixelCode).filter(Boolean));
        initGoogleAds(config.googleAds || []);
      })
      .catch(() => {});
  }, []);

  return null;
}
