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
    phoneNumber: { type: String, required: true, unique: true },
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
const ShipmentSchema = new Schema(
  {
    trackingNumber: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
    },
    customer: { type: Schema.Types.ObjectId, ref: "Customer", required: true },
    agency: { type: Schema.Types.ObjectId, ref: "Agency", required: true },
    receiverName: { type: String, required: true },
    receiverMobile: { type: String },
    receiverAddress: String,
    shipmentLabel: {
      type: String,
      required: true,
    },

    itemName: { type: String, required: true },
    weight: { type: Number, default: 0 },
    boxCount: { type: Number, default: 1 },
    shippingMark: { type: String,
      trim:true,
      default:""
      


     },
    shipmentType: {
      type: String,
      enum: ["Air", "Sea", "Road"],
      default: "Air",
    },
    totalCharge: { type: Number, required: true },
    paidAmount: { type: Number, default: 0 },
    status: {
      type: String,
      enum: [
        "Booked",
        "In-Transit",
        "Received-at-Warehouse",
        "Out-for-Delivery",
        "Delivered",
        "Cancelled",
      ],
      default: "Booked",
    },

    batch: { type: mongoose.Schema.Types.ObjectId, ref: "Batch" },
    deliveryDate: Date,
    notes: String,
  },
  { timestamps: true },
);
export const Shipment = model("Shipment", ShipmentSchema);

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
const BatchSchema = new mongoose.Schema(
  {
    batchName: { type: String, required: true, unique: true }, // উদাহরণ: DXB-FLIGHT-001
    flightNumber: { type: String },
    flightDate: { type: Date },
    destination: { type: String },
    status: {
      type: String,
      enum: ["Draft", "Loaded", "In-Transit", "Arrived", "Released"],
      default: "Draft",
    },
    notes: { type: String },
  },
  { timestamps: true },
);

export const Batch = mongoose.model("Batch", BatchSchema);
