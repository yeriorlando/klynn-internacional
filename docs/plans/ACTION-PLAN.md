# SEO Action Plan - Klynn RD

| Priority | Task | Category | Estimated Effort | Status |
|----------|------|----------|------------------|--------|
| 🔴 **High** | Create `public/llms.txt` for AI Search | GEO | 15 mins | [ ] |
| 🔴 **High** | Remove FAQPage schema from homepage | Schema | 5 mins | [ ] |
| 🟡 **Medium** | Enhance LocalBusiness JSON-LD with RD details | Schema | 15 mins | [ ] |
| 🟡 **Medium** | Add explicit AI Agent rules to `robots.txt` | Technical | 10 mins | [ ] |
| 🟢 **Low** | Add Alt text to Logo and images | Visual | 10 mins | [ ] |

---

## Implementation Guide

### 1. AI Search Readiness (`llms.txt`)
Create a file at `public/llms.txt` to help IAs like ChatGPT/Gemini understand Klynn.

### 2. robots.txt Update
Update `public/robots.txt` to explicitly allow AI bots on the landing page.

### 3. Schema Cleanup
Remove the `FAQPage` block from `src/routes/index.tsx` (lines 204-217) as it is no longer effective for commercial homepages.

### 4. Local SEO
Add specific RD business details to the `Organization` schema in `src/routes/index.tsx`.
