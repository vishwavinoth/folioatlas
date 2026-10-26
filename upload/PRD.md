# MASTER PRD & BUILD PLAN
## FolioAtlas — The Open Developer Portfolio Directory

**Document type:** End-to-end product requirements, technical specification, implementation plan, and release checklist  
**Status:** Ready for AI-agent execution  
**Delivery target:** Production-ready MVP  
**Primary source repository:** `https://github.com/emmabostian/developer-portfolios`  
**Primary design references:**
- https://developer.apple.com/documentation/technologyoverviews/liquid-glass
- https://developer.apple.com/design/human-interface-guidelines/materials

---

# 1. EXECUTIVE SUMMARY

## 1.1 Product vision

Build **FolioAtlas**, a polished, searchable, SEO-optimized public directory of developer portfolios sourced from the open-source GitHub repository `emmabostian/developer-portfolios`.

The website should help developers, recruiters, students, hiring managers, and engineering communities discover real developer portfolios through a fast, elegant, and accessible browsing experience.

The experience should combine:

- Apple's Liquid Glass-inspired visual language.
- Premium, restrained macOS/iOS-inspired UI and interaction design.
- Reliable, automated portfolio data synchronization from GitHub.
- Server-rendered pages designed for search engine discovery.
- Powerful search, filters, sorting, and browsing.
- A production-ready architecture that can grow without unnecessary complexity.

This is not a portfolio builder, a social network, or an arbitrary collection of invented profiles. It is a directory whose content is grounded in the upstream repository.

## 1.2 Product promise

**One beautiful place to discover real developer portfolios.**

Visitors should be able to open the site, search for a name or technology, filter the results, inspect a portfolio entry, and visit the original portfolio in a few interactions.

## 1.3 Non-negotiable requirements

1. The upstream GitHub repository is the canonical source of portfolio entries.
2. Do not fabricate portfolio owners, portfolio URLs, skills, employers, biographies, or project descriptions.
3. Follow the supplied Apple design documentation as the primary design authority.
4. Use Liquid Glass-inspired effects primarily for navigation and interactive controls, not as a blanket background for every content card.
5. Deliver working functionality, not a static mockup.
6. Build real SEO pages with server-rendered content and correct metadata.
7. Include loading, empty, error, offline/stale-data, and accessibility states.
8. Implement tests, production checks, deployment documentation, and a repeatable release process.
9. GitHub authentication may be configured if necessary, but must be optional for public-repository reads and must never expose credentials.
10. The MVP must be usable without an account, database, payment system, or mandatory third-party analytics service.

---

# 2. PRODUCT GOALS AND SUCCESS CRITERIA

## 2.1 Primary goals

- Make the upstream portfolio list significantly easier to explore.
- Make real portfolio entries discoverable through search engines.
- Provide a premium and recognizable interface inspired by Apple's design principles.
- Keep portfolio data synchronized with the source repository.
- Deliver a maintainable, secure, fast, accessible production website.

## 2.2 Success criteria

The release is considered successful when:

- Every valid, supported portfolio entry discovered in the upstream README is represented in the generated directory index.
- Invalid, duplicate, or ambiguous records are reported rather than silently converted into fabricated data.
- Search, filters, sorting, pagination, and direct URLs work.
- All public pages have appropriate metadata and canonical URLs.
- The production build succeeds without TypeScript errors or lint failures.
- Automated tests cover parsing, filtering, sorting, synchronization, and critical user journeys.
- The site passes keyboard navigation and reduced-motion checks.
- No private credentials, access tokens, or unnecessary personal data are shipped to the browser.
- The deployed website is functional on desktop, tablet, and mobile.
- The deployment and synchronization procedures are documented.

## 2.3 Explicit non-goals for the MVP

Do not implement unless necessary for the core product:

- User accounts or social authentication.
- Developer registration and portfolio submission forms.
- A database-backed profile editor.
- Ratings, reviews, likes, comments, or follower systems.
- AI-generated bios, skills, summaries, or recommendations.
- Scraping the content of every linked portfolio website.
- A paid subscription system.
- A complex administrative dashboard.
- A separate backend service where Next.js server capabilities are sufficient.

The architecture may support future additions, but the initial release should remain lean.

---

# 3. TARGET USERS AND USER JOURNEYS

## 3.1 Audience

**Developers:** Discover portfolio examples, presentation approaches, and other developers working with similar technologies.

**Recruiters and hiring managers:** Explore publicly available developer portfolios and follow links to original websites.

**Students and early-career developers:** Learn how other developers present their work.

**Open-source contributors:** Explore entries in the upstream repository and discover the original source of the directory data.

## 3.2 Core user journeys

### Journey A — Discover a portfolio

1. Visitor opens the homepage.
2. Visitor sees the product introduction and directory search.
3. Visitor enters a developer name or technology.
4. Matching results appear.
5. Visitor opens a portfolio entry or visits its external website.

### Journey B — Explore a technology

1. Visitor opens a technology directory page.
2. The page explains the category and displays matching entries.
3. Visitor sorts or filters the results.
4. Visitor opens a portfolio.

### Journey C — Browse alphabetically

1. Visitor selects a letter.
2. The directory navigates to the relevant alphabetical page.
3. Visitor browses the available entries.
4. Visitor opens the original portfolio.

### Journey D — Arrive from a search engine

1. Visitor searches for a developer portfolio directory or relevant technology.
2. Search engine displays an eligible indexable page.
3. Visitor lands directly on a meaningful page.
4. Visitor can immediately browse or continue searching.

### Journey E — Handle unavailable upstream data

1. The source repository or GitHub API is temporarily unavailable.
2. The website continues serving the last successfully generated index.
3. Visitors can still search and browse existing data.
4. The system records the synchronization failure and retries later.

---

# 4. PRODUCT INFORMATION ARCHITECTURE

Use the following routes as the proposed MVP information architecture.

| Route | Purpose | Indexing |
|---|---|---|
| `/` | Homepage and directory discovery | Index |
| `/portfolios` | Main searchable directory | Index |
| `/portfolios/a` | Alphabetical directory for A | Index if useful |
| `/portfolios/b` | Alphabetical directory for B | Index if useful |
| `/portfolios/z` | Alphabetical directory for Z | Index if useful |
| `/technologies` | Browse supported technology categories | Index |
| `/technologies/react` | Portfolios tagged with React | Index if useful |
| `/technologies/nextjs` | Portfolios tagged with Next.js | Index if useful |
| `/about` | Explain the directory and its source | Index |
| `/methodology` | Explain data provenance and classification | Index |
| `/privacy` | Explain any data collection and privacy practices | Index |
| `/robots.txt` | Search engine crawling rules | Technical |
| `/sitemap.xml` | Canonical indexable URLs | Technical |

