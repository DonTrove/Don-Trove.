/**
 * Don Trove — Google Apps Script Backend
 * =========================================
 * File: Code.gs
 *
 * SETUP INSTRUCTIONS:
 * 1. Go to https://script.google.com and create a new project.
 * 2. Paste this entire file into the editor.
 * 3. Update SPREADSHEET_ID below with your Google Sheet ID.
 *    (The ID is in the sheet URL: docs.google.com/spreadsheets/d/THIS_PART/edit)
 * 4. Deploy → New deployment → Web app
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 5. Copy the deployment URL and paste it into index.html → CONFIG.SHEET_URL
 *
 * PRODUCTS SHEET COLUMNS (row 1 = headers):
 *   A: Name  |  B: Price  |  C: Description  |  D: Image URL  |  E: Category  |  F: Active (YES/NO)
 *
 * ORDERS SHEET: auto-created on first order.
 */

const SPREADSHEET_ID = 'https://script.google.com/macros/s/AKfycbwOMervnMYiwxPUNkqqOvRwnwfxvmxzYhEk2wcQyLAF_5D7rv153KsS2UiruaC3_11N3Q/exec'; // ← Replace this!
const PRODUCTS_SHEET = 'Products';
const ORDERS_SHEET   = 'Orders';

function getSpreadsheet() {
  return SpreadsheetApp.openById(SPREADSHEET_ID);
}

// ══ GET — returns active products as JSON ══════════════
function doGet(e) {
  try {
    const ss  = getSpreadsheet();
    let sheet = ss.getSheetByName(PRODUCTS_SHEET);

    if (!sheet) {
      // Auto-create with headers if missing
      sheet = ss.insertSheet(PRODUCTS_SHEET);
      sheet.appendRow(['Name', 'Price', 'Description', 'Image URL', 'Category', 'Active']);
      sheet.setFrozenRows(1);
      return jsonResponse([]);
    }

    const data = sheet.getDataRange().getValues();
    if (data.length < 2) return jsonResponse([]);

    // Detect column layout (supports 5-col legacy and 6-col with Category)
    const hasCategory = data[0].length >= 6;

    const products = data
      .slice(1) // skip header row
      .filter(row => {
        const activeVal = hasCategory ? row[5] : row[4];
        return String(activeVal).toUpperCase().trim() === 'YES' && String(row[0]).trim();
      })
      .map(row => ({
        name:        String(row[0]).trim(),
        price:       Number(row[1]) || 0,
        description: String(row[2] || '').trim(),
        imageUrl:    String(row[3] || '').trim(),
        category:    hasCategory ? String(row[4] || '').trim() : '',
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

    if (!sheet) {
      sheet = ss.insertSheet(ORDERS_SHEET);
      sheet.appendRow([
        'Order Ref', 'Date/Time', 'Sender Name', 'Phone', 'Email', 'City',
        'Recipient Name', 'Delivery Address', 'Delivery Date', 'Occasion',
        'Gift Message', 'Special Notes', 'Items',
        'Subtotal (PKR)', 'Gift Wrap', 'Delivery Fee (PKR)', 'Total (PKR)', 'Payment Method',
      ]);
      sheet.setFrozenRows(1);
    }

    sheet.appendRow([
      payload.orderRef      || '',
      payload.dateTime      || '',
      payload.senderName    || '',
      payload.phone         || '',
      payload.email         || '',
      payload.city          || '',
      payload.recipientName || '',
      payload.address       || '',
      payload.deliveryDate  || '',
      payload.occasion      || '',
      payload.giftMessage   || '',
      payload.notes         || '',
      payload.items         || '',
      payload.subtotal      || 0,
      payload.giftWrap      || 'No',
      payload.deliveryFee   || 200,
      payload.total         || 0,
      payload.paymentMethod || '',
    ]);

    return jsonResponse({ success: true, orderRef: payload.orderRef });
  } catch (err) {
    return jsonResponse({ error: err.message });
  }
}

// ══ Helper ════════════════════════════════════════════
function jsonResponse(data) {
  const output = ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
  return output;
}
