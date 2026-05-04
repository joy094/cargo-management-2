// models.js

import mongoose from "mongoose";
const { Schema, model } = mongoose;

/* =====================================================
   1️⃣ Agency Model (Branch)
===================================================== */
const AgencySchema = new Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    contactPerson: String,
    mobile: String,
    address: String,
    notes: String,
  },
  { timestamps: true },
);
export const Agency = model("Agency", AgencySchema);

/* =====================================================
   2️⃣ Customer Model
===================================================== */
const CustomerSchema = new Schema(
  {
    agency: { type: Schema.Types.ObjectId, ref: "Agency", required: true },
    fullName: { type: String, required: true, trim: true },
    phoneNumber: { type: String, required: false, unique: true },
    address: String,
    nidOrPassport: String,
    notes: String,
  },
  { timestamps: true },
);
export const Customer = model("Customer", CustomerSchema);

/* =====================================================
   3️⃣ Shipment Model
===================================================== */
const shipmentSchema = new mongoose.Schema(
  {
    // সিস্টেমের নিজস্ব ইউনিক আইডি (Auto-generated)
    trackingNumber: { type: String, unique: true },

    // ক্লায়েন্টের রিকোয়ারমেন্ট অনুযায়ী নতুন ফিল্ডস
    shippingMark: { type: String, required: true },
    cartonNo: { type: String },
    productName: { type: String },
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

    // ট্র্যাকিং লজিক (চায়না ট্র্যাকিং ডুপ্লিকেট হতে পারবে)
    chinaTrackingNo: { type: String },

    receivedDate: { type: Date, default: Date.now },

    // ✅ ক্লায়েন্টের রিকোয়ারমেন্ট অনুযায়ী আপডেট করা হয়েছে
    shipmentType: {
      type: String,
      enum: ["Air", "Sea", "Hand Carry"],
      default: "Air",
    },
    originPort: { type: String }, // ✅ পোর্টের নাম (যেমন: Guangzhou, Hong Kong)

    // রিলেশনস
    customer: { type: mongoose.Schema.Types.ObjectId, ref: "Customer" },
    agency: { type: mongoose.Schema.Types.ObjectId, ref: "Agency" }, // অপশনাল রাখা হয়েছে
    batch: { type: mongoose.Schema.Types.ObjectId, ref: "Batch" },

    status: { type: String, default: "Warehouse Received" },
    totalCharge: { type: Number, default: 0 },
    paidAmount: { type: Number, default: 0 },
    notes: { type: String },
  },
  { timestamps: true },
);

export const Shipment = model("Shipment", shipmentSchema);
/* =====================================================
   4️⃣ Bank Statement Model
===================================================== */
const BankStatementSchema = new Schema(
  {
    paymentType: {
      type: String,
      enum: ["bank", "mobile", "cash"],
      required: true,
    },
    statementNo: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    bankName: String,
    mobileBank: String,
    receivedDate: { type: Date, required: true },
    totalAmount: { type: Number, required: true },
    allocatedAmount: { type: Number, default: 0 },
    isFinalized: { type: Boolean, default: false },
  },
  { timestamps: true },
);
export const BankStatement = model("BankStatement", BankStatementSchema);

/* =====================================================
   5️⃣ Payment Allocation Model
===================================================== */
const PaymentAllocationSchema = new Schema(
  {
    statement: {
      type: Schema.Types.ObjectId,
      ref: "BankStatement",
      required: true,
    },
    shipment: { type: Schema.Types.ObjectId, ref: "Shipment", required: true },
    customer: { type: Schema.Types.ObjectId, ref: "Customer", required: true },
    agency: { type: Schema.Types.ObjectId, ref: "Agency", required: true },
    amount: { type: Number, required: true },
    paymentDate: { type: Date, required: true },
  },
  { timestamps: true },
);
export const PaymentAllocation = model(
  "PaymentAllocation",
  PaymentAllocationSchema,
);

/* =====================================================
   6️⃣ Global Bank Statement Lock (FIXED)
===================================================== */
const GlobalBankStatementSchema = new Schema(
  {
    statementNo: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    paymentType: {
      type: String,
      enum: ["bank", "mobile", "cash"],
      required: true,
    },
    appSource: {
      type: String,
      enum: ["HAJJI", "UMRAH", "CARGO"],
      required: true,
    },
    linkedStatement: { type: Schema.Types.ObjectId, ref: "BankStatement" },
    totalAmount: { type: Number, required: true },
    status: { type: String, enum: ["LOCKED", "FINALIZED"], default: "LOCKED" },
  },
  { timestamps: true },
);

// Indexing
GlobalBankStatementSchema.index({ statementNo: 1 });

export const GlobalBankStatement = model(
  "GlobalBankStatement",
  GlobalBankStatementSchema,
);

/* =====================================================
   7️⃣ User Schema
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
    role: { type: String, enum: ["admin", "user"], default: "admin" },
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

export const Batch = model("Batch", BatchSchema);
