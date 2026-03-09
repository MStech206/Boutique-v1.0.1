# 📊 SAPTHALA BOUTIQUE - COMPLETE WORKFLOW

## 🔄 Order Creation Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    ADMIN CREATES ORDER                       │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  STEP 1: Customer Information                                │
│  ├─ Name (Required)                                          │
│  ├─ Phone (Required)                                         │
│  ├─ Address (Optional)                                       │
│  └─ Branch Selection (Required)                              │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  STEP 2: Category & Garment Selection                        │
│  ├─ Select Category:                                         │
│  │  ├─ Men's Collection (6 items)                            │
│  │  ├─ Women's Collection (15 items)                         │
│  │  ├─ Kids Collection → Boys (4) / Girls (6)                │
│  │  ├─ Fitting Services (4 items)                            │
│  │  ├─ Ready-Made (4 items)                                  │
│  │  └─ Redo Orders (6 services)                              │
│  │                                                            │
│  └─ Select Garment:                                          │
│     ├─ View Image                                            │
│     ├─ See Price                                             │
│     └─ Check Measurements Required                           │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  STEP 3: Measurements & Design                               │
│  ├─ Enter Measurements (auto-generated fields)               │
│  ├─ Design Description (Required)                            │
│  ├─ Special Notes (Optional)                                 │
│  └─ Upload Images (Max 5, 5MB each)                          │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  STEP 4: Pricing & Payment                                   │
│  ├─ Base Price (Auto-filled)                                 │
│  ├─ Add-on Services:                                         │
│  │  ├─ Fall & Pico (+₹150)                                   │
│  │  ├─ Saree Knots (+₹500)                                   │
│  │  ├─ Can-Can Extra (+₹500)                                 │
│  │  └─ Custom Add-on (Variable)                              │
│  ├─ Other Expenses (Manual entry)                            │
│  ├─ Subtotal (Calculated)                                    │
│  ├─ Discount (Optional, Max 15%)                             │
│  │  ├─ By Percentage                                         │
│  │  └─ By Amount                                             │
│  ├─ Total Amount (Calculated)                                │
│  ├─ Advance Payment (Required)                               │
│  └─ Balance Due (Calculated)                                 │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  STEP 5: Workflow & Delivery                                 │
│  ├─ Select Workflow Stages:                                  │
│  │  ├─ ☑ Dyeing (Default)                                    │
│  │  ├─ ☑ Cutting (Default)                                   │
│  │  ├─ ☑ Stitching (Default)                                 │
│  │  ├─ ☐ Khakha (Optional)                                   │
│  │  ├─ ☐ Maggam (Optional)                                   │
│  │  ├─ ☐ Painting (Optional)                                 │
│  │  ├─ ☑ Finishing (Default)                                 │
│  │  ├─ ☑ Quality Check (Default)                             │
│  │  └─ ☑ Ready to Deliver (Default)                          │
│  │                                                            │
│  └─ Delivery Date (Required, Future date)                    │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  STEP 6: Create Order                                        │
│  ├─ Validate all fields                                      │
│  ├─ Generate Order ID                                        │
│  ├─ Save to MongoDB                                          │
│  ├─ Sync to Firebase                                         │
│  ├─ Create workflow tasks                                    │
│  ├─ Assign to branch staff                                   │
│  ├─ Send notifications                                       │
│  └─ Generate PDF                                             │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    ORDER CREATED ✅                          │
│  ├─ Order ID: ORD-1234567890                                 │
│  ├─ Status: Pending                                          │
│  ├─ First Task: Pending (awaiting staff acceptance)          │
│  └─ Notifications sent to staff                              │
└─────────────────────────────────────────────────────────────┘
```

## 👥 Staff Workflow

```
┌─────────────────────────────────────────────────────────────┐
│                  STAFF RECEIVES ORDER                        │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  STAFF PORTAL - Available Tasks                              │
│  ├─ View order details                                       │
│  ├─ Check measurements                                       │
│  ├─ See design notes                                         │
│  └─ View images                                              │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  STAFF ACCEPTS TASK                                          │
│  ├─ Task status: Pending → Assigned                          │
│  ├─ Staff assigned to order                                  │
│  └─ Task appears in "My Tasks"                               │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  STAFF STARTS WORK                                           │
│  ├─ Task status: Assigned → In Progress                      │
│  ├─ Timer starts                                             │
│  └─ Can add notes/images                                     │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  STAFF COMPLETES TASK                                        │
│  ├─ Task status: In Progress → Completed                     │
│  ├─ Time recorded                                            │
│  ├─ Quality rating (optional)                                │
│  └─ Final notes/images                                       │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  AUTOMATIC PROGRESSION                                       │
│  ├─ Next stage activated                                     │
│  ├─ Next staff notified                                      │
│  └─ Order progress updated                                   │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  REPEAT FOR ALL STAGES                                       │
│  Dyeing → Cutting → Stitching → ... → Ready to Deliver       │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  ORDER COMPLETED ✅                          │
│  ├─ All tasks completed                                      │
│  ├─ Status: Completed                                        │
│  ├─ Ready for delivery                                       │
│  └─ Customer notified                                        │
└─────────────────────────────────────────────────────────────┘
```

## 🏢 Branch-wise Assignment

```
┌─────────────────────────────────────────────────────────────┐
│              ORDER CREATED IN KPHB BRANCH                    │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  SYSTEM CHECKS BRANCH STAFF                                  │
│  ├─ Branch: SAPTHALA.KPHB                                    │
│  ├─ Required stages: Dyeing, Cutting, Stitching, etc.        │
│  └─ Find staff for each stage in KPHB branch                 │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  STAFF ASSIGNMENT                                            │
│  ├─ Dyeing: SAPTHALA_KPHB_dyeing                             │
│  ├─ Cutting: SAPTHALA_KPHB_cutting                           │
│  ├─ Stitching: SAPTHALA_KPHB_stitching                       │
│  ├─ Finishing: SAPTHALA_KPHB_finishing                       │
│  ├─ Quality Check: SAPTHALA_KPHB_quality-check               │
│  └─ Ready to Deliver: SAPTHALA_KPHB_ready-to-deliver         │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  NOTIFICATIONS SENT                                          │
│  ├─ First staff (Dyeing) receives immediate notification     │
│  ├─ Other staff notified when their turn comes               │
│  └─ All notifications branch-specific                        │
└─────────────────────────────────────────────────────────────┘
```

## 📊 Calculation Flow

```
┌─────────────────────────────────────────────────────────────┐
│                  PRICING CALCULATION                         │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  BASE PRICE                                                  │
│  Garment selected: Silk Kurthi                               │
│  Base Price: ₹850                                            │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  ADD-ON SERVICES                                             │
│  ├─ Fall & Pico: +₹150                                       │
│  ├─ Saree Knots: +₹0 (not selected)                          │
│  ├─ Can-Can: +₹0 (not selected)                              │
│  └─ Custom: +₹0 (not selected)                               │
│  Total Add-ons: ₹150                                         │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  OTHER EXPENSES                                              │
│  Manual entry: ₹100                                          │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  SUBTOTAL                                                    │
│  Base (₹850) + Add-ons (₹150) + Other (₹100) = ₹1100        │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  DISCOUNT (Optional)                                         │
│  ├─ Discount enabled: Yes                                    │
│  ├─ Discount type: Percentage                                │
│  ├─ Discount value: 10%                                      │
│  └─ Discount amount: ₹110 (10% of ₹1100)                     │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  TOTAL AMOUNT                                                │
│  Subtotal (₹1100) - Discount (₹110) = ₹990                   │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  ADVANCE PAYMENT                                             │
│  Customer pays: ₹500                                         │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  BALANCE DUE                                                 │
│  Total (₹990) - Advance (₹500) = ₹490                        │
└─────────────────────────────────────────────────────────────┘
```

## 📈 Reports Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    ADMIN OPENS REPORTS                       │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  FILTER OPTIONS                                              │
│  ├─ Branch: KPHB                                             │
│  ├─ Date Range: Last 7 days                                  │
│  ├─ Filter By: Customer Name                                 │
│  └─ Search: "Test Customer"                                  │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  SYSTEM QUERIES DATABASE                                     │
│  ├─ MongoDB query with filters                               │
│  ├─ Firebase sync check                                      │
│  └─ Data aggregation                                         │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  REPORT DISPLAY                                              │
│  ├─ Order list with details                                  │
│  ├─ Progress percentage                                      │
│  ├─ Assigned staff                                           │
│  ├─ Amount details                                           │
│  └─ Status indicators                                        │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  EXPORT OPTIONS                                              │
│  ├─ Download CSV                                             │
│  └─ Download PDF                                             │
└─────────────────────────────────────────────────────────────┘
```

