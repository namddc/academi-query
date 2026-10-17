// ============================================================
//  school-info.ts – Thông tin & Dữ liệu thực tế của Trường (ICTU)
//  Cung cấp dữ liệu chuẩn hóa cho InfoPanel và các tiện ích sinh viên
// ============================================================

export interface SchoolNotice {
  id: string;
  title: string;
  date: string;
  tag: "Học vụ" | "Học bổng" | "Học phí" | "Khác";
  queryHint: string; // Câu hỏi mẫu để người dùng click hỏi ngay bot
  badgeColor?: string;
}

export interface SchoolDocument {
  id: string;
  title: string;
  category: string;
  fileSize?: string;
  queryHint: string;
  url?: string;
}

export interface QuickLink {
  id: string;
  title: string;
  shortDesc: string;
  url: string;
  iconName: "graduation" | "calendar" | "credit-card" | "book" | "mail";
}

export interface AcademicMilestone {
  event: string;
  date: string;
  status: "upcoming" | "current" | "past";
}

export const SCHOOL_NOTICES: SchoolNotice[] = [
  {
    id: "tb-1",
    title: "Thông báo nộp học phí Học kỳ 2 năm học 2024-2025",
    date: "15/01/2025",
    tag: "Học phí",
    queryHint: "Thời hạn và các hình thức nộp học phí học kỳ 2 là khi nào?",
  },
  {
    id: "tb-2",
    title: "Xét cấp học bổng khuyến khích học tập (KKHT) Đợt 1",
    date: "10/01/2025",
    tag: "Học bổng",
    queryHint: "Điều kiện và mức xét học bổng khuyến khích học tập kỳ này ra sao?",
  },
  {
    id: "tb-3",
    title: "Đăng ký kế hoạch học tập & học ghép, học cải thiện",
    date: "05/01/2025",
    tag: "Học vụ",
    queryHint: "Quy định đăng ký học cải thiện điểm và học ghép như thế nào?",
  },
  {
    id: "tb-4",
    title: "Lịch thi kết thúc học phần và tra cứu phòng thi",
    date: "28/12/2024",
    tag: "Học vụ",
    queryHint: "Xem lịch thi và cách thức giải quyết khi bị trùng lịch thi?",
  },
];

export const SCHOOL_DOCUMENTS: SchoolDocument[] = [
  {
    id: "doc-1",
    title: "Quy chế đào tạo theo hệ thống tín chỉ",
    category: "Quy chế",
    fileSize: "PDF (1.2 MB)",
    queryHint: "Tóm tắt quy chế tính điểm rèn luyện và thang điểm tín chỉ?",
  },
  {
    id: "doc-2",
    title: "Sổ tay sinh viên & Hướng dẫn học vụ 2024-2025",
    category: "Sổ tay",
    fileSize: "PDF (3.8 MB)",
    queryHint: "Các mốc thời gian xử lý học vụ và thủ tục xin giấy xác nhận SV?",
  },
  {
    id: "doc-3",
    title: "Quy định về xét cấp học bổng & trợ cấp xã hội",
    category: "Chính sách",
    fileSize: "PDF (850 KB)",
    queryHint: "Hồ sơ xin miễn giảm học phí và trợ cấp xã hội gồm những gì?",
  },
];

export const QUICK_LINKS: QuickLink[] = [
  {
    id: "link-1",
    title: "Cổng Sinh Viên",
    shortDesc: "Tra cứu kết quả học tập",
    url: "https://sinhvien.ictu.edu.vn/DangNhapExternal/Index",
    iconName: "graduation",
  },
  {
    id: "link-2",
    title: "Đăng Ký Học Phần",
    shortDesc: "Đăng ký tín chỉ trực tuyến",
    url: "https://sinhvien.ictu.edu.vn/DangNhapExternal/Index",
    iconName: "calendar",
  },
  {
    id: "link-3",
    title: "Thanh Toán HP",
    shortDesc: "Cổng nộp học phí trực tuyến",
    url: "https://sinhvien.ictu.edu.vn/DangNhapExternal/Index",
    iconName: "credit-card",
  },
  {
    id: "link-4",
    title: "Thư Viện Số",
    shortDesc: "Tài liệu học tập & giáo trình",
    url: "https://sinhvien.ictu.edu.vn/DangNhapExternal/Index",
    iconName: "book",
  },
];


export const ACADEMIC_CALENDAR: AcademicMilestone[] = [
  { event: "Bắt đầu Học kỳ 2", date: "06/01/2025", status: "past" },
  { event: "Hạn nộp học phí HK2", date: "15/02/2025", status: "current" },
  { event: "Thi giữa học kỳ", date: "10/03/2025", status: "upcoming" },
  { event: "Thi kết thúc học phần", date: "19/05/2025", status: "upcoming" },
  { event: "Xét tốt nghiệp đợt 1", date: "15/06/2025", status: "upcoming" },
];
