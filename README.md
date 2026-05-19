# Don Trove 🌸
**Le Tresor De Misfah** — A curated gift store storefront

A fully static front-end (HTML + CSS + JS) that reads products from Google Sheets and submits orders via Google Apps Script. No server required — host on GitHub Pages for free.

---

## 📁 File Structure

```
don-trove/
├── index.html   ← markup & layout
├── style.css    ← all styles & CSS variables
├── app.js       ← product loading, cart, orders logic
├── Code.gs      ← Google Apps Script (paste into Apps Script editor)
└── assets/
    └── logo.png ← (optional) your logo image
```

---

## 🚀 Quick Start

### 1. Google Sheet — Products

Create a Google Sheet with a tab named **Products** and these columns:

| id | name | category | description | price | imageUrl | featured |
|----|------|----------|-------------|-------|----------|----------|
| 1  | Digital Planner | PLANNER | Stay organised | 1500 | https://… | TRUE |

Make the sheet **publicly viewable** (Share → Anyone with the link → Viewer).

Copy the Sheet ID from the URL:  
`https://docs.google.com/spreadsheets/d/`**`YOUR_SHEET_ID`**`/edit`

Update `app.js`:
```js
const SHEET_PRODUCTS_URL =
  "https://opensheet.elk.sh/YOUR_SHEET_ID/Products";
```

### 2. Google Apps Script — Orders

1. In your Google Sheet go to **Extensions → Apps Script**
2. Paste the contents of `Code.gs` (replace any existing code)
3. Save, then **Deploy → New deployment**
   - Type: **Web app**
   - Execute as: **Me**
   - Who has access: **Anyone**
4. Copy the deployment URL

Update `app.js`:
```js
const SHEET_ORDERS_URL =
  "https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec";
```

### 3. Host on GitHub Pages

1. Push all files to a GitHub repository
2. Go to **Settings → Pages → Source → main branch / root**
3. Your store is live at `https://yourusername.github.io/your-repo/`

---

## ✨ Features

- 📦 Products pulled live from Google Sheets
- 🎠 Featured carousel for hand-picked items
- 🔍 Real-time search across name, category & description
- 🗂️ Category filter sidebar
- 🔍 Product lightbox with prev/next navigation
- 🛒 Cart drawer with quantity tracking
- 📋 Checkout modal → order written to Google Sheet
- 🌸 Fully responsive (mobile-first)
- ⌨️ Escape key closes any open panel

---

## 🎨 Customisation

All colours are CSS variables in `style.css`:

```css
:root {
  --pink:       #e8708a;   /* primary accent */
  --pink-dark:  #b84060;   /* dark accent, headings */
  --pink-light: #fce8ee;   /* soft backgrounds */
  --bg:         #fff5f7;   /* page background */
}
```

Change `--pink` and `--pink-dark` to your brand colours and the whole UI updates instantly.

---

## 📦 Dependencies

None — vanilla HTML/CSS/JS only. Fonts loaded from Google Fonts CDN.

---

## 📄 License

MIT — free to use and adapt for personal or commercial projects.
