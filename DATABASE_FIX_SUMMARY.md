# Database Fix Summary

## Problems Identified & Fixed

### 1. ID Type Mismatch (Primary Issue)
**Symptom:** `Failed to place order: Error creating order: No document found for query "{ _id: new ObjectId(...) }" on model "Table"`

**Cause:** After database restore, all `_id` fields and reference fields were stored as **strings** instead of **ObjectId**. Mongoose expects ObjectId, so queries failed due to type mismatch.

**Fix:**
- Created `scripts/fix-id-types.js` to convert all `_id` and reference fields to ObjectId
- Updated `scripts/restore-db.js` to convert IDs during future restores
- Updated `server/config/database.js` → `findUserById` to convert string ID to ObjectId when querying

**Collections fixed:** tables, orders, users, categories, menuitems, vendors, vendortransactions

### 2. Date Fields Stored as Strings
**Symptom:** Order number generation and date-based queries returned incorrect results (only 1 order found instead of 27).

**Cause:** `createdAt` and `updatedAt` fields were stored as ISO strings instead of Date objects.

**Fix:** Extended `fix-id-types.js` to convert `createdAt` and `updatedAt` to proper Date objects.

### 3. Order Number Generation Could Create Duplicates
**Symptom:** `E11000 duplicate key error collection: orders index: orderNumber_1`

**Cause:** Order number generation used `countDocuments` which can produce duplicates if orders were deleted or if there are gaps in sequence.

**Fix:** Updated order number generation in `server/models/Order.js` pre-save hook to find the highest existing order number for today and increment it (also already fixed in `database.js` createOrder).

### 4. Authentication 401 Errors
**Symptom:** All API requests returning 401 Unauthorized after restart.

**Cause:** `findUserById` was querying `_id` with a string value, but after ID conversion `_id` became ObjectId, causing user lookup to fail.

**Fix:** Updated `findUserById` to convert string ID to ObjectId before querying.

## Files Modified/Created

### New Files
- `scripts/fix-id-types.js` - Migration script to fix existing database
- `scripts/verify-fix.js` - Verification script
- `scripts/test-auth.js` - Auth test
- `scripts/test-full-order.js` - Full order creation test
- `scripts/check-orders.js` - Order inspection
- `scripts/check-dates.js` - Date field inspection
- `DATABASE_FIX_SUMMARY.md` - This document

### Modified Files
- `scripts/restore-db.js` - Added ID conversion during restore
- `server/config/database.js` - Fixed `findUserById` to handle ObjectId
- `server/models/Order.js` - Fixed order number generation to use max sequence

## What You Need To Do

### 1. Restart the Server
**Required** for all code changes to take effect:
```bash
# Stop current server (Ctrl+C)
cd server
npm start
```
Or use `scripts/start-server.bat`

### 2. Re-login (If You See 401 Errors)
If the UI shows 401 errors after restart:
- Clear browser storage (localStorage/sessionStorage) or use incognito
- Log in again with credentials:
  - Admin: `admin` / `admin`
  - Waiter: `waiter` / `waiter`
  - Biller: `biller` / `biller`

### 3. Test Order Creation
Try placing an order in the POS - it should now work without the "No document found" error.

## Verification

Run these scripts to verify fixes:

```bash
# Check ID types and order creation
cd server && node ../scripts/verify-fix.js

# Check date fields
cd server && node ../scripts/check-dates.js

# Check order numbers
cd server && node ../scripts/check-orders.js

# Test auth
cd server && node ../scripts/test-auth.js

# Test full order creation
cd server && node ../scripts/test-full-order.js
```

All tests should pass.

## Technical Details

### ID Conversion
The migration converts all ID fields from strings to ObjectId using:
```javascript
new mongoose.Types.ObjectId(stringId)
```
The hex string value remains the same; only the BSON type changes.

### Date Conversion
ISO 8601 strings are converted to Date objects:
```javascript
new Date(dateString)
```

### Order Number Logic
Now uses maximum existing sequence + 1:
```javascript
const lastOrder = await Order.find(...).sort({orderNumber: -1});
const lastSeq = parseInt(lastOrder.orderNumber.split('-').pop());
nextSeq = lastSeq + 1;
```

## Future Restores
The updated `restore-db.js` automatically converts IDs and dates during restore, so this issue won't recur.
