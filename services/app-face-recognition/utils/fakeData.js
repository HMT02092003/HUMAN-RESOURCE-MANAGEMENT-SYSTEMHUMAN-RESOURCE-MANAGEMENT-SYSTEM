// Fake data cho AI response
export const getFakeAttendanceData = () => {
  const names = [
    'Nguyễn Văn An',
    'Trần Thị Bình',
    'Lê Hoàng Cường',
    'Phạm Thị Dung',
    'Hoàng Văn Em'
  ];

  const locations = [
    'Văn phòng Hà Nội',
    'Chi nhánh HCM',
    'Văn phòng Đà Nẵng',
    'Trụ sở chính'
  ];

  const now = new Date();
  const randomName = names[Math.floor(Math.random() * names.length)];
  const randomLocation = locations[Math.floor(Math.random() * locations.length)];

  return {
    name: randomName,
    time: now.toLocaleTimeString('vi-VN', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit' 
    }),
    date: now.toLocaleDateString('vi-VN'),
    location: randomLocation,
    confidence: (Math.random() * 0.3 + 0.7).toFixed(2), // 70-100%
    employeeId: 'NV' + Math.floor(Math.random() * 9000 + 1000),
  };
};