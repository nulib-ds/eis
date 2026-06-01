// Ensures correct base path for images and links on GitHub Pages and local development //

export function getBasePath() {
  if (typeof window !== "undefined") {
    const isLocal =
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1";
    if (!isLocal) {
      const match = window.location.pathname.match(/^(\/[^/]+)/);
      if (match) return match[1];
    }
  }

  return "";
}