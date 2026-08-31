//batchRoute.js

import express from "express";
import { Batch, Shipment, Branch } from "./models.js";

const router = express.Router();

// --- ১. সকল ব্যাচ দেখা (Get All Batches) ---
router.get("/", async (req, res) => {
  try {
    const batches = await Batch.find().sort({ createdAt: -1 });

    const batchData = await Promise.all(
      batches.map(async (b) => {
        const count = await Shipment.countDocuments({ batch: b._id });
        const heldCount = await Shipment.countDocuments({
          batch: b._id,
          isHeld: true,
        });

        return {
          ...b.toObject(),
          shipmentCount: count,
          heldCount: heldCount,
          isBackendUpdated: "YES", // 🔥 এটি শুধু টেস্ট করার জন্য দিলাম!
        };
      }),
    );

    res.json(batchData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// --- ২. নতুন ব্যাচ তৈরি করা (Create Batch) ---
router.post("/", async (req, res) => {
  try {
    const newBatch = new Batch(req.body);
    const savedBatch = await newBatch.save();
    res.status(201).json(savedBatch);
  } catch (err) {
    res.status(400).json({ error: "এই নামে ব্যাচ ইতিমধ্যে আছে বা ডাটা ভুল।" });
  }
});

/* =====================================================
   ৩. বক্স হোল্ড বা অন্য ব্যাচে মুভ করা (Manage Exception)
   ⚠️ ক্যাসকেড লজিক: মাস্টার বক্স হোল্ড/মুভ করলে ভেতরের মালও আপডেট হবে
===================================================== */
router.put("/manage-exception", async (req, res) => {
  try {
    const { shipmentIds, action, reason, targetBatchId } = req.body;

    if (action === "HOLD") {
      await Shipment.updateMany(
        {
          $or: [
            { _id: { $in: shipmentIds } }, // আপনি যে বক্সগুলো সিলেক্ট করেছেন
            { parentId: { $in: shipmentIds } }, // 🔥 যদি সিলেক্ট করা কোনো আইডি মাস্টার বক্সের হয়, তবে তার ভেতরের চাইল্ড বক্সগুলো
          ],
        },
        { $set: { isHeld: true, exceptionStatus: reason || "Customs Hold" } },
      );
    } else if (action === "RELEASE") {
      await Shipment.updateMany(
        {
          $or: [
            { _id: { $in: shipmentIds } },
            { parentId: { $in: shipmentIds } },
          ],
        },
        { $set: { isHeld: false, exceptionStatus: "Normal" } },
      );
    } else if (action === "MOVE") {
      if (!targetBatchId)
        return res.status(400).json({ error: "টার্গেট ব্যাচ আইডি প্রয়োজন।" });

      await Shipment.updateMany(
        {
          $or: [
            { _id: { $in: shipmentIds } },
            { parentId: { $in: shipmentIds } }, // 🔥 মাস্টার বক্স অন্য ফ্লাইটে দিলে ভেতরের বক্সগুলোও অটো চলে যাবে
          ],
        },
        {
          $set: {
            batch: targetBatchId,
            isHeld: false,
            exceptionStatus: "Normal",
          },
        },
      );
    }

    res.json({ success: true, message: "অ্যাকশন সফল হয়েছে।" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// --- ৩. একটি নির্দিষ্ট ব্যাচের বিস্তারিত, শিপমেন্ট এবং পাই চার্টের স্ট্যাটাস দেখা ---
router.get("/:id", async (req, res) => {
  try {
    const batch = await Batch.findById(req.params.id);
    if (!batch) return res.status(404).json({ error: "ব্যাচ পাওয়া যায়নি।" });

    const shipments = await Shipment.find({ batch: batch._id });

    // 🔥 নতুন: পাই চার্টের জন্য Product Type অনুযায়ী ডাটা ক্যালকুলেশন
    const typeStats = await Shipment.aggregate([
      { $match: { batch: batch._id } },
      {
        $group: {
          _id: { $ifNull: ["$productType", "General"] }, // টাইপ না থাকলে ডিফল্ট General ধরবে
          count: { $sum: 1 },
          totalWeight: {
            $sum: {
              $convert: {
                input: "$actualWeight",
                to: "double",
                onError: 0,
                onNull: 0,
              },
            },
          },
        },
      },
    ]);

    // typeStats কেও ফ্রন্টএন্ডে পাঠানো হচ্ছে
    res.json({ batch, shipments, typeStats });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// --- ৪. শিপমেন্টগুলোকে ব্যাচে (এবং ঐচ্ছিকভাবে মাস্টার বক্সে) যুক্ত করা ---
// 🔥 (পুরোনোটি মুছে শুধু নতুন আপডেটেডটি রাখা হয়েছে)
router.put("/:id/assign", async (req, res) => {
  try {
    const { shipmentIds, masterBoxId } = req.body;

    // ডিফল্টভাবে শুধু ব্যাচ আইডি আপডেট করার জন্য পে-লোড
    const updatePayload = { batch: req.params.id };

    // 🔥 ম্যাজিক লজিক: যদি মাস্টার বক্স সিলেক্ট করা থাকে, তবে parentId সেট করে দেওয়া হচ্ছে
    if (masterBoxId) {
      updatePayload.parentId = masterBoxId;
      updatePayload.isMasterCarton = false; // এটি মাস্টার বক্সের ভেতরের মাল (লুজ মাল নয়)
    }

    // ডাটাবেসে একসাথে সব সিলেক্ট করা মাল আপডেট করা
    await Shipment.updateMany(
      { _id: { $in: shipmentIds } },
      { $set: updatePayload },
    );

    res.json({ success: true, message: "শিপমেন্টগুলো সফলভাবে যুক্ত হয়েছে।" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- ৫. ব্যাচের স্ট্যাটাস আপডেট ও স্মার্ট বাল্ক আপডেট (HOLD লজিক সহ) ---
router.put("/:id/status", async (req, res) => {
  try {
    const { status } = req.body;

    // ১. ব্যাচ স্ট্যাটাস আপডেট
    const updatedBatch = await Batch.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true },
    );

    // ২. 🔥 স্মার্ট আপডেট: শুধুমাত্র সেই বক্সগুলোর স্ট্যাটাস চেঞ্জ হবে যেগুলো হোল্ড (isHeld) করা নেই
    const statusesToSync = [
      "In-Transit",
      "Arrived",
      "Delivered",
      "Dispatched",
      "Customs Clearing",
    ];

    if (statusesToSync.includes(status)) {
      await Shipment.updateMany(
        {
          batch: req.params.id,
          isHeld: { $ne: true }, // শুধুমাত্র যেগুলো হোল্ডে নেই
        },
        { $set: { status: status } },
      );
    }

    res.json(updatedBatch);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// --- ৮. ব্যাচ ইনফরমেশন এডিট/আপডেট করা ---
router.put("/:id", async (req, res) => {
  try {
    const updatedBatch = await Batch.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true },
    );
    res.json({ success: true, batch: updatedBatch });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- ৭. ব্যাচ ডিলিট করা ---
// ✅ ব্যাচ এবং এর ভেতরের সকল শিপমেন্ট (বক্স) একসাথে ডিলিট করার রাউট
router.delete("/:id", async (req, res) => {
  try {
    const batchId = req.params.id;

    // ১. প্রথমে চেক করা হচ্ছে এই ব্যাচের কোনো মালের ইনভয়েস (বিল) তৈরি হয়েছে কি না
    const billedShipments = await Shipment.find({
      batch: batchId,
      isBilled: true,
    });

    if (billedShipments.length > 0) {
      return res.status(400).json({
        error:
          "⛔ Warning: Some shipments in this batch are already billed! You cannot delete a batch containing billed items.",
      });
    }

    // ২. যদি কোনো ইনভয়েস না থাকে, তবে ব্যাচের ভেতরের সকল মাল (মাস্টার এবং সাব-বক্স) ডিলিট করা
    await Shipment.deleteMany({ batch: batchId });

    // ৩. এরপর মূল ব্যাচটি (Batch) ডিলিট করা
    const deletedBatch = await Batch.findByIdAndDelete(batchId);

    if (!deletedBatch) {
      return res.status(404).json({ error: "Batch not found!" });
    }

    res.json({
      success: true,
      message: "Batch and all its shipments have been successfully deleted.",
    });
  } catch (error) {
    console.error("Batch Delete Error:", error);
    res.status(500).json({ error: "Server error, failed to delete batch." });
  }
});

// --- ৯. ব্যাচ আইডি দিয়ে কাস্টমার (Branch) ফিল্টার করা ---
router.get("/filter-by-batch/:batchId", async (req, res) => {
  try {
    const batchId = req.params.batchId;

    // ১. এই ব্যাচের আন্ডারে থাকা সব শিপমেন্ট খুঁজে বের করা
    const shipments = await Shipment.find({ batch: batchId }).select(
      "shippingMark",
    );

    // ২. শিপিং মার্কগুলো থেকে ডুপ্লিকেট বাদ দিয়ে ইউনিক মার্কের লিস্ট তৈরি করা
    const uniqueMarks = [...new Set(shipments.map((s) => s.shippingMark))];

    if (uniqueMarks.length === 0) {
      return res.json({ success: true, branches: [] });
    }

    // ৩. এই মার্কগুলোর সাথে মিলে যাওয়া কাস্টমারদের (Branches) খুঁজে বের করা
    const branches = await Branch.find({
      $or: [
        { shippingMark: { $in: uniqueMarks } },
        { shippingMarks: { $in: uniqueMarks } },
      ],
    });

    res.json({ success: true, branches });
  } catch (error) {
    console.error("Batch filter error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// --- ৯. নির্দিষ্ট ব্যাচের মাস্টার বক্সগুলো ফেচ করা ---
router.get("/:id/master-boxes", async (req, res) => {
  try {
    const masterBoxes = await Shipment.find({
      batch: req.params.id,
      isMasterCarton: true, // শুধুমাত্র মাস্টার বক্সগুলো
    }).select("shippingMark cartonNo chinaTrackingNo");

    res.json({ success: true, masterBoxes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
