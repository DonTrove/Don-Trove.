// ============================================================
//  Le Trésor de Misfah — Google Apps Script Backend
//  Code.gs
// ============================================================

// ── CONFIGURATION ────────────────────────────────────────────
const SPREADSHEET_ID = SpreadsheetApp.getActiveSpreadsheet().getId();
const ORDERS_SHEET   = "Orders";
const PRODUCTS_SHEET = "Products";

// ── WEB APP ENTRY POINTS ─────────────────────────────────────

function doGet(e) {
  return HtmlService
    .createTemplateFromFile("index")
    .evaluate()
    .setTitle("Le Trésor de Misfah")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag("viewport", "width=device-width, initial-scale=1");
}

function doPost(e) {
  try {
    const data   = JSON.parse(e.postData.contents);
    const result = processOrder(data);
    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ── INCLUDE HELPER (for CSS partials) ────────────────────────

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

// ── PRODUCTS ─────────────────────────────────────────────────

/**
 * Returns all active products from the Products sheet.
 * Expected columns (row 1 = headers):
 *   A: ID | B: Name | C: Category | D: Price (PKR) | E: Image URL
 *   F: Description | G: Badge (BESTSELLER / NEW / empty) | H: Active (TRUE/FALSE)
 */
function getProducts() {
  try {
    const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(PRODUCTS_SHEET);

    if (!sheet) return { success: false, error: "Products sheet not found" };

    const rows = sheet.getDataRange().getValues();
    if (rows.length < 2) return { success: true, products: [] };

    const headers = rows[0].map(h => String(h).trim().toLowerCase());
    const idxOf   = key => headers.indexOf(key);

    const iId    = idxOf("id");
    const iName  = idxOf("name");
    const iCat   = idxOf("category");
    const iPrice = idxOf("price (pkr)");
    const iImg   = idxOf("image url");
    const iDesc  = idxOf("description");
    const iBadge = idxOf("badge");
    const iAct   = idxOf("active");

    const products = rows.slice(1)
      .filter(r => iAct === -1 || String(r[iAct]).toUpperCase() === "TRUE")
      .map(r => ({
        id:          r[iId]    || "",
        name:        r[iName]  || "",
        category:    r[iCat]   || "General",
        price:       Number(r[iPrice]) || 0,
        imageUrl:    r[iImg]   || "",
        description: r[iDesc]  || "",
        badge:       r[iBadge] || ""
      }));

    return { success: true, products };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// ── ORDERS ───────────────────────────────────────────────────

/**
 * Writes a new order row to the Orders sheet.
 * order = {
 *   name, phone, city, address, paymentMethod, notes,
 *   items: [{ id, name, price, qty }]
 * }
 */
function processOrder(order) {
  try {
    const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
    let   sheet = ss.getSheetByName(ORDERS_SHEET);

    // Create sheet + header row if missing
    if (!sheet) {
      sheet = ss.insertSheet(ORDERS_SHEET);
      sheet.appendRow([
        "Timestamp", "Order Ref", "Name", "Phone", "City", "Address",
        "Items", "Subtotal (PKR)", "Delivery Fee (PKR)", "Total (PKR)",
        "Payment Method", "Notes"
      ]);
      sheet.getRange(1, 1, 1, 12).setFontWeight("bold");
    }

    const ref        = "ORD-" + Date.now();
    const itemsSummary = order.items
      .map(i => `${i.name} x${i.qty}`)
      .join(", ");
    const subtotal   = order.items.reduce((s, i) => s + i.price * i.qty, 0);
    const delivery   = subtotal > 0 ? 200 : 0;   // flat PKR 200 delivery fee
    const total      = subtotal + delivery;

    sheet.appendRow([
      new Date(),
      ref,
      order.name        || "",
      order.phone       || "",
      order.city        || "",
      order.address     || "",
      itemsSummary,
      subtotal,
      delivery,
      total,
      order.paymentMethod || "",
      order.notes         || ""
    ]);

    return { success: true, orderRef: ref, total };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// ── UTILITY: seed sample products (run once from Apps Script IDE) ──

function seedProducts() {
  const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  let   sheet = ss.getSheetByName(PRODUCTS_SHEET);

  if (!sheet) {
    sheet = ss.insertSheet(PRODUCTS_SHEET);
  } else {
    sheet.clearContents();
  }

  const headers = [
    "ID", "Name", "Category", "Price (PKR)", "Image URL",
    "Description", "Badge", "Active"
  ];
  sheet.appendRow(headers);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold");

 // const samples = [
   // ["P001", "Velvet Rose Oud",       "Fragrance", 3500, "https://images.unsplash.com/photo-1594035910387-fea47794261f?w=400", "A rich, velvety oud with rose heart notes.",     "BESTSELLER", "TRUE"],
    //["P002", "Crystal Moon Necklace", "Jewellery", 2800, "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=400", "Delicate crystal pendant on 18k gold chain.",    "NEW",        "TRUE"],
    //["P003", "Desert Bloom Candle",   "Home",      1200, "https://images.unsplash.com/photo-1603905935680-0cdc3d62f0aa?w=400", "Hand-poured soy candle with jasmine & amber.",   "",           "TRUE"],
    //["P004", "Silk Heritage Scarf",   "Fashion",   4200, "https://images.unsplash.com/photo-1601924994987-69e26d50dc26?w=400", "Pure silk scarf inspired by Arabian textiles.",  "NEW",        "TRUE"],
  //];

  samples.forEach(row => sheet.appendRow(row));
  SpreadsheetApp.flush();
  Logger.log("Products seeded successfully.");
}