The exact set of indexable technology pages must be generated from meaningful, validated categories. Do not create hundreds of empty or near-duplicate SEO pages.

Do not create individual developer profile pages by default. The upstream data may contain only a name, URL, and short description. Create profile-detail routes only if the implementation can provide useful, unique, verified content beyond a thin duplicate of the directory entry.

## 4.1 Navigation

Desktop navigation:

- Brand: FolioAtlas.
- Discover.
- Portfolios.
- Technologies.
- About.
- Theme control, if needed.
- A clearly identifiable GitHub source link.

Mobile navigation:

- Compact brand.
- Search access.
- A restrained navigation menu or compact navigation bar.
- No crowded row of tiny glass buttons.

Navigation should remain visually separate from the main content layer.

---

# 5. APPLE LIQUID GLASS DESIGN REQUIREMENTS

## 5.1 Authoritative references

The agent must study and use the following documents before implementing the UI:

1. Apple Liquid Glass technology overview:
   https://developer.apple.com/documentation/technologyoverviews/liquid-glass

2. Apple Human Interface Guidelines — Materials:
   https://developer.apple.com/design/human-interface-guidelines/materials

3. Apple guidance on adopting Liquid Glass:
   https://developer.apple.com/documentation/technologyoverviews/adopting-liquid-glass

4. Apple Human Interface Guidelines:
   https://developer.apple.com/design/human-interface-guidelines

The supplied materials and Liquid Glass documentation take priority over generic glassmorphism tutorials, arbitrary design trends, or an agent's default component styling.

## 5.2 Translation to the web

This is a web application, not a native SwiftUI application. Implement the visual language with appropriate web technologies such as CSS translucency, backdrop filters, layered highlights, controlled shadows, and fluid motion.

Do not claim that CSS `backdrop-filter` is Apple's native Liquid Glass implementation.

Do not add native iOS-specific APIs to a web project merely to imitate the appearance.

The objective is to translate the design principles into a credible, polished web experience.

## 5.3 Core design principles

### A. Distinct functional and content layers

The interface must clearly distinguish navigation and controls from the content being explored.

**Functional layer:**
- Floating primary navigation.
- Search controls.
- Filter controls.
- Sort controls.
- Popovers and menus.
- Selected interactive states.

**Content layer:**
- Developer names.
- Portfolio URLs.
- Descriptions.
- Technology labels.
- Directory results.
- Editorial text and documentation.

Use Liquid Glass-inspired styling primarily for the functional layer. Keep content cards and reading surfaces comparatively restrained.

### B. Glass should reveal content, not compete with it

- Underlying content should remain perceptible through translucent functional elements where appropriate.
- Use translucency intentionally.
- Keep the visual hierarchy understandable.
- Avoid stacking multiple blurred surfaces over one another.
- Do not use heavy glass effects on every card, section, badge, and footer element.

### C. Regular and clear variants

Treat the two variants as different functional choices, not interchangeable decorations.

**Regular-inspired glass:**
- Default for the primary navigation and text-heavy control surfaces.
- Stronger background attenuation where necessary.
- Prioritize readability and separation.

**Clear-inspired glass:**
- Reserved for controls that genuinely sit over a visually rich background.
- Use only where the background contributes meaningfully to the experience.
- Apply additional contrast protection when necessary.

Do not make the entire website a transparent, heavily blurred surface.

### D. Contrast and adaptation

- Text must remain readable over light and dark backgrounds.
- Use explicit foreground colors and background fallbacks.
- Do not depend on blur alone for contrast.
- Respect browser and operating-system preferences where practical.
- Provide a usable interface when backdrop filtering is unsupported or disabled.
- Support increased contrast and reduced transparency through appropriate styles.

### E. Fluidity and motion

Interactions should feel lightweight and responsive.

Use motion for:
- Navigation state changes.
- Popover presentation.
- Filter activation.
- Search suggestions.
- Button feedback.
- Subtle transitions between interface states.

Avoid:
- Excessive parallax.
- Constantly moving backgrounds.
- Heavy spring animations on every element.
- Large animated blur surfaces.
- Motion that delays access to the directory.
- Decorative movement that distracts from search results.

All nonessential motion must respect `prefers-reduced-motion`.

## 5.4 Proposed visual direction

Use these as initial design tokens, not official Apple specifications. Validate the values in actual browser renders and refine them to meet the design principles above.

### Color foundation

| Token | Starting value | Use |
|---|---|---|
| `--page-bg` | `#F5F5F7` | Light page background |
| `--page-bg-dark` | `#101114` | Dark page background |
| `--text-primary` | `#1D1D1F` | Primary light-mode text |
| `--text-primary-dark` | `#F5F5F7` | Primary dark-mode text |
| `--text-secondary` | `#6E6E73` | Supporting text |
| `--accent` | `#0A84FF` | Restrained interactive accent |
| `--border-subtle` | Low-opacity neutral | Separators and boundaries |
| `--glass-surface` | Adaptive translucent neutral | Functional glass surfaces |

The final palette must be contrast-tested. Never assume a color works because it resembles an Apple interface.

### Material tokens

Define reusable CSS variables for:

- Regular-inspired glass surface.
- Clear-inspired glass surface.
- Material border.
- Specular highlight.
- Material shadow.
- Backdrop blur.
- Active-state highlight.
- Focus ring.

Possible starting values:

```css
:root {
  --glass-regular-bg: rgba(255, 255, 255, 0.72);
  --glass-regular-border: rgba(255, 255, 255, 0.65);
  --glass-clear-bg: rgba(255, 255, 255, 0.38);
  --glass-blur: 20px;
  --glass-radius: 20px;
}
```

These are implementation starting points only. They must be adapted for light mode, dark mode, actual backgrounds, contrast, and browser support.

Do not copy these values indiscriminately to every component.

### Typography

- Use a clean system-first sans-serif stack.
- Prefer native system fonts over downloading a large font family solely for an Apple-like appearance.
- Use clear typographic hierarchy.
- Keep body text comfortable to read.
- Avoid excessive letter spacing, uppercase labels everywhere, and oversized headlines that push the directory below the fold.

