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

// ✅ ২. আইটেম অনুযায়ী বিল ইনপুট (রেট, টোটাল, ট্রান্সপোর্ট ও ডিসকাউন্ট সেভ করা)
router.post("/generate-invoice", async (req, res) => {
  try {
    // 🔥 req.body থেকে transportBill এবং discount রিসিভ করা হলো
    const { items, invoiceTotal, discount, transportBill } = req.body;
    const invoiceId = `INV-${Date.now()}`;

    // ফ্রন্টএন্ড থেকে আসা আইটেমগুলোর রেট ও ইনভয়েস লেভেলের ডাটা আপডেট করা
    const updatePromises = items.map((item) => {
      return Shipment.findByIdAndUpdate(item.id, {
        perKgRate: item.rate,
        totalBill: item.total,
        isBilled: true,
        billingDate: new Date(),
        invoiceId: invoiceId,
        discount: discount || 0, // 🔥 ইনভয়েসের মোট ডিসকাউন্ট আইটেমে সেভ হচ্ছে
        transportBill: transportBill || 0, // 🔥 ট্রান্সপোর্ট বিল আইটেমে সেভ হচ্ছে
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

/// ✅ ৩. ড্যাশবোর্ড সামারি: Shipping Marks অনুযায়ী টোটাল এবং বকেয়া (Due) হিসাব
router.get("/summary/:shippingMark", async (req, res) => {
  try {
    const requestedMark = req.params.shippingMark;
    const searchRegex = new RegExp(`^${requestedMark}$`, "i");

    // 🔥 ১. প্রথমে ব্রাঞ্চ খুঁজে বের করা (পুরোনো String বা নতুন Array দুই নিয়মেই)
    const branchInfo = await Branch.findOne({
      $or: [{ shippingMark: searchRegex }, { shippingMarks: searchRegex }],
    });

    // 🔥 ২. ব্রাঞ্চের সবগুলো মার্ক একটি Array তে নেওয়া (যাতে সবার ডেটা একসাথে আসে)
    let allMarksToSearch = [searchRegex]; // ডিফল্ট (যদি ব্রাঞ্চ না পাওয়া যায়)
    if (
      branchInfo &&
      branchInfo.shippingMarks &&
      branchInfo.shippingMarks.length > 0
    ) {
      allMarksToSearch = branchInfo.shippingMarks.map(
        (m) => new RegExp(`^${m}$`, "i"),
      );
    } else if (branchInfo && branchInfo.shippingMark) {
      allMarksToSearch = [new RegExp(`^${branchInfo.shippingMark}$`, "i")];
    }

    // ৩. Shipment থেকে টোটাল বিল, ওজন এবং বক্সের হিসাব
    const stats = await Shipment.aggregate([
      {
        $match: {
          shippingMark: { $in: allMarksToSearch },
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

    // ৪. Payment কালেকশন থেকে হিসাব
    const payments = await Payment.find({
      shippingMark: { $in: allMarksToSearch },
    });
    let totalPaid = 0;
    let totalDiscount = 0;

    payments.forEach((txn) => {
      const type = txn.type ? txn.type.toUpperCase() : "";
      if (type === "PAYMENT") {
        totalPaid += txn.amount;
      } else if (type === "DISCOUNT" || type === "ADJUSTMENT") {
        totalDiscount += txn.amount;
      }
    });

    const currentDue = summaryData.totalBilled - totalPaid - totalDiscount;

    res.status(200).json({
      success: true,
      summary: {
        ...summaryData,
        totalPaid,
        totalDiscount,
        currentDue,
        branchName: branchInfo ? branchInfo.branchName : "",
        phone: branchInfo ? branchInfo.phone : "",
        address: branchInfo ? branchInfo.address : "",
        shippingMarks: branchInfo ? branchInfo.shippingMarks : [], // 🔥 একাধিক মার্ক প্রোফাইলে পাঠানোর জন্য
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
    // 🔥 ফ্রন্টএন্ড থেকে আসা shippingMarks (Array) রিসিভ করা হলো
    const { branchName, shippingMarks, phone, address } = req.body;

    // চেক করা হচ্ছে যে পাঠানো মার্কগুলোর মধ্যে কোনোটি আগে থেকেই অন্য ব্রাঞ্চে আছে কি না
    if (shippingMarks && shippingMarks.length > 0) {
      const existingBranch = await Branch.findOne({
        shippingMarks: { $in: shippingMarks }, // $in ব্যবহার করে Array এর ভেতরে খোঁজা হচ্ছে
      });

      if (existingBranch) {
        return res.status(400).json({
          success: false,
          message:
            "এই Shipping Mark গুলোর মধ্যে কোনো একটি ইতিমধ্যে অন্য ব্রাঞ্চে ব্যবহার করা হয়েছে!",
        });
      }
    }

    const newBranch = new Branch({
      branchName,
      shippingMarks, // 🔥 Array টি ডাটাবেসে সেভ হচ্ছে
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

// // ✅ ২. ব্রাঞ্চ আপডেট করা (Update Branch)
// router.put("/:id", async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { branchName, shippingMark, phone, address } = req.body;

//     const updatedBranch = await Branch.findByIdAndUpdate(
//       id,
//       { branchName, shippingMark, phone, address },
//       { new: true },
//     );

//     if (!updatedBranch) {
//       return res
//         .status(404)
//         .json({ success: false, message: "ব্রাঞ্চ খুঁজে পাওয়া যায়নি!" });
//     }

//     res.status(200).json({
//       success: true,
//       message: "ব্রাঞ্চ সফলভাবে আপডেট হয়েছে",
//       branch: updatedBranch,
//     });
//   } catch (error) {
//     console.error("Branch Update Error:", error);
//     res.status(500).json({
//       success: false,
//       message: "সার্ভার এরর, ব্রাঞ্চ আপডেট করা যায়নি!",
//     });
//   }
// });

// 🔥 (বোনাস) আপনার আগের Edit (PUT) রাউটে shippingMarks আপডেট করার জন্য নিশ্চিত করুন যে কোডটি এভাবে আছে:
router.put("/:id", async (req, res) => {
  try {
    const updatedBranch = await Branch.findByIdAndUpdate(
      req.params.id,
      req.body, // { branchName, shippingMarks, phone, address }
      { new: true },
    );
    res.json({ success: true, branch: updatedBranch });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ ৩. সব ব্রাঞ্চ ফেচ করা (Get All Branches)
// ✅ সব ব্রাঞ্চ দেখা (Batch Filter সহ)
router.get("/", async (req, res) => {
  try {
    const { batch } = req.query; // ফ্রন্টএন্ড থেকে আসা ব্যাচ আইডি
    let filter = {};

    if (batch) {
      // ১. ওই নির্দিষ্ট ব্যাচের সব শিপমেন্ট খোঁজা
      const shipments = await Shipment.find({ batch: batch }, "shippingMark");

      // ২. ওই ব্যাচের মধ্যে থাকা সব ইউনিক শিপিং মার্ক বের করা
      const marksInBatch = [
        ...new Set(
          shipments.map((s) => s.shippingMark?.toUpperCase()).filter(Boolean),
        ),
      ];

      if (marksInBatch.length > 0) {
        // ৩. রেগুলার এক্সপ্রেশন দিয়ে কেস-ইনসেনসিটিভ ম্যাচ করানো (যেমন: J-SKL)
        const regexMarks = marksInBatch.map(
          (m) =>
            new RegExp(`^${m.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
        );
        filter = {
          $or: [
            { shippingMark: { $in: regexMarks } },
            { shippingMarks: { $in: regexMarks } },
          ],
        };
      } else {
        // ওই ব্যাচে কোনো শিপমেন্ট না থাকলে ফাঁকা লিস্ট পাঠাবে
        return res.json({ success: true, branches: [] });
      }
    }

    const branches = await Branch.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, branches });
  } catch (error) {
    console.error("Branch Fetch Error:", error);
    res.status(500).json({ success: false, message: "সার্ভার এরর!" });
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

// ✅ ইনভয়েস হিস্ট্রি ফেচ করা (সব মার্ক একসাথে)
router.get("/invoice-history/:shippingMark", async (req, res) => {
  try {
    const requestedMark = req.params.shippingMark;

    const safeMark = requestedMark.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const searchRegex = new RegExp(`^${safeMark}$`, "i");

    const branch = await Branch.findOne({
      $or: [{ shippingMark: searchRegex }, { shippingMarks: searchRegex }],
    });

    let allMarksToSearch = [requestedMark]; // Aggregation এ স্ট্রিং বা রেজেক্স দুটিই কাজ করে, তবে বেস্ট হলো স্ট্রিং পাঠানো।
    if (branch && branch.shippingMarks && branch.shippingMarks.length > 0) {
      allMarksToSearch = branch.shippingMarks;
    }

    const history = await Shipment.aggregate([
      // 🔥 $in অপারেটর দিয়ে সবগুলো মার্কের ডাটা একসাথে আনা হচ্ছে
      {
        $match: {
          shippingMark: {
            $in: allMarksToSearch.map((m) => new RegExp(`^${m}$`, "i")),
          },
          isBilled: true,
        },
      },

      {
        $lookup: {
          from: "batches",
          localField: "batch",
          foreignField: "_id",
          as: "batchDetails",
        },
      },
      {
        $unwind: {
          path: "$batchDetails",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $group: {
          _id: "$invoiceId",
          date: { $first: "$billingDate" },
          transportBill: { $first: { $ifNull: ["$transportBill", 0] } }, // 🔥 ডাটাবেস থেকে ট্রান্সপোর্ট বিল রিড করা হলো
          discount: { $first: { $ifNull: ["$discount", 0] } }, // 🔥 ডাটাবেস থেকে ডিসকাউন্ট রিড করা হলো
          totalAmount: { $sum: "$totalBill" },
          totalWeight: { $sum: { $toDouble: "$grossWeight" } },
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
      { $sort: { date: -1 } },
      { $sort: { date: -1 } },
    ]);

    res.status(200).json({ success: true, history });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ success: false, message: "হিস্ট্রি লোড করতে সমস্যা হয়েছে" });
  }
});

// ✅ সব আইটেম আনার রাউট (সব মার্ক একসাথে)
router.get("/all-items/:shippingMark", async (req, res) => {
  try {
    const requestedMark = req.params.shippingMark;
    const searchRegex = new RegExp(`^${requestedMark}$`, "i");

    const branch = await Branch.findOne({
      $or: [{ shippingMark: searchRegex }, { shippingMarks: searchRegex }],
    });

    let allMarksToSearch = [searchRegex];
    if (branch && branch.shippingMarks && branch.shippingMarks.length > 0) {
      allMarksToSearch = branch.shippingMarks.map(
        (m) => new RegExp(`^${m}$`, "i"),
      );
    }

    const items = await Shipment.find({
      shippingMark: { $in: allMarksToSearch },
    })
      .populate("batch", "batchName")
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
    // ১. সব ব্রাঞ্চ থেকে পুরোনো shippingMark এবং নতুন shippingMarks দুটিই নিয়ে আসা
    const branches = await Branch.find({}, "shippingMark shippingMarks");

    // ২. সব ব্রাঞ্চের সবগুলো মার্ক একটি সিঙ্গেল লিস্টে (Set) জমা করা
    let activeShippingMarks = new Set();

    branches.forEach((branch) => {
      // পুরোনো সিঙ্গেল মার্ক থাকলে যোগ করা
      if (branch.shippingMark) {
        activeShippingMarks.add(branch.shippingMark.toUpperCase());
      }
      // নতুন Array ফরম্যাটে থাকলে সবগুলো যোগ করা
      if (branch.shippingMarks && branch.shippingMarks.length > 0) {
        branch.shippingMarks.forEach((mark) => {
          activeShippingMarks.add(mark.toUpperCase());
        });
      }
    });

    // Set কে নরমাল Array তে রূপান্তর করা
    const activeMarksArray = Array.from(activeShippingMarks);

    // ৩. এমন শিপমেন্ট খোঁজা যেগুলো Arrived বা Delivered হয়েছে
    const unassignedShipments = await Shipment.find({
      status: { $in: ["Arrived", "Delivered"] },
      isMasterCarton: { $ne: true }, // 🔥 শুধু সাব-বক্স বা সাধারণ বক্স আনবে
    }).sort({ receivedDate: -1 });

    // ৪. কেস-ইনসেনসিটিভ চেকিংয়ের জন্য জাভাস্ক্রিপ্ট দিয়ে ফিল্টার করা (সবচেয়ে সেফ পদ্ধতি)
    const finalUnassigned = unassignedShipments.filter((shipment) => {
      if (!shipment.shippingMark) return true; // মার্ক না থাকলে আনঅ্যাসাইনড
      return !activeMarksArray.includes(shipment.shippingMark.toUpperCase());
    });

    res.json(finalUnassigned);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// ✅ Excel থেকে Bulk Branch আপলোড করার API
router.post("/bulk-import", async (req, res) => {
  try {
    const { branches } = req.body;

    if (!branches || branches.length === 0) {
      return res.status(400).json({ error: "No branch data provided" });
    }

    // Insert Many দিয়ে একসাথে সবগুলো সেভ করা (Duplicate Skip করার জন্য ordered: false দেওয়া হয়েছে)
    const result = await Branch.insertMany(branches, { ordered: false });

    res.json({
      success: true,
      message: `সফলভাবে ${result.length} টি ব্রাঞ্চ যুক্ত হয়েছে!`,
    });
  } catch (error) {
    // যদি কিছু ডুপ্লিকেট থাকে, তবুও যেন বাকিগুলো সেভ হয়
    if (error.code === 11000) {
      res.json({
        success: true,
        message:
          "নতুন ব্রাঞ্চগুলো সেভ হয়েছে, তবে কিছু ডুপ্লিকেট মার্ক স্কিপ করা হয়েছে।",
      });
    } else {
      console.error("Bulk Import Error:", error);
      res.status(500).json({ error: "আপলোড ব্যর্থ হয়েছে।" });
    }
  }
});

export default router;