## 🔥 Firebase Sync Flow

```
┌─────────────────────────────────────────────────────────────┐
│                  ORDER CREATED IN MONGODB                    │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  FIREBASE SYNC TRIGGERED                                     │
│  ├─ Check Firebase connection                                │
│  ├─ Prepare order data                                       │
│  └─ Format for Firestore                                     │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  WRITE TO FIRESTORE                                          │
│  ├─ Collection: orders                                       │
│  ├─ Document ID: Order ID                                    │
│  └─ Data: Complete order object                              │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  REAL-TIME UPDATES                                           │
│  ├─ Staff app listens to Firestore                           │
│  ├─ Receives instant notification                            │
│  └─ Updates UI automatically                                 │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  BIDIRECTIONAL SYNC                                          │
│  ├─ Staff updates → Firestore → MongoDB                      │
│  ├─ Admin updates → MongoDB → Firestore                      │
│  └─ Always in sync                                           │
└─────────────────────────────────────────────────────────────┘
```

## ✅ Success Indicators

```
┌─────────────────────────────────────────────────────────────┐
│  ✅ Order Created                                            │
│  ├─ Order ID generated                                       │
│  ├─ Saved to MongoDB                                         │
│  ├─ Synced to Firebase                                       │
│  └─ Success message displayed                                │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  ✅ Staff Notified                                           │
│  ├─ Notification sent                                        │
│  ├─ Task appears in staff portal                             │
│  └─ Staff can accept task                                    │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  ✅ Reports Working                                          │
│  ├─ Order appears in reports                                 │
│  ├─ Filters work correctly                                   │
│  └─ Exports generate successfully                            │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  ✅ Calculations Accurate                                    │
│  ├─ All prices calculated correctly                          │
│  ├─ Discount applied properly                                │
│  └─ Balance matches expected                                 │
└─────────────────────────────────────────────────────────────┘
```

---

**This workflow ensures:**
- ✅ Complete order lifecycle management
- ✅ Branch-wise staff assignment
- ✅ Real-time notifications
- ✅ Accurate calculations
- ✅ Comprehensive reporting
- ✅ Firebase synchronization
- ✅ End-to-end tracking

**Status: FULLY OPERATIONAL** 🎉
