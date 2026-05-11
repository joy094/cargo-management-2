// branchRoutes.js

import express from "express";
import { Shipment, Branch, Payment } from "./models.js"; // ⚠️ Payment মডেলটি ইমপোর্ট করা হয়েছে

const router = express.Router();

// ✅ ১. অটো গ্রুপিং: Shipping Mark অনুযায়ী আনবিল্ড (Unbilled) আইটেমগুলো আনা
router.get("/pending/:shippingMark", async (req, res) => {
  try {
    // ছোট বা বড় হাতের অক্ষরের ঝামেলা এড়াতে RegExp ব্যবহার করা হলো (Case Insensitive)
    const shippingMarkRegex = new RegExp(`^${req.params.shippingMark}$`, "i");

    const pendingItems = await Shipment.find({
      shippingMark: shippingMarkRegex,
      isBilled: { $ne: true }, // 🔥 যাদের বিল হয়নি বা যাদের ডাটাবেসে isBilled ফিল্ডটিই নেই
      isMasterCarton: { $ne: true }, // 🔥 শুধু সাব-বক্স বা সাধারণ বক্স আনবে
    });

    res.status(200).json({ success: true, pendingItems });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ success: false, message: "ডেটা ফেচ করতে সমস্যা হয়েছে" });
  }
});

// ✅ ২. আইটেম অনুযায়ী বিল ইনপুট (রেট ও টোটাল সেভ করা)
router.post("/generate-invoice", async (req, res) => {
  try {
    const { items, invoiceTotal, discount } = req.body;
    const invoiceId = `INV-${Date.now()}`;

    // ফ্রন্টএন্ড থেকে আসা আইটেমগুলোর রেট আপডেট করা
    const updatePromises = items.map((item) => {
      return Shipment.findByIdAndUpdate(item.id, {
        perKgRate: item.rate,
        totalBill: item.total,
        isBilled: true,
        billingDate: new Date(),
        invoiceId: invoiceId,
      });
    });

    await Promise.all(updatePromises);

    res.status(200).json({
      success: true,
      message: "ইনভয়েস তৈরি হয়েছে",
      invoiceId,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "ইনভয়েস সেভ করা যায়নি" });
  }
});

