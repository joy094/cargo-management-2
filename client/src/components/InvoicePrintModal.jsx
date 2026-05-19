import React from "react";

// 🌟 টাকাকে কথায় (Words) রূপান্তর করার ফাংশন (কম্পোনেন্টের বাইরে)
const numberToWords = (num) => {
  if (num === 0) return "Zero Taka Only";
  const a = [
    "",
    "One ",
    "Two ",
    "Three ",
    "Four ",
    "Five ",
    "Six ",
    "Seven ",
    "Eight ",
    "Nine ",
    "Ten ",
    "Eleven ",
    "Twelve ",
    "Thirteen ",
    "Fourteen ",
    "Fifteen ",
    "Sixteen ",
    "Seventeen ",
    "Eighteen ",
    "Nineteen ",
  ];
  const b = [
    "",
    "",
    "Twenty",
    "Thirty",
    "Forty",
    "Fifty",
    "Sixty",
    "Seventy",
    "Eighty",
    "Ninety",
  ];
  if ((num = num.toString()).length > 9) return "Overflow";
  const n = ("000000000" + num)
    .substr(-9)
    .match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
  if (!n) return "";
  let str = "";
  str +=
    n[1] != 0
      ? (a[Number(n[1])] || b[n[1][0]] + " " + a[n[1][1]]) + "Crore "
      : "";
  str +=
    n[2] != 0
      ? (a[Number(n[2])] || b[n[2][0]] + " " + a[n[2][1]]) + "Lakh "
      : "";
  str +=
    n[3] != 0
      ? (a[Number(n[3])] || b[n[3][0]] + " " + a[n[3][1]]) + "Thousand "
      : "";
  str +=
    n[4] != 0
      ? (a[Number(n[4])] || b[n[4][0]] + " " + a[n[4][1]]) + "Hundred "
      : "";
  str +=
    n[5] != 0
      ? (str != "" ? "and " : "") +
        (a[Number(n[5])] || b[n[5][0]] + " " + a[n[5][1]])
      : "";
  return str.trim() + " Taka Only";
};

