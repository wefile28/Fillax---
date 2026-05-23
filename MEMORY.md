# Project Memory - Fillax

## Project Overview
- **Goal**: Migrate the Tax Accounting Assistant (Fillax) to a standalone Next.js frontend, backed by a robust FastAPI API connected to Supabase.
- **Stack (Frontend)**: Next.js 16.2.6 (App Router), Tailwind CSS v4 (OKLCH with explicit Hex fallback mapping), LocalStorage (MVP) shifting to Supabase syncing.
- **Stack (Backend)**: FastAPI (0.111.0), Supabase (2.4.2), Python 3.14, Claude 3.5 Sonnet (Anthropic 0.28.0), PyMuPDF (1.27.2) / pdfplumber.
- **Status**: Frontend migration completed successfully. Backend core completely built, robustly validated. Elite Security Shield deployed globally (intercepting & blocking SQLi/XSS/Path Traversal threats via global WAF middleware, auto-sanitizing all incoming string fields via SafeBaseModel, and masking outbound PII), with 35/35 unit and integration tests passing perfectly. Production build succeeds flawlessly.

## Architecture
- **Routing (Frontend)**: Next.js App Router with Route Groups `(dashboard)`.
- **Routing (Backend)**: FastAPI routers under `/api/v1` (`auth`, `income`, `tax`, `ai`, `receipts`).
- **Security Shield (Backend)**:
  * **Rate Limiter (`app/core/security.py`)**: Asynchronous, in-memory IP-based sliding window rate-limiter guarding high-cost AI/OCR and calculator endpoints from brute-force exploits.
  * **Response Headers Middleware (`app/main.py`)**: Hardened custom response headers (HSTS, CSP, XSS-Block, Referrer-Policy, nosniff).
  * **Validator & Sanitizer**: Restricts file uploads strictly to 10MB PDFs/images; escapes HTML and filters control characters from text fields to block XSS and prompt injection.
  * **WAF Threat Detection Engine**: Scans incoming text inputs for SQL Injection (SQLi), Cross-Site Scripting (XSS), and Path Traversal signatures, immediately blocking suspicious attempts with `HTTP 400 Bad Request`.
  * **PII Privacy Masking Shield**: Automatically detects and masks sensitive personal identifiers (Thai National ID cards, Credit Card numbers, Emails, and Phone Numbers) before passing text to third-party AI systems to ensure 100% privacy compliance.
- **Database (Supabase)**: SQL schema defined in `backend/app/db/schema.sql` supporting user profiles, e-commerce transactions, saved tax assessment checks, and user tax deductions (allowances).
- **Authentication**: JWT token verification via Supabase Auth in `backend/app/db/supabase.py` (`get_current_user` dependency) protecting all secure endpoints.

## Key Decisions
- **Premium Free PDF Substitution Receipt Generator (มค.๑)**: Designed and launched a world-class, fully client-side workspace at `/receipts/substitution` that allows freelancers and small merchants to generate legally-compliant Thai substitution receipts for cash transactions that lack official invoices.
  * **Side-by-Side Immersive Editor**: Displays a step-by-step document input form on the left, and a real-time pixel-perfect render of the official Thai **"ใบแทนใบเสร็จรับเงิน (มค.๑)"** tax sheet on the right.
  * **Touch-Friendly Signature Canvas**: Built a custom HTML5 canvas element allowing users to draw their digital signatures on-screen via fingers (mobile/LINE) or mouse (desktop), instantly updating the live document preview.
  * **Zero-Dependency PDF Export**: Configured an elegant `@media print` CSS layout that automatically hides all editor panels and UI buttons during standard browser printing (Ctrl + P or print dialogs), exporting a pristine, vector-sharp A4 tax receipt.
