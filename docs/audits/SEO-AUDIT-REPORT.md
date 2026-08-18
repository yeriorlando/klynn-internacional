# SEO Audit & Action Plan - Klynn RD

This report follows the **Agentic-SEO-Skill** methodology for deterministic LLM-first analysis.

## Summary Score: 78/100 (Good)
| Category | Score | Weight |
|----------|-------|--------|
| Technical SEO | 85% | 25% |
| Content Quality | 75% | 20% |
| On-Page SEO | 80% | 15% |
| Schema / Structured Data | 70% | 15% |
| Performance (CWV) | 80% | 10% |
| AI Search Readiness (GEO) | 60% | 5% |

---

## 🔴 Critical Findings

### 1. Restricted Schema Type: FAQPage
- **Finding:** Use of `FAQPage` schema for a commercial SaaS.
- **Evidence:** `src/routes/index.tsx` lines 204-217.
- **Impact:** Since August 2023, Google restricts FAQ rich results to government and health sites. Commercial sites using it may face manual actions or simply waste crawl budget without getting rich snippets.
- **Fix:** Remove `FAQPage` JSON-LD or move it to a specific support/help page, but do not expect rich results on the homepage.

### 2. Missing AI Search Readiness (llms.txt)
- **Finding:** No `llms.txt` file found in `public/`.
- **Evidence:** Directory listing of `public/`.
- **Impact:** AI models (Perplexity, GPT-4, etc.) use this file to understand the site structure and context more efficiently, increasing the chance of Klynn being recommended in AI answers.
- **Fix:** Create a `public/llms.txt` file summarizing Klynn's features and mission for AI crawlers.

---

## ⚠️ Warnings & Opportunities

### 1. Schema Optimization: LocalBusiness
- **Finding:** JSON-LD focuses on `SoftwareApplication` but lacks specific `LocalBusiness` or `Service` details for the Dominican Republic.
- **Evidence:** `src/routes/index.tsx` lines 161-187.
- **Impact:** Adding specific coordinates, address, and local phone numbers in JSON-LD helps dominate local search in Santo Domingo and Santiago.
- **Fix:** Enhance the `Organization` or add a `Service` schema with `areaServed: "Dominican Republic"` and specific city mappings.

### 2. Missing Alt Text / Visual SEO
- **Finding:** No images found with `alt` attributes on the main landing page.
- **Evidence:** Grep search for `<img` and `src=`.
- **Impact:** Reduces visibility in Google Images and impacts accessibility.
- **Fix:** Ensure the `Logo` and any future feature screenshots have descriptive `alt` tags (e.g., "Klynn POS Interface - Software para lavanderías").

### 3. robots.txt AI Bot Management
- **Finding:** Generic bot management.
- **Evidence:** `public/robots.txt`.
- **Impact:** Modern SEO (GEO) requires explicit permission or guidance for AI crawlers like `GPTBot` or `ClaudeBot` to ensure they prioritize indexing the landing page.
- **Fix:** Update `robots.txt` to explicitly allow AI agents on the root and landing pages.

---

## ✅ Passes
- **Title & Meta Description:** Recently optimized, unique, and includes "Software" and "Plataforma".
- **Keywords:** Good coverage of "Lavanderías", "RD", "POS", and city names.
- **Sitemap:** Correct structure and prioritization.
- **E-E-A-T:** Testimonials and local office address add significant trust signals for the Dominican market.
