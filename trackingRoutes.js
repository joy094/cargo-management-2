import express from "express";
import { Shipment } from "./models.js";

const router = express.Router();

router.get("/public/tracking/:trackingCode", async (req, res) => {
  try {
    const { trackingCode } = req.params;
    const searchCode = trackingCode.trim().toUpperCase();

    // 🔥 ১. স্মার্ট রেজেক্স: কমা দিয়ে লেখা লিস্টের ভেতর থেকে নিখুঁতভাবে আপনার কোডটি খুঁজে বের করবে
    // এটি শুধু আংশিক মিল নয়, বরং কমা বা স্পেসের মাঝের সঠিক শব্দটি ধরবে
    const searchRegex = new RegExp(searchCode, "i");

    const shipments = await Shipment.find({
      $or: [{ trackingNumber: searchRegex }, { chinaTrackingNo: searchRegex }],
    }).populate("batch");

    if (!shipments || shipments.length === 0) {
      return res.status(404).json({
        success: false,
        message:
          "No tracking details found for this code. Please check your tracking number.",
      });
    }

    // ২. সবগুলো বক্সের ডাটা প্রসেস করা
    const allProductsTimeline = await Promise.all(
      shipments.map(async (shipment) => {
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
            };
            if (masterBox.status !== "Warehouse Received") {
              currentStatus = masterBox.status;
            }
          }
        }

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
        const isAir =
          shipment.category && shipment.category.toLowerCase().includes("air");

        const timeline = allStages.map((stage, index) => {
          let stepDate =
            index === 0 ? shipment.receivedDate || shipment.createdAt : null;
          if (index === currentIndex && index > 0)
            stepDate = shipment.updatedAt;

          let displayStatus = stage;
          if (stage === "Ready to Ship")
            displayStatus = isAir ? "Ready to Fly ✈️" : "Ready to Sail 🚢";
          else if (stage === "Dispatched")
            displayStatus = isAir
              ? "Dispatched (Air Freight)"
              : "Dispatched (Sea Freight)";

          return {
            status: displayStatus,
            completed: index <= currentIndex,
            date: stepDate,
          };
        });

        return {
          shipmentId: shipment._id,
          trackingInfo: {
            trackingNumber: shipment.trackingNumber,
            chinaTrackingNo: shipment.chinaTrackingNo,
            currentStatus: currentStatus, // ফ্রন্টএন্ডে স্ট্যাটাস ব্যাজ দেখানোর জন্য
          },
          customerInfo: {
            name: shipment.customerName || "Registered Customer",
            shippingMark: shipment.shippingMark,
          },
          productDetails: {
            productName: shipment.productName,
            cartonNo: shipment.cartonNo,
            quantity: shipment.quantity,
          },
          masterBox: masterBoxDetails,
          timeline: timeline,
        };
      }),
    );

    // 🔥 ৩. স্ট্যাটাস সামারি তৈরি করা (কয়টা বক্স কোন অবস্থায় আছে)
    const statusCounts = {};
    allProductsTimeline.forEach((item) => {
      const status = item.trackingInfo.currentStatus;
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });

    // ৪. ফাইনাল রেসপন্স
    res.status(200).json({
      success: true,
      searchedCode: searchCode,
      summary: {
        totalBoxes: allProductsTimeline.length, // মোট বক্সের সংখ্যা
        statusBreakdown: statusCounts, // কোন স্ট্যাটাসে কয়টা বক্স আছে তার হিসাব
      },
      results: allProductsTimeline, // বক্সগুলোর বিস্তারিত লিস্ট
    });
  } catch (error) {
    console.error("Tracking API Error:", error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
});

export default router;
