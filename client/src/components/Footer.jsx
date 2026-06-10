// src/components/Footer.jsx

import React from "react";
import "./Footer.css"; // 🔥 CSS ফাইলটি ইম্পোর্ট করা হলো

// ==========================================
// 3. Footer Component
// ==========================================
const Footer = () => {
  return (
    <footer className="main-footer">
      <div className="footer-container">
        {/* Top Section */}
        <div className="footer-top">
          <div className="footer-brand">
            <div className="footer-logo">
              <span className="footer-icon">🏢</span>
              <h4>Saba & Rihan Enterprise</h4>
            </div>
            <p className="footer-tagline">
              Reliable Cargo and Logistics Services
            </p>
          </div>

          {/* ঐচ্ছিক: প্রফেশনাল লুকের জন্য কিছু ডেমো কন্টাক্ট ইনফো (আপনি চাইলে বাদ দিতে বা পরিবর্তন করতে পারেন) */}
          <div className="footer-contact">
            <p>📧 info@saba-rihan.com</p>
            <p>📞 +880 1841389672</p>
          </div>
        </div>

        {/* Divider Line */}
        <div className="footer-divider"></div>

        {/* Bottom Section */}
        <div className="footer-bottom">
          <p>&copy; {new Date().getFullYear()} All Rights Reserved</p>
          <p className="developer-credit">
            Design & Development: <strong><a href="https://github.com/joy094">MD. JAKARIA</a></strong>
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
