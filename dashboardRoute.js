// routes/dashboardRoutes.js
import express from "express";
import { Shipment, Branch, Payment, Batch } from "./models.js";

const router = express.Router();

router.get("/summary", async (req, res) => {
  try {
    // ১. মোট ব্রাঞ্চ সংখ্যা
    const totalBranches = await Branch.countDocuments();

    // ২. মোট ব্যাচ সংখ্যা
    const totalBatches = await Batch.countDocuments();

    // ৩. শিপমেন্ট অ্যানালিটিক্স (Two-Stage Aggregation সহ গ্লোবাল হিসাব)
    const shipmentStats = await Shipment.aggregate([
      {
        $match: { isMasterCarton: { $ne: true } },
      },
      // প্রথম ধাপ: ইনভয়েস আইডি অনুযায়ী গ্রুপ করে খরচগুলো একবার করে নেওয়া
      {
        $group: {
          _id: {
            $cond: [
              { $eq: ["$isBilled", true] },
              "$invoiceId",
              "$_id", // আনবিল্ড আইটেমগুলো যাতে আলাদা থাকে
            ],
          },
          invoiceBoxes: { $sum: 1 },
          invoiceWeight: {
            $sum: {
              $toDouble: {
                $ifNull: ["$actualWeight", { $ifNull: ["$grossWeight", 0] }],
              },
            },
          },
          transportBill: { $first: { $ifNull: ["$transportBill", 0] } },
          receivingCost: { $first: { $ifNull: ["$invoiceReceivingCost", 0] } },
          packagingCost: { $first: { $ifNull: ["$invoicePackagingCost", 0] } },
          discount: { $first: { $ifNull: ["$discount", 0] } },
          totalBillSum: {
            $sum: {
              $cond: [
                { $eq: ["$isBilled", true] },
                { $toDouble: { $ifNull: ["$totalBill", 0] } },
                0,
              ],
            },
          },
          isBilled: { $first: "$isBilled" },
        },
      },
      // দ্বিতীয় ধাপ: গ্লোবাল গ্র্যান্ড টোটাল এবং বক্স/ওজন যোগ করা
      {
        $group: {
          _id: null,
          totalBoxes: { $sum: "$invoiceBoxes" },
          totalWeight: { $sum: "$invoiceWeight" },
          totalBilledAmount: {
            $sum: {
              $cond: [
                { $eq: ["$isBilled", true] },
                {
                  $subtract: [
                    {
                      $add: [
                        "$totalBillSum",
                        "$transportBill",
                        "$receivingCost",
                        "$packagingCost",
                      ],
                    },
                    "$discount",
                  ],
                },
                0,
              ],
            },
          },
        },
      },
    ]);

    // ৪. পেমেন্ট অ্যানালিটিক্স (Payment Collection)
    const paymentStats = await Payment.aggregate([
      {
        $group: {
          _id: null,
          totalCollected: {
            $sum: {
              $cond: [
                { $eq: ["$type", "PAYMENT"] },
                { $toDouble: { $ifNull: ["$amount", 0] } },
                0,
              ],
            },
          },
          totalDiscount: {
            $sum: {
              $cond: [
                { $in: ["$type", ["DISCOUNT", "ADJUSTMENT"]] },
                { $toDouble: { $ifNull: ["$amount", 0] } },
                0,
              ],
            },
          },
        },
      },
    ]);

    // ৫. লেটেস্ট পেমেন্ট হিস্ট্রি
    const recentPayments = await Payment.find()
      .sort({ createdAt: -1 })
      .limit(5);

    // ডিফল্ট ভ্যালু সেট করা
    const sStats = shipmentStats[0] || {
      totalBoxes: 0,
      totalWeight: 0,
      totalBilledAmount: 0,
    };
    const pStats = paymentStats[0] || { totalCollected: 0, totalDiscount: 0 };

    // 🔥 ৬. বকেয়া কাস্টমারদের তালিকা (Due List) তৈরি - গ্র্যান্ড টোটাল ফিক্সসহ
    const allBranches = await Branch.find(
      {},
      "branchName shippingMark shippingMarks phone address",
    );

    const dueListPromises = allBranches.map(async (branch) => {
      let marksToSearch = [];
      if (branch.shippingMarks && branch.shippingMarks.length > 0) {
        marksToSearch = branch.shippingMarks.map(
          (m) =>
            new RegExp(`^${m.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
        );
      } else if (branch.shippingMark) {
        marksToSearch = [
          new RegExp(
            `^${branch.shippingMark.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
            "i",
          ),
        ];
      } else {
        return { _id: branch._id, currentDue: 0 };
      }

      // ওই ব্রাঞ্চের সবগুলো ইনভয়েসের সঠিক গ্র্যান্ড টোটাল বের করা
      const billData = await Shipment.aggregate([
        {
          $match: {
            shippingMark: { $in: marksToSearch },
            isBilled: true,
            isMasterCarton: { $ne: true },
          },
        },
        {
          $group: {
            _id: "$invoiceId",
            transportBill: { $first: { $ifNull: ["$transportBill", 0] } },
            receivingCost: {
              $first: { $ifNull: ["$invoiceReceivingCost", 0] },
            },
            packagingCost: {
              $first: { $ifNull: ["$invoicePackagingCost", 0] },
            },
            discount: { $first: { $ifNull: ["$discount", 0] } },
            totalBillSum: {
              $sum: { $toDouble: { $ifNull: ["$totalBill", 0] } },
            },
          },
        },
        {
          $group: {
            _id: null,
            total: {
              $sum: {
                $subtract: [
                  {
                    $add: [
                      "$totalBillSum",
                      "$transportBill",
                      "$receivingCost",
                      "$packagingCost",
                    ],
                  },
                  "$discount",
                ],
              },
            },
          },
        },
      ]);

      // ওই ব্রাঞ্চের সবগুলো মার্কের মোট পেমেন্ট ও ডিসকাউন্ট আনা
      const payData = await Payment.find({
        shippingMark: { $in: marksToSearch },
      });
      let paid = 0;
      let ledgerDiscount = 0;

      payData.forEach((p) => {
        const pType = p.type ? p.type.toUpperCase() : "";
        if (pType === "PAYMENT") paid += p.amount;
        else if (pType === "DISCOUNT" || pType === "ADJUSTMENT")
          ledgerDiscount += p.amount;
      });

      const totalBill = billData[0]?.total || 0;
      const currentDue = totalBill - paid - ledgerDiscount;

      return {
        _id: branch._id,
        branchName: branch.branchName,
        shippingMark:
          branch.shippingMarks && branch.shippingMarks.length > 0
            ? branch.shippingMarks.join(", ")
            : branch.shippingMark || "-",
        phone: branch.phone || "N/A",
        currentDue: currentDue,
      };
    });

    const branchesWithDue = await Promise.all(dueListPromises);

    const sortedDueList = branchesWithDue
      .filter((b) => b && b.currentDue > 0)
      .sort((a, b) => b.currentDue - a.currentDue);

    // বর্তমান মার্কেট ডিউ হিসাব
    const totalDue =
      sStats.totalBilledAmount - pStats.totalCollected - pStats.totalDiscount;

    // ৭. ফাইনাল রেসপন্স
    res.status(200).json({
      success: true,
      data: {
        totalBranches,
        totalBatches,
        totalBoxes: sStats.totalBoxes,
        totalWeight: sStats.totalWeight,
        totalBilledAmount: sStats.totalBilledAmount,
        totalCollected: pStats.totalCollected,
        totalDiscount: pStats.totalDiscount,
        totalDue,
        recentPayments,
        dueCustomers: sortedDueList,
      },
    });
  } catch (error) {
    console.error("Dashboard API Error:", error);
    res.status(500).json({
      success: false,
      message: "ড্যাশবোর্ড ডাটা লোড হতে ব্যর্থ হয়েছে",
    });
  }
});

export default router;
