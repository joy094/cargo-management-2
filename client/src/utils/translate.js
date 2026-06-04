// src/utils/translate.js

export const translateToChinese = async (text) => {
  if (!text) return "";
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=zh-CN&dt=t&q=${encodeURIComponent(text)}`;

    // 💡 Axios এর বদলে সরাসরি native fetch ব্যবহার করছি
    // এতে লোকাল কোনো টোকেন/হেডার্স এখানে যুক্ত হবে না এবং CORS পলিসি ব্রেক করবে না
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error("Network response was not ok");
    }

    const data = await response.json();

    if (data && data[0] && data[0][0] && data[0][0][0]) {
      return data[0][0][0];
    }
    return "";
  } catch (error) {
    console.error("Translation error:", error);
    return "";
  }
};