Suggested stack:

```css
font-family:
  -apple-system,
  BlinkMacSystemFont,
  "Segoe UI",
  sans-serif;
```

Do not use Apple's proprietary font files without the appropriate rights.

### Shape and spacing

- Use consistent radii for controls, popovers, and content containers.
- Avoid giving every element a different rounded-pill shape.
- Keep page gutters and content widths consistent.
- Give search and filtering controls sufficient touch targets.
- Use whitespace to establish hierarchy rather than relying on blur and shadows.

### Iconography

- Use one consistent icon library, such as Lucide.
- Keep icons minimal and recognizable.
- Include visible text for important actions.
- Do not use emoji as the primary icon system.
- Ensure decorative icons are hidden from assistive technology when appropriate.

## 5.5 Required design components

Implement and document reusable components:

1. `GlassNavigation`
2. `GlassButton`
3. `GlassIconButton`
4. `GlassSearchField`
5. `GlassPopover`
6. `GlassFilterBar`
7. `ThemeToggle`
8. `PortfolioCard`
9. `TechnologyChip`
10. `AlphabetNavigator`
11. `Pagination`
12. `EmptyState`
13. `ErrorState`
14. `LoadingSkeleton`
15. `ExternalLinkIndicator`
16. `SiteFooter`

Not every component should use a glass material. For example, `PortfolioCard` should prioritize readability and content hierarchy.

## 5.6 Portfolio card requirements

Each card may display only information available from a validated source or generated classification.

Required where available:
- Developer name.
- Original portfolio URL.
- Short description, only if supplied.
- Verified or transparently classified technology labels, if available.
- External-link indicator.

Optional:
- Alphabetical index.
- Source attribution.
- A lightweight interaction to copy or open the URL.

Do not fabricate headshots, company logos, professional biographies, ratings, profile statistics, or project previews.

Do not automatically fetch every portfolio's favicon or screenshot during server rendering. This creates reliability, privacy, and security concerns. Any future preview feature must be separately designed, safe, and optional.

## 5.7 Accessibility requirements

- Semantic HTML.
- Keyboard-operable navigation, search, filters, menus, and pagination.
- Visible focus indicators.
- Accessible names for icon-only buttons.
- Proper heading hierarchy.
- Sufficient text contrast.
- No information conveyed by color alone.
- Respect reduced motion.
- Support zoom and narrow viewports.
- Do not trap focus in nonmodal popovers.
- Use modal dialog semantics only for actual modal interactions.
- Test with automated accessibility tools and manual keyboard navigation.

---

# 6. TECHNICAL ARCHITECTURE

## 6.1 Recommended stack

Use the latest stable, mutually compatible versions at implementation time. Pin dependencies through the package manager lockfile.

| Layer | Recommended choice |
|---|---|
| Framework | Next.js with App Router |
| Language | TypeScript with strict checking |
| UI | React |
| Styling | Tailwind CSS plus a small custom CSS material layer |
| Motion | CSS transitions first; Motion library only where it adds value |
| Icons | Lucide |
| Data source | GitHub repository README |
| Data parsing | A dedicated deterministic parser and normalization pipeline |
| Search | Server-rendered initial results with client-side interactive filtering |
| Testing | Vitest or equivalent, React Testing Library, Playwright |
| Accessibility | Automated accessibility checks plus manual verification |
| Deployment | Vercel or another compatible Node.js hosting platform |
| CI | GitHub Actions |
| Storage | Generated, versioned static data artifact or build-time data |
| Database | Not required for MVP |
| Analytics | Optional, privacy-conscious, disabled unless explicitly configured |

Do not add a database, Redis, a separate API server, or a complex state-management framework without a documented technical reason.

## 6.2 High-level architecture

```text
Upstream GitHub Repository
        |
        v
Fetch README.md
        |
        v
Parse and Normalize
        |
        v
Validate + Deduplicate
        |
        v
Generate Portfolio Index
        |
        +------> Validation Report
        |
        v
Versioned Data Artifact
        |
        v
Next.js Server-Rendered Pages
        |
        +------> Search and Filters
        +------> Technology Pages
        +------> Alphabetical Pages
        +------> Metadata and Sitemap
        |
        v
Production Deployment
```

The source repository must remain the canonical source. The generated index is a derived artifact, never an independent source of truth.

## 6.3 Proposed repository structure

Adapt this structure to the existing project if one exists. Inspect before replacing files.

```text
folioatlas/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── globals.css
│   ├── portfolios/
│   │   ├── page.tsx
│   │   └── [letter]/
│   │       └── page.tsx
│   ├── technologies/
│   │   ├── page.tsx
│   │   └── [slug]/
│   │       └── page.tsx
│   ├── about/
│   │   └── page.tsx
│   ├── methodology/
│   │   └── page.tsx
│   ├── privacy/
│   │   └── page.tsx
│   ├── robots.ts
│   └── sitemap.ts
├── components/
│   ├── navigation/
│   ├── search/
│   ├── directory/
│   ├── filters/
│   ├── materials/
│   ├── layout/
│   └── feedback/
├── lib/
│   ├── github/
│   ├── parser/
│   ├── validation/
│   ├── search/
│   ├── seo/
│   └── utils/
├── data/
│   ├── portfolios.generated.json
│   └── sync-report.generated.json
├── scripts/
│   └── sync-portfolios.ts
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── public/
├── .github/
│   └── workflows/
│       └── sync-portfolios.yml
├── .env.example
├── .gitignore
├── README.md
└── package.json
```

Use Next.js route conventions correctly. For example, implement actual metadata routes for `robots.txt` and `sitemap.xml` rather than shipping placeholder files that cannot reflect generated routes.

---

# 7. GITHUB SOURCE AND DATA PIPELINE

## 7.1 Source of truth

Canonical repository:

`https://github.com/emmabostian/developer-portfolios`

The implementation must verify the repository's actual structure before assuming the README layout. Do not invent additional data files or APIs that are not present.

Default source:
- Repository: `emmabostian/developer-portfolios`
- Branch: determine the actual default branch through GitHub metadata.
- File: `README.md`, unless inspection identifies a more authoritative maintained source.

The source URL and repository attribution must be visible on the website.

## 7.2 Data ingestion

Implement a deterministic pipeline:

