/**
 * Don Trove — Google Apps Script Backend
 * =========================================
 * File: Code.gs
 *
 * SETUP:
 * 1. Open https://script.google.com → paste this file
 * 2. Deploy → New deployment → Web app
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 3. Copy the deployment URL → paste into App.js as SHEET_URL
 *
 * SHEET STRUCTURE:
 *   Products sheet  → Name | Price | Description | Image URL | Category | Active
 *
 *   Image URL column supports MULTIPLE images — separate with commas:
 *   e.g.  https://i.ibb.co/img1.jpg,https://i.ibb.co/img2.jpg,https://i.ibb.co/img3.jpg
 *
 *   Orders sheet    → Order Ref | Date/Time | Sender Name | Phone | Email |
 *                     Recipient Name | Delivery Address | Delivery Date | Occasion |
 *                     Gift Message | Items | Subtotal (PKR) | Gift Wrap |
 *                     Delivery Fee (PKR) | Total (PKR) | Payment Method
 */

const SPREADSHEET_ID = '1l1pIsSdVIbbu0AEEEJvDhlhinA4nGimT-ZSBGX0oLbY';
const PRODUCTS_SHEET  = 'Products';
const ORDERS_SHEET    = 'Orders';

function getSpreadsheet() {
  return SpreadsheetApp.openById(SPREADSHEET_ID);
}

// ══ doGet — returns active products as JSON ════════════════════════════════
// Returns: { name, price, description, imageUrl, images[], category }
// imageUrl  = first image (backwards-compatible)
// images    = array of all images parsed from comma-separated cell
function doGet(e) {
  try {
    const ss    = getSpreadsheet();
    let   sheet = ss.getSheetByName(PRODUCTS_SHEET);

    if (!sheet) {
      sheet = ss.insertSheet(PRODUCTS_SHEET);
      sheet.appendRow(['Name', 'Price', 'Description', 'Image URL', 'Category', 'Active']);
      sheet.setFrozenRows(1);
      return jsonResponse([]);
    }

    const rows = sheet.getDataRange().getValues();
    if (rows.length <= 1) return jsonResponse([]);

    const headers = rows[0].map(h => String(h).trim().toLowerCase());

    const col = {
      name:        headers.indexOf('name'),
      price:       headers.indexOf('price'),
      description: headers.indexOf('description'),
      imageUrl:    headers.indexOf('image url'),
      category:    headers.indexOf('category'),
      active:      headers.indexOf('active'),
    };

    const products = rows
      .slice(1)
      .filter(row => {
        const activeVal = col.active >= 0 ? row[col.active] : '';
        const hasName   = col.name >= 0 && String(row[col.name]).trim() !== '';
        return hasName && String(activeVal).toUpperCase() === 'YES';
      })
      .map(row => {
        // Parse comma-separated image URLs from the single "Image URL" cell
        const rawImages = col.imageUrl >= 0 ? String(row[col.imageUrl]).trim() : '';
        const images    = rawImages
          .split(',')
          .map(u => u.trim())
          .filter(u => u.length > 0);

        return {
          name:        col.name        >= 0 ? String(row[col.name]).trim()        : '',
          price:       col.price       >= 0 ? Number(row[col.price])              : 0,
          description: col.description >= 0 ? String(row[col.description]).trim() : '',
          imageUrl:    images[0] || '',   // first image — keeps old code working
          images:      images,            // full array for carousel
          category:    col.category    >= 0 ? String(row[col.category]).trim()    : '',
        };
      });

    return jsonResponse(products);

  } catch (err) {
    return jsonResponse({ error: err.message });
  }
}

// ══ doPost — records a new order ══════════════════════════════════════════
function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    const ss      = getSpreadsheet();
    let   sheet   = ss.getSheetByName(ORDERS_SHEET);

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
      payload.orderRef      || '',
      payload.dateTime      || new Date().toLocaleString(),
      payload.senderName    || '',
      payload.phone         || '',
      payload.email         || '',
      payload.recipientName || '',
      payload.address       || '',
      payload.deliveryDate  || '',
      payload.occasion      || '',
      payload.giftMessage   || '',
      payload.items         || '',
      payload.subtotal      || 0,
      payload.giftWrap      || 0,
      payload.deliveryFee   || 0,
      payload.total         || 0,
      payload.paymentMethod || '',
    ]);

    return jsonResponse({ success: true, orderRef: payload.orderRef });

  } catch (err) {
    return jsonResponse({ error: err.message });
  }
}

// ══ Helper ════════════════════════════════════════════════════════════════
function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
