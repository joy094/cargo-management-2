//routes.js

import express from "express";
import dotenv from "dotenv";
dotenv.config();

import {
  Agency,
  Customer,
  Shipment, // নতুন মডেল
  BankStatement,
  PaymentAllocation,
  // Adjustment,
  GlobalBankStatement,
  Batch,
} from "./models.js";
import { authMiddleware, loginHandler, LOGIN_RATE_LIMIT } from "./auth.js";

const APP_SOURCE = process.env.APP_TYPE || "CARGO";
const router = express.Router();

// Auth Routes
router.post("/auth/login", LOGIN_RATE_LIMIT, loginHandler);
router.use(authMiddleware);

// সকল কাস্টমারের সামারি লিস্ট বের করা
router.get("/reports/customer-summary", async (req, res) => {
  try {
    const customers = await Customer.find();
    const summaryList = await Promise.all(
      customers.map(async (c) => {
        const shipments = await Shipment.find({ customer: c._id });

        const totalBill = shipments.reduce((sum, s) => sum + s.totalCharge, 0);
        const totalPaid = shipments.reduce((sum, s) => sum + s.paidAmount, 0);

        return {
          _id: c._id,
          name: c.fullName,
          mobile: c.phoneNumber,
          totalShipments: shipments.length,
          totalBill,
          totalPaid,
          totalDue: totalBill - totalPaid,
        };
      }),
    );
    res.json(summaryList);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* =====================================================
   কাস্টমার প্রোফাইল ও শিপমেন্ট লিস্ট এপিআই
   পাথ: GET /api/customers/:id
===================================================== */
router.get("/customers/:id", async (req, res) => {
  try {
    // ১. কাস্টমার আইডি দিয়ে কাস্টমার খুঁজবে
    const customer = await Customer.findById(req.params.id).populate("agency");

    if (!customer) {
      return res.status(404).json({ error: "কাস্টমার পাওয়া যায়নি!" });
    }

    // ২. এই কাস্টমারের অধীনে থাকা সকল শিপমেন্ট বের করবে
    const shipments = await Shipment.find({ customer: customer._id }).sort({
      createdAt: -1,
    });

    // ৩. ফ্রন্টএন্ডের ডিমান্ড অনুযায়ী ডাটা পাঠানো
    res.json({ customer, shipments });
  } catch (err) {
    console.error("Customer Profile Error:", err);
    res.status(500).json({ error: "সার্ভার এরর: ডাটা লোড করা যায়নি।" });
  }
});
/* 





=====================================================
   1️⃣ BRANCH / AGENCY CONTROLLERS
===================================================== */

router.post("/agencies", async (req, res) => {
  try {
    const agency = await Agency.create(req.body);
    res.json(agency);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get("/agencies", async (req, res) => {
  const agencies = await Agency.find();
  const result = await Promise.all(
    agencies.map(async (agency) => {
      const shipments = await Shipment.find({ agency: agency._id });
      const total = shipments.reduce((s, ship) => s + ship.totalCharge, 0);
      const paid = shipments.reduce((s, ship) => s + ship.paidAmount, 0);

      return {
        ...agency.toObject(),
        totalShipments: shipments.length,
        totalAmount: total,
        paidAmount: paid,
        dueAmount: total - paid,
      };
    }),
  );
  res.json(result);
});

/* =====================================================
   এজেন্সি/ব্রাঞ্চ প্রোফাইল দেখার রাউট (এটি যোগ করুন)
===================================================== */
router.get("/agencies/:id", async (req, res) => {
  try {
    // ১. আইডি দিয়ে এজেন্সি বা ব্রাঞ্চ খুঁজবে
    const agency = await Agency.findById(req.params.id);

    if (!agency) {
      return res.status(404).json({ error: "Branch not found" });
    }

    // ২. এই ব্রাঞ্চের অধীনে থাকা সকল শিপমেন্ট বের করবে
    // এখানে Hajji এর বদলে Shipment মডেল ব্যবহার করা হয়েছে
    const shipments = await Shipment.find({ agency: agency._id }).populate(
      "customer",
    );

    res.json({ agency, shipments }); // ফ্রন্টএন্ড এই ফরম্যাটেই ডাটা আশা করছে
  } catch (err) {
    console.error("Single Agency Fetch Error:", err);
    res.status(500).json({ error: "সার্ভার এরর: ডাটা লোড করা যায়নি।" });
  }
});

/* =====================================================
   ১. সিঙ্গেল ব্রাঞ্চ/এজেন্সি ডাটা লোড (GET /api/agencies/:id)
===================================================== */
router.get("/agencies/:id", async (req, res) => {
  try {
    const agency = await Agency.findById(req.params.id);
    if (!agency) return res.status(404).json({ error: "Branch not found" });

    // ওই ব্রাঞ্চের আন্ডারে থাকা সকল শিপমেন্ট
    const shipments = await Shipment.find({ agency: agency._id }).populate(
      "customer",
    );

    res.json({ agency, shipments });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* =====================================================
   ২. ব্রাঞ্চ লেজার রিপোর্ট (GET /api/reports/agency-ledger/:agencyId)
   (যেটি আপনার স্ক্রিনশটে ফেইল করছে)
===================================================== */
router.get("/reports/agency-ledger/:agencyId", async (req, res) => {
  try {
    const { agencyId } = req.params;

    // ওই ব্রাঞ্চের সকল পেমেন্ট অ্যালোকেশন খুঁজে বের করা
    const allocations = await PaymentAllocation.find({ agency: agencyId })
      .populate("shipment")
      .populate("customer")
      .populate("statement");

    if (!allocations.length) return res.json([]);

    const ledgerMap = {};

    allocations.forEach((a) => {
      const st = a.statement;
      if (!st) return; // স্টেটমেন্ট ডিলিট হয়ে থাকলে স্কিপ করবে

      if (!ledgerMap[st._id]) {
        ledgerMap[st._id] = {
          statementId: st._id,
          paymentType: st.paymentType,
          statementNo: st.statementNo,
          sourceName: st.bankName || st.mobileBank || "CASH",
          receivedDate: st.receivedDate,
          totalAmount: st.totalAmount,
          allocatedAmount: st.allocatedAmount,
          hajjiList: [], // ফ্রন্টএন্ড হাজি লিস্ট নামেই ডাটা আশা করছে (লজিক অনুযায়ী)
        };
      }

      ledgerMap[st._id].hajjiList.push({
        trackingNumber: a.shipment?.trackingNumber,
        name: a.customer?.fullName || "Unknown",
        amount: a.amount,
      });
    });

    res.json(Object.values(ledgerMap));
  } catch (err) {
    console.error("Ledger Error:", err);
    res.status(500).json({ error: "সার্ভার এরর: লেজার ডাটা লোড হয়নি।" });
  }
});
//update agency route
router.put("/agencies/:id", async (req, res) => {
  try {
    const updated = await Agency.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!updated) return res.status(404).json({ error: "Branch not found" });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// শিপমেন্টে এজেন্সি অ্যাসাইন করার রাউট

router.put("/shipments/bulk-assign-agency", async (req, res) => {
  try {
    const { shipmentIds, agencyId } = req.body;
    await Shipment.updateMany(
      { _id: { $in: shipmentIds } },
      { $set: { agency: agencyId } },
    );
    res.json({ success: true, message: "এজেন্সি সফলভাবে আপডেট করা হয়েছে।" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

//delete agency route
router.delete("/agencies/:id", async (req, res) => {
  try {
    const deleted = await Agency.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: "Branch not found" });
    // ঐ ব্রাঞ্চের অধীনে থাকা সকল শিপমেন্ট ডিলিট করা হবে
    await Shipment.deleteMany({ agency: req.params.id });
    res.json({ success: true, message: "Branch and its shipments deleted." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* =====================================================
   Add New Shipment (Name Cleanup লজিকসহ)
===================================================== */
router.post("/shipments", async (req, res) => {
  try {
    const { customerData, shipmentData } = req.body;

    // ১. নাম প্রসেস করা
    const rawName = customerData.fullName || ""; // এটা হলো "মাহবুব (শিপমেন্ট ২)"
    const cleanName = rawName
      .replace(/\s*\(\s*শিপমেন্ট\s*\d+\s*\)/g, "")
      .trim(); // এটা হলো "মাহবুব"

    // ২. কাস্টমার হ্যান্ডলিং (প্রোফাইলে ক্লিন নাম থাকবে)
    let customer = await Customer.findOne({
      phoneNumber: customerData.phoneNumber,
    });

    if (!customer) {
      customer = await Customer.create({
        ...customerData,
        fullName: cleanName,
        agency: shipmentData.agency,
      });
    } else {
      customer.fullName = cleanName;
      customer.agency = shipmentData.agency;
      await customer.save();
    }

    // ৩. ট্র্যাকিং নম্বর
    const trackingNumber = `TRK-${Date.now().toString().slice(-6)}`;

    // ৪. শিপমেন্ট তৈরি (এখানেই ব্র্যাকেটসহ নাম সেভ হবে)
    const shipment = await Shipment.create({
      ...shipmentData,
      customer: customer._id,
      shipmentLabel: rawName, // ✅ এখানে ব্র্যাকেটসহ নামটা হুবহু সেভ হবে
      trackingNumber,
    });

    res.json({ success: true, shipment, customer });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/* =====================================================
   Smart Excel Bulk Import (Packing List)
===================================================== */
router.post("/shipments/bulk-import", async (req, res) => {
  try {
    const { shipments, agencyId, batchId } = req.body;
    // shipments হলো ফ্রন্টএন্ড থেকে পাঠানো এক্সেল ডাটার Array

    if (!shipments || !shipments.length) {
      return res.status(400).json({ error: "কোনো ডাটা পাওয়া যায়নি!" });
    }

    const results = [];

    // প্রতিটি এক্সেল রো (Row) লুপ করে ডাটাবেজে ঢোকানো হবে
    for (const item of shipments) {
      // ১. নাম প্রসেস করা (আগের লজিকের মতো)
      const rawName = item.customerName || "Unknown";
      const cleanName = rawName
        .replace(/\s*\(\s*শিপমেন্ট\s*\d+\s*\)/g, "")
        .trim();

      // ২. কাস্টমার চেক বা তৈরি করা
      let customer = await Customer.findOne({
        phoneNumber: item.customerMobile,
      });

      if (!customer) {
        customer = await Customer.create({
          fullName: cleanName,
          phoneNumber: item.customerMobile,
          agency: agencyId,
        });
      }

      // ৩. CBM অটো-ক্যালকুলেশন (যদি এক্সেল শিটে CBM না থাকে, তবে L*W*H দিয়ে হিসাব করবে)
      let calculatedCbm = item.cbm || 0;
      if (!calculatedCbm && item.length && item.width && item.height) {
        calculatedCbm =
          (Number(item.length) * Number(item.width) * Number(item.height)) /
          1000000;
      }

      // ৪. ইউনিক লোকাল ট্র্যাকিং নম্বর জেনারেট (আপনার সিস্টেমের জন্য)
      // র্যান্ডম স্ট্রিং তৈরি করা হলো যাতে ডুপ্লিকেট না হয়
      const localTracking = `MAT-${Date.now().toString().slice(-5)}${Math.floor(10 + Math.random() * 90)}`;

      // ৫. শিপমেন্ট তৈরি
      const newShipment = await Shipment.create({
        trackingNumber: localTracking, // সিস্টেমের ইউনিক নম্বর
        chinaTrackingNo: item.trackingNumber, // এক্সেলের চায়না ট্র্যাকিং (ডুপ্লিকেট হতে পারে)
        shippingMark: item.shippingMark || "-",
        cartonNo: item.cartonNo || "-",
        productName: item.productName || "Various Items",
        quantity: Number(item.quantity) || 1,
        grossWeight: Number(item.grossWeight) || 0,
        actualWeight:
          Number(item.actualWeight) || Number(item.grossWeight) || 0,

        dimensions: {
          length: Number(item.length) || 0,
          width: Number(item.width) || 0,
          height: Number(item.height) || 0,
        },
        cbm: Number(calculatedCbm).toFixed(3),

        customer: customer._id,
        shipmentLabel: rawName,
        agency: agencyId,
        batch: batchId || null,
        receivedDate: item.receivedDate
          ? new Date(item.receivedDate)
          : new Date(),
        status: "Booked", // ডিফল্ট স্ট্যাটাস
      });

      results.push(newShipment);
    }

    res.json({
      success: true,
      count: results.length,
      message: `${results.length} টি শিপমেন্ট সফলভাবে ইম্পোর্ট হয়েছে!`,
    });
  } catch (err) {
    console.error("Bulk Import Error:", err);
    res.status(500).json({ error: "সার্ভার এরর: এক্সেল আপলোড ব্যর্থ হয়েছে।" });
  }
});

//update shipment route
// আপডেট শিপমেন্ট রাউট (Fix করা হয়েছে)
router.put("/shipments/:id", async (req, res) => {
  try {
    const { customerData, shipmentData } = req.body;

    // ১. নাম ক্লিন করার লজিক (যদি এডিট করার সময় নাম বদলানো হয়)
    const rawName = customerData.fullName || "";
    const cleanName = rawName
      .replace(/\s*\(\s*শিপমেন্ট\s*\d+\s*\)/g, "")
      .trim();

    // ২. কাস্টমার প্রোফাইল আপডেট
    const currentShipment = await Shipment.findById(req.params.id);
    if (currentShipment && currentShipment.customer) {
      await Customer.findByIdAndUpdate(currentShipment.customer, {
        fullName: cleanName,
        phoneNumber: customerData.phoneNumber,
      });
    }

    // ৩. শিপমেন্ট ডাটা আপডেট (itemName এখানে ম্যাপ করা হয়েছে)
    const updated = await Shipment.findByIdAndUpdate(
      req.params.id,
      {
        ...shipmentData, // এর ভেতর itemName, weight, boxCount সব আছে
        shipmentLabel: rawName, // লেবেল আপডেট
      },
      { new: true },
    );

    if (!updated) return res.status(404).json({ error: "Shipment not found" });
    res.json(updated);
  } catch (err) {
    console.error("Update Error:", err);
    res.status(400).json({ error: err.message });
  }
});

//delete shipment route
router.delete("/shipments/:id", async (req, res) => {
  try {
    const deleted = await Shipment.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: "Shipment not found" });
    res.json({ success: true, message: "Shipment deleted." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get All Shipments
router.get("/shipments", async (req, res) => {
  const list = await Shipment.find().populate("customer").populate("agency");
  res.json(list);
});

//auto fill customer data by phone number (for shipment form) - new route
router.get("/customers/search/:phone", async (req, res) => {
  try {
    const customer = await Customer.findOne({ phoneNumber: req.params.phone });
    if (customer) {
      // এই কাস্টমারের মোট কয়টি শিপমেন্ট আছে তা গুনে দেখা
      const shipmentCount = await Shipment.countDocuments({
        customer: customer._id,
      });

      res.json({
        ...customer.toObject(),
        nextShipmentNumber: shipmentCount + 1, // পরবর্তী শিপমেন্ট নম্বর
      });
    } else {
      res.status(404).json({ message: "New Customer", nextShipmentNumber: 1 });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* =====================================================
   3️⃣ PAYMENT ALLOCATION (With Duplicate Filter)
===================================================== */

router.post("/payments/allocate", async (req, res) => {
  try {
    const {
      paymentType,
      statementNo,
      bankName,
      totalAmount,
      allocations, // [{ shipmentId, amount }]
      receivedDate,
    } = req.body;

    // --- ডুপ্লিকেট চেক (Global Lock) ---
    const normalizedStatement = statementNo.trim().toUpperCase();
    const lockExists = await GlobalBankStatement.findOne({
      statementNo: normalizedStatement,
    });

    if (lockExists) {
      return res.status(400).json({
        error: `এই স্টেটমেন্ট নম্বরটি ইতিমধ্যে ${lockExists.appSource} সিস্টেমে ব্যবহার করা হয়েছে।`,
      });
    }

    // --- ব্যাংক স্টেটমেন্ট তৈরি ---
    const statement = await BankStatement.create({
      paymentType,
      statementNo: normalizedStatement,
      bankName: bankName || "CASH",
      totalAmount,
      receivedDate: new Date(receivedDate),
    });

    // --- গ্লোবাল লক সেট করা ---
    await GlobalBankStatement.create({
      statementNo: normalizedStatement,
      paymentType,
      appSource: APP_SOURCE,
      linkedStatement: statement._id,
      totalAmount,
      status: "FINALIZED",
    });

    let totalAllocated = 0;

    // --- অ্যালোকেশন লুপ ---
    for (const item of allocations) {
      const shipment = await Shipment.findById(item.shipmentId);
      if (!shipment) continue;

      const amount = parseFloat(item.amount);

      await PaymentAllocation.create({
        statement: statement._id,
        shipment: shipment._id, // কারগোতে শিপমেন্ট আইডি দরকার
        customer: shipment.customer,
        agency: shipment.agency,
        amount,
        paymentDate: new Date(receivedDate),
      });

      // শিপমেন্টে পেইড অ্যামাউন্ট আপডেট
      shipment.paidAmount += amount;
      await shipment.save();
      totalAllocated += amount;
    }

    statement.allocatedAmount = totalAllocated;
    statement.isFinalized = true;
    await statement.save();

    res.json({ success: true, message: "পেমেন্ট সফলভাবে এন্ট্রি করা হয়েছে।" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* =====================================================
   4️⃣ REPORTS (Cargo Focused)
===================================================== */

// Shipment Ledger
router.get("/reports/shipment-ledger/:id", async (req, res) => {
  try {
    const shipment = await Shipment.findById(req.params.id)
      .populate("customer")
      .populate("agency");

    if (!shipment)
      return res.status(404).json({ error: "শিপমেন্ট পাওয়া যায়নি।" });

    const payments = await PaymentAllocation.find({
      shipment: shipment._id,
    }).populate("statement");

    res.json({ shipment, payments });
  } catch (err) {
    res.status(500).json({ error: "ডাটা লোড করতে সমস্যা হয়েছে।" });
  }
});

/* =====================================================
   5️⃣ DELETE & ROLLBACK (Strict Logic)
===================================================== */

router.delete("/statements/:id", async (req, res) => {
  try {
    const statement = await BankStatement.findById(req.params.id);
    if (!statement) return res.status(404).json({ error: "স্টেটমেন্ট নেই।" });

    const allocations = await PaymentAllocation.find({
      statement: statement._id,
    });

    // শিপমেন্ট পেমেন্ট রোলব্যাক
    for (const alloc of allocations) {
      await Shipment.findByIdAndUpdate(alloc.shipment, {
        $inc: { paidAmount: -alloc.amount },
      });
    }

    await PaymentAllocation.deleteMany({ statement: statement._id });
    await GlobalBankStatement.findOneAndDelete({
      statementNo: statement.statementNo,
    });
    await BankStatement.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: "স্টেটমেন্ট এবং পেমেন্ট রোলব্যাক করা হয়েছে।",
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Recent Payments Route
router.get("/payments/recent", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10; // Default to 10 recent payments
    const recentPayments = await PaymentAllocation.find()
      .populate("shipment")
      .populate("customer")
      .populate("agency")
      .populate("statement")
      .sort({ paymentDate: -1 })
      .limit(limit);

    res.json(recentPayments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ শুধু ওজন আপডেট করার জন্য স্পেশাল রাউট
router.put("/shipments/:id/weight", async (req, res) => {
  try {
    const { actualWeight } = req.body;
    await Shipment.findByIdAndUpdate(req.params.id, { actualWeight });
    res.json({ success: true, message: "ওজন আপডেট হয়েছে" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