1. Fetch the README from the upstream repository.
2. Handle GitHub rate limits and network errors.
3. Parse supported portfolio entries.
4. Normalize whitespace and URLs.
5. Validate required fields.
6. Deduplicate entries.
7. Classify entries only when classification rules are documented.
8. Produce a generated data artifact.
9. Produce a validation report.
10. Publish the new data only after the pipeline passes validation.

The parser must be tested against actual repository content, not just an invented sample.

## 7.3 Suggested data schema

```ts
export type Portfolio = {
  id: string;
  name: string;
  url: string;
  description?: string;
  technologies?: string[];
  source: {
    repository: string;
    file: string;
    line?: number;
  };
};
```

Requirements:

- `id` must be deterministic across builds.
- `name` must originate from the upstream entry.
- `url` must be a validated HTTP or HTTPS URL.
- `description` must only be included if actually present.
- `technologies` must only contain supported, verified classifications.
- `source` must preserve provenance.

Do not use a random UUID for each build. Prefer a deterministic identifier derived from the normalized source entry or a stable source identifier.

## 7.4 Parsing rules

The parser must:

- Recognize the actual Markdown patterns used by the repository.
- Support common Markdown link forms.
- Handle optional descriptions where the format permits them.
- Ignore unrelated headings and prose.
- Detect malformed entries.
- Avoid interpreting arbitrary README text as a portfolio.
- Preserve meaningful Unicode names.
- Reject unsafe or unsupported URL schemes.
- Handle duplicate URLs and names without silently deleting valid, distinct entries.
- Report entries that require manual review.

If the upstream format changes, the parser should fail visibly or produce a degraded validation report instead of publishing corrupted data.

## 7.5 URL validation and normalization

- Allow `https://` and, where necessary, `http://`.
- Reject `javascript:`, `data:`, `file:`, and other non-web schemes.
- Reject credentials embedded in URLs.
- Normalize hostnames and safe URL formatting.
- Do not silently remove meaningful path segments.
- Do not assume every URL with the same domain is a duplicate.
- Do not automatically redirect to a guessed HTTPS variant unless the original URL is verified.
- Use `rel="noopener noreferrer"` for links opened in a new tab.

External URLs are untrusted data. Render them as text and safe links; never execute source-provided markup.

## 7.6 Duplicate handling

Use multiple signals:
- Exact normalized URL.
- Canonical hostname and path where safe.
- Stable upstream entry identity, when available.

The pipeline must report collisions and apply an explicit policy. Avoid collapsing two different people into one entry simply because they share a hosting platform or domain.

## 7.7 Technology classification

The upstream repository may not supply structured technology metadata.

If classifications are needed, implement a separate, transparent classification layer.

Rules:
- Only use explicitly supported evidence.
- Prefer a deterministic mapping from verified source descriptions or manually reviewed classification data.
- Never infer that a portfolio uses React simply because its URL contains a common hosting domain.
- Do not scrape portfolio websites for technology detection in the MVP.
- Keep unclassified entries in the general directory.
- Explain the classification methodology on the website.
- Make it possible to regenerate classifications without changing the source README.

If reliable classification cannot be implemented for the available data, ship the directory with name and URL search first, and defer technology filters rather than fabricate tags.

## 7.8 Generated artifact and atomic updates

Generate a JSON artifact with:
- Schema version.
- Source repository and branch.
- Source commit SHA when available.
- Generation timestamp.
- Valid entries.
- Validation statistics.

Example structure:

```json
{
  "schemaVersion": 1,
  "source": {
    "repository": "emmabostian/developer-portfolios",
    "file": "README.md",
    "commit": "SOURCE_COMMIT_SHA"
  },
  "generatedAt": "ISO_TIMESTAMP",
  "portfolios": []
}
```

The example's commit and timestamp are placeholders, not real values.

Write to a temporary file, validate the output, and replace the previous artifact only after success.

A failed sync must not erase a previously valid production index.

## 7.9 Synchronization strategy

Implement:

- Manual local command for developers.
- Build-time generation or validation.
- Scheduled synchronization using GitHub Actions.
- Optional manual workflow dispatch.
- Failure notifications through CI logs; add external notifications only if configured.

The scheduled job should:
1. Fetch upstream source.
2. Run parsing and validation.
3. Compare generated data with the existing artifact.
4. Run relevant tests.
5. Create an update pull request or commit according to the chosen repository policy.
6. Avoid empty commits when no meaningful data changed.
7. Preserve auditability.

Prefer a pull request for source-data changes when repository governance or review requirements make it appropriate. Direct commits are acceptable only when the target repository is owned and configured for that workflow.

Never require a long-lived write token simply to read a public repository.

---

# 8. GITHUB AUTHENTICATION AND SECRETS

## 8.1 Default behavior

Public GitHub repository reads should work anonymously where the API or raw-content endpoint permits.

If the pipeline encounters rate limits, an optional read-only token may be configured.

Use the least-privileged token type and permissions supported by the selected GitHub integration. Read-only source access is sufficient for ingestion.

Write permissions are only required if the chosen automation must create pull requests, push generated artifacts, or modify a repository.

## 8.2 Configuration

Provide a documented `.env.example`, for example:

```dotenv
GITHUB_TOKEN=
GITHUB_OWNER=emmabostian
GITHUB_REPO=developer-portfolios
GITHUB_REF=
GITHUB_README_PATH=README.md
NEXT_PUBLIC_SITE_URL=
```

Requirements:
- Determine the default branch when `GITHUB_REF` is not set.
- Keep all server-only credentials out of `NEXT_PUBLIC_*`.
- Never commit a populated `.env` file.
- Never print tokens in logs.
- Never include tokens in error messages or generated artifacts.
- Do not place a GitHub token in browser-side requests.
- Validate environment variables at startup or during build.
- Document token creation, permissions, rotation, and revocation.

## 8.3 Git access for the AI agent

If the agent needs access to a private repository or write operations, request only the necessary authorization through the user's approved GitHub connection or credential mechanism.

Do not ask the user to paste a personal access token into chat if a safer authenticated integration is available.

Do not attempt to bypass repository permissions, branch protection, review requirements, or organizational policies.

If authentication is unavailable:
- Continue local development where possible.
- Explain which repository operation is blocked.
- Provide a clear, minimal setup instruction.
- Do not claim a push, PR, or deployment succeeded unless verified.

---

# 9. SEARCH, FILTERING, SORTING, AND PAGINATION

## 9.1 Search behavior

