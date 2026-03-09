# 🚀 QUICK START - ORDER CREATION

## ⚡ 30-SECOND TEST

```bash
# 1. Start server
node server.js

# 2. Create test orders (in new terminal)
CREATE_TEST_ORDERS.bat

# 3. Open browser
http://localhost:3000

# 4. Login
Username: admin
Password: sapthala@2029

# 5. Check Orders tab
✅ Should see 8 new orders (2 per branch)
```

---

## 📝 CREATE ORDER MANUALLY

### **Step 1: Customer Info** (Required)
- Name: Customer full name
- Phone: 10-digit number
- Address: Full address
- Branch: Select from dropdown

### **Step 2: Select Garment** (Required)
1. Click category (Men/Women/Kids/etc.)
2. If Kids, select Boys/Girls
3. Click garment card
4. See price auto-fill

### **Step 3: Measurements** (Required)
- Enter all measurements shown
- Use short codes (C=Chest, W=Waist, etc.)
- Values in inches

### **Step 4: Design** (Required)
- Description: Detailed design notes
- Images: Upload 1-5 reference images (optional)
- Special notes: Any additional requirements

### **Step 5: Pricing** (Auto-calculated)
- Base Price: Auto-filled from garment
- Add-ons: Select if needed
- Other Expenses: Enter if any
- Discount: Max 15% allowed
- Advance: Enter amount paid
- Balance: Auto-calculated

### **Step 6: Workflow** (Pre-selected)
- Default stages already selected
- Add optional stages if needed:
  - Khakha
  - Maggam
  - Painting

### **Step 7: Delivery Date** (Required)
- Select future date
- Minimum: Tomorrow

### **Step 8: Submit**
- Click "Create Order & Send to Staff"
- Wait for success message
- Order appears in Orders tab

---

## 🎯 QUICK VALIDATION

Before clicking Create Order, verify:
- ✅ Customer name entered
- ✅ Phone number (10 digits)
- ✅ Branch selected
- ✅ Garment selected
- ✅ Design description entered
- ✅ Delivery date selected
- ✅ Advance payment entered
- ✅ At least one workflow stage selected

---

## 🔍 VERIFY ORDER CREATED

1. **Success Message Shows:**
   - Order ID
   - Customer details
   - Pricing summary
   - Workflow stages

2. **Orders Tab:**
   - New order appears at top
   - Status: Pending
   - Correct branch
   - Correct amount

3. **Staff Portal:**
   - Staff can see task
   - Task status: Pending
   - Can accept task

---

## 📊 TEST ALL BRANCHES

### **SAPTHALA.MAIN**
- Location: Main Branch, Hyderabad
- Test with: Business Shirt (₹1200)

### **SAPTHALA.KPHB**
- Location: KPHB, Hyderabad
- Test with: Wedding Sherwani (₹3500)

### **SAPTHALA.JNTU**
- Location: JNTU, Hyderabad
- Test with: Formal Trouser (₹1000)

### **SAPTHALA.ECIL**
- Location: ECIL, Hyderabad
- Test with: Men Kurta (₹800)

---

## 🐛 COMMON ISSUES

### **"Please select a branch"**
→ Select branch from dropdown at top

### **"Please select a garment"**
→ Click category, then click garment card

### **"Please enter design description"**
→ Fill in design description field

### **"Please select delivery date"**
→ Click calendar and select future date

### **"Please enter advance payment"**
→ Enter amount in advance payment field

### **"Discount cannot exceed 15%"**
→ Reduce discount percentage to 15% or less

### **"Advance cannot be more than total"**
→ Reduce advance to be less than total amount

---

## ✅ SUCCESS INDICATORS

You'll know it worked when:
1. ✅ Success message displays with order ID
2. ✅ Form resets to blank
3. ✅ Order appears in Orders tab
4. ✅ Dashboard stats update
5. ✅ Staff can see task in their portal

---

## 📞 QUICK HELP

**Browser Console (F12):**
- Check for error messages
- Look at Network tab for failed requests

**Server Terminal:**
- Look for "Order created successfully"
- Check for any error messages

**Database:**
- Orders collection should have new entry
- Customer collection should update

---

## 🎉 READY TO GO!

The order creation system is now:
- ✅ Fully functional
- ✅ Validated and tested
- ✅ Working across all 4 branches
- ✅ Ready for production use

**Start creating orders now!** 🚀
