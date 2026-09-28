import { createFileRoute } from "@tanstack/react-router";
import { CountryLanding } from "@/components/klynn/CountryLanding";
import { COUNTRY_SEO_CONFIGS } from "@/lib/countryLandingConfig";

const config = COUNTRY_SEO_CONFIGS.PA;

export const Route = createFileRoute("/software-lavanderia-panama")({
  head: () => ({
    meta: [
      { title: config.metaTitle },
      { name: "description", content: config.metaDescription },
      { name: "keywords", content: config.metaKeywords },
      { property: "og:title", content: config.metaTitle },
      { property: "og:description", content: config.metaDescription },
      { property: "og:locale", content: "es_PA" },
      { property: "og:type", content: "website" },
      { property: "og:url", content: `https://klynncloud.com/${config.slug}` },
    ],
    links: [
      { rel: "canonical", href: `https://klynncloud.com/${config.slug}` },
      { rel: "alternate", hrefLang: "es-PA", href: `https://klynncloud.com/${config.slug}` },
      { rel: "alternate", hrefLang: "es", href: "https://klynncloud.com" },
      { rel: "alternate", hrefLang: "x-default", href: "https://klynncloud.com" },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          "name": `Klynn Cloud ${config.countryName} — Sistema de Facturación para Lavanderías`,
          "operatingSystem": "Web, Windows, macOS, Android, iOS",
          "applicationCategory": "BusinessApplication",
          "description": config.metaDescription,
          "offers": {
            "@type": "Offer",
            "price": config.defaultPrice,
            "priceCurrency": config.currencyCode,
            "priceValidUntil": "2026-12-31"
          },
          "aggregateRating": {
            "@type": "AggregateRating",
            "ratingValue": "4.9",
            "ratingCount": "95"
          }
        })
      }
    ]
  }),
  component: () => <CountryLanding {...config} />,
});