- **Dashboard Footer Expansion**: Expanded the Dashboard Quick Actions from 3 columns to a balanced 4-column responsive grid, inserting the new **"สร้างใบแทนใบเสร็จ"** action block with a custom Printer icon to maximize user discovery.
- **Premium Free Version Features on Dashboard**: Designed and added 2 highly interactive, zero-API cost features on the main Dashboard page to maximize daily merchant value and naturally showcase premium features:
  1. **Dynamic Financial Health Badge**: Automatically calculates the "Income-to-Expense Ratio" of the active year and displays an animated glassmorphic banner showing a categorized health status (Excellent Surplus, Healthy Balanced, Tight Margin, Deficit Alert) with matching soft pastel color schemes.
  2. **Top 3 Expense Leaks**: Sorts expense categories descending and displays the top 3 items in a beautiful list. Features custom Lucide icons (food, travel, shopping, etc.), calculated category share percentages, and custom animated progress bars.
- **OCR Free Quota Upgrade**: Increased the dynamic free OCR scanning quota ceiling from 5 to 10 receipts. The progress bars, math logic, and premium Pro Upgrade prompts now dynamically adjust to 10/10 capacity limits automatically.
- **React 19 / Next 16 Hydration Conflict Resolution**: Purged the `next-themes` package wrapper (`ThemeProvider`) and related hooks completely from the codebase (deleted `src/components/theme-provider.tsx` and refactored `sonner.tsx`, `DashboardClientWrapper.tsx`). Next.js 16 and React 19 throw a client-side warning/error when `next-themes` injects an inline `<script>` tag into the DOM during rendering. Since the application is globally locked to a singular Cream-Purple-White design theme, the theme toggle was redundant, and removing it resolved the hydration issue completely.
- **Sinuous Glowing Pipeline Layout (Desktop & Mobile)**: Designed a simultaneous 6-step workflow grid on the landing page connected via custom S-curve neon path vectors with traveling laser pulses to enhance UX/UI read rates.
- **Global Workflow Integrity Audit**: Conducted a rigorous static code audit mapping the 6 landing page workflow steps to real code logic (rate-limited Claude 3.5 OCR scanning, Modulo-11 juristic checksum verifications, digital signature canvas generators, Google OAuth sync, and CSV/PDF export streams).
- **Custom Aesthetic Locking**: Applied the user's custom Cream-Purple-White HEX palette globally to the application. Configured both `:root` (Light mode) and `.dark` (Dark mode) classes in `globals.css` with identical colors, ensuring that no matter the user's OS or browser theme preference, all pages always and only display in this custom aesthetic.
- **Mock Data Elimination**: Purged all mock static data from the frontend pages. Replaced simulated OCR scanning (which formerly delayed and returned random 7-Eleven data) and keyword-based chat responses with real live FastAPI endpoints `/api/v1/receipts/scan` and `/api/v1/ai/chat`.
- **Legacy Code Purge**: Cleaned up and deleted legacy files (`src/lib/db.ts`, `src/lib/actions` folder) and excluded the `prisma` directory in `tsconfig.json` to eliminate type-checking conflicts, restoring the frontend's build to 100% functional health.
- **Safe Graceful Degradation**: Setup fallback handlers and safe defaults in `backend/app/core/config.py` and service initializers so the backend loads cleanly even if environment keys are placeholders (out-of-the-box local development).
- **SRE & Dependency Isolation**: Re-allocated clashing Pydantic namespace annotations (specifically resolved the `date: date` FieldInfo annotation clash) using fully qualified modules (`datetime.date`).
- **Local-first to Sync**: Designed the backend endpoints to map 1:1 with `frontend/src/lib/types.ts` structures to make database syncing straightforward.


