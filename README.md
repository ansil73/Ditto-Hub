# DITTO HUB website

The online shop window for **DITTO HUB** — sneakers, watches and budget gadgets, delivered across India.
Customers browse, pick a size and tap **Order on WhatsApp**; the order lands in your WhatsApp Business
chat with the product, size, colour and price already written out. There is no checkout and no
database: every product, price and offer is a small file in this GitHub repository, and you update
them from your phone at `/admin`.

- **Home:** the 3D “Drop Room” (gold emblem, podium engraved with today’s date, featured sneaker →
  watch → gadget as you scroll), today’s offers with countdowns, shop by budget, category portals,
  today’s arrivals, combo deals, how to order, customer photos, Instagram strip, WhatsApp group.
- **Shop pages:** `/shop`, `/sneakers`, `/watches`, `/gadgets`, `/combos` with filters that live in the URL.
- **Today’s catalogue:** `/today` — today’s arrivals and offers on one page, with Share and Save as PDF.
- **Product pages:** `/p/DH-SN-0001` — photos with zoom, 3D / 360° / video tabs when you add them,
  sizes, stock, offer countdown, and WhatsApp, Instagram and call buttons.
- **Bag and wishlist** saved on the customer’s phone, sent to you as one WhatsApp message.
- **Contact, policies, 404, offline page**, link previews for WhatsApp/Instagram, sitemap, installable app.

