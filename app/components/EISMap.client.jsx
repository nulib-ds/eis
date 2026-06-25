import React, { useEffect, useRef, useState } from "react";

const COLLECTION_URL =
  "https://raw.githubusercontent.com/gracegormley-gkg/canumpy-/refs/heads/main/collection-eis-v4.json";

const CANOPY_BASE_URL = "https://nulib-ds.github.io/EIS-Final";

const LEAFLET_CSS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
const LEAFLET_JS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";

const themeColors = {
  "Water Systems": "#3b82f6",
  "Wildlife and Natural Areas": "#16a34a",
  "Energy Systems": "#f59e0b",
  "Transportation Infrastructure": "#94a3b8",
  "Urban Development": "#f97316",
  "Climate and Weather Modification": "#06b6d4",
  "Industrial Production and Materials": "#ef4444",
  "Place-Based Conflicts": "#8b5cf6",
  "Governance": "#d97706",
  "Indigenous Narratives": "#10b981",
};

function manifestToCanopyUrl(manifestId) {
  const filename = manifestId.split("/").pop().replace(/\.json$/, "");
  const slug = filename.slice(0, 50);
  return `${CANOPY_BASE_URL}/works/${slug}.html`;
}

function getMeta(metadata, key) {
  const entry = metadata?.find((m) => m.label?.none?.[0] === key);
  return entry?.value?.none ?? [];
}

const loaders = new Map();

function loadAsset(kind, url) {
  if (!loaders.has(url)) {
    loaders.set(
      url,
      new Promise((resolve, reject) => {
        const tag = document.createElement(kind === "script" ? "script" : "link");
        if (kind === "script") {
          tag.src = url;
        } else {
          tag.rel = "stylesheet";
          tag.href = url;
        }
        tag.onload = resolve;
        tag.onerror = () => reject(new Error(`Failed to load ${url}`));
        document.head.appendChild(tag);
      })
    );
  }
  return loaders.get(url);
}

export default function EISMap({ style }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [docCount, setDocCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const mount = async () => {
      await Promise.all([
        loadAsset("style", LEAFLET_CSS),
        loadAsset("script", LEAFLET_JS),
      ]);

      const res = await fetch(COLLECTION_URL);
      const collection = await res.json();
      const items = collection.items ?? [];

      const geoItems = items
        .map((item) => {
          const meta = item.metadata ?? [];
          const latStr = getMeta(meta, "Latitude")[0];
          const lngStr = getMeta(meta, "Longitude")[0];
          if (!latStr || !lngStr) return null;
          const lat = parseFloat(latStr);
          const lng = parseFloat(lngStr);
          if (isNaN(lat) || isNaN(lng)) return null;
          return {
            id: item.id,
            title: item.label?.none?.[0] ?? "Untitled",
            lat,
            lng,
            location: getMeta(meta, "Geocoded Location")[0] ?? "",
            themes: getMeta(meta, "Themes"),
            thumbnail: item.thumbnail?.[0]?.id,
          };
        })
        .filter(Boolean);

      if (cancelled || !containerRef.current || mapRef.current) return;

      const L = window.L;
      const map = L.map(containerRef.current, {
        center: [38, -96],
        zoom: 4,
        scrollWheelZoom: true,
      });
      mapRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 18,
      }).addTo(map);

      geoItems.forEach((item) => {
        const color = themeColors[item.themes[0]] ?? "#6642a4";

        const pinSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="32" viewBox="0 0 24 32">
          <path d="M12 0C5.373 0 0 5.373 0 12c0 8.25 12 20 12 20S24 20.25 24 12C24 5.373 18.627 0 12 0z" fill="${color}" />
          <circle cx="12" cy="12" r="4.5" fill="white" fill-opacity="0.9" />
        </svg>`;

        const icon = L.divIcon({
          html: pinSvg,
          className: "",
          iconSize: [24, 32],
          iconAnchor: [12, 32],
          popupAnchor: [0, -34],
        });

        const marker = L.marker([item.lat, item.lng], { icon }).addTo(map);

        const thumbHtml = item.thumbnail
          ? `<img src="${item.thumbnail}" style="width:100%;height:110px;object-fit:cover;border-radius:4px;margin-bottom:8px;" />`
          : "";

        const themePills = item.themes
          .map(
            (t) =>
              `<span style="display:inline-block;background:${themeColors[t] ?? "#6642a4"}22;color:${themeColors[t] ?? "#6642a4"};border-radius:3px;padding:1px 6px;font-size:11px;margin:1px;">${t}</span>`
          )
          .join("");

        marker.bindPopup(
          `<div style="max-width:260px;font-family:sans-serif;line-height:1.4;">
            ${thumbHtml}
            <div style="font-weight:600;font-size:13px;margin-bottom:4px;">${item.title}</div>
            ${item.location ? `<div style="font-size:11px;color:#666;margin-bottom:6px;">${item.location}</div>` : ""}
            ${themePills ? `<div style="margin-bottom:8px;">${themePills}</div>` : ""}
            <a href="${manifestToCanopyUrl(item.id)}" target="_blank" rel="noopener" style="font-size:12px;color:#6642a4;text-decoration:underline;">View Document →</a>
          </div>`
        );
      });

      setDocCount(geoItems.length);
      setLoading(false);
    };

    mount().catch(() => {});

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  return (
    <div style={{ position: "relative", ...style }}>
      {loading && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#f9f9f9",
            zIndex: 10,
            fontSize: 14,
            color: "#888",
          }}
        >
          Loading map…
        </div>
      )}
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
      {!loading && (
        <div
          style={{
            position: "absolute",
            bottom: 24,
            left: 12,
            zIndex: 1000,
            background: "rgba(255,255,255,0.9)",
            borderRadius: 6,
            padding: "6px 10px",
            fontSize: 12,
            color: "#444",
            pointerEvents: "none",
          }}
        >
          {docCount} documents mapped
        </div>
      )}
    </div>
  );
}