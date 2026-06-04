// models.js

import mongoose from "mongoose";
const { Schema, model } = mongoose;

const branchSchema = new Schema(
  {
    branchName: {
      type: String,
      required: true,
      trim: true,
    },
    // 🔥 ১. shippingMark কে shippingMarks (Array) করা হলো
    shippingMarks: {
      type: [
        {
          type: String,
          uppercase: true,
          trim: true,
        },
      ],
      validate: [
        (val) => val.length > 0,
        "অন্তত একটি শিপিং মার্ক দেওয়া আবশ্যক!",
      ],
    },
    phone: {
      type: String,
      trim: true,
      default: null, // 🔥 ২. "" এর বদলে null দেওয়া হলো
      sparse: true, // 🔥 ৩. sparse দিলে যাদের ফোন নাম্বার নেই, তাদের duplicate error আসবে না
    },
    address: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    timestamps: true,
  },
);

// 🔥 ৪. এই ইনডেক্সটি নিশ্চিত করবে যে একটি শিপিং মার্ক অন্য কোনো ব্রাঞ্চ ব্যবহার করতে পারবে না
branchSchema.index({ shippingMarks: 1 }, { unique: true });

export const Branch = model("Branch", branchSchema);

/* =====================================================
   3️⃣ Shipment Model (Updated with Exception Handling)
===================================================== */
const shipmentSchema = new mongoose.Schema(
  {
    // সিস্টেমের নিজস্ব ইউনিক আইডি (Auto-generated)
    trackingNumber: { type: String, unique: true },

    // ক্লায়েন্টের রিকোয়ারমেন্ট অনুযায়ী ফিল্ডস
    shippingMark: { type: String, required: true },
    cartonNo: { type: String },
    productName: { type: String },
    productNameCn: { type: String, default: "" }, // 🇨🇳 নতুন ফিল্ড
    quantity: { type: Number, default: 1 },
    grossWeight: { type: Number }, // চায়না থেকে আসা ওজন
    actualWeight: { type: Number }, // অফিসে মাপা ওজন

    // ডাইমেনশন ও CBM
    dimensions: {
      length: { type: Number, default: 0 },
      width: { type: Number, default: 0 },
      height: { type: Number, default: 0 },
    },
    cbm: { type: Number, default: 0 },

    // ট্র্যাকিং লজিক
    chinaTrackingNo: { type: String },
    receivedDate: { type: Date, default: Date.now },

    shipmentType: {
      type: String,
      enum: ["Air", "Sea", "Hand Carry"],
      default: "Air",
    },
    originPort: { type: String },

    // মাস্টার কার্টন ও সাব-কার্টন লজিক
    isMasterCarton: { type: Boolean, default: false },
    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shipment",
      default: null,
    },

    // রিলেশনস
    // customer: { type: mongoose.Schema.Types.ObjectId, ref: "Customer" },
    // agency: { type: mongoose.Schema.Types.ObjectId, ref: "Agency" },
    batch: { type: mongoose.Schema.Types.ObjectId, ref: "Batch" },

    // 🔴 স্ট্যাটাস এবং নতুন এক্সেপশন (Hold) লজিক
    status: { type: String, default: "Warehouse Received" },

    // ✅ নতুন যুক্ত করা ফিল্ড: Hybrid Exception Handling এর জন্য
    isHeld: { type: Boolean, default: false }, // ট্রু থাকলে ব্যাচ স্ট্যাটাসের সাথে এটি পরিবর্তন হবে না
    exceptionStatus: {
      type: String,
      enum: ["Normal", "Customs Hold", "Flight Offload", "Missing", "Damaged"],
      default: "Normal",
    },

    totalCharge: { type: Number, default: 0 },
    paidAmount: { type: Number, default: 0 },
    notes: { type: String },

    // বিলিং সম্পর্কিত ফিল্ডস
    isBilled: { type: Boolean, default: false },
    perKgRate: { type: Number, default: 0 },
    totalBill: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    transportBill: { type: Number, default: 0 }, // 🔥 নতুন এই লাইনটি যুক্ত করুন
    billingDate: { type: Date },
    invoiceId: { type: String },

    // Shipment Schema এর ভেতরে এই ফিল্ডগুলো যোগ করুন
    category: { type: String, default: "By Air" }, // By Sea, By Air, Hand Carry, HONG KONG PRODUCT
    customerName: { type: String }, // অটো-ফিল হওয়া নাম সেভ করার জন্য
    packagingCost: { type: Number, default: 0 },
    receivingCost: { type: Number, default: 0 },
    note: { type: String },
  },
  { timestamps: true },
);

