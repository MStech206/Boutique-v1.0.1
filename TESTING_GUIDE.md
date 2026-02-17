# Quick Testing Guide - SAPTHALA Boutique Admin Panel

## \ud83d\udea6 Quick Start

1. **Start Server**: Run `node server.js` or `RESTART_SERVER.bat`
2. **Open Browser**: Navigate to `http://localhost:3000`
3. **Login**: Use admin credentials
4. **Test Features**: Follow steps below

## \ud83d\udccb Test Scenarios

### 1. Reports Section (2 minutes)

**Test Enter Key Functionality**:
```
1. Click "Reports" tab
2. Select "Order ID" from dropdown
3. Type any order ID (e.g., "ORD-")
4. Press Enter key (NOT the button)
5. \u2705 Results should appear instantly
```

**Test All Filters**:
```
1. Try "Customer Name" filter + Enter
2. Try "Phone Number" filter + Enter
3. Try "Staff Name" filter + Enter
4. \u2705 Each should work without clicking button
```

**Test Export**:
```
1. Generate a report
2. Click "Download PDF"
3. Click "Download CSV"
4. \u2705 Both files should download
```

### 2. Customer Management (3 minutes)

**Test Customer List**:
```
1. Click "Customers" tab
2. \u2705 Should see table with avatars
3. \u2705 Should see order counts
4. \u2705 Should see total spent
```

**Test Edit Customer**:
```
1. Click "\u270f\ufe0f Edit" on any customer
2. \u2705 Modal opens with customer data
3. Change name to "Test Customer"
4. Change phone to "9999999999"
5. Click "Save Changes"
6. \u2705 Success notification appears
7. \u2705 Customer list refreshes
8. \u2705 Changes are visible
```

**Test View Orders**:
```
1. Click "\ud83d\udccb View Orders" on customer
2. \u2705 Modal shows all customer orders
3. \u2705 Order details are complete
4. Click "View Details" on an order
5. \u2705 Full order information displays
```

### 3. Sub-Admin Management (3 minutes)

**Test Sub-Admin List**:
```
1. Click "Sub-Admins" tab
2. \u2705 Should see all sub-admins
3. \u2705 Branch names displayed
4. \u2705 Permissions shown
```

**Test Password Change**:
```
1. Click on any sub-admin row
2. \u2705 Password modal opens
3. Enter new password: "TestPass123"
4. Confirm password: "TestPass123"
5. Add reason: "Testing password change"
6. Click "Change Password"
7. \u2705 Success notification appears
8. \u2705 Password changed in database
```

**Test Password Validation**:
```
1. Open password modal
2. Enter password: "short" (< 8 chars)
3. Try to submit
4. \u2705 Should show error
5. Enter mismatched passwords
6. \u2705 Should show "Passwords do not match"
```

### 4. Festival Themes (5 minutes)

**Test All Themes**:
```
For each theme:
1. Click theme card
2. \u2705 Header color changes
3. \u2705 Sidebar color changes
4. \u2705 Buttons update
5. \u2705 Stat cards update
6. \u2705 Smooth transition (0.5s)
7. \u2705 Notification appears
```

**Test Specific Themes**:
```
\ud83c\udffa Modern: Purple/Pink gradient
\ud83c\udf8a New Year: Gold/Orange
\ud83e\ude81 Sankranti: Bright Orange/Yellow
\ud83c\udf08 Holi: Pink/Purple/Turquoise
\ud83c\udf38 Ugadi: Green/Gold
\ud83c\udf19 Ramadan: Teal/Gold
\ud83e\ude94 Diwali: Orange/Gold/Red
\ud83d\udc18 Ganesh: Orange/Gold
\ud83c\uddee\ud83c\uddf3 Independence: Saffron/White/Green
\ud83c\udf84 Christmas: Red/Green/Gold
```

**Test Undo Functionality**:
```
1. Apply any theme (e.g., Diwali)
2. \u2705 Notification shows with "Undo" button
3. Click "\u21ba Undo" within 5 seconds
4. \u2705 Previous theme restored
5. \u2705 "Theme reverted" notification shows
```

**Test Theme Persistence**:
```
1. Apply Holi theme
2. Refresh page (F5)
3. \u2705 Holi theme still active
4. Close browser
5. Reopen http://localhost:3000
6. \u2705 Holi theme still active
```

### 5. Staff Mobile Portal (3 minutes)

**Test Task Display**:
```
1. Open staff portal (separate login)
2. Login with staff credentials
3. View "My Active Tasks"
4. \u2705 Task cards show:
   - Product information
   - All measurements
   - Design description
   - Reference images
```

**Test Measurements**:
```
1. Open any task card
2. Scroll to Measurements section
3. \u2705 All measurements visible
4. \u2705 Labels formatted correctly
5. \u2705 Units (cm) displayed
6. \u2705 Grid layout clean
```

**Test Images**:
```
1. Scroll to Reference Images
2. \u2705 Images load correctly
3. \u2705 2-column grid layout
4. \u2705 Placeholder if no images
5. Click image to view full size
6. \u2705 Image opens in new view
```

**Test Design Description**:
```
1. Scroll to Design Information
2. \u2705 Full description visible
3. \u2705 Text formatted properly
4. \u2705 Easy to read
5. \u2705 No truncation
```

**Test Task Actions**:
```
1. Click "Start Task"
2. \u2705 Status changes to "Started"
3. Click "Pause Task"
4. \u2705 Status changes to "Paused"
5. Click "Resume Task"
6. \u2705 Status back to "Started"
7. Click "Complete Task"
8. \u2705 Task moves to Completed tab
```

## \u26a0\ufe0f Common Issues & Solutions

### Issue: Reports not loading
**Solution**: 
- Check if server is running
- Verify token in localStorage
- Check browser console for errors

### Issue: Customer edit not saving
**Solution**:
- Ensure all required fields filled
- Check network tab for API errors
- Verify admin permissions

### Issue: Password change fails
**Solution**:
- Password must be 8+ characters
- Passwords must match
- Must be logged in as admin

### Issue: Theme not applying
**Solution**:
- Clear browser cache
- Check localStorage for theme key
- Refresh page after applying

### Issue: Staff portal images not loading
**Solution**:
- Check image URLs in database
- Verify uploads folder exists
- Check file permissions

## \u2705 Success Criteria

All tests pass if:
- [x] Reports load on Enter key
- [x] Customer edit saves successfully
- [x] Password changes work
- [x] All 10 themes apply correctly
- [x] Undo button works
- [x] Staff portal shows measurements
- [x] Staff portal shows images
- [x] Staff portal shows design description
- [x] No console errors
- [x] Smooth transitions
- [x] Notifications display

## \ud83d\udcca Performance Benchmarks

Expected performance:
- Theme switch: < 0.5s
- Report load: < 2s
- Customer edit: < 1s
- Password change: < 1s
- Staff task load: < 2s

If slower, check:
- Network connection
- Server load
- Database size
- Browser cache

## \ud83d\udcde Support

If issues persist:
1. Check server logs
2. Check browser console
3. Verify database connection
4. Restart server
5. Clear browser cache
6. Try different browser

---

**Testing Time**: ~15 minutes for complete test
**Last Updated**: December 2024
**Status**: All features working \u2705
