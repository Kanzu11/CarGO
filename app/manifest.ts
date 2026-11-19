import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "CarGo — Fleet & Landmark Dispatch",
    short_name: "CarGo",
    description:
      "Landmark-first ride-hailing, Bajaj and local fleet dispatch for Ethiopia. Upfront locked ETB fares, live fleet tracking.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#FFFFFF",
    theme_color: "#09090B",
    lang: "en",
    dir: "ltr",
    categories: ["travel", "navigation", "business"],
    icons: [
      { src: "/icons/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/192", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      {
        name: "Book a ride",
        short_name: "Ride",
        url: "/?mode=rider",
        icons: [{ src: "/icons/192", sizes: "192x192", type: "image/png" }],
      },
      {
        name: "Ops command center",
        short_name: "Dispatch",
        url: "/dispatch",
        icons: [{ src: "/icons/192", sizes: "192x192", type: "image/png" }],
      },
    ],
  };
}
