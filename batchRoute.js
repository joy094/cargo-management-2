// batchRoute.js

import express from "express";

import {
  Batch,
  Shipment, // নতুন মডেল
} from "./models.js";
const router = express.Router();

// --- ১. সকল ব্যাচ দেখা (Get All Batches) ---
router.get("/batches", async (req, res) => {
  try {
    // প্রতিটি ব্যাচের সাথে তার আন্ডারে কতটি শিপমেন্ট আছে তাও গুনে দেখাবে
    const batches = await Batch.find().sort({ createdAt: -1 });

    // শিপমেন্ট কাউন্টসহ ডাটা সাজানো
    const batchData = await Promise.all(
      batches.map(async (b) => {
        const count = await Shipment.countDocuments({ batch: b._id });
        return { ...b.toObject(), shipmentCount: count };
      }),
    );

    res.json(batchData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- ২. নতুন ব্যাচ তৈরি করা (Create Batch) ---
router.post("/batches", async (req, res) => {
  try {
    const newBatch = new Batch(req.body);
    const savedBatch = await newBatch.save();
    res.status(201).json(savedBatch);
  } catch (err) {
    res.status(400).json({ error: "এই নামে ব্যাচ ইতিমধ্যে আছে বা ডাটা ভুল।" });
  }
});

// --- ৩. একটি নির্দিষ্ট ব্যাচের বিস্তারিত ও তার শিপমেন্টগুলো দেখা ---
// --- ৩. একটি নির্দিষ্ট ব্যাচের বিস্তারিত ও তার শিপমেন্টগুলো দেখা ---
router.get("/batches/:id", async (req, res) => {
  try {
    const batch = await Batch.findById(req.params.id);
    if (!batch) return res.status(404).json({ error: "ব্যাচ পাওয়া যায়নি।" });

    // ✅ আসল ম্যাজিক এখানেই! customer এর পাশাপাশি agency-কেও populate করা হলো
    const shipments = await Shipment.find({ batch: batch._id })
      .populate("customer")
      .populate("agency"); // এই লাইনটি যুক্ত করা হয়েছে

    res.json({ batch, shipments });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- ৪. শিপমেন্টগুলোকে ব্যাচে যুক্ত করা (Assign Shipments to Batch) ---
router.put("/batches/:id/assign", async (req, res) => {
  try {
    const { shipmentIds } = req.body; // ফ্রন্টএন্ড থেকে অ্যারে আসবে [id1, id2...]

    // শিপমেন্টগুলোর ভেতরে ব্যাচ আইডি আপডেট করা
    await Shipment.updateMany(
      { _id: { $in: shipmentIds } },
      { $set: { batch: req.params.id } },
    );

    res.json({ success: true, message: "শিপমেন্টগুলো ব্যাচে যুক্ত হয়েছে।" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- ৫. ব্যাচের স্ট্যাটাস আপডেট ও বাল্ক শিপমেন্ট আপডেট ---
router.put("/batches/:id/status", async (req, res) => {
  try {
    const { status } = req.body;

    // ১. ব্যাচ স্ট্যাটাস আপডেট
    const updatedBatch = await Batch.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true },
    );

    // ২. ম্যাজিক পার্ট: ব্যাচ 'In-Transit' হলে সব শিপমেন্টও 'In-Transit' হয়ে যাবে
    if (
      status === "In-Transit" ||
      status === "Arrived" ||
      status === "Delivered"
    ) {
      await Shipment.updateMany(
        { batch: req.params.id },
        { $set: { status: status } },
      );
    }

    res.json(updatedBatch);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- ৬. ব্যাচ ডিলিট করা ---
router.delete("/batches/:id", async (req, res) => {
  try {
    // ব্যাচ ডিলিট করার আগে শিপমেন্টগুলো থেকে ব্যাচ রেফারেন্স সরিয়ে ফেলা
    await Shipment.updateMany(
      { batch: req.params.id },
      { $unset: { batch: "" } },
    );
    await Batch.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "ব্যাচ ডিলিট হয়েছে।" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
