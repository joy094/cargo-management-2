import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import "./BranchProfile.css";

export default function PaymentLedger({ activeMark, summary, invoiceHistory }) {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (activeMark) {
      fetchPayments();
    }
  }, [activeMark]);

  const fetchPayments = async () => {
    try {
      // 🔥 URL টি পরিবর্তন করে আপনার পেমেন্ট রাউটের সাথে মেলানো হলো
      const res = await axios.get(
        `/api/payments/history/${encodeURIComponent(activeMark)}`,
      );
      if (res.data.success) {
        setPayments(res.data.payments);
      }
    } catch (error) {
      console.error("Error fetching payments", error);
    } finally {
      setLoading(false);
    }
  };

  const ledgerData = useMemo(() => {
    const combined = [];

    invoiceHistory.forEach((inv) => {
      combined.push({
        id: inv._id,
        date: new Date(inv.date),
        type: "INVOICE",
        description: `Commercial Invoice (${inv.items?.length || 0} items)`,
        debit: (inv.totalAmount || 0) + (inv.transportBill || 0),
        credit: inv.discount || 0,
      });
    });

    payments.forEach((pay) => {
      combined.push({
        id: pay.transactionId || pay._id.slice(-6).toUpperCase(),
        date: new Date(pay.date),
        type: pay.type,
        description: pay.remarks || `Payment via ${pay.paymentMethod}`,
        debit: 0,
        credit: pay.amount || 0,
      });
    });

    combined.sort((a, b) => a.date - b.date);

    let currentBalance = 0;
    return combined.map((item) => {
      currentBalance = currentBalance + item.debit - item.credit;
      return { ...item, balance: currentBalance };
    });
  }, [invoiceHistory, payments]);

  if (loading) return <div style={{ padding: "20px" }}>Loading Ledger...</div>;

  return (
    <div className="tab-content ledger-wrapper">
      <div
        className="controls-bar no-print"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
        }}
      >
        <h3>Statement of Account</h3>
        <button
          onClick={() => window.print()}
          style={{
            background: "#0f172a",
            color: "white",
            padding: "10px 20px",
            borderRadius: "5px",
            cursor: "pointer",
            fontWeight: "bold",
            border: "none",
          }}
        >
          🖨️ Print Statement
        </button>
      </div>

      {/* 🔥 এই পুরো অংশটি প্রিন্ট হবে */}
      <div
        id="ledger-print-section"
        className="table-card"
        style={{ padding: "20px", background: "#fff" }}
      >
        {/* প্রিন্ট হেডার এবং কাস্টমার ইনফো */}
        <div
          className="ledger-header"
          style={{
            marginBottom: "20px",
            borderBottom: "2px solid #e2e8f0",
            paddingBottom: "20px",
          }}
        >
          <h2
            style={{
              textAlign: "center",
              margin: "0 0 5px 0",
              color: "#0f172a",
              textTransform: "uppercase",
            }}
          >
            Saba & Rihan Enterprise
          </h2>
          <p
            style={{
              textAlign: "center",
              margin: "0 0 20px 0",
              fontWeight: "bold",
              fontSize: "16px",
              color: "#475569",
            }}
          >
            Customer Account Statement
          </p>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: "20px",
            }}
          >
            <div>
              <strong>Shipping Mark:</strong>{" "}
              <span
                style={{
                  fontSize: "18px",
                  color: "#dc2626",
                  fontWeight: "bold",
                }}
              >
                {activeMark}
              </span>{" "}
              <br />
              <strong>Customer Name:</strong> {summary?.branchName || "N/A"}{" "}
              <br />
              <strong>Phone:</strong> {summary?.phone || "N/A"}
            </div>
            <div style={{ textAlign: "right" }}>
              <strong>Print Date:</strong>{" "}
              {new Date().toLocaleDateString("en-GB")}
            </div>
          </div>

          {/* 🔥 নতুন যুক্ত করা ৪টি সামারি বক্স */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              background: "#f8fafc",
              padding: "15px",
              borderRadius: "8px",
              border: "1px solid #cbd5e1",
            }}
          >
            <div
              style={{
                textAlign: "center",
                width: "25%",
                borderRight: "1px solid #e2e8f0",
              }}
            >
              <span
                style={{
                  fontSize: "12px",
                  color: "#64748b",
                  textTransform: "uppercase",
                }}
              >
                Total Billed
              </span>
              <div
                style={{
                  fontSize: "16px",
                  fontWeight: "bold",
                  color: "#0f172a",
                }}
              >
                ৳ {summary?.totalBilled?.toLocaleString() || 0}
              </div>
            </div>
            <div
              style={{
                textAlign: "center",
                width: "25%",
                borderRight: "1px solid #e2e8f0",
              }}
            >
              <span
                style={{
                  fontSize: "12px",
                  color: "#64748b",
                  textTransform: "uppercase",
                }}
              >
                Total Paid
              </span>
              <div
                style={{
                  fontSize: "16px",
                  fontWeight: "bold",
                  color: "#16a34a",
                }}
              >
                ৳ {summary?.totalPaid?.toLocaleString() || 0}
              </div>
            </div>
            <div
              style={{
                textAlign: "center",
                width: "25%",
                borderRight: "1px solid #e2e8f0",
              }}
            >
              <span
                style={{
                  fontSize: "12px",
                  color: "#64748b",
                  textTransform: "uppercase",
                }}
              >
                Total Discount
              </span>
              <div
                style={{
                  fontSize: "16px",
                  fontWeight: "bold",
                  color: "#eab308",
                }}
              >
                ৳ {summary?.totalDiscount?.toLocaleString() || 0}
              </div>
            </div>
            <div style={{ textAlign: "center", width: "25%" }}>
              <span
                style={{
                  fontSize: "12px",
                  color: "#dc2626",
                  textTransform: "uppercase",
                  fontWeight: "bold",
                }}
              >
                Current Due
              </span>
              <div
                style={{
                  fontSize: "18px",
                  fontWeight: "bold",
                  color: "#dc2626",
                }}
              >
                ৳ {summary?.currentDue?.toLocaleString() || 0}
              </div>
            </div>
          </div>
        </div>

        {/* ট্রানজেকশন টেবিল */}
        <table className="pro-table history-table" style={{ width: "100%" }}>
          <thead>
            <tr style={{ background: "#f1f5f9" }}>
              <th style={{ textAlign: "left", padding: "10px" }}>Date</th>
              <th style={{ textAlign: "left", padding: "10px" }}>
                Ref / Invoice No
              </th>
              <th style={{ textAlign: "left", padding: "10px" }}>
                Description
              </th>
              <th style={{ textAlign: "right", padding: "10px" }}>
                Debit (Bill)
              </th>
              <th style={{ textAlign: "right", padding: "10px" }}>
                Credit (Paid/Disc)
              </th>
              <th style={{ textAlign: "right", padding: "10px" }}>
                Balance (Due)
              </th>
            </tr>
          </thead>
          <tbody>
            {ledgerData.length > 0 ? (
              ledgerData.map((item, index) => (
                <tr key={index} style={{ borderBottom: "1px solid #e2e8f0" }}>
                  <td style={{ padding: "10px" }}>
                    {item.date.toLocaleDateString("en-GB")}
                  </td>
                  <td style={{ padding: "10px" }}>
                    <strong>{item.id}</strong>
                  </td>
                  <td style={{ padding: "10px" }}>
                    {item.type === "INVOICE" && (
                      <span
                        style={{
                          color: "#dc2626",
                          fontWeight: "bold",
                          fontSize: "12px",
                        }}
                      >
                        [BILL]{" "}
                      </span>
                    )}
                    {item.type === "PAYMENT" && (
                      <span
                        style={{
                          color: "#16a34a",
                          fontWeight: "bold",
                          fontSize: "12px",
                        }}
                      >
                        [PAID]{" "}
                      </span>
                    )}
                    {item.type === "DISCOUNT" && (
                      <span
                        style={{
                          color: "#eab308",
                          fontWeight: "bold",
                          fontSize: "12px",
                        }}
                      >
                        [DISC]{" "}
                      </span>
                    )}
                    {item.description}
                  </td>
                  <td
                    style={{
                      textAlign: "right",
                      padding: "10px",
                      color: item.debit > 0 ? "#dc2626" : "inherit",
                    }}
                  >
                    {item.debit > 0 ? `৳ ${item.debit.toLocaleString()}` : "-"}
                  </td>
                  <td
                    style={{
                      textAlign: "right",
                      padding: "10px",
                      color: item.credit > 0 ? "#16a34a" : "inherit",
                    }}
                  >
                    {item.credit > 0
                      ? `৳ ${item.credit.toLocaleString()}`
                      : "-"}
                  </td>
                  <td
                    style={{
                      textAlign: "right",
                      padding: "10px",
                      fontWeight: "bold",
                    }}
                  >
                    ৳ {item.balance.toLocaleString()}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan="6"
                  className="no-data"
                  style={{ padding: "20px", textAlign: "center" }}
                >
                  কোনো লেনদেনের রেকর্ড পাওয়া যায়নি
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* ফুটার সিগনেচার (প্রিন্টের সময় দেখাবে) */}
        <div
          style={{
            marginTop: "50px",
            display: "flex",
            justifyContent: "space-between",
            padding: "0 20px",
          }}
        >
          <div
            style={{
              borderTop: "1px solid #000",
              paddingTop: "5px",
              width: "200px",
              textAlign: "center",
            }}
          >
            Customer Signature
          </div>
          <div
            style={{
              borderTop: "1px solid #000",
              paddingTop: "5px",
              width: "200px",
              textAlign: "center",
            }}
          >
            Authorised Signature
          </div>
        </div>
      </div>
    </div>
  );
}