// ✅ ৩. ড্যাশবোর্ড সামারি: Shipping Mark অনুযায়ী টোটাল এবং বকেয়া (Due) হিসাব
router.get("/summary/:shippingMark", async (req, res) => {
  try {
    const shippingMarkRegex = new RegExp(`^${req.params.shippingMark}$`, "i");

    // ১. Shipment থেকে টোটাল বিল, ওজন এবং বক্সের হিসাব
    const stats = await Shipment.aggregate([
      {
        $match: {
          shippingMark: shippingMarkRegex,
          isMasterCarton: { $ne: true },
        },
      },
      {
        $group: {
          _id: null,
          totalShipments: { $sum: 1 },
          totalWeight: {
            $sum: { $toDouble: { $ifNull: ["$actualWeight", "$grossWeight"] } },
          },
          // শুধুমাত্র বিল হওয়া আইটেমগুলোর totalBill যোগ করবে
          totalBilled: {
            $sum: {
              $cond: [{ $eq: ["$isBilled", true] }, "$totalBill", 0],
            },
          },
        },
      },
    ]);

    const summaryData = stats[0] || {
      totalShipments: 0,
      totalWeight: 0,
      totalBilled: 0,
    };

    // ২. Payment কালেকশন থেকে মোট জমা এবং ডিসকাউন্টের হিসাব
    const payments = await Payment.find({ shippingMark: shippingMarkRegex });
    let totalPaid = 0;
    let totalDiscount = 0;

    payments.forEach((txn) => {
      if (txn.type === "PAYMENT") {
        totalPaid += txn.amount;
      } else if (txn.type === "DISCOUNT" || txn.type === "ADJUSTMENT") {
        totalDiscount += txn.amount;
      }
    });

    // ৩. বর্তমান বকেয়া (Due) হিসাব
    const currentDue = summaryData.totalBilled - totalPaid - totalDiscount;

    // ৪. সব ডেটা একসাথে পাঠানো
    res.status(200).json({
      success: true,
      summary: {
        ...summaryData,
        totalPaid,
        totalDiscount,
        currentDue,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "সামারি তৈরি করা যায়নি" });
  }
});

// ==========================================
// 🏢 Branch Management API Routes
// ==========================================

// ✅ ১. নতুন ব্রাঞ্চ যুক্ত করা (Create Branch)
router.post("/", async (req, res) => {
  try {
    const { branchName, shippingMark, phone, address } = req.body;

    const existingBranch = await Branch.findOne({
      shippingMark: shippingMark.toUpperCase(),
    });

    if (existingBranch) {
      return res.status(400).json({
        success: false,
        message:
          "এই Shipping Mark টি ইতিমধ্যে অন্য ব্রাঞ্চের জন্য ব্যবহার করা হয়েছে!",
      });
    }

    const newBranch = new Branch({
      branchName,
      shippingMark,
      phone,
      address,
    });

    await newBranch.save();
    res.status(201).json({
      success: true,
      message: "ব্রাঞ্চ সফলভাবে যুক্ত হয়েছে",
      branch: newBranch,
    });
  } catch (error) {
    console.error("Branch Create Error:", error);
    res.status(500).json({
      success: false,
      message: "সার্ভার এরর, ব্রাঞ্চ সেভ করা যায়নি!",
    });
  }
});

// ✅ ২. ব্রাঞ্চ আপডেট করা (Update Branch)
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { branchName, shippingMark, phone, address } = req.body;

    const updatedBranch = await Branch.findByIdAndUpdate(
      id,
      { branchName, shippingMark, phone, address },
      { new: true },
    );

    if (!updatedBranch) {
      return res
        .status(404)
        .json({ success: false, message: "ব্রাঞ্চ খুঁজে পাওয়া যায়নি!" });
    }

    res.status(200).json({
      success: true,
      message: "ব্রাঞ্চ সফলভাবে আপডেট হয়েছে",
      branch: updatedBranch,
    });
  } catch (error) {
    console.error("Branch Update Error:", error);
    res.status(500).json({
      success: false,
      message: "সার্ভার এরর, ব্রাঞ্চ আপডেট করা যায়নি!",
    });
  }
});

// ✅ ৩. সব ব্রাঞ্চ ফেচ করা (Get All Branches)
router.get("/", async (req, res) => {
  try {
    const branches = await Branch.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, branches });
  } catch (error) {
    console.error("Fetch Branches Error:", error);
    res.status(500).json({
      success: false,
      message: "ব্রাঞ্চ লিস্ট লোড করতে সমস্যা হয়েছে!",
    });
  }
});

// ✅ ৪. ব্রাঞ্চ ডিলিট করা (Delete Branch)
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const deletedBranch = await Branch.findByIdAndDelete(id);

    if (!deletedBranch) {
      return res
        .status(404)
        .json({ success: false, message: "ব্রাঞ্চ খুঁজে পাওয়া যায়নি!" });
    }

    res
      .status(200)
      .json({ success: true, message: "ব্রাঞ্চ সফলভাবে ডিলিট হয়েছে!" });
  } catch (error) {
    console.error("Delete Branch Error:", error);
    res
      .status(500)
      .json({ success: false, message: "ব্রাঞ্চ ডিলিট করতে সমস্যা হয়েছে!" });
  }
});

// ==========================================
// 📦 Shipment & Invoice API Routes
// ==========================================

