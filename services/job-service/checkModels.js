import { GoogleGenAI } from "@google/genai";
import 'dotenv/config'; 

const API_KEY = process.env.GEMINI_API_KEY;

if (!API_KEY) {
  console.error("LỖI: Không tìm thấy GEMINI_API_KEY. Hãy kiểm tra file .env.");
  process.exit(1); // Thoát nếu không có key
}

const genAI = new GoogleGenAI(API_KEY);

async function checkMyModel() {
  
  // Tên model chúng ta cần kiểm tra
  const modelToTest = "gemini-2.5-pro"; 

  console.log(`Đang kiểm tra quyền truy cập model '${modelToTest}'...`);
  
  try {
    // Thử gọi lệnh countTokens với model này
    const result = await genAI.models.countTokens({
      model: modelToTest, 
      contents: [{ role: "user", parts: [{ text: "Test" }] }]
    }); 
    
    console.log(`✅ THÀNH CÔNG! Bạn có thể sử dụng model '${modelToTest}'.`);
    console.log("Kết quả đếm token (để xác nhận):", result);

  } catch (error) {
    console.error(`Lỗi khi kiểm tra model '${modelToTest}':`, error);
  }
}

checkMyModel();