Implement a real search interface with:

- Name search.
- URL and domain search.
- Description search, if descriptions exist.
- Technology search, only when classification data exists.
- Case-insensitive matching.
- Whitespace normalization.
- Clear-search control.
- Search result count.
- Empty state.
- Keyboard support.
- A clear indication of active filters.

Search should feel responsive without introducing unnecessary server requests on every keystroke.

Use the generated index for local matching where appropriate. Keep the initial directory content server-rendered.

## 9.2 Filters

Available filters must reflect actual data.

Possible filters:
- Technology.
- Alphabetical letter.
- Domain or hosting category, only if reliably derived and useful.

Do not add fake filters that return arbitrary results.

Allow users to remove individual filters and clear all filters.

## 9.3 Sorting

Provide:
- Name A–Z.
- Name Z–A.

Additional sorting options may be added only when their data has a meaningful, verified definition.

Do not add “Most popular,” “Trending,” “Newest,” or “Top rated” without a real, documented signal.

## 9.4 Pagination

Use a configurable page size, with a reasonable initial default such as 24 entries.

Requirements:
- Deterministic ordering.
- Correct page boundaries.
- No duplicate or missing results during navigation.
- Accessible pagination controls.
- URL state for shareable search and filter states where practical.

Use query parameters for transient directory state where this improves usability, for example:

`/portfolios?q=react&sort=name-asc&page=2`

Do not generate indexable SEO pages for every possible query permutation.

## 9.5 Performance

- Do not load the entire UI framework or large animation bundles unnecessarily.
- Avoid rendering the complete directory in the browser if the source becomes large.
- Use server rendering for the initial directory state.
- Keep search behavior responsive on modest devices.
- Add virtualization only if measurements show it is necessary.
- Avoid unnecessary images and third-party embeds.

---

# 10. HOMEPAGE SPECIFICATION

## 10.1 Header

A restrained, floating Liquid Glass-inspired navigation surface.

Include:
- Product mark and name.
- Main navigation.
- Search shortcut or search entry point.
- Theme toggle only if both themes are implemented properly.
- Link to the upstream GitHub repository.

Requirements:
- Sticky or floating behavior must not obscure content.
- Use a regular-inspired material where text legibility requires it.
- Provide an opaque or sufficiently solid fallback.
- Ensure the mobile menu works with keyboard and touch.

## 10.2 Hero

Suggested heading:

**Find your next developer portfolio inspiration.**

Suggested supporting text:

“Explore real developer portfolios collected from an open-source community directory.”

Primary action: **Explore portfolios**

Secondary action: **Browse technologies**

Display a verified directory count only when derived from the latest successfully generated index. Label it appropriately if it may be stale.

Do not invent a number of developers, technologies, or visitors.

## 10.3 Search experience

Make search the primary interaction.

The search field should:
- Have a clear label or accessible name.
- Support a visible focus state.
- Offer an obvious clear action.
- Avoid unnecessary decorative elements inside the input.
- Work with keyboard input and screen readers.
- Provide helpful empty-state guidance.

Suggestions or autocomplete are optional. Do not delay the core search experience to implement them.

## 10.4 Directory preview

Display a small selection of real portfolio entries in a deterministic order.

Each item should use the actual source data.

Provide:
- Name.
- URL.
- Description when available.
- Verified tags when available.
- External-link action.

Do not display fictional featured developers or fabricated popularity metrics.

## 10.5 Browse by technology

Display categories generated from verified classifications.

If classifications are not available, replace this section with alphabetical browsing or another useful directory entry point. Do not display fake technology counts.

## 10.6 Source transparency

Explain that entries are sourced from the upstream open-source repository.

Link directly to the source.

Include a methodology page that explains:
- How data is collected.
- How URLs are validated.
- How duplicates are handled.
- How technology tags are assigned.
- How often synchronization runs.
- How errors or removals are handled.

## 10.7 Footer

Include:
- About.
- Methodology.
- Privacy.
- Source repository.
- Attribution.
- Copyright information only where accurate.

Do not imply that the project is endorsed by Apple or by the maintainers of the source repository.

---

# 11. SEO AND CONTENT DISCOVERY

SEO is a core product requirement, not a last-minute plugin.

## 11.1 Technical SEO

Implement:
- Server-rendered HTML for primary page content.
- Unique page titles.
- Unique meta descriptions.
- Canonical URLs.
- XML sitemap.
- `robots.txt`.
- Correct HTTP status codes.
- Open Graph metadata.
- Social preview metadata.
- Semantic heading structure.
- Descriptive internal links.
- Clean URLs.
- No accidental indexing of development, preview, or private pages.

Use a single configured production origin for canonical URLs. Do not derive canonical URLs from arbitrary incoming request headers.

## 11.2 Page metadata

Homepage title example:

`FolioAtlas — Discover Developer Portfolios`

Homepage description example:

`Explore real developer portfolios from an open-source directory. Search by developer name, portfolio URL, and supported technology categories.`

Directory title example:

`Developer Portfolio Directory | FolioAtlas`

Technology page example:

`React Developer Portfolios | FolioAtlas`

Descriptions must accurately describe the actual page and available content.

## 11.3 Sitemap rules

Include only:
- Canonical homepage.
- Main directory.
- Meaningful alphabetic pages.
- Technology pages with sufficient valid entries.
- About, methodology, and privacy pages.

Exclude:
- Search query URLs.
- Arbitrary filter permutations.
- Empty category pages.
- Duplicate canonical pages.
- Error pages.
- Development and preview URLs.

If page-level update timestamps are unavailable, do not invent precise `lastmod` dates. Use reliable source or build metadata where appropriate.

## 11.4 Structured data

Use structured data only when it accurately represents the page.

Potential choices:
- `WebSite` for the overall site.
- `Organization` only if the publisher identity and associated facts are accurate.
- `BreadcrumbList` for valid hierarchical navigation.

Do not mark every directory entry as a verified employee, company, employer, or reviewed professional profile.

Validate JSON-LD output and ensure it matches visible page content.

## 11.5 Search engine quality

Avoid:
- Keyword stuffing.
- Automatically generated near-duplicate pages.
- Empty technology pages.
- Invented descriptions.
- Unsupported ratings.
- Hidden text.
- Unrelated keyword landing pages.

Each indexable route should provide useful content, valid internal navigation, and a clear purpose.

## 11.6 Favicons and social images