// ✅ ইনভয়েস হিস্ট্রি ফেচ করা (Batch Lookup ফিক্স সহ)
router.get("/invoice-history/:shippingMark", async (req, res) => {
  try {
    const { shippingMark } = req.params;

    const history = await Shipment.aggregate([
      { $match: { shippingMark: shippingMark, isBilled: true } },

      // 🔥 Aggregation-এর ভেতরে Populate করার জন্য $lookup ব্যবহার করা হলো
      {
        $lookup: {
          from: "batches", // ডাটাবেসে Batch মডেলের কালেকশনের নাম (MongoDB অটোমেটিক s যোগ করে)
          localField: "batch", // Shipment মডেলে ব্যাচের রেফারেন্স ফিল্ড
          foreignField: "_id",
          as: "batchDetails",
        },
      },
      {
        $unwind: {
          path: "$batchDetails",
          preserveNullAndEmptyArrays: true, // যদি কোনো আইটেমে ব্যাচ না থাকে, তবুও যেন এরর না দেয়
        },
      },

      // এরপর গ্রুপিং করা হচ্ছে
      {
        $group: {
          _id: "$invoiceId",
          date: { $first: "$billingDate" },
          totalAmount: { $sum: "$totalBill" },
          totalWeight: { $sum: { $toDouble: "$grossWeight" } },

          // 🔥 items এর ভেতরে ব্যাচের আসল নাম (batchName) সরাসরি ঢুকিয়ে দেওয়া হচ্ছে
          items: {
            $push: {
              $mergeObjects: [
                "$$ROOT",
                { batchName: "$batchDetails.batchName" },
              ],
            },
          },
        },
      },
      { $sort: { date: -1 } }, // লেটেস্ট ইনভয়েস উপরে থাকবে
    ]);

    res.status(200).json({ success: true, history });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ success: false, message: "হিস্ট্রি লোড করতে সমস্যা হয়েছে" });
  }
});

// ✅ সব আইটেম আনার রাউট (Populate সহ, যাতে ব্যাচের আসল নাম আসে)
router.get("/all-items/:shippingMark", async (req, res) => {
  try {
    const items = await Shipment.find({
      shippingMark: req.params.shippingMark,
    })
      .populate("batch", "batchName") // 🔥 ম্যাজিক লাইন: এই লাইনটিই আইডির বদলে আসল ব্যাচ নেম (MAY 20 GU) নিয়ে আসবে!
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, items });
  } catch (error) {
    console.error("Fetch all items error:", error);
    res.status(500).json({ success: false });
  }
});

// ✅ Undo / Revert করার রাউট
router.post("/revert-item", async (req, res) => {
  try {
    const { itemId } = req.body;
    await Shipment.findByIdAndUpdate(itemId, {
      isBilled: false,
      invoiceId: null,
    });
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false });
  }
});

// ✅ বিল হওয়া আইটেমের রেট বা ডিসকাউন্ট আপডেট করা
router.put("/update-billed-item/:id", async (req, res) => {
  try {
    const { rate, total, discount } = req.body;
    const updatedItem = await Shipment.findByIdAndUpdate(
      req.params.id,
      { perKgRate: rate, totalBill: total, discount: discount },
      { new: true },
    );
    res.status(200).json({ success: true, item: updatedItem });
  } catch (error) {
    res.status(500).json({ success: false });
  }
});

// --- আন-অ্যাসাইনড শিপমেন্ট তালিকা (যেগুলোর ব্রাঞ্চ নেই) ---
router.get("/unassigned-shipments", async (req, res) => {
  try {
    // ১. সব ব্রাঞ্চের শিপিং মার্কগুলো খুঁজে বের করা
    const branches = await Branch.find({}, "shippingMark");
    const activeShippingMarks = branches.map((b) => b.shippingMark);

    // ২. এমন শিপমেন্ট খোঁজা যেগুলো Arrived বা Delivered হয়েছে, কিন্তু শিপিং মার্ক কোনো ব্রাঞ্চের সাথে মেলে না
    const unassignedShipments = await Shipment.find({
      status: { $in: ["Arrived", "Delivered"] },
      shippingMark: { $nin: activeShippingMarks }, // $nin মানে "Not In" (লিস্টে নেই)
    }).sort({ receivedDate: -1 });

    res.json(unassignedShipments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
