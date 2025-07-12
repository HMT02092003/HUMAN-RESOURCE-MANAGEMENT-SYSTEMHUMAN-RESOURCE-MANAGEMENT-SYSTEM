// utils/parseNestedData.ts
export function parseNestedData(flatData: { [key: string]: any }): { [key: string]: any } {
    const result: { [key: string]: any } = {};
  
    for (const key in flatData) {
      const value = flatData[key];
      const keys = key.split(/[\[\]]+/).filter(k => k); // Tách key dựa trên [ và ]
  
      let current = result; // Con trỏ để xây dựng object/mảng lồng nhau
      for (let i = 0; i < keys.length; i++) {
        const k = Number.isNaN(Number(keys[i])) ? keys[i] : parseInt(keys[i], 10); // Chuyển chỉ số mảng thành số nếu cần
  
        if (i === keys.length - 1) {
          // Đặt giá trị tại vị trí cuối cùng
          current[k] = value;
        } else {
          // Tạo object hoặc array tại các cấp độ trung gian
          if (!current[k]) {
            current[k] = Number.isNaN(Number(keys[i + 1])) ? {} : [];
          }
          current = current[k];
        }
      }
    }
  
    return result;
  }
  