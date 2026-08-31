// routes.js

import express from "express";
import dotenv from "dotenv";
dotenv.config();
import mongoose from "mongoose";

import { Shipment, Batch } from "./models.js";
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
      return res.status(404).json({ error: "Customer not found!" });

    const shipments = await Shipment.find({ customer: customer._id }).sort({
      createdAt: -1,
    });
    res.json({ customer, shipments });
  } catch (err) {
    res.status(500).json({ error: "Failed to load data." });
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
    res.status(500).json({ error: "Failed to load data." });
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
// ✅ Excel Master & Sub-box স্মার্ট বাল্ক ইমপোর্ট (হুবহু এক্সেলের সিরিয়াল বজায় রেখে)
router.post("/bulk-import-excel", async (req, res) => {
  try {
    const { shipments, batchId } = req.body;
    if (!shipments || !shipments.length) {
      return res.status(400).json({ error: "No data found!" });
    }

    // ১. ডাটাবেস থেকে বর্তমান ব্যাচের আগের মাস্টার বক্সগুলো খুঁজে বের করা (যদি আগে আপলোড করা থাকে)
    const existingMasters = await Shipment.find({
      batch: batchId,
      isMasterCarton: true,
    });
    const masterIdMap = {};
    existingMasters.forEach((m) => {
      if (m.cartonNo) masterIdMap[m.cartonNo] = m._id;
    });

    // ২. এক্সেলের নতুন মাস্টার বক্সগুলোর জন্য আগে থেকেই ID তৈরি করে রাখা
    // (যাতে ডাটাবেসে সেভ করার আগেই সাব-বক্সগুলো তাকে চিনতে পারে)
    shipments.forEach((item) => {
      if (item.isMasterCarton && item.cartonNo) {
        const newId = new mongoose.Types.ObjectId(); // নতুন ID তৈরি
        item._id = newId; // এক্সেলের আইটেমে টেম্পোরারি সেভ রাখলাম
        masterIdMap[item.cartonNo] = newId; // ম্যাপে আপডেট করলাম
      }
    });

    // ৩. এক্সেলের অরিজিনাল সিরিয়াল অনুযায়ী ডাটা প্রস্তুত করা (কোনো ফিল্টার করে আলাদা করা যাবে না)
    const finalDocsToInsert = shipments.map((item) => {
      let calculatedCbm = item.cbm || 0;
      if (!calculatedCbm && item.length && item.width && item.height) {
        calculatedCbm =
          (Number(item.length) * Number(item.width) * Number(item.height)) /
          1000000;
      }

      const doc = {
        trackingNumber: `MAT-${Math.floor(100000 + Math.random() * 900000)}`,
        chinaTrackingNo: item.chinaTrackingNo || "-",
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
        batch: batchId || null,
        status: "Warehouse Received",
        receivedDate: item.receivedDate
          ? new Date(item.receivedDate)
          : new Date(),
        isMasterCarton: item.isMasterCarton,
        parentId: null,

        // 🔥 এক্সেলের জন্যও এই নতুন ফিল্ডগুলো যুক্ত করা হলো
        category: item.category || "By Sea",
        customerName: item.customerName || "",
        productType: item.productType || "General", // 👈 🔥 এই লাইনটি যুক্ত করুন
        packagingCost: Number(item.packagingCost) || 0,
        receivingCost: Number(item.receivingCost) || 0,
        note: item.note || "",
      };

      // মাস্টার বক্স হলে আমাদের তৈরি করা ID টি বসিয়ে দেবো
      if (item.isMasterCarton) {
        doc._id = item._id;
      }
      // সাব-বক্স হলে ম্যাপ থেকে তার প্যারেন্ট ID বের করে বসাবো
      else if (item.parentCartonNo && masterIdMap[item.parentCartonNo]) {
        doc.parentId = masterIdMap[item.parentCartonNo];
      }

      return doc;
    });

    // ৪. এক ক্লিকে এক্সেলের হুবহু সিরিয়াল অনুযায়ী পুরো ডাটাবেসে সেভ করা!
    await Shipment.insertMany(finalDocsToInsert);

    res.json({
      success: true,
      message: `সফলভাবে ${finalDocsToInsert.length} টি বক্স আপলোড হয়েছে!`,
    });
  } catch (err) {
    console.error("Bulk Import Error:", err);

    // ১. ডুপ্লিকেট কি এরর (Duplicate Key Error - MongoDB Code 11000)
    // যদি এক্সেলে এমন কোনো ট্র্যাকিং নম্বর বা ডেটা থাকে যা ডাটাবেসে অলরেডি আছে (unique: true হলে)
    if (err.code === 11000) {
      const duplicateKey = Object.keys(err.keyValue)[0];
      const duplicateValue = err.keyValue[duplicateKey];
      return res.status(400).json({
        error: `ডাটাবেসে এই ${duplicateKey} (${duplicateValue}) আগে থেকেই আছে! ডুপ্লিকেট এন্ট্রি করা যাবে না।`,
      });
    }

    // ২. স্কিমা ভ্যালিডেশন এরর (Mongoose ValidationError)
    // যদি ডাটাবেসের স্কিমায় কোনো ফিল্ড required থাকে কিন্তু এক্সেলে না থাকে
    if (err.name === "ValidationError") {
      const messages = Object.values(err.errors).map((val) => val.message);
      return res.status(400).json({
        error: `ভ্যালিডেশন এরর: ${messages.join(", ")}`,
      });
    }

    // ৩. অন্যান্য অপ্রত্যাশিত সার্ভার এরর
    res.status(500).json({
      error: err.message || "বাল্ক ইম্পোর্ট ব্যর্থ হয়েছে। ফাইলটি চেক করুন।",
    });
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
        productNameCn: item.productNameCn || "", // 🇨🇳 চায়না থেকে আসা পণ্যের নাম (চাইনিজ)
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

        // 🔥 এই নতুন ফিল্ডগুলো যুক্ত করা হলো
        category: item.category || "By Sea",
        productType: item.productType || "General", // 👈 🔥 এই লাইনটি যুক্ত করুন
        customerName: item.customerName || "",
        packagingCost: Number(item.packagingCost) || 0,
        receivingCost: Number(item.receivingCost) || 0,
        note: item.note || "",
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
    res.json({ success: true, message: "Weight updated successfully." });
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
    res.json({ success: true, message: "Branch updated successfully." });
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

// ✅ শিপমেন্ট ডিলিট করার রাউট
router.delete("/shipments/:id", async (req, res) => {
  try {
    const shipmentId = req.params.id;

    // ১. প্রথমে ডাটাবেস থেকে বক্সটি খুঁজে বের করা
    const shipment = await Shipment.findById(shipmentId);
    if (!shipment) {
      return res.status(404).json({ error: "Box not found!" });
    }

    // 🔥 ২. ইনভয়েস চেক করা (বিল হয়ে থাকলে ডিলিট হবে না)
    if (shipment.isBilled) {
      return res.status(400).json({
        error: "⛔ This box has an invoice created, so it cannot be deleted!",
      });
    }

    // ৩. মাস্টার বক্স হলে এর ভেতরের সাব-বক্সগুলোর ইনভয়েস চেক করা
    if (shipment.isMasterCarton) {
      const billedSubItems = await Shipment.find({
        parentId: shipmentId,
        isBilled: true,
      });
      if (billedSubItems.length > 0) {
        return res.status(400).json({
          error:
            "⛔ This master box has some items with invoices created, so it cannot be deleted!",
        });
      }
      // ইনভয়েস না থাকলে ভেতরের সাব-বক্সগুলো ডিলিট করা
      await Shipment.deleteMany({ parentId: shipmentId });
    }

    // ৪. মূল মালটি ডিলিট করা
    await Shipment.findByIdAndDelete(shipmentId);

    res.json({ success: true, message: "Box successfully deleted!" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete the box." });
  }
});

// 📥 ডাইরেক্ট/ম্যানুয়াল বাল্ক এন্ট্রি (ব্রাঞ্চ প্রোফাইলের জন্য)
router.post("/direct-bulk", authMiddleware, async (req, res) => {
  try {
    const { items, shippingMark } = req.body; // items হলো টেবিলের ডাটাগুলোর অ্যারে

    if (!items || items.length === 0) {
      return res.status(400).json({ error: "No data provided!" });
    }

    const savedShipments = [];

    for (const item of items) {
      // অটোমেটিক ট্র্যাকিং নাম্বার জেনারেট (যদি ক্লায়েন্ট না দেয়)
      const autoTracking = `DIR-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

      const newShipment = new Shipment({
        trackingNumber: item.trackingNo || autoTracking,
        chinaTrackingNo: item.chinaTrackingNo || "",
        shippingMark: shippingMark, // প্রোফাইলের শিপিং মার্ক ফিক্সড থাকবে
        productName: item.productName || "MIX",
       productType: item.productType || "General", // 👈 🔥 এই লাইনটি যুক্ত করুন
        cartonNo: item.cartonNo || "",
        quantity: Number(item.quantity) || 1,
        grossWeight: Number(item.grossWeight) || 0,
        actualWeight: Number(item.actualWeight) || 0,
        dimensions: {
          length: Number(item.length) || 0,
          width: Number(item.width) || 0,
          height: Number(item.height) || 0,
        },
        cbm: Number(item.cbm) || 0,
        batch: null, // 🔥 কোনো ব্যাচ নেই
        status: "Delivered", // বা আপনার প্রয়োজন অনুযায়ী স্ট্যাটাস
        isBilled: false,
      });

      const saved = await newShipment.save();
      savedShipments.push(saved);
    }

    res.status(201).json({
      success: true,
      message: `${savedShipments.length} direct shipments successfully added.`,
    });
  } catch (error) {
    console.error("Direct Bulk Entry Error:", error);
    res.status(500).json({ error: "Server error occurred." });
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
        .json({ error: "This statement number is already in use." });

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

    res.json({ success: true, message: "Payment allocation successful." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/statements/:id", async (req, res) => {
  try {
    const statement = await BankStatement.findById(req.params.id);
    if (!statement)
      return res.status(404).json({ error: "Statement not found." });

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
      message: "Statement and payments successfully rolled back.",
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
      message: `Batch and all shipments are now in${status} stage.`,
      batch: updatedBatch,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to update status." });
  }
});

// ✅ মাস্টার কার্টনের ভেতরে সাব-আইটেম যুক্ত করার আপডেট করা রাউট
router.post("/shipments/add-sub-items", async (req, res) => {
  try {
    const { items, parentId } = req.body;

    if (!items || !items.length || !parentId) {
      return res.status(400).json({ error: "Data not found!" });
    }

    const masterCarton = await Shipment.findById(parentId);
    if (!masterCarton) {
      return res.status(404).json({ error: "Box not found!" });
    }

    const preparedSubItems = items.map((item) => ({
      trackingNumber: `MAT-S${Math.floor(100000 + Math.random() * 900000)}`,
      shippingMark: item.shippingMark || masterCarton.shippingMark,
      cartonNo: item.cartonNo || "-",
      productName: item.productName || "General Item",
      chinaTrackingNo: item.chinaTrackingNo || "-",
      quantity: Number(item.quantity) || 1,
      grossWeight: Number(item.grossWeight) || 0,
      actualWeight: Number(item.grossWeight) || 0,
      isMasterCarton: false, // ছোট বক্স সব সময় ফলস
      parentId: parentId,
      batch: masterCarton.batch,
      agency: masterCarton.agency,
      shipmentType: masterCarton.shipmentType,
      originPort: masterCarton.originPort,
      status: masterCarton.status,
    }));

    // সাব-আইটেম সেভ করা
    await Shipment.insertMany(preparedSubItems);

    // ✅ ম্যাজিক লাইন: বড় বক্সটিকে অটোমেটিক 'মাস্টার কার্টন' এ রূপান্তর করা
    await Shipment.findByIdAndUpdate(parentId, { isMasterCarton: true });

    res.status(201).json({
      success: true,
      message: "Parcel added and master box updated.",
    });
  } catch (err) {
    res.status(500).json({ error: "Server error." });
  }
});

// ✅ যেকোনো শিপমেন্ট (মাস্টার বা সাব-বক্স) এডিট করার রাউট
router.put("/shipments/edit/:id", async (req, res) => {
  try {
    const updatedShipment = await Shipment.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true }, // আপডেট হওয়ার পর নতুন ডেটা রিটার্ন করবে
    );
    res.json({ success: true, shipment: updatedShipment });
  } catch (error) {
    res.status(500).json({ error: "Failed to update data." });
  }
});

// QR Code স্ক্যান করলে বক্স এবং সাব-বক্সের ডিটেইলস বের করার API
router.get("/shipments/qr-details/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // ১. প্রথমে মূল বক্সটি (মাস্টার বা সাধারণ) খুঁজুন
    const mainBox = await Shipment.findById(id);

    if (!mainBox) {
      return res.status(404).json({ message: "বক্সটি খুঁজে পাওয়া যায়নি!" });
    }

    // ২. যদি এটি মাস্টার বক্স হয়, তবে এর ভেতরের সব সাব-বক্স খুঁজুন
    let subBoxes = [];
    if (mainBox.isMasterCarton) {
      subBoxes = await Shipment.find({ parentId: id });
    }

    // ৩. মূল বক্স এবং সাব-বক্স একসাথে ফ্রন্টএন্ডে পাঠিয়ে দিন
    res.status(200).json({
      success: true,
      mainBox,
      subBoxes,
    });
  } catch (error) {
    console.error("QR Details Fetch Error:", error);
    res.status(500).json({ success: false, message: "Server error!" });
  }
});

// ✅ শিপিং মার্ক থেকে কাস্টমারের নাম অটো-ফিল করার API
router.get("/customer-map", async (req, res) => {
  try {
    // mongoose.model ব্যবহার করছি যাতে import error না আসে
    const branches = await mongoose.model("Branch").find();
    const customerMap = {};

    branches.forEach((b) => {
      // সিঙ্গেল শিপিং মার্ক থাকলে
      if (b.shippingMark) {
        customerMap[b.shippingMark.toUpperCase()] =
          b.name || b.branchName || "";
      }
      // যদি মাল্টিপল শিপিং মার্কস (Array) থাকে
      if (b.shippingMarks && Array.isArray(b.shippingMarks)) {
        b.shippingMarks.forEach((mark) => {
          customerMap[mark.toUpperCase()] = b.name || b.branchName || "";
        });
      }
    });

    res.json({ success: true, customerMap });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ✅ ওয়্যারহাউজের আনঅ্যাসাইনড মালগুলো ফেচ করার আপডেট করা API
router.get("/unassigned", async (req, res) => {
  try {
    // যেসব শিপমেন্টের batch নেই এবং স্ট্যাটাস শুধুমাত্র "Warehouse Received"
    const unassignedShipments = await Shipment.find({
      $or: [{ batch: null }, { batch: { $exists: false } }],
      status: "Warehouse Received", // 🔥 ফিক্সড: ডেলিভারড বা ব্রাঞ্চের ম্যানুয়াল এন্ট্রি ফিল্টার আউট করা হলো
    }).sort({ createdAt: -1 });

    res.json({ success: true, shipments: unassignedShipments });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- বাল্ক ডিলিট (একাধিক শিপমেন্ট একসাথে ডিলিট) ---
router.post("/bulk-delete", async (req, res) => {
  try {
    const { shipmentIds } = req.body;

    if (!shipmentIds || shipmentIds.length === 0) {
      return res.status(400).json({ error: "No shipment IDs provided." });
    }

    // 🔥 ১. চেক করা হচ্ছে সিলেক্ট করা কোনো মালের ইনভয়েস হয়েছে কি না
    const billedShipments = await Shipment.find({
      _id: { $in: shipmentIds },
      isBilled: true,
    });

    if (billedShipments.length > 0) {
      return res.status(400).json({
        error:
          "⛔ The selected items include billed shipments! Billed items cannot be deleted.",
      });
    }

    // ২. মাস্টার বক্সের সাব-বক্সগুলোর ইনভয়েস চেক করা (নিরাপত্তার জন্য)
    const billedSubShipments = await Shipment.find({
      parentId: { $in: shipmentIds },
      isBilled: true,
    });

    if (billedSubShipments.length > 0) {
      return res.status(400).json({
        error:
          "⛔ The selected master box contains billed shipments! These items cannot be deleted.",
      });
    }

    // ৩. কোনো ইনভয়েস না থাকলে সব একসাথে ডিলিট হবে
    await Shipment.deleteMany({ _id: { $in: shipmentIds } });
    await Shipment.deleteMany({ parentId: { $in: shipmentIds } });

    res.json({ success: true, message: "Successfully deleted." });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ✅ ভুল করে এক্সেপশন বা অন্য স্টেটে যাওয়া মাল আবার ওয়ারহাউসে পুশ করার রাউট (Batch Link Fix সহ)
router.put("/shipments/push-warehouse/:id", async (req, res) => {
  try {
    const shipmentId = req.params.id;

    // ১. ডাটাবেস থেকে বক্সটি খুঁজে বের করা
    const shipment = await Shipment.findById(shipmentId);

    if (!shipment) {
      return res
        .status(404)
        .json({ success: false, message: "বক্সটি খুঁজে পাওয়া যায়নি!" });
    }

    // ২. ভ্যালিডেশন: ইনভয়েস হয়ে থাকলে ওয়ারহাউসে পুশ করা যাবে না
    if (shipment.isBilled) {
      return res.status(400).json({
        success: false,
        message:
          "⚠️ Warning: This box has an invoice created! To return it to the warehouse, please undo the invoice from the customer profile.",
      });
    }

    // 🚀 ৩. ফিক্স: স্ট্যাটাস পরিবর্তনের সাথে সাথে ব্যাচ আইডি ক্লিয়ার (null) করে দেওয়া
    shipment.status = "Warehouse Received";
    shipment.batch = null; // 👈 এই লাইনটি বক্সটিকে বর্তমান ব্যাচ থেকে সম্পূর্ণ বের করে দেবে
    if (shipment.isHeld) shipment.isHeld = false;
    await shipment.save();

    // 🚀 ৪. সাব-বক্সগুলোর জন্যও স্ট্যাটাসের সাথে সাথে ব্যাচ আইডি ক্লিয়ার (null) করা
    await Shipment.updateMany(
      { parentId: shipmentId, isBilled: { $ne: true } },
      { $set: { status: "Warehouse Received", isHeld: false, batch: null } }, // 👈 batch: null যোগ করা হয়েছে
    );

    res.status(200).json({
      success: true,
      message:
        "Box successfully removed from the batch and returned to the general warehouse.",
    });
  } catch (error) {
    console.error("Push Warehouse Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error, failed to push to warehouse.",
    });
  }
});

// --- ✅ সিলেক্ট করা বিদ্যমান বক্সগুলোকে মাস্টার বক্সে রূপান্তর করা ---
router.put("/make-master", async (req, res) => {
  try {
    const { shipmentIds } = req.body;

    if (!shipmentIds || shipmentIds.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "No items selected." });
    }

    // 🔥 সিলেক্ট করা আইডিগুলোর isMasterCarton ফিল্ডটি true করে দেওয়া হচ্ছে
    await Shipment.updateMany(
      { _id: { $in: shipmentIds } },
      { $set: { isMasterCarton: true } },
    );

    res.json({
      success: true,
      message: "Successfully converted to Master Box.",
    });
  } catch (error) {
    console.error("Make Master Box Error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to convert to master box." });
  }
});
export default router;