## Recent Tasks
- [x] Create Next.js project
- [x] Port Design System (CSS OKLCH)
- [x] Port Components & Hooks
- [x] Port All Pages (Dashboard, Transactions, Receipts, Tax Risk, Assistant, Export)
- [x] Create Supabase FastAPI client & Auth dependency
- [x] Create Pydantic schemas mapping 1:1 with frontend objects
- [x] Implement User Profiles endpoints (`auth.py`)
- [x] Implement Financial CRUD & YTD Analytics Dashboard summary endpoints (`income.py`)
- [x] Implement Advanced progressive tax engine with persistent history & allowances upsert (`tax.py`)
- [x] Implement Contextual Claude 3.5 Sonnet AI Assistant (`ai.py`)
- [x] Implement Dual-Engine AI Visual OCR Receipt Scanner (`receipts.py`)
- [x] Verify production FastAPI compilation & loader health (100% green tests)
- [x] Connect Receipts Page to Live Backend AI OCR Scanner API
- [x] Connect Tax Assistant Chat to Live Claude AI Assistant Chat API
- [x] Purge all unused mock data structures, legacy files, and compile 100% successful frontend production build
- [x] Set and lock all pages to the custom signature Cream, Purple, Light Purple, and Brown Text color palette
- [x] Eliminate `next-themes` entirely to resolve Next 16 / React 19 client-side hydration `<script>` tag warning.
- [x] Increased maximum free OCR Quota ceiling to 10 on the Receipts page.
- [x] Add Dynamic Financial Health Badge and Top 3 Expense Leaks cards on main Dashboard.
- [x] Integrate unified stateful Stripe & Omise premium UpgradeDialog payment gateway.
- [x] Integrate dynamic PromptPay QR SVG with 5-min timer countdown & secure Credit Card checkout.
- [x] Restrict free limits (10 OCR scans, 5 AI questions) and PDF/Excel Exports, triggering the central checkout portal.
- [x] Fix React 19 / Next 16 cascading render lifecycle effect warnings in `auth-guard.tsx` and `upgrade-dialog.tsx`.
- [x] Create highly advanced, stateful settings page at `/settings` containing Profile Management, Shop Tax ID registration with digit check, Notification toggles, active plan card, simulated Invoice History & printable invoices, and subscription cancel dialog.
- [x] Create professional, PDPA/GDPR-compliant Thai Privacy Policy and Terms of Service pages at `/privacy` and `/terms`.
- [x] Add clickable Legal navigation links to landing page footer.
- [x] Achieve 100% clean Next.js/TypeScript compilation with absolutely zero errors.
- [x] Integrate premium 3D mascot cartoon character in the Pricing/Package section on the landing page with slow floating animations.
- [x] Add cache-busting query parameter (?v=2) to mascot image source to bypass browser cache.
- [x] Remove the redundant bottom CTA banner from the Landing Page for cleaner visual flow.
- [x] Integrate premium 6-step interactive visual looping workflow in Thai, replacing the basic placeholder.
- [x] Localize the entire Home page in 100% fluent, high-quality Thai copy.
- [x] Integrate AI OCR seller Tax ID extraction and client-side/server-side modulo-11 DBD juristic verification.
- [x] Redesign the entire Receipts dashboard with a premium glassmorphic theme, responsive folder layout, custom animated DBD verified cards, and instant transaction-notes integration.
- [x] Overhaul landing page workflow into a 100% original, state-of-the-art **Interactive Split-Console Product Tour** featuring auto-playing rotating cycles and manual step capsule navigation to eliminate any copied appearance.
- [x] Upgrade the inner content of all 6 workflow step cards into breathtaking, high-fidelity mockups of actual system features (AI scanners, official DBD verified seals, signature canvases, Excel reports).
- [x] Redesign landing page workflow to show all 6 steps simultaneously connected by a Sinuous S-Curve Glowing Pipeline with traveling laser neon pulses.
- [x] Secure Paywall verification from Supabase on Export, Receipts, Settings, and Tax Assistant pages.
- [x] Integrate real Omise payment gateway charge verification in FastAPI backend.
- [x] Enforce strict subscription blocking on /tax/calculate API route (403 Forbidden).
- [x] Add dynamic and scannable PromptPay QR Code generator.
- [x] Fix pdfplumber fallback stream parsing crash using BytesIO.
- [x] Upgrade config.py with required environment variables.
- [x] Add /api/v1/payment/verify-status and /api/v1/payment/webhook endpoints.
- [x] Create optimized production Dockerfile and .env.example files for both backend and frontend.
- [x] Verify complete test suite and production build output (100% successful).
- [x] Permanently purge legacy SQLite database file (dev.db), Prisma folder, and config templates to keep the repository extremely clean.
- [x] Clear redundant requirements.zip from the backend repository.
- [x] Eliminate hardcoded localhost ports in frontend React pages, routing them dynamically through a central `API_URL` environment parameter.
- [x] Replace mock placeholder authorization token in receipts OCR scanner page with live JWT bearer sessions.
- [x] Integrate beautiful dynamic annual pricing savings calculations and percentage indicators on all landing page pricing cards to maximize conversions.
- [x] Purge all exclamation marks (!), decorative stars (✦), and emojis (🔥, ✨, 💸) from the pricing section of landing page.
- [x] Remove all unincluded features with a red cross (❌) from the Free Plan card to maintain a pristine, premium layout.
- [x] Overwrite legacy placeholder logo files with the user's uploaded winking purple mascot in public assets, and integrate Next.js Image brand logos globally inside Landing Page Header, Dashboard Sidebar, and Login screen portals.
- [x] Upscale and optimize mascot logo sizes across the Landing Page (40px), Dashboard Sidebar (36px), and Auth Guard Login screen (64px) for perfect proportion and gorgeous clarity.
- [x] Strictly overwrite both mascot.png and mascot-pro.png with the new exact purple winking mascot logo uploaded on this turn, ensuring 100% brand consistency throughout the application.
- [x] Add browser tab icon (favicon) metadata pointing to /mascot.png in RootLayout (layout.tsx) to automatically render our winking mascot logo on the browser tab across all pages of the app.
- [x] Replace all web logo assets (mascot.png, mascot-pro.png, and favicon.ico) with the newly uploaded high-res transparent mascot image, and configure RootLayout icons metadata (icon, shortcut, apple) for bulletproof browser tab rendering.
- [x] Revert query parameters to ensure Next.js image compiler compatibility and provide full client browser cache clearing guide.
- [x] Tightly crop winking mascot images to mathematical squares (eliminating 100% of wide empty canvas margins) and convert solid white background to fully transparent alpha channels, making the icon look extremely large, bold, and borderless on the browser tab exactly like Paypers.
- [x] Create the brand-new /fillax-mascot.png file from the cropped transparent version and replace all layout, page, sidebar, and auth portal routes globally to completely bypass local server and browser caching permanently.
- [x] Correct the transparency conversion algorithm to safely retain all original solid white pixels of the mascot's face, eyeballs, and round glasses while keeping only the background completely transparent, restoring a solid winking face on the tab.
- [x] Tightly crop ONLY the mascot head (excluding the right-side yellow stars) into a perfect square of 451x451px, centering the face perfectly on the browser tab and web layouts to prevent off-centering and maximize icon size.
- [x] Tightly crop and center the brand-new extremely cute winking mascot sticking its tongue out, applying a circular transparency mask to keep 100% of the solid face details opaque while leaving corners borderless, integrating it globally across the browser tab and entire website.
- [x] Remove the circular mask and restore the 100% pristine original transparent 1024x1024px winking tongue-out mascot to eliminate all cheek, hair, and star deformation, rendering a gorgeous and authentic look in all circular web containers.
- [x] Auto-crop the brand-new tongue-out mascot to a mathematically centered `802x802` transparent square boundary, fully retaining original sparkles, dropshadows, and crisp edges.
- [x] Compile a professional multi-resolution favicon.ico containing 16x16, 32x32, 48x48, 64x64, 128x128, and 256x256 pixel sets and map it to layout.tsx metadata.
- [x] Upscale and optimize brand mascot logo rendering across the landing page navbar (from 40px to 48px), dashboard sidebar header (from 36px to 48px), and auth portal login greeting card (from 64px to 96px) with soft shadows and elegant interactive scaling micro-animations.
- [x] Replace the landing page hero section mascot on the right side with the brand-new transparent, full-body mascot character, cropping it to a perfectly balanced `895x895` centered square and setting the Next.js preloading priority for instant load.
- [x] Create a backend pytest.ini configuration file to explicitly define the asyncio_default_fixture_loop_scope as function and suppress third-party deprecation warnings, reducing test execution warnings from 1,279 down to 0.
- [x] Relaxed version constraints in backend requirements.txt for PyMuPDF, FastAPI, Pydantic, and other libraries to allow fetching precompiled Python 3.14 compatible binary wheels, enabling successful, compilation-free installations inside local venv on Windows.
- [x] Resolved Uvicorn startup crashes by copying the shared .env file, adding Config fallbacks, ignoring frontend NEXT_PUBLIC_* variables via extra = "ignore", and installing email-validator to cleanly boot FastAPI on port 8000.
- [x] Engineered and deployed the **Elite Security Shield** global middleware in FastAPI backend that acts as an active WAF (Web Application Firewall) blocking SQL Injection (SQLi), Cross-Site Scripting (XSS), and Path Traversal payloads in query parameters and POST/PUT JSON bodies with `HTTP 400 Bad Request`.
- [x] Implemented Pydantic v2 `SafeBaseModel` base model to automatically sanitize all incoming string fields and list elements, escaping HTML tags and stripping harmful control characters to block stored XSS.
- [x] Upgraded Pydantic schemas across `transactions`, `auth`, `tax`, `ai`, and `payment` controllers to inherit from `SafeBaseModel` for automatic defense-in-depth sanitization.
- [x] Expanded the test suite with advanced integration tests covering global WAF middleware request blocking and automatic Pydantic schema validation, raising the test suite to **35/35 passing tests** with 100% security success.
- [x] Fixed React Hydration Mismatch console warning in root layout.tsx by adding suppressHydrationWarning directly to the <body> tag, successfully ignoring Grammarly/browser extension-injected data attributes.
- [x] Deployed premium glassmorphic 3-step **OnboardingModal** system inside the main Dashboard with a dynamic Canvas Confetti canvas celebratory effect and automatic local storage and database sync.
- [x] Created highly gamified **Setup Progress Checklist Widget** inside the Dashboard that computes a real-time percentage score (Onboarding + Transactions + Receipts + Risk Assessment) and triggers context-aware navigation CTAs.
- [x] Overhauled the empty state in `/transactions` page, replacing the blank screen with an interactive, beautifully designed welcome layout, custom creator CTA, and a high-fidelity visual preview card of an e-commerce ledger item.
- [x] Overhauled the empty state in `/receipts` page, deploying a highly engaging drag-and-drop placeholder, immediate OCR scanning trigger, and direct link to Cash Substitution Receipt (มค.๑) creator workspace.
- [x] Maintained 100% clean Next.js/TypeScript compilation with absolutely zero errors and warnings.
- [x] Implement dynamic years calculator (availableYears) extracting unique transaction years in client memory, sorting them, and limiting the list to the last 10 years.
- [x] Complete mock and simulated transaction data purge across /export page, replacing injection with pristine toast validation.
- [x] Resolve UTC-based timezone transition bugs inside receipts OCR scanner and AI Assistant chat, replacing with local timezone-aware year-month calendars.
- [x] Overhaul export download limits from lifetime caps into dynamic month-resetting limits (10 free exports per month), while keeping historical tables preserved.
- [x] Implement FastAPI backend monthly plan/quota checking for /scan (receipts) and /chat (AI Assistant) endpoints, preventing API bypass with 403 Forbidden.
- [x] Purge all Guest Mode simulated mock responses and local plan overrides from all dashboard pages, guaranteeing 100% genuine backend API integration.
- [x] Excise generic browser window.confirm dialogs, replacing with premium custom glassmorphic confirmation warning modals on Receipts and Transactions pages.
- [x] Fix Warning Dialog layout positioning, removing the trailing relative class from DialogContent to restore perfect screen viewport centering.
- [x] Resolve aggressive thumbnail cropping of receipts, implementing object-contain framed preview cards and a premium click-to-zoom Lightbox modal.
- [x] Implement highly interactive AI OCR Scan & Manual Review/Augment flow inside the upload Dialog, replacing the hidden scan icon button with a prominent glowing action trigger and guide.
- [x] Standardize UI/UX Year Selector capsule style across Export (/export) and Tax Risk Assessment (/tax-risk-assessment) pages, matching the Dashboard's Pill Button design.
- [x] Complete comprehensive system audit & QA verification across Next.js and FastAPI frameworks, raising the test suite to **38/38 green passing tests** and validating 100% successful Turbopack production compilation.
- [x] Deploy comprehensive root .gitignore file protecting all environment secrets, Python caches, Next.js build packages, database files, macOS/Windows metadata, and IDE setups.
- [x] Deploy dedicated standalone backend .gitignore file for clean and secure independent FastAPI service deployment.