> **Sample content.** The site ships with 12 sample products (4 sneakers, 4 watches, 4 gadgets),
> 4 offers and 2 combos so it looks complete on day one. Every sample is marked **Sample** on the site.
> Replace them with your real products — see [Replace the sample products](#replace-the-sample-products).

---

## Contents

1. [Daily update (5 minutes, from your phone)](#daily-update-5-minutes-from-your-phone)
2. [Put the site online (one time)](#put-the-site-online-one-time)
3. [Admin at /admin (one time)](#admin-at-admin-one-time)
4. [Your own domain](#your-own-domain)
5. [Replace the sample products](#replace-the-sample-products)
6. [Photos](#photos)
7. [3D models, 360° spins and videos](#3d-models-360-spins-and-videos)
8. [How prices, offers, badges and stock work](#how-prices-offers-badges-and-stock-work)
9. [WhatsApp, Instagram and call buttons](#whatsapp-instagram-and-call-buttons)
10. [Counting taps (optional)](#counting-taps-optional)
11. [Speed and low-power phones](#speed-and-low-power-phones)
12. [For developers](#for-developers)
13. [Before you launch](#before-you-launch)

---

## Daily update (5 minutes, from your phone)

Open `https://<your-site>/admin/` and sign in.

1. **Add today’s arrivals.** *Products → New Product.* Fill in the ID, name, category, price, MRP and
   photos. *Arrival date* is already today, so the product shows **TODAY** on the site.
2. **Set today’s offers with end times.** *Daily updates → Today’s offers and combos.* Add an offer:
   pick the product, type the offer price, a short label (“Flash deal”) and the **Ends** time.
   The offer price, countdown and discount appear on their own and disappear when the time is up.
3. **Update stock and sold-out sizes.** Open each product that sold and lower *Stock* (watches and
   gadgets) or the stock under each size (sneakers). 0 shows **Sold out**; 1–5 shows **Only n left**.
4. **Wait for the live site to refresh.** Every *Save* is published automatically. The site updates in
   about 2–4 minutes (you can watch it under *Actions* on GitHub).
5. **Share `/today`.** Post `https://<your-site>/today/` on your Instagram story and WhatsApp status,
   or open it and tap **Share today’s catalogue** / **Save as PDF** for WhatsApp groups.

Tip: To take a product off the site without deleting it, set its *Status* to **Hidden**.
Use **Archived** for something that will not come back — its link then says “No longer available”
and suggests similar products.

---

## Put the site online (one time)

You need a free **GitHub** account and a free **Cloudflare** account. Cloudflare hosts the site
(free plan, commercial use allowed, unlimited traffic for static sites). GitHub Pages is **not** used
because its terms do not allow online shops.

### 1. Put this code on GitHub

1. Sign in at github.com → **New repository** → name it `ditto-hub` → *Private* or *Public* → **Create**.
2. Upload everything in this folder **except** `node_modules`, `dist` and `public/_gen`
   (they are rebuilt automatically). On a computer with Git:

   ```bash
   git init
   git add .
   git commit -m "DITTO HUB website"
   git branch -M main
   git remote add origin https://github.com/<your-username>/ditto-hub.git
   git push -u origin main
   ```

### 2. Connect Cloudflare

1. In Cloudflare, open **My Profile → API Tokens → Create Token → Create Custom Token**.
   Permission: **Account → Cloudflare Pages → Edit**. Create it and copy the token.
2. Copy your **Account ID** (Workers & Pages → right-hand side of the overview page).
3. In your GitHub repository: **Settings → Secrets and variables → Actions**
   - **Secrets → New repository secret:** `CLOUDFLARE_API_TOKEN` = the token, `CLOUDFLARE_ACCOUNT_ID` = the account ID.
   - **Variables → New repository variable:** `SITE_URL` = `https://ditto-hub.pages.dev`
     (change it later if you add your own domain).

### 3. Deploy

Go to **Actions → Deploy to Cloudflare → Run workflow** (or push any change). The first run creates
the Cloudflare Pages project `ditto-hub` and publishes the site at **https://ditto-hub.pages.dev**.
After that, every push and every save in `/admin` deploys again. If several saves arrive close
together, only the newest one is deployed.

---

## Admin at /admin (one time)

The admin is [Sveltia CMS](https://sveltiacms.app). It runs in your browser and saves straight to
GitHub. Photos you upload are converted to WebP (max 1600 px, quality 80) on your phone before they
are saved, so the repository stays small.

1. Open `public/admin/config.yml` and change the line
   `repo: YOUR-GITHUB-USERNAME/ditto-hub` to your username and repository name. Commit the change.
2. **Quick way to sign in — access token.** On GitHub: *Settings → Developer settings → Personal access
   tokens → Fine-grained tokens → Generate new token.* Repository access: only `ditto-hub`.
   Permissions: **Contents → Read and write**. Copy the token, open `/admin/`, tap
   **Sign In Using Access Token** and paste it. Your browser remembers it.
3. **“Sign in with GitHub” button (optional, nicer for daily use).** Deploy the free
   [Sveltia CMS Authenticator](https://github.com/sveltia/sveltia-cms-auth) to Cloudflare Workers
   (its README has a one-click button), create a GitHub OAuth App whose *Authorization callback URL* is
   `https://<your-worker>.workers.dev/callback`, add the app’s client ID and secret to the worker, and set
   `ALLOWED_DOMAINS` to your site’s domain. Then put the worker URL in `config.yml` at
   `base_url:` and commit.

What you can edit:

| In /admin | File in the repository | What it controls |
| --- | --- | --- |
| **Products** | `src/content/products/<ID>.json` | Every product, its photos, sizes, stock, status |
| **Daily updates → Today’s offers and combos** | `src/content/offers.json` | Offer prices with start/end times, combo deals |
| **Daily updates → Shop settings** | `src/content/settings.json` | WhatsApp number, phone, Instagram, announcement, featured products, Instagram strip, business details |
| **Daily updates → Customer love** | `src/content/reviews.json` | Real customer photos (section hidden while empty) |

If a save has a mistake (for example a price left empty), the deploy stops and the live site keeps
the last good version. The *Actions* tab on GitHub shows the message, such as
`Content problem in src/content/products/DH-SN-0005.json: price: Price must be more than 0`.

On a computer you can also run the site locally (`npm run dev`), open `http://localhost:4321/admin/`
and choose **Work with Local Repository** to edit files without signing in.

---

## Your own domain

1. Cloudflare → **Workers & Pages → ditto-hub → Custom domains → Set up a domain**, enter e.g.
   `dittohub.in` and follow the DNS steps (automatic if the domain is on Cloudflare).
2. GitHub → **Settings → Secrets and variables → Actions → Variables**: change `SITE_URL` to
   `https://dittohub.in` and run the workflow again. Link previews, the sitemap and canonical links
   then use your domain.
3. If you set up the “Sign in with GitHub” worker, add the new domain to its `ALLOWED_DOMAINS`.

---

## Replace the sample products

1. In `/admin → Products`, use the filter **Sample products (replace these)**.
2. Open each one and either change it into a real product (new name, photos, prices, untick
   **Sample product**) or delete it.
3. Product IDs: `DH-SN-0001` for sneakers, `DH-WT-0001` for watches, `DH-GD-0001` for gadgets.
   Use the next free number. Never reuse an ID — customers may have it in a WhatsApp chat.
4. In **Shop settings → Featured in the 3D Drop Room**, choose the sneaker, watch and gadget that
   stand on the podium.
5. Replace the six **Instagram strip** photos (Shop settings) with your own posts.
6. Delete the sample offers and combos and add your own.
7. Fill in **Business details** (address, email, grievance contact) and edit the four policy pages in
   `src/content/policies/` — replace every `[bracketed]` part.

Content rules for everything on the site: use DITTO HUB’s own product names (like “Aero Runner”),
never another company’s brand name, logo or model name, and only real numbers — no invented reviews,
ratings, “sold today” counters or fake stock.

---

## Photos

- **Product photos:** square, the product in full colour on a plain grey backdrop — the same style as
  your Instagram. 1–8 photos per product; the first one is the main photo. Upload straight from your
  phone (JPG or PNG); they are converted to WebP automatically.
- **Cut-out photo (optional but recommended):** the product on a transparent background (PNG), at most
  1200 px. It stands on the 3D podium and floats on the category banners. Free tools that remove
  backgrounds: your phone’s gallery “lift subject” / “remove background” feature.
- **Your Instagram photos:** save them from Instagram to your phone and upload them in the product or
  in *Shop settings → Instagram strip*. (The website cannot copy photos from Instagram by itself.)
- Customer photos go in **Customer love** — only with the customer’s permission.

The site makes 480 px and 960 px copies of every photo during each build (`npm run images`), so phones
download small files.

---

## 3D models, 360° spins and videos

The site looks complete with photos alone. These upgrades can be added product by product.

### 3D models (GLB)

1. Get a `.glb` model of the product (made by a 3D artist, or with a phone 3D-scanning app).
2. On a computer with this repository and Node.js: create a folder `models-src/` and put the file in it,
   named after the product ID — `models-src/DH-SN-0001.glb`.
3. Run `npm run optimize:models`. It compresses the model (Meshopt geometry, WebP textures up to
   2048 px) and writes `public/products/DH-SN-0001/model.glb`. Keep each model under **3 MB**; if it is
   bigger, run `npm run optimize:models -- --texture 1024`.
4. Commit and push, then in `/admin` set the product’s **3D model** to `/products/DH-SN-0001/model.glb`.

The product page gets a **3D** tab (drag, zoom and “View in your space” AR on supported phones). A
featured product with a model stands on the Drop Room podium as a real 3D object instead of a photo card.
`models-src/` is not uploaded to GitHub, so large originals stay on your computer.

### 360° spin

Take 24–36 photos while turning the product on a turntable in equal steps. Name them `01.webp`,
`02.webp`, … and upload them to `public/products/<ID>/spin/`. Then set **360° photos** on the product to the
number of photos. The product page gets a **360°** tab that spins as you drag.

### Turntable video

6–10 seconds, 720p, no sound, looping, MP4, at most 2 MB. Upload it in the product’s **Turntable video**
field. It plays in the product page’s **Video** tab and in the category portal on the home page.

---

## How prices, offers, badges and stock work

- **Price shown** = the offer price while the time in India is between the offer’s *Starts* and *Ends*,
  otherwise the normal price. This is checked in the visitor’s browser, so an offer disappears on time
  even without a new deploy.
- **Discount %** = (MRP − price shown) ÷ MRP, rounded. Hidden when there is no MRP or it is not higher.
- **Budget tiles** (Under ₹499, Under ₹999, Under ₹1,999, Premium ₹2,000+) use the price shown.
- **TODAY** badge: arrival date is today (India time). **NEW**: arrived in the last 3 days.
- **Stock:** 0 → Sold out (the size is greyed out, and the product offers “Ask for restock” on
  WhatsApp), 1–5 → “Only n left”, more → “In stock”. Sneaker stock is the total of its sizes.
- **Order:** newest arrivals first.

## WhatsApp, Instagram and call buttons

All numbers and links come from **Shop settings** — nothing is typed into the code.

| Button | Opens |
| --- | --- |
| Order on WhatsApp | `https://wa.me/919995706323?text=…` with the order written out |
| Ask on Instagram | Copies the same message, shows “Details copied — paste them in the DM”, then opens `https://ig.me/m/_ditto.hub._` (Instagram DMs cannot be pre-filled) |
| Call | `tel:+918078102296` |
| Daily drops group | your WhatsApp group invite link |

The order message looks like this:

```
Hi DITTO HUB! I'd like to order:
Aero Runner (ID: DH-SN-0001)
Price: ₹1,499
Size: UK 8 | Colour: White / Volt
https://ditto-hub.pages.dev/p/DH-SN-0001/

My name:
Delivery pincode:
```

The bag sends one message with a line per item and the total.

## Counting taps (optional)

To see which products get the most enquiries, create a free account at
[goatcounter.com](https://www.goatcounter.com) (no cookies, privacy-friendly). In *Shop settings*,
turn on **Count button taps** and enter your GoatCounter code (the part before `.goatcounter.com`).
Every WhatsApp, Instagram and call tap is then recorded as `tap/<button>/<product ID>`.

---

## Speed and low-power phones

- The home page paints a photo version of the Drop Room first; the 3D scene loads after the page is
  visible and only runs while it is on screen. 3D code (three.js) loads only on the home page.
- **Photo-and-CSS version** (no WebGL) for visitors who prefer reduced motion, have Data Saver on, or
  whose device reports **2 GB of memory or less or 2 CPU cores or less**. The brief suggested 4 GB / 4 cores,
  but every iPhone reports 4 cores to websites, so that rule would have switched 3D off on all iPhones.
  Instead, the site also measures the first 90 frames and falls back to the photo version on its own if
  the phone cannot keep up. Add `?force3d` to the address to test the 3D scene on any device.
- Initial JavaScript on the home page is about 13 KB (compressed); the 3D scene is a separate download
  of about 165 KB that starts only after the page has appeared.
- Installable as an app (“Add to Home screen”). With no internet connection it shows a small
  “You’re offline” page instead of an error; the bag and wishlist stay saved on the phone.

---

## For developers

Requirements: Node.js 22.12 or newer.

```bash
npm install
npm run dev               # http://localhost:4321
npm run build             # static site in dist/
npm run preview           # serve dist/
npm run check             # type checks
npm run images            # make the 480/960 px photo copies (also runs before dev and build)
npm run optimize:models   # compress models-src/*.glb into public/products/<ID>/model.glb
```

**Stack.** [Astro](https://astro.build) static output; content as JSON in `src/content/`, checked with
[zod](https://zod.dev) at build time (`src/lib/catalog.ts`); three.js for the Drop Room
(`src/scripts/drop3d.ts`), loaded after first paint; `<model-viewer>` for product 3D/AR; Fuse.js
search; Lenis smooth scrolling on desktop; Sveltia CMS; Cloudflare Pages via GitHub Actions
(`.github/workflows/deploy.yml`).

**Where it differs from the brief, and why.** The brief suggested React islands with
@react-three/fiber, Tailwind CSS and GSAP. The site uses plain TypeScript, three.js directly, CSS with the
brand tokens as variables (`src/styles/global.css`) and a small scroll controller instead
(`src/scripts/drop.ts`). Same features and motion, a fraction of the JavaScript, which keeps phones on
4G fast. Photos are resized by `scripts/images.mjs` (sharp) instead of Astro’s image component, because
product photo paths come from the CMS at build time.

**Layout of the code.**

```
public/admin/        Sveltia CMS (index.html, config.yml)
public/brand/        logo files (used as supplied)
public/products/<ID> product photos, cut-outs, models, spin frames, videos
src/content/         products/*.json, offers.json, settings.json, reviews.json, policies/*.md
src/lib/             catalog (zod schemas), pricing rules, WhatsApp messages, formatting
src/scripts/         browser code: live prices, bag/wishlist, search, Drop Room, product page
src/components/      header, footer, cards, banners
src/pages/           every route
scripts/             photo copies, model optimiser
```

Prices, offers, countdowns and badges are rendered at build time and recalculated in the browser
(`src/scripts/live.ts`, India time), so pages stay correct between deploys.

---

## Before you launch

- [ ] `public/admin/config.yml`: `repo:` changed (and `base_url:` if you use the sign-in worker).
- [ ] Sample products, offers and combos replaced; featured products chosen.
- [ ] Business details filled in; the four policy pages edited (no `[bracketed]` text left).
- [ ] Every WhatsApp, Instagram and call button opens the right chat with the right message.
- [ ] A price or stock changed in `/admin` shows on the live site after the deploy.
- [ ] An offer with an end time disappears on its own after that time.
- [ ] Checked on Chrome for Android, Safari on iPhone and a desktop browser.
- [ ] A product link sent on WhatsApp shows its photo, name and price.
- [ ] `SITE_URL` set to your final domain.
