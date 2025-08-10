
const roleKey = {
    root: "Admin",
};

const numberInMonth = {
    "01": 31,
    "02": 28,
    "03": 31,
    "04": 30,
    "05": 31,
    "06": 30,
    "07": 31,
    "08": 31,
    "09": 30,
    "10": 31,
    "11": 30,
    "12": 31,
};

const numberInMonthProfit = {
    "01": 31,
    "02": 29,
    "03": 31,
    "04": 30,
    "05": 31,
    "06": 30,
    "07": 31,
    "08": 31,
    "09": 30,
    "10": 31,
    "11": 30,
    "12": 31,
};

const TypeOfSetting = {
    officeHours: "Giờ hành chính",
    MoneyPenalty: "Tiền phạt",
    absent: "Đi muộn/về sớm",
    vacation: "Xin nghỉ phép",
    overtime: "Làm thêm giờ",
    check: "Check in/out",
};

const TypeOfApplication = {
    1: "Đi muộn/về sớm",
    2: "Xin nghỉ phép",
    3: "Làm thêm giờ",
    4: "Check in/out",
};

const TypeOfStatusApplication = {
    1: "Chờ duyệt",
    2: "Đã duyệt",
    3: "Từ chối",
};

const permissionScope = {
    global: 1,
    department: 2,
    personal: 3,
};

const Gender = [
    { key: 1, value: "Nam" },
    { key: 2, value: "Nữ" },
    { key: 3, value: "Khác" },
];

const statusOptions = [
    { value: 1, label: "Đang hoạt động" },
    { value: 2, label: "Nghỉ thai sản" },
    { value: 3, label: "Đã nghỉ việc" },
];

const Relationship = [
    { value: 1, label: "Bố" },
    { value: 2, label: "Mẹ" },
    { value: 3, label: "Anh" },
    { value: 4, label: "Chị" },
    { value: 5, label: "Em" },
    { value: 6, label: "Ông" },
    { value: 7, label: "Bà" },
    { value: 8, label: "Con" },
    { value: 9, label: "Vợ" },
];

const importanceOptions = [
    { value: 1, label: "Thấp" },
    { value: 2, label: "Cao" },
];

const settingKey = [
    { value: 1, label: "officeHours" },
    { value: 2, label: "MoneyPenalty" },
    { value: 3, label: "absent" },
    { value: 4, label: "vacation" },
    { value: 5, label: "overtime" },
    { value: 6, label: "check" },
];

const settingKeyVal = {
    officeHours: 1,
    MoneyPenalty: 2,
};

const typeToSettingKey = {
    1: "absent",
    2: "vacation",
    3: "overtime",
    4: "check",
};

const scopeValues = {
    1: "Toàn cục",
    2: "Phòng ban",
    3: "Cá nhân",
};

const roles = [
  { value: 'admin', label: 'Quản trị viên' },
  { value: 'user', label: 'Người dùng' },
  { value: 'editor', label: 'Biên tập viên' },
];

const chevrons = [
  { value: 'junior', label: 'Thực tập sinh' },
  { value: 'mid', label: 'Nhân viên' },
  { value: 'senior', label: 'Trưởng nhóm' },
];

const departments = [
  { value: 'hr', label: 'Phòng Nhân sự' },
  { value: 'it', label: 'Phòng IT' },
  { value: 'marketing', label: 'Phòng Marketing' },
];

export default {
    roleKey,
    numberInMonth,
    numberInMonthProfit,
    TypeOfSetting,
    permissionScope,
    TypeOfApplication,
    TypeOfStatusApplication,
    Gender,
    statusOptions,
    Relationship,
    importanceOptions,
    settingKey,
    settingKeyVal,
    typeToSettingKey,
    scopeValues,
    roles,
    chevrons,
    departments,
};
