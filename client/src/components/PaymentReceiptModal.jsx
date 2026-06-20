import React from "react";
import ReactDOM from "react-dom";
import "./PaymentReceiptModal.css";

// 💯 টাকার অংক কথায় লেখার সম্পূর্ণ ফাংশন
const numberToWords = (amount) => {
  if (amount === 0 || !amount) return "ZERO TAKA ONLY";
  const amountStr = Number(amount).toFixed(0);
  const a = [
    "",
    "ONE ",
    "TWO ",
    "THREE ",
    "FOUR ",
    "FIVE ",
    "SIX ",
    "SEVEN ",
    "EIGHT ",
    "NINE ",
    "TEN ",
    "ELEVEN ",
    "TWELVE ",
    "THIRTEEN ",
    "FOURTEEN ",
    "FIFTEEN ",
    "SIXTEEN ",
    "SEVENTEEN ",
    "EIGHTEEN ",
    "NINETEEN ",
  ];
  const b = [
    "",
    "",
    "TWENTY",
    "THIRTY",
    "FORTY",
    "FIFTY",
    "SIXTY",
    "SEVENTY",
    "EIGHTY",
    "NINETY",
  ];

  const convert = (num) => {
    if (num < 20) return a[num];
    return b[Math.floor(num / 10)] + (num % 10 !== 0 ? " " + a[num % 10] : "");
  };

  if (amountStr.length > 9) return "AMOUNT TOO LARGE";

  let words = "";
  const crore = Math.floor(amountStr / 10000000);
  const lakh = Math.floor((amountStr % 10000000) / 100000);
  const thousand = Math.floor((amountStr % 100000) / 1000);
  const hundred = Math.floor((amountStr % 1000) / 100);
  const remainder = amountStr % 100;

  if (crore > 0) words += convert(crore) + " CRORE ";
  if (lakh > 0) words += convert(lakh) + " LAKH ";
  if (thousand > 0) words += convert(thousand) + " THOUSAND ";
  if (hundred > 0) words += convert(hundred) + " HUNDRED ";
  if (remainder > 0) words += convert(remainder);

  return words.trim() + " TAKA ONLY";
};

export default function PaymentReceiptModal({ isOpen, onClose, receiptData }) {
  if (!isOpen || !receiptData) return null;

  // প্রিন্ট করার ফাংশন
  const handlePrint = () => {
    window.print();
  };

  return ReactDOM.createPortal(
    <div className="receipt-modal-overlay no-print-bg">
      <div className="pos-receipt" id="receipt-print">
        {/* Header Section */}
        <div className="pos-header">
          <img src="/SABA_&_RIHAN_LOGO.jpeg" alt="Logo" className="pos-logo" />
          <h2 className="pos-company-name">SABA & RIHAN ENTERPRISE</h2>
          <p className="pos-address">
            GOVT. AUTHORISED CUSTOMS
            <br />
            CLEARING & FORWARDING AGENT
          </p>
          <p className="pos-address">
            Uttara Sector-4, Dhaka
            <br />
            Tel: +8801841389672
          </p>
        </div>

        <div className="divider">--------------------------------</div>
        <h3 className="pos-title">PAYMENT RECEIPT</h3>
        <div className="divider">--------------------------------</div>

        {/* Info Section */}
        <div className="pos-info">
          <p>
            <span>DATE:</span>{" "}
            <span>
              {new Date(receiptData.date).toLocaleDateString("en-GB")}
            </span>
          </p>
          <p>
            <span>RECEIPT NO:</span> <span>{receiptData.receiptId}</span>
          </p>
          <p>
            <span>SHIPPING MARK:</span> <span>{receiptData.shippingMark}</span>
          </p>
          <p>
            <span>CUSTOMER:</span> <span>{receiptData.customerName}</span>
          </p>
        </div>

        <div className="divider">--------------------------------</div>

        {/* Transaction Table */}
        <table className="pos-table">
          <thead>
            <tr>
              <th className="text-left">DESCRIPTION</th>
              <th className="text-right">AMOUNT</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan="2" className="divider-td">
                --------------------------------
              </td>
            </tr>
            <tr>
              <td className="text-left">
                PAYMENT AGAINST
                <br />
                INV: {receiptData.invoiceId}
              </td>
              <td className="text-right align-bottom">
                ৳ {receiptData.amount.toLocaleString()}
              </td>
            </tr>
            <tr>
              <td colSpan="2" className="divider-td">
                --------------------------------
              </td>
            </tr>
            <tr className="pos-total-row">
              <td className="text-left">TOTAL RECEIVED:</td>
              <td className="text-right">
                ৳ {receiptData.amount.toLocaleString()}
              </td>
            </tr>
          </tbody>
        </table>

        {/* In Words Section */}
        <div className="pos-in-words">
          <p>IN WORDS: {numberToWords(receiptData.amount)}</p>
        </div>

        <div className="divider">--------------------------------</div>

        {/* Footer/Signatures */}
        <div className="pos-footer">
          <p>TRANSACTION SUCCESSFUL</p>
          <p>THANK YOU FOR YOUR BUSINESS</p>

          <div className="pos-signatures">
            <div>
              <p>SIGNATURE</p>
            </div>
            <div>
              <p>AUTHORITY</p>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons (Will be hidden during print) */}
      <div className="receipt-actions no-print">
        <button className="btn-print" onClick={handlePrint}>
          🖨️ Print Receipt
        </button>
        <button className="btn-close" onClick={onClose}>
          ✖ Close
        </button>
      </div>
    </div>,
    document.body,
  );
}
