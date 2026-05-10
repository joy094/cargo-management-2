//src/batchRoute.js

import express from "express";
import { Batch, Shipment } from "./models.js";

const router = express.Router();

// --- ১. সকল ব্যাচ দেখা (Get All Batches) ---
router.get("/", async (req, res) => {
  console.log("✅ ব্যাচ লিস্টের নতুন এপিআই কল হয়েছে!"); // টার্মিনালে চেক করার জন্য
  
  try {
    const batches = await Batch.find().sort({ createdAt: -1 });

    const batchData = await Promise.all(
      batches.map(async (b) => {
        const count = await Shipment.countDocuments({ batch: b._id });
        const heldCount = await Shipment.countDocuments({ batch: b._id, isHeld: true });

        return { 
          ...b.toObject(), 
          shipmentCount: count, 
          heldCount: heldCount,
          isBackendUpdated: "YES" // 🔥 এটি শুধু টেস্ট করার জন্য দিলাম!
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

// --- ৬. হাইব্রিড এক্সেপশন ম্যানেজমেন্ট (বক্স হোল্ড বা মুভ করা) ---
// এই নতুন রাউটটি দিয়ে আপনি ফ্রন্টএন্ড থেকে এক বা একাধিক বক্সকে হোল্ড বা ব্যাচ মুভ করতে পারবেন
router.put("/manage-exception", async (req, res) => {
  try {
    const { shipmentIds, action, reason, targetBatchId } = req.body;

    if (action === "HOLD") {
      // কাস্টমস বা অন্য কারণে হোল্ড করা
      await Shipment.updateMany(
        { _id: { $in: shipmentIds } },
        {
          $set: {
            isHeld: true,
            exceptionStatus: reason || "Customs Hold",
          },
        },
      );
    } else if (action === "RELEASE") {
      // হোল্ড থেকে মুক্তি দেওয়া
      await Shipment.updateMany(
        { _id: { $in: shipmentIds } },
        {
          $set: {
            isHeld: false,
            exceptionStatus: "Normal",
          },
        },
      );
    } else if (action === "MOVE") {
      // ফ্লাইট অফলোড বা অন্য কারণে অন্য ব্যাচে পাঠিয়ে দেওয়া
      if (!targetBatchId)
        return res.status(400).json({ error: "টার্গেট ব্যাচ আইডি প্রয়োজন।" });

      await Shipment.updateMany(
        { _id: { $in: shipmentIds } },
        {
          $set: {
            batch: targetBatchId,
            isHeld: false,
            exceptionStatus: "Normal",
          },
        },
      );
    }

    res.json({ success: true, message: "অ্যাকশন সফলভাবে সম্পন্ন হয়েছে।" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- ৩. একটি নির্দিষ্ট ব্যাচের বিস্তারিত ও তার শিপমেন্টগুলো দেখা ---
router.get("/:id", async (req, res) => {
  try {
    const batch = await Batch.findById(req.params.id);
    if (!batch) return res.status(404).json({ error: "ব্যাচ পাওয়া যায়নি।" });

    const shipments = await Shipment.find({ batch: batch._id })
      .populate("customer")
      .populate("agency");

    res.json({ batch, shipments });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- ৪. শিপমেন্টগুলোকে ব্যাচে যুক্ত করা ---
router.put("/:id/assign", async (req, res) => {
  try {
    const { shipmentIds } = req.body;
    await Shipment.updateMany(
      { _id: { $in: shipmentIds } },
      { $set: { batch: req.params.id } },
    );
    res.json({ success: true, message: "শিপমেন্টগুলো ব্যাচে যুক্ত হয়েছে।" });
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
router.delete("/:id", async (req, res) => {
  try {
    await Shipment.updateMany(
      { batch: req.params.id },
      { $unset: { batch: "" } },
    );
    await Batch.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "ব্যাচ ডিলিট হয়েছে।" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
