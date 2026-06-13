import express from "express";
import { Shipment } from "./models.js";

const router = express.Router();

// ✅ পাবলিক ট্র্যাকিং এপিআই (গ্রাহকদের জন্য)
router.get("/public/tracking/:trackingCode", async (req, res) => {
  try {
    const { trackingCode } = req.params;
    const searchCode = trackingCode.trim().toUpperCase();

    // ১. ট্র্যাকিং নম্বর, চায়না ট্র্যাকিং অথবা কার্টন নম্বর দিয়ে মালটি খোঁজা
    const shipment = await Shipment.findOne({
      $or: [
        { trackingNumber: searchCode },
        { chinaTrackingNo: searchCode },

      ],
    }).populate("batch"); // ব্যাচ পপুলেট করছি কারণ ব্যাচের স্ট্যাটাস জানতে হবে

    if (!shipment) {
      return res.status(404).json({
        success: false,
        message:
          "No tracking details found for this code. Please check your tracking number.",
      });
    }

    // ২. মাস্টার বক্স লজিক (যদি এটি কোনো মাস্টার বক্সের ভেতরে থাকে)
    let masterBoxDetails = null;
    let currentStatus = shipment.status;

    if (shipment.parentId) {
      const masterBox = await Shipment.findById(shipment.parentId).populate(
        "batch",
      );
      if (masterBox) {
        masterBoxDetails = {
          trackingNumber: masterBox.trackingNumber,
          cartonNo: masterBox.cartonNo,
          note: "Your item is consolidated inside a Master Box for better security.",
        };
        // যদি মাস্টার বক্স কোনো ফ্লাইটে (ব্যাচে) থাকে, তবে তার স্ট্যাটাসই ছোট বক্সের স্ট্যাটাস হবে
        if (masterBox.status !== "Warehouse Received") {
          currentStatus = masterBox.status;
        }
      }
    }

    // ৩. ডায়নামিক ট্র্যাকিং টাইমলাইন তৈরি
    const allStages = [
      "Warehouse Received",
      "Processing",
      "Ready to Ship",
      "Dispatched",
      "In-Transit",
      "Customs Clearing",
      "Arrived",
      "Delivered",
    ];

    const currentIndex = allStages.indexOf(currentStatus);

    // ক্যাটাগরি চেক করা (Air নাকি Sea)
    const isAir =
      shipment.category && shipment.category.toLowerCase().includes("air");

    // ৮টি স্টেজের জন্য ডায়নামিক টাইমলাইন জেনারেট করা
    const timeline = allStages.map((stage, index) => {
      let stepDate = null;

      if (index === 0) {
        stepDate = shipment.receivedDate || shipment.createdAt;
      } else if (index === currentIndex && index > 0) {
        stepDate = shipment.updatedAt;
      }

      // 🔥 ম্যাজিক লজিক: ক্যাটাগরি অনুযায়ী নাম পরিবর্তন (শুধু কাস্টমারদের দেখানোর জন্য)
      let displayStatus = stage;

      if (stage === "Ready to Ship") {
        displayStatus = isAir ? "Ready to Fly ✈️" : "Ready to Sail 🚢";
      } else if (stage === "Dispatched") {
        displayStatus = isAir
          ? "Dispatched (Air Freight)"
          : "Dispatched (Sea Freight)";
      }

      return {
        status: displayStatus,
        completed: index <= currentIndex,
        date: stepDate,
      };
    });
    // ৪. ফ্রন্টএন্ডের জন্য সুন্দরভাবে ডেটা সাজানো (সিক্রেট ডেটা হাইড করা)
    const responseData = {
      success: true,
      trackingInfo: {
        trackingNumber: shipment.trackingNumber,
        chinaTrackingNo:
          shipment.chinaTrackingNo !== "-" ? shipment.chinaTrackingNo : "N/A",
        currentStatus: currentStatus,
      },
      customerInfo: {
        // প্রাইভেসির জন্য কাস্টমারের পুরো নাম না দেখিয়ে একটু মাস্ক করে দেওয়া ভালো (ঐচ্ছিক)
        name: shipment.customerName || "Registered Customer",
        shippingMark: shipment.shippingMark,
      },
      productDetails: {
        productName: shipment.productName,
        cartonNo: shipment.cartonNo,
        quantity: shipment.quantity,
        totalWeight: `${shipment.actualWeight || shipment.grossWeight} KG`,
        totalCBM: `${shipment.cbm} m³`,
        category: shipment.category || "Standard Cargo",
      },
      masterBox: masterBoxDetails, // যদি থাকে
      timeline: timeline, // ফ্রন্টএন্ডে প্রোগ্রেস বার বানানোর জন্য
    };

    res.status(200).json(responseData);
  } catch (error) {
    console.error("Tracking API Error:", error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
});

export default router;
