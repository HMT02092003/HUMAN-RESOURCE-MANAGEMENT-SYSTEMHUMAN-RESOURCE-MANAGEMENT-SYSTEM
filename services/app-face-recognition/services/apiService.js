import { getFakeAttendanceData } from '../utils/fakeData';

// Hàm gửi ảnh tới AI server (hiện tại dùng fake data)
export const sendImageToAI = async (imageUri) => {
  try {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // TODO: Thay thế bằng API call thực tế
    // const formData = new FormData();
    // formData.append('image', {
    //   uri: imageUri,
    //   type: 'image/jpeg',
    //   name: 'attendance.jpg',
    // });
    
    // const response = await fetch('YOUR_AI_SERVER_URL/recognize', {
    //   method: 'POST',
    //   body: formData,
    //   headers: {
    //     'Content-Type': 'multipart/form-data',
    //   },
    // });
    
    // const data = await response.json();
    // return data;

    // Trả về fake data
    return getFakeAttendanceData();
  } catch (error) {
    console.error('API Error:', error);
    // Fallback to fake data nếu có lỗi
    return getFakeAttendanceData();
  }
};