Create a distinctive, original FolioAtlas brand mark and a social sharing image.

Do not copy Apple's logo or app icons.

Do not present Apple branding in a way that suggests affiliation.

The social image should use restrained typography, the actual brand identity, and an appropriate title.

---

# 12. THEME SYSTEM AND RESPONSIVE DESIGN

## 12.1 Light and dark themes

Support light and dark modes if both can be implemented and tested properly.

Requirements:
- Use semantic color tokens.
- Respect the user's system preference by default.
- Allow explicit user selection.
- Persist the selected theme only where appropriate.
- Avoid a flash of the wrong theme on initial load.
- Keep controls readable across themes.
- Test material effects independently in both modes.

If theme persistence is implemented, ensure it does not cause hydration mismatch or layout flicker.

## 12.2 Responsive breakpoints

Use content-driven responsive layouts.

Test at minimum:
- 320–375 px mobile.
- 390–430 px mobile.
- 768 px tablet.
- 1024 px laptop/tablet landscape.
- 1280–1440 px desktop.
- Wide desktop layouts.

Requirements:
- No horizontal overflow.
- No clipped navigation.
- No overlapping fixed elements.
- Search remains easy to access.
- Cards adapt to available width.
- Long names and URLs wrap safely.
- Touch targets remain usable.

## 12.3 Motion and material fallbacks

Implement:
- `prefers-reduced-motion`.
- Browser fallback if `backdrop-filter` is unsupported.
- Stronger background surfaces where transparency is disabled or unsuitable.
- Visible focus rings.
- High-contrast states.
- Stable layouts during hydration.

The interface must remain fully functional when all decorative blur and animation are disabled.

---

# 13. SECURITY AND PRIVACY

## 13.1 Security requirements

- Validate all source-derived URLs.
- Treat upstream Markdown and all external content as untrusted input.
- Do not render arbitrary HTML from the README.
- Escape user-visible source text appropriately.
- Do not expose environment variables to client bundles.
- Do not expose GitHub tokens or CI secrets.
- Avoid unnecessary API endpoints.
- Add rate limiting if a public endpoint introduces abuse risk.
- Configure appropriate security headers.
- Validate redirect destinations.
- Avoid open redirect vulnerabilities.
- Use safe external-link attributes.
- Keep dependencies updated and audited.
- Do not create an unauthenticated endpoint that can trigger unrestricted GitHub synchronization.

## 13.2 SSRF prevention

The MVP should not fetch arbitrary user-submitted URLs.

The synchronization process may fetch only explicitly configured upstream GitHub source locations.

If a future feature checks external portfolio availability, implement a separate security review covering:
- Private and reserved IP ranges.
- Redirects.
- DNS rebinding.
- Request timeouts.
- Response size limits.
- Content-type validation.
- Egress controls.

Do not add a generic URL-fetching proxy.

## 13.3 Privacy

- Do not require visitors to register.
- Do not collect personal information unnecessarily.
- Do not scrape additional personal information from portfolio sites.
- Do not install advertising trackers by default.
- If analytics are added, document what is collected and provide the appropriate privacy disclosures.
- Publish a privacy page that accurately reflects the deployed system.

---

# 14. ERROR HANDLING AND RELIABILITY

Implement clear behavior for:

| Situation | Expected behavior |
|---|---|
| GitHub temporarily unavailable | Continue serving the last valid index |
| GitHub rate limited | Retry according to policy and retain valid data |
| README format changes | Report parser errors and avoid publishing corrupted data |
| No search results | Show a useful empty state |
| Invalid category route | Return an appropriate not-found response |
| Missing environment variable | Provide a clear build or startup error when required |
| Broken external portfolio | Preserve the source URL and avoid inventing a replacement |
| Missing optional description | Display the entry without a description |
| Invalid source URL | Exclude or quarantine the entry and report it |
| Empty technology category | Avoid generating an unnecessary indexable page |
| CSS blur unavailable | Use an accessible solid/translucent fallback |
| Sync job fails | Preserve the last good artifact and report the failure |

Use bounded retries with backoff for transient network failures.

Do not silently replace valid existing data with an empty list when upstream retrieval fails.

---

# 15. TESTING STRATEGY

## 15.1 Unit tests

Cover:
- Markdown parsing.
- URL validation.
- URL normalization.
- Duplicate detection.
- Deterministic identifiers.
- Technology classification.
- Search matching.
- Filtering.
- Sorting.
- Pagination.
- Metadata generation.
- Sitemap URL selection.
- Error handling.

## 15.2 Integration tests

Cover:
- Fetching source data.
- Parsing actual README fixtures.
- Generating the index.
- Preserving previous data on sync failure.
- Schema validation.
- Build-time data loading.
- Correct page generation.
- Optional authentication configuration.

Tests must not require write access to the actual upstream repository.

## 15.3 End-to-end tests

Using Playwright or an equivalent browser-testing tool, verify:

1. Homepage loads successfully.
2. Main directory loads real generated entries.
3. Search finds a known fixture.
4. Search with no matches shows the empty state.
5. Filters update results correctly.
6. Sorting changes order correctly.
7. Pagination works.
8. Technology routes work when categories exist.
9. External portfolio links resolve to the expected destination.
10. Keyboard navigation reaches interactive controls.
11. Mobile navigation opens and closes correctly.
12. Light and dark themes work if implemented.
13. Browser refresh preserves valid shareable route state.
14. Unknown routes return a proper not-found page.
15. The sitemap and robots routes return valid content.

## 15.4 Accessibility tests

Use an automated tool such as axe where supported, then manually test:
- Keyboard-only interaction.
- Focus visibility.
- Screen-reader names.
- Heading order.
- Contrast.
- Zoom.
- Reduced motion.
- Material fallbacks.

Automated accessibility scores alone are not sufficient evidence of accessibility.

## 15.5 Visual tests

Capture screenshots at representative desktop and mobile sizes.

Inspect:
- Navigation material.
- Search field.
- Directory cards.
- Active filters.
- Popovers.
- Empty state.
- Light/dark theme.
- Reduced-motion state.

Compare screenshots against the intended Apple-inspired design principles, not just pixel similarity.

---

# 16. PERFORMANCE AND QUALITY TARGETS

Treat these as release goals measured against representative production-like builds.

## 16.1 Core Web Vitals targets

Aim for the following field metrics at the 75th percentile when sufficient real-user data becomes available:

