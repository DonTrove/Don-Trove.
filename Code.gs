/**
 * Don Trove — Google Apps Script Backend
 * =========================================
 * File: Code.gs
 *
 * SETUP INSTRUCTIONS:
 * 1. Go to https://script.google.com and create a new project.
 * 2. Paste this entire file into the editor.
 * 3. Update SPREADSHEET_ID below with your Google Sheet ID.
 * 4. Deploy → New deployment → Web app
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 5. Copy the deployment URL and paste it into js/app.js → CONFIG.SHEET_URL
 *
 * SHEET STRUCTURE:
 * The script auto-creates two sheets on first run:
 *   - "Products"  → Name | Price | Description | Image URL | Category | Active
 *   - "Orders"    → All order fields
 */

// ── CONFIG ─────────────────────────────────────────────
const SPREADSHEET_ID = 'YOUR_SPREADSHEET_ID_HERE'; // ← Replace this!
const PRODUCTS_SHEET = 'Products';
const ORDERS_SHEET   = 'Orders';
// ───────────────────────────────────────────────────────

function getSpreadsheet() {
  return SpreadsheetApp.openById(SPREADSHEET_ID);
}

// ══ GET — returns active products as JSON ══════════════
// Columns: Name(0) | Price(1) | Description(2) | Image URL(3) | Category(4) | Active(5)
function doGet(e) {
  try {
    const ss    = getSpreadsheet();
    let sheet   = ss.getSheetByName(PRODUCTS_SHEET);

    // Auto-create Products sheet with headers if missing
    if (!sheet) {
      sheet = ss.insertSheet(PRODUCTS_SHEET);
      sheet.appendRow(['Name', 'Price', 'Description', 'Image URL', 'Category', 'Active']);
      sheet.setFrozenRows(1);
      return jsonResponse([]);
    }

    const data = sheet.getDataRange().getValues();

    // Support both old layout (5 cols, Active at index 4)
    // and new layout (6 cols, Category at index 4, Active at index 5)
    const hasCategory = data[0].length >= 6;

    const products = data
      .slice(1)
      .filter(row => {
        const activeVal = hasCategory ? row[5] : row[4];
        return String(activeVal).toUpperCase() === 'YES' && row[0];
      })
      .map(row => ({
        name:        row[0],
        price:       row[1],
        description: row[2],
        imageUrl:    row[3],
        category:    hasCategory ? String(row[4]).trim() : '',
      }));

    return jsonResponse(products);
  } catch (err) {
    return jsonResponse({ error: err.message });
  }
}

// ══ POST — records a new order ════════════════════════
function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    const ss      = getSpreadsheet();
    let sheet     = ss.getSheetByName(ORDERS_SHEET);

    // Auto-create Orders sheet with headers if missing
    if (!sheet) {
      sheet = ss.insertSheet(ORDERS_SHEET);
      sheet.appendRow([
        'Order Ref', 'Date/Time', 'Sender Name', 'Phone', 'Email',
        'Recipient Name', 'Delivery Address', 'Delivery Date', 'Occasion',
        'Gift Message', 'Items', 'Subtotal (PKR)', 'Gift Wrap',
        'Delivery Fee (PKR)', 'Total (PKR)', 'Payment Method',
      ]);
      sheet.setFrozenRows(1);
    }

    sheet.appendRow([
      payload.orderRef,
      payload.dateTime,
      payload.senderName,
      payload.phone,
      payload.email,
      payload.recipientName,
      payload.address,
      payload.deliveryDate,
      payload.occasion,
      payload.giftMessage,
      payload.items,
      payload.subtotal,
      payload.giftWrap,
      payload.deliveryFee,
      payload.total,
      payload.paymentMethod,
    ]);

    return jsonResponse({ success: true, orderRef: payload.orderRef });
  } catch (err) {
    return jsonResponse({ error: err.message });
  }
}

// ══ Helper ════════════════════════════════════════════
function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
