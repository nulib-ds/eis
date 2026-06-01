// Ensures correct base path for images and links on GitHub Pages and local development //

export function getBasePath() {
  if (typeof window !== "undefined") {
    if (window.location.pathname.startsWith("/eis")) {
      return "/eis";
    }
  }

  return "";
}