- Largest Contentful Paint: ≤ 2.5 seconds.
- Interaction to Next Paint: ≤ 200 milliseconds.
- Cumulative Layout Shift: ≤ 0.1.

Use Lighthouse or equivalent lab measurements as early diagnostics, not as a substitute for field data.

## 16.2 Implementation targets

- No unnecessary client-side rendering for primary directory content.
- No large background video or decorative 3D scene required for the MVP.
- No unbounded external requests during page rendering.
- No layout shifts caused by missing font or image dimensions.
- Avoid expensive, full-screen backdrop-filter effects on mobile.
- Avoid shipping unnecessary animation libraries.
- Cache generated data appropriately.
- Optimize the production bundle and inspect unexpected growth.

Do not promise a particular Lighthouse score without measuring the production build.

---

# 17. DEPLOYMENT AND CI/CD

## 17.1 Environment setup

The agent must inspect the existing repository and hosting configuration before making assumptions.

Required production configuration:
- Public site origin.
- Upstream GitHub repository details.
- Optional GitHub read token.
- Correct production build command.
- Correct start command where required.
- Valid environment variables.
- Working source-data generation process.

## 17.2 CI pipeline

Implement a GitHub Actions workflow that:

1. Checks out the code.
2. Sets up the supported Node.js version.
3. Installs dependencies from the lockfile.
4. Runs linting.
5. Runs type checking.
6. Runs unit and integration tests.
7. Validates the generated portfolio data.
8. Builds the production application.
9. Runs end-to-end tests where the CI environment supports them.

Do not let a failing critical check be silently ignored.

## 17.3 Data synchronization workflow

Create a separate workflow for scheduled and manual synchronization.

Requirements:
- Use minimal workflow permissions.
- Avoid exposing secrets to untrusted pull requests.
- Pin or otherwise appropriately secure third-party GitHub Actions.
- Record the source commit SHA.
- Generate an auditable diff.
- Avoid unnecessary commits.
- Preserve the last valid index on failures.
- Use a pull request if source-data changes require review.

## 17.4 Deployment platform

Vercel is the default recommendation for a Next.js MVP, but the implementation must confirm the existing project and hosting requirements before selecting the final target.

The application should not depend on Vercel-only features unless documented.

Deployment must include:
- Production environment variables.
- Domain configuration.
- HTTPS.
- Build verification.
- Smoke tests.
- Sitemap verification.
- Rollback instructions.
- A documented procedure for triggering a data refresh.

## 17.5 Release verification

After deployment, verify:
- Homepage HTTP response.
- Main directory HTTP response.
- Representative technology route.
- Sitemap.
- Robots file.
- Canonical URLs.
- External links.
- Console errors.
- Failed network requests.
- Mobile layout.
- Data freshness.
- Theme and material fallbacks.

A successful build alone does not count as a successful release.

---

# 18. IMPLEMENTATION PHASES

The agent must execute these phases in order. Do not stop after creating a plan or mockup.

## Phase 1 — Repository and source inspection

Tasks:
- Inspect the current project and package manager.
- Identify existing code, conventions, and tests.
- Inspect the upstream repository's default branch and README structure.
- Verify the real portfolio entry format.
- Estimate source size and edge cases.
- Read the Apple design references.
- Record assumptions and unresolved issues.

Deliverables:
- Short implementation notes.
- Verified data-format findings.
- Confirmed stack and deployment target.

**Gate:** Do not build a parser against a guessed README format.

## Phase 2 — Data pipeline

Tasks:
- Implement fetching.
- Implement parsing and normalization.
- Add validation and duplicate handling.
- Generate the typed data artifact.
- Add source provenance.
- Add validation reporting.
- Add failure-safe atomic replacement.
- Add fixtures from actual source patterns.

Deliverables:
- Working sync command.
- Generated index.
- Parser and validation tests.

**Gate:** The generated data must be traceable to the real upstream repository.

## Phase 3 — Design system

Tasks:
- Define semantic tokens.
- Implement light/dark foundations.
- Build glass navigation and control primitives.
- Build content components with restrained styling.
- Implement focus and reduced-motion states.
- Test materials over actual backgrounds.
- Review desktop and mobile screenshots.

Deliverables:
- Reusable components.
- Design tokens.
- Documented material usage rules.

**Gate:** The interface must reflect the distinction between the functional Liquid Glass layer and the content layer.

## Phase 4 — Core directory

Tasks:
- Build the homepage.
- Build the searchable directory.
- Implement filters, sorting, and pagination.
- Build empty, loading, and error states.
- Implement alphabetic navigation.
- Implement verified technology browsing.
- Ensure URL state behaves correctly.

Deliverables:
- Fully working directory.
- Responsive interaction model.
- End-to-end coverage for core journeys.

**Gate:** Search and navigation must work with actual generated data.

## Phase 5 — SEO and content pages

Tasks:
- Add route metadata.
- Add canonical URL handling.
- Implement sitemap and robots routes.
- Add Open Graph metadata.
- Implement about and methodology pages.
- Implement the privacy page.
- Validate indexable route quality.

Deliverables:
- Production metadata.
- Valid sitemap.
- Documented data provenance.

**Gate:** No empty or fabricated SEO pages.

## Phase 6 — Hardening and verification

Tasks:
- Run all tests.
- Inspect the production build.
- Run accessibility checks.
- Inspect visual screenshots.
- Test material fallbacks.
- Audit environment variables and dependencies.
- Test sync failure behavior.
- Check for console errors and broken interactions.

Deliverables:
- Test results.
- Resolved critical issues.
- Known limitations documented.

**Gate:** No known critical security, data-integrity, or functional issues.

## Phase 7 — Deployment

Tasks:
- Configure hosting and production variables.
- Configure scheduled synchronization.
- Deploy the application.
- Run production smoke tests.
- Verify metadata and sitemap.
- Verify source-data freshness.
- Document rollback and refresh procedures.

Deliverables:
- Verified production deployment.
- Setup documentation.
- Release summary.

**Gate:** Do not report “ready to ship” until production verification is complete, or clearly mark deployment as blocked if access is unavailable.

---

# 19. ACCEPTANCE CRITERIA

The MVP is accepted only when all critical criteria pass.

## Data integrity

- [ ] Correct upstream repository configured.
- [ ] Actual README format inspected.
- [ ] Parser handles supported entry formats.
- [ ] Invalid URLs are rejected or quarantined.
- [ ] Duplicate policy is explicit.
- [ ] Every published entry is traceable to source data.
- [ ] Failed synchronization preserves the previous valid index.
- [ ] No invented portfolio data or metrics.

