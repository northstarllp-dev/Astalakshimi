import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Astalakshimi Admin",
    short_name: "Asta Admin",
    description: "Staff console for profile review and verification.",
    start_url: "/admin",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#fdf8f0",
    theme_color: "#7c1535",
    categories: ["business", "productivity"],
    icons: [
      {
        src: "/icon.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  }
}