export const Shipment = model("Shipment", shipmentSchema);

//* =====================================================
// 6️⃣ Payment Model (UPDATED)
//* =====================================================

const PaymentSchema = new Schema(
  {
    shippingMark: {
      type: String,
      required: true,
      index: true, // দ্রুত সার্চ করার জন্য ইনডেক্সিং
    },
    type: {
      type: String,
      enum: ["PAYMENT", "DISCOUNT", "ADJUSTMENT"],
      required: true,
      default: "PAYMENT",
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    paymentMethod: {
      type: String,
      enum: ["CASH", "BKASH", "NAGAD", "BANK_TRANSFER", "CHECK"],
      default: "CASH",
    },
    transactionId: {
      type: String,
      unique: true, // সিকিউরিটি: একই ট্রানজেকশন আইডি দ্বিতীয়বার বসানো যাবে না
      sparse: true, // ক্যাশ পেমেন্টের ক্ষেত্রে যদি আইডি না থাকে তবে এরর দেবে না
    },
    date: {
      type: Date,
      default: Date.now,
    },
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // কোন স্টাফ পেমেন্টটি রিসিভ করল তা ট্র্যাক রাখার জন্য
    },
    remarks: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true },
);

// ডুপ্লিকেট ফিল্টারিং লজিক (Composite Unique Key)
// এটি নিশ্চিত করবে যে একই মার্কের অধীনে একই পরিমাণ টাকা এবং একই দিনে ভুল করে দুবার এন্ট্রি না হয়
PaymentSchema.index({ shippingMark: 1, amount: 1, date: 1 }, { unique: false });
export const Payment = model("Payment", PaymentSchema);

/* =====================================================
   ৭ (ক). Role Schema (ক্ষমতা ও পারমিশন)
===================================================== */
const RoleSchema = new Schema(
  {
    roleName: { type: String, required: true, unique: true, trim: true }, // যেমন: "China Admin", "Cashier"
    permissions: {
      batch: { view: Boolean, create: Boolean, edit: Boolean, delete: Boolean },
      shipment: {
        view: Boolean,
        create: Boolean,
        edit: Boolean,
        delete: Boolean,
      },
      // 🔥 Branch আপডেট করা হলো
      branch: {
        view: Boolean,
        create: Boolean,
        edit: Boolean,
        delete: Boolean,
      },
      billing: { view: Boolean, create: Boolean, revert: Boolean },
      // 🔥 Payment নতুন যোগ করা হলো
      payment: {
        view: Boolean,
        create: Boolean,
        delete: Boolean,
      },
    },
  },
  { timestamps: true },
);
export const Role = model("Role", RoleSchema);

/* =====================================================
   ৭ (খ). User Schema (কর্মচারী/অ্যাডমিন)
===================================================== */
const UserSchema = new Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: { type: String, required: true },

    // 🔥 নতুন RBAC রিলেশন এবং এক্সেস কন্ট্রোল
    role: { type: Schema.Types.ObjectId, ref: "Role", default: null }, // Role এর সাথে লিংক
    isSuperAdmin: { type: Boolean, default: false }, // সুপার অ্যাডমিন কি না
    isActive: { type: Boolean, default: true }, // চাকরি ছাড়লে false করে দেবেন

    // আপনার আগের চমৎকার সিকিউরিটি সিস্টেম
    failedLoginAttempts: { type: Number, default: 0 },
    lockUntil: { type: Date, default: null },
  },
  { timestamps: true },
);