## User experience

- [ ] Homepage and directory are functional.
- [ ] Search works.
- [ ] Sorting works.
- [ ] Filters work when corresponding metadata exists.
- [ ] Pagination works.
- [ ] Empty and error states are implemented.
- [ ] External links work safely.
- [ ] Mobile navigation works.
- [ ] Layout is responsive.
- [ ] Keyboard interaction works.

## Design

- [ ] Liquid Glass-inspired treatment is primarily applied to the functional layer.
- [ ] Content remains visually distinct from navigation.
- [ ] Glass is used selectively.
- [ ] Regular-inspired materials prioritize legibility.
- [ ] Clear-inspired materials are reserved for suitable contexts.
- [ ] Light and dark modes are tested if supported.
- [ ] Reduced-motion preference is respected.
- [ ] Material fallbacks remain functional.
- [ ] No obvious generic-template styling or excessive blur.

## SEO

- [ ] Unique titles and descriptions.
- [ ] Correct canonical URLs.
- [ ] Valid sitemap.
- [ ] Valid robots configuration.
- [ ] No accidental indexing of preview routes.
- [ ] Structured data matches visible content.
- [ ] Empty or thin category pages are excluded.
- [ ] Social metadata is implemented.

## Engineering

- [ ] Type checking passes.
- [ ] Lint passes.
- [ ] Unit tests pass.
- [ ] Integration tests pass.
- [ ] Critical end-to-end tests pass.
- [ ] Production build passes.
- [ ] No exposed credentials.
- [ ] No critical console errors.
- [ ] No known critical security defects.

## Release

- [ ] Production URL responds correctly.
- [ ] Production routes are verified.
- [ ] Sitemap is accessible.
- [ ] Data source and freshness are documented.
- [ ] Deployment and rollback instructions exist.
- [ ] Final implementation report is provided.

---

# 20. FUTURE ROADMAP — NOT REQUIRED FOR MVP

Only consider these after the core directory is stable:

### Version 1.1
- More sophisticated technology classification.
- Improved search ranking.
- Better shareable filter URLs.
- Directory change history.
- Source change notifications.

### Version 1.2
- Optional verified portfolio preview cards.
- Maintainer-friendly data quality reports.
- Additional trusted open-source portfolio sources, if licensing and attribution permit.
- Improved discovery for related technologies.

### Later
- Community submissions with validation and moderation.
- Opt-in developer profile claims.
- Curated collections.
- Search analytics based on privacy-conscious, aggregate data.

Do not implement these features in the MVP unless a core requirement depends on them.

---

# 21. REQUIRED FINAL DELIVERABLES

At completion, provide:

1. Working source code in the project repository.
2. The generated portfolio index and validation report.
3. The GitHub synchronization workflow.
4. Reusable design system and Liquid Glass-inspired components.
5. All required pages and directory functionality.
6. SEO metadata, sitemap, and robots configuration.
7. Unit, integration, and end-to-end tests.
8. `.env.example` with placeholders only.
9. Complete README with setup, development, sync, testing, deployment, and troubleshooting instructions.
10. A security and accessibility checklist.
11. A production verification summary.
12. A list of changed files and significant architectural decisions.
13. The production URL if deployment is completed.
14. The Git commit, branch, and pull request details if those actions are performed and verified.
15. Any remaining limitations or blockers.

Do not claim a test passed, a repository was updated, or a deployment succeeded unless the action was actually executed and verified.

---

# 22. MASTER INSTRUCTIONS TO THE AI CODING AGENT

You are the senior full-stack engineer, product designer, accessibility reviewer, QA engineer, and release owner for FolioAtlas.

Your responsibility is to build the production-ready MVP described in this document, not merely to suggest an architecture or generate a visual mockup.

Follow these execution rules:

1. **Inspect before changing.** Review the existing repository, project structure, scripts, source data, environment configuration, and deployment setup.
2. **Verify the upstream source.** Inspect the actual `emmabostian/developer-portfolios` README and build the parser against real formats.
3. **Use Apple documentation as the design authority.** Read the supplied Liquid Glass and Materials references before implementing the visual system.
4. **Implement a complete product.** Build the real data pipeline, pages, search, navigation, SEO, tests, and deployment configuration.
5. **Preserve data provenance.** Never invent portfolio information or metrics.
6. **Use a restrained material system.** Liquid Glass-inspired effects belong primarily to navigation and controls. Keep the content layer clear and readable.
7. **Make functionality resilient.** Preserve valid data on sync failures and implement accessible fallbacks.
8. **Use least privilege.** Configure GitHub authentication only when needed, request minimum permissions, and protect all secrets.
9. **Avoid unnecessary complexity.** Do not introduce a database, account system, or additional infrastructure without a clear requirement.
10. **Test continuously.** Run relevant checks after each major phase instead of waiting until the end.
11. **Inspect the real UI.** Use browser screenshots or equivalent visual verification at mobile and desktop sizes. Correct visual defects instead of relying only on code inspection.
12. **Complete the release.** Deploy and verify production if the required access is available.
13. **Be transparent.** If a task is blocked by credentials, repository permissions, or hosting access, explain the precise blocker and complete all unblocked work.
14. **Do not stop at planning.** Proceed through implementation, validation, and release readiness.

## Required final report format

When finished, provide:

- **Status:** Complete, partially complete, or blocked.
- **Product summary:** What was built.
- **Architecture:** Main technical decisions.
- **Data source:** Repository, branch, sync method, and validation behavior.
- **Design:** How Apple’s material guidance was applied.
- **SEO:** Pages and metadata implemented.
- **Testing:** Exact checks executed and their results.
- **Security:** Secrets, permissions, and validation measures.
- **Deployment:** Hosting, verified URL, and deployment status.
- **Git:** Branch, commit, and pull request details, if applicable.
- **Remaining issues:** Only actual unresolved issues.
- **Next actions:** Specific actions required from the owner, if any.

**Definition of done:** FolioAtlas is a functioning, tested, accessible, SEO-ready, production-deployable developer portfolio directory powered by verified upstream GitHub data, with an Apple Liquid Glass-inspired interface that preserves Apple's core distinction between functional materials and readable content.

Do not declare completion until the acceptance criteria have been checked and the final report accurately reflects the verified result.