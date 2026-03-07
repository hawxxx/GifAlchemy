"use client";

import { useEffect } from "react";

const GOOGLE_FONTS_URL =
  "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;700&family=Rock+Salt&family=Permanent+Marker&family=Bebas+Neue&family=Pacifico&family=Press+Start+2P&family=Cinzel:wght@400;700&family=Righteous&family=Creepster&family=Nosifer&family=Monoton&family=Bungee+Shade&family=Special+Elite&family=VT323&display=swap";

export function FontLoader() {
  useEffect(() => {
    const id = "gifalchemy-google-fonts";
    if (document.getElementById(id)) return;
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href = GOOGLE_FONTS_URL;
    document.head.appendChild(link);
    return () => {
      const existing = document.getElementById(id);
      if (existing) existing.remove();
    };
  }, []);

  return null;
}