UserSchema.virtual("isLocked").get(function () {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

export const User = model("User", UserSchema);

//Batch
/* =====================================================
   8️⃣ Batch Model (UPDATED)
===================================================== */
const BatchSchema = new mongoose.Schema(
  {
    batchName: { type: String, required: true, unique: true }, // উদাহরণ: MAY-20-DXB
    flightNumber: { type: String },
    flightDate: { type: Date },

    // ✅ নতুন যুক্ত করা রুট এবং পোর্ট (Shipment মডেলের সাথে মিল রেখে)
    shipmentType: {
      type: String,
      enum: ["Air", "Sea", "Hand Carry"],
      default: "Air",
    },
    originPort: { type: String },
    destination: { type: String },

    // ✅ আপডেট করা ৮টি কার্গো লাইফ-সাইকেল স্টেজ
    status: {
      type: String,
      enum: [
        "Warehouse Received",
        "Processing",
        "Ready to Ship",
        "Dispatched",
        "In-Transit",
        "Customs Clearing",
        "Arrived",
        "Delivered",
      ],
      default: "Warehouse Received",
    },
    notes: { type: String },
  },
  { timestamps: true },
);

/* =====================================================
   2️⃣ Customer Model
===================================================== */
// const CustomerSchema = new Schema(
//   {
//     agency: { type: Schema.Types.ObjectId, ref: "Agency", required: true },
//     fullName: { type: String, required: true, trim: true },
//     phoneNumber: { type: String, required: false, unique: true },
//     address: String,
//     nidOrPassport: String,
//     notes: String,
//   },
//   { timestamps: true },
// );
// export const Customer = model("Customer", CustomerSchema);

/* =====================================================
   1️⃣ Agency Model (Branch)
===================================================== */
// const AgencySchema = new Schema(
//   {
//     name: { type: String, required: true, unique: true, trim: true },
//     contactPerson: String,
//     mobile: String,
//     address: String,
//     notes: String,
//   },
//   { timestamps: true },
// );
// export const Agency = model("Agency", AgencySchema);

/* =====================================================
   4️⃣ Bank Statement Model
===================================================== */
// const BankStatementSchema = new Schema(
//   {
//     paymentType: {
//       type: String,
//       enum: ["bank", "mobile", "cash"],
//       required: true,
//     },
//     statementNo: {
//       type: String,
//       required: true,
//       unique: true,
//       uppercase: true,
//       trim: true,
//     },
//     bankName: String,
//     mobileBank: String,
//     receivedDate: { type: Date, required: true },
//     totalAmount: { type: Number, required: true },
//     allocatedAmount: { type: Number, default: 0 },
//     isFinalized: { type: Boolean, default: false },
//   },
//   { timestamps: true },
// );
// export const BankStatement = model("BankStatement", BankStatementSchema);

/* =====================================================
   5️⃣ Payment Allocation Model
===================================================== */
// const PaymentAllocationSchema = new Schema(
//   {
//     statement: {
//       type: Schema.Types.ObjectId,
//       ref: "BankStatement",
//       required: true,
//     },
//     shipment: { type: Schema.Types.ObjectId, ref: "Shipment", required: true },
//     customer: { type: Schema.Types.ObjectId, ref: "Customer", required: true },
//     agency: { type: Schema.Types.ObjectId, ref: "Agency", required: true },
//     amount: { type: Number, required: true },
//     paymentDate: { type: Date, required: true },
//   },
//   { timestamps: true },
// );
// export const PaymentAllocation = model(
//   "PaymentAllocation",
//   PaymentAllocationSchema,
// );

/* =====================================================
   6️⃣ Global Bank Statement Lock (FIXED)
===================================================== */
// const GlobalBankStatementSchema = new Schema(
//   {
//     statementNo: {
//       type: String,
//       required: true,
//       unique: true,
//       uppercase: true,
//       trim: true,
//     },
//     paymentType: {
//       type: String,
//       enum: ["bank", "mobile", "cash"],
//       required: true,
//     },
//     appSource: {
//       type: String,
//       enum: ["HAJJI", "UMRAH", "CARGO"],
//       required: true,
//     },
//     linkedStatement: { type: Schema.Types.ObjectId, ref: "BankStatement" },
//     totalAmount: { type: Number, required: true },
//     status: { type: String, enum: ["LOCKED", "FINALIZED"], default: "LOCKED" },
//   },
//   { timestamps: true },
// );

// Indexing
// GlobalBankStatementSchema.index({ statementNo: 1 });

// export const GlobalBankStatement = model(
//   "GlobalBankStatement",
//   GlobalBankStatementSchema,
// );

export const Batch = model("Batch", BatchSchema);