export default function InvoicePrintModal({
  isOpen,
  onClose,
  invoiceData,
  summary,
}) {
  // মডাল ওপেন না থাকলে বা ডাটা না থাকলে কিছুই দেখাবে না
  if (!isOpen || !invoiceData) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content pro-modal-width">
        <div id="print-area" className="pro-invoice-wrapper">
          {/* Company Header */}
          <div className="pro-inv-header">
            <div className="pro-logo-container">
              <img
                src="/SABA_&_RIHAN_LOGO.jpeg"
                alt="Company Logo"
                className="pro-main-logo"
                onError={(e) => {
                  e.target.style.display = "none";
                  e.target.nextSibling.style.display = "flex";
                }}
              />
              <div className="pro-logo-placeholder" style={{ display: "none" }}>
                <span>LOGO</span>
              </div>
            </div>

            <div className="pro-company-details">
              <h1 className="gradient-company-name">SABA & RIHAN ENTERPRISE</h1>
              <p className="pro-tagline">
                GOVT. AUTHORISED CUSTOMS, CLEARING & FORWARDING (C&F) AGENT
              </p>
              <p className="pro-address">
                Door to Door (Cargo) • China • Hongkong • Dubai • Malaysia
              </p>
            </div>
          </div>

          <div className="pro-inv-title-bar">
            <h2>COMMERCIAL INVOICE</h2>
          </div>

          {/* Customer Metadata */}
          <div className="pro-invoice-meta">
            <div className="pro-bill-to">
              <h4 className="info-title">BILLED TO:</h4>
              <table className="info-table">
                <tbody>
                  <tr>
                    <td className="lbl">Shipping Mark</td>
                    <td>
                      : <strong>{invoiceData.customerMark}</strong>
                    </td>
                  </tr>
                  <tr>
                    <td className="lbl">Customer Name</td>
                    <td>
                      :{" "}
                      <strong
                        contentEditable
                        suppressContentEditableWarning
                        className="editable-print-text"
                      >
                        {summary?.branchName || "Enter Name"}
                      </strong>
                    </td>
                  </tr>
                  <tr>
                    <td className="lbl">Phone Number</td>
                    <td>
                      :{" "}
                      <strong
                        contentEditable
                        suppressContentEditableWarning
                        className="editable-print-text"
                      >
                        {summary?.phone || "Enter Phone"}
                      </strong>
                    </td>
                  </tr>
                  <tr>
                    <td className="lbl">Address</td>
                    <td>
                      :{" "}
                      <strong
                        contentEditable
                        suppressContentEditableWarning
                        className="editable-print-text"
                      >
                        {summary?.address || "Enter Address"}
                      </strong>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="pro-date-info">
              <table className="info-table">
                <tbody>
                  <tr>
                    <td className="lbl">Invoice No</td>
                    <td>
                      :{" "}
                      <strong>
                        {invoiceData.invoiceId ||
                          `INV-${Date.now().toString().slice(-6)}`}
                      </strong>
                    </td>
                  </tr>
                  <tr>
                    <td className="lbl">Date</td>
                    <td>
                      :{" "}
                      <strong>
                        {invoiceData.date ||
                          new Date().toLocaleDateString("en-GB")}
                      </strong>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Invoice Items Table */}
          <table className="pro-item-table">
            <thead>
              <tr>
                <th width="5%">SL</th>
                <th width="45%">Description of Goods</th>
                <th width="15%">Weight (KG)</th>
                <th width="15%">Rate (৳)</th>
                <th width="20%">Total Amount</th>
              </tr>
            </thead>
            <tbody>
              {invoiceData.items.map((it, i) => (
                <tr key={i}>
                  <td className="center">{i + 1}</td>
                  <td>
                    <strong className="item-name">
                      {it.productName || "General Cargo Item"}
                    </strong>
                    <div className="item-meta">
                      {it.batchName && (
                        <span className="batch-pill">
                          Batch: {it.batchName}
                        </span>
                      )}
                      {it.chinaTrackingNo && (
                        <span className="trk-text">
                          Trk: {it.chinaTrackingNo}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="center">{it.calcWeight.toFixed(2)}</td>
                  <td className="center">{it.rate}</td>
                  <td className="right">৳ {it.total.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Financial Calculations */}
          <div className="pro-calc-section">
            <div className="amount-in-words">
              <p>
                <strong>Amount in Words:</strong>
              </p>
              <p className="words-text">
                {numberToWords(invoiceData.netPayable || 0)}
              </p>
            </div>

            <div className="pro-totals">
              <table className="totals-table">
                <tbody>
                  <tr>
                    <td>Subtotal</td>
                    <td className="right">
                      ৳ {invoiceData.subTotal?.toLocaleString()}
                    </td>
                  </tr>

                  {invoiceData.discount > 0 && (
                    <tr className="text-red">
                      <td>Discount</td>
                      <td className="right">
                        - ৳ {invoiceData.discount?.toLocaleString()}
                      </td>
                    </tr>
                  )}

                  {invoiceData.transportCost > 0 && (
                    <tr>
                      <td>Transport / Other Cost</td>
                      <td className="right">
                        + ৳ {(invoiceData.transportCost || 0).toLocaleString()}
                      </td>
                    </tr>
                  )}

                  <tr className="grand-total-row">
                    <td>Grand Total</td>
                    <td className="right">
                      ৳ {(invoiceData.netPayable || 0).toLocaleString()}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Bank Payment Information */}
          <div className="pro-bank-info">
            <h4>Payment Information</h4>
            <div className="bank-grid">
              <div className="bank-card">
                <strong>Dutch Bangla Bank</strong>
                <p>A/C Name: SABA AND RIHAN ENTERPRISE</p>
                <p>A/C No: 2021100054999</p>
                <p>Branch: Hazicamp, Askona</p>
              </div>
              <div className="bank-card">
                <strong>BRAC Bank</strong>
                <p>A/C Name: SABA AND RIHAN ENTER PRISE</p>
                <p>A/C No: 2077416900001</p>
                <p>Branch: Dakshin Khan Sub Br.</p>
              </div>
              <div className="bank-card">
                <strong>Southeast Bank PLC</strong>
                <p>A/C Name: SABA AND RIHAN ENTERPRIS</p>
                <p>A/C No: 003011100006291</p>
                <p>Branch: Aganagor</p>
              </div>
            </div>
          </div>

          {/* Warning Note */}
          <div className="invoice-warning-note">
            <span className="warning-icon">⚠️</span>
            <span>
              <strong>সতর্কতা:</strong> বাংলাদেশের ওয়ারহাউজে পণ্য আসার ৭ দিন পর
              কোনো প্রকার ক্ষয়ক্ষতি বা নিরাপত্তার দায় কর্তৃপক্ষ বহন করবে না।
            </span>
          </div>

          <div className="pro-footer-note">
            Thank you for your business! Goods once sold will not be taken back.
          </div>
        </div>

        {/* Modal Window Actions */}
        <div className="modal-btns no-print">
          <button onClick={() => window.print()} className="print-btn">
            🖨️ Print Invoice
          </button>
          <button onClick={onClose} className="close-btn">
            ✖ Close
          </button>
        </div>
      </div>
    </div>
  );
}
