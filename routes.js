// routes.js

import express from "express";
import dotenv from "dotenv";
dotenv.config();

import {
  Agency,
  Customer,
  Shipment,
  BankStatement,
  PaymentAllocation,
  GlobalBankStatement,
  Batch,
} from "./models.js";
import { authMiddleware, loginHandler, LOGIN_RATE_LIMIT } from "./auth.js";

const APP_SOURCE = process.env.APP_TYPE || "CARGO";
const router = express.Router();

// --- Auth Routes ---
router.post("/auth/login", LOGIN_RATE_LIMIT, loginHandler);
router.use(authMiddleware);

/* =====================================================
   📊 REPORTS & SUMMARIES
===================================================== */

// সকল কাস্টমারের সামারি লিস্ট (Shipping Mark ও ডিউ ব্যালেন্সসহ)
router.get("/reports/customer-summary", async (req, res) => {
  try {
    const customers = await Customer.find();
    const summaryList = await Promise.all(
      customers.map(async (c) => {
        const shipments = await Shipment.find({ customer: c._id });

        const totalBill = shipments.reduce(
          (sum, s) => sum + (s.totalCharge || 0),
          0,
        );
        const totalPaid = shipments.reduce(
          (sum, s) => sum + (s.paidAmount || 0),
          0,
        );

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

// কাস্টমার প্রোফাইল ও শিপমেন্ট লিস্ট
router.get("/customers/:id", async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id).populate("agency");
    if (!customer)
      return res.status(404).json({ error: "কাস্টমার পাওয়া যায়নি!" });

    const shipments = await Shipment.find({ customer: customer._id }).sort({
      createdAt: -1,
    });
    res.json({ customer, shipments });
  } catch (err) {
    res.status(500).json({ error: "ডাটা লোড করা যায়নি।" });
  }
});

/* =====================================================
   🏢 BRANCH / AGENCY CONTROLLERS
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
  try {
    const agencies = await Agency.find();
    const result = await Promise.all(
      agencies.map(async (agency) => {
        const shipments = await Shipment.find({ agency: agency._id });
        const total = shipments.reduce(
          (s, ship) => s + (ship.totalCharge || 0),
          0,
        );
        const paid = shipments.reduce(
          (s, ship) => s + (ship.paidAmount || 0),
          0,
        );

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
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ব্রাঞ্চ ডিটেইলস (লিস্ট অব শিপমেন্টসহ)
router.get("/agencies/:id", async (req, res) => {
  try {
    const agency = await Agency.findById(req.params.id);
    if (!agency) return res.status(404).json({ error: "Branch not found" });

    const shipments = await Shipment.find({ agency: agency._id }).populate(
      "customer",
    );
    res.json({ agency, shipments });
  } catch (err) {
    res.status(500).json({ error: "ডাটা লোড করা যায়নি।" });
  }
});

router.put("/agencies/:id", async (req, res) => {
  try {
    const updated = await Agency.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete("/agencies/:id", async (req, res) => {
  try {
    const deleted = await Agency.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: "Branch not found" });
    await Shipment.deleteMany({ agency: req.params.id });
    res.json({ success: true, message: "Branch and its shipments deleted." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* =====================================================
   ✈️ BATCH / FLIGHT CONTROLLERS
===================================================== */

router.get("/batches", async (req, res) => {
  try {
    const batches = await Batch.find().sort({ createdAt: -1 });
    // প্রতিটি ব্যাচে কয়টি শিপমেন্ট আছে তা গুনে পাঠানো
    const result = await Promise.all(
      batches.map(async (b) => {
        const count = await Shipment.countDocuments({ batch: b._id });
        return { ...b.toObject(), shipmentCount: count };
      }),
    );
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/batches/:id", async (req, res) => {
  try {
    const batch = await Batch.findById(req.params.id);
    const shipments = await Shipment.find({ batch: req.params.id })
      .populate("agency")
      .populate("customer");
    res.json({ batch, shipments });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/batches", async (req, res) => {
  try {
    const batch = await Batch.create(req.body);
    res.json(batch);
  } catch (err) {
    res.status(400).json({ error: "এই নামে ব্যাচ ইতিমধ্যে আছে!" });
  }
});

/* =====================================================
   📦 SHIPMENT MANAGEMENT
===================================================== */

// ম্যানুয়ালি শিপমেন্ট যোগ করা (Shipping Mark ফোকাসড)
router.post("/shipments", async (req, res) => {
  try {
    const { shipmentData } = req.body;

    // ইউনিক ট্র্যাকিং নম্বর
    const trackingNumber = `MAT-${Date.now().toString().slice(-6)}`;

    const shipment = await Shipment.create({
      ...shipmentData,
      trackingNumber,
      status: "warehouse received",
    });

    res.json({ success: true, shipment });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ✅ স্মার্ট বাল্ক ইমপোর্ট (চায়না থেকে আসা প্যাকিং লিস্টের জন্য)
router.post("/shipments/bulk-import", async (req, res) => {
  try {
    const { shipments, agencyId, batchId } = req.body;
    if (!shipments || !shipments.length)
      return res.status(400).json({ error: "No data found!" });

    const preparedData = shipments.map((item) => {
      // CBM ক্যালকুলেশন লজিক
      let calculatedCbm = item.cbm || 0;
      if (!calculatedCbm && item.length && item.width && item.height) {
        calculatedCbm =
          (Number(item.length) * Number(item.width) * Number(item.height)) /
          1000000;
      }

      return {
        trackingNumber: `MAT-${Math.floor(100000 + Math.random() * 900000)}`,
        chinaTrackingNo: item.chinaTrackingNo || item.trackingNumber || "-",
        shippingMark: item.shippingMark || "-",
        cartonNo: item.cartonNo || "-",
        productName: item.productName || "Various Items",
        quantity: Number(item.quantity) || 1,
        grossWeight: Number(item.grossWeight) || 0,
        actualWeight: Number(item.grossWeight) || 0,
        dimensions: {
          length: Number(item.length) || 0,
          width: Number(item.width) || 0,
          height: Number(item.height) || 0,
        },
        cbm: Number(calculatedCbm).toFixed(3),
        agency: agencyId || null,
        batch: batchId || null,
        status: "Warehouse Received",
        receivedDate: item.receivedDate
          ? new Date(item.receivedDate)
          : new Date(),
      };
    });

    const results = await Shipment.insertMany(preparedData);
    res.json({ success: true, count: results.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "বাল্ক ইম্পোর্ট ব্যর্থ হয়েছে।" });
  }
});

// শিপমেন্ট এডিট/আপডেট (ক্র্যাশ রোধে কন্ডিশনাল লজিক)
router.put("/shipments/:id", async (req, res) => {
  try {
    const { customerData, shipmentData } = req.body;

    // ✅ কাস্টমার ডাটা থাকলে তবেই কাস্টমার আপডেট করবে (এরর ফিক্স)
    if (customerData && customerData.fullName) {
      const rawName = customerData.fullName;
      const cleanName = rawName
        .replace(/\s*\(\s*শিপমেন্ট\s*\d+\s*\)/g, "")
        .trim();

      const currentShipment = await Shipment.findById(req.params.id);
      if (currentShipment && currentShipment.customer) {
        await Customer.findByIdAndUpdate(currentShipment.customer, {
          fullName: cleanName,
          phoneNumber: customerData.phoneNumber,
        });
      }
    }

    const updated = await Shipment.findByIdAndUpdate(
      req.params.id,
      shipmentData,
      { new: true },
    );
    if (!updated) return res.status(404).json({ error: "Shipment not found" });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ✅ স্পেশাল ওজন আপডেট রাউট (অফিসে মাল ম্যাপ করার পর)
router.put("/shipments/:id/weight", async (req, res) => {
  try {
    const { actualWeight } = req.body;
    await Shipment.findByIdAndUpdate(req.params.id, { actualWeight });
    res.json({ success: true, message: "ওজন সফলভাবে আপডেট হয়েছে।" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// বাল্ক এজেন্সি অ্যাসাইন
router.put("/shipments/bulk-assign-agency", async (req, res) => {
  try {
    const { shipmentIds, agencyId } = req.body;
    await Shipment.updateMany(
      { _id: { $in: shipmentIds } },
      { $set: { agency: agencyId } },
    );
    res.json({ success: true, message: "ব্রাঞ্চ সফলভাবে আপডেট করা হয়েছে।" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/shipments/:id", async (req, res) => {
  try {
    await Shipment.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Shipment deleted." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/shipments", async (req, res) => {
  try {
    const list = await Shipment.find()
      .populate("customer")
      .populate("agency")
      .sort({ createdAt: -1 });
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* =====================================================
   💰 PAYMENT & STATEMENTS
===================================================== */

router.post("/payments/allocate", async (req, res) => {
  try {
    const {
      statementNo,
      totalAmount,
      allocations,
      receivedDate,
      paymentType,
      bankName,
    } = req.body;

    const normalizedStatement = statementNo.trim().toUpperCase();
    const lockExists = await GlobalBankStatement.findOne({
      statementNo: normalizedStatement,
    });

    if (lockExists)
      return res
        .status(400)
        .json({ error: "এই স্টেটমেন্ট নম্বরটি ইতিমধ্যে ব্যবহৃত হয়েছে।" });

    const statement = await BankStatement.create({
      paymentType,
      statementNo: normalizedStatement,
      bankName: bankName || "CASH",
      totalAmount,
      receivedDate: new Date(receivedDate),
    });

    await GlobalBankStatement.create({
      statementNo: normalizedStatement,
      appSource: APP_SOURCE,
      linkedStatement: statement._id,
      totalAmount,
      status: "FINALIZED",
    });

    let totalAllocated = 0;
    for (const item of allocations) {
      const shipment = await Shipment.findById(item.shipmentId);
      if (!shipment) continue;

      const amount = parseFloat(item.amount);
      await PaymentAllocation.create({
        statement: statement._id,
        shipment: shipment._id,
        customer: shipment.customer,
        agency: shipment.agency,
        amount,
        paymentDate: new Date(receivedDate),
      });

      shipment.paidAmount = (shipment.paidAmount || 0) + amount;
      await shipment.save();
      totalAllocated += amount;
    }

    statement.allocatedAmount = totalAllocated;
    statement.isFinalized = true;
    await statement.save();

    res.json({ success: true, message: "পেমেন্ট সফলভাবে এন্ট্রি করা হয়েছে।" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/statements/:id", async (req, res) => {
  try {
    const statement = await BankStatement.findById(req.params.id);
    if (!statement) return res.status(404).json({ error: "স্টেটমেন্ট নেই।" });

    const allocations = await PaymentAllocation.find({
      statement: statement._id,
    });
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
      message: "স্টেটমেন্ট এবং পেমেন্ট রোলব্যাক করা হয়েছে।",
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/payments/recent", async (req, res) => {
  try {
    const recentPayments = await PaymentAllocation.find()
      .populate("shipment customer agency statement")
      .sort({ paymentDate: -1 })
      .limit(20);
    res.json(recentPayments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// routes.js

router.put("/batches/:id/status", async (req, res) => {
  try {
    const { status } = req.body;
    const batchId = req.params.id;

    // ১. ব্যাচের স্ট্যাটাস আপডেট
    const updatedBatch = await Batch.findByIdAndUpdate(
      batchId,
      { status },
      { new: true },
    );

    // ২. ওই ব্যাচের অধীনে থাকা সকল শিপমেন্টের স্ট্যাটাস অটো-আপডেট
    // যদি ব্যাচ 'Arrived' হয়, শিপমেন্টগুলোও 'Arrived' হবে
    await Shipment.updateMany({ batch: batchId }, { $set: { status: status } });

    res.json({
      success: true,
      message: `ব্যাচ এবং সকল শিপমেন্ট এখন ${status} স্টেজে আছে।`,
      batch: updatedBatch,
    });
  } catch (err) {
    res.status(500).json({ error: "স্ট্যাটাস আপডেট করা যায়নি।" });
  }
});

export default router;
