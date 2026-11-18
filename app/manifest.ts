import type { MetadataRoute } from "next"

// Paths are written out with the base path: the manifest is read as it is, not through Next's router.
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/start",
    name: "Startside",
    short_name: "Start",
    description: "Det jeg skal gjøre og se på i løpet av arbeidsdagen.",
    lang: "nb",
    start_url: "/start",
    scope: "/start",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    categories: ["productivity"],
    icons: [
      { src: "/start/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/start/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/start/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  }
}
