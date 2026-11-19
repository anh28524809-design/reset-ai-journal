import type {
  ActivityStatus, ChartType, ContentOrigin, DateCertainty, DossierStatus, EntryStatus,
  EvidenceKind, EvidenceLevel, ProjectInfo, ResultSection, Stage, StageStatus,
} from './types';

/**
 * Thông tin dự án mặc định — chỉ gồm các dữ kiện nhóm đã cung cấp.
 * Mục tiêu và câu hỏi nghiên cứu để trống cho tới khi nhóm tự nhập trong mục Quản trị.
 */
export const DEFAULT_PROJECT: ProjectInfo = {
  name:
    'Nghiên cứu hành vi tìm đến AI trước khi tự thử giải bài tập và thử nghiệm trạm RESET-AI nhằm tái hình thành thói quen tư duy độc lập cho học sinh Trường THPT Chuyên Bắc Kạn',
  field: 'Khoa học xã hội và hành vi',
  unit: 'Trường THPT Chuyên Bắc Kạn',
  period: '01/8/2026 – 18/11/2026',
  basis: 'Kế hoạch số 5999/KH-SGDĐT ngày 16/10/2026 của Sở GDĐT',
  members: [
    { name: 'Vương Đức Anh', role: 'Học sinh nghiên cứu – nhóm trưởng', note: 'Lớp 12 Hóa Sinh · phụ trách giải pháp, chế tạo thiết bị' },
    { name: 'Đàm Khánh An', role: 'Học sinh nghiên cứu', note: 'Lớp 11 Hóa · phụ trách cơ sở khoa học, văn bản' },
  ],
  advisor: 'Vũ Thúy Mai',
  objectives: '',
  questions: '',
  deviceIntro:
    'Trạm RESET-AI do nhóm thiết kế và chế tạo trên vi điều khiển ESP32-S3, gồm màn hình TFT 2,8 inch, mô-đun khuếch đại âm thanh MAX98357A và loa, công tắc hành trình nhận biết đặt/nhấc, mạch nguồn và pin. Thiết bị phát âm thanh hướng dẫn được ghi sẵn và ghi lại sự kiện DOCK/UNDOCK để phục vụ phân tích.',
  process3T: [
    { title: 'Tự nghĩ', desc: 'Học sinh tự thử giải bài tập trước.' },
    { title: 'Tra AI khi cần', desc: 'Chỉ tra cứu AI khi đã tự thử và thật sự cần.' },
    { title: 'Tự kiểm', desc: 'Tự kiểm tra lại lời giải và nội dung tham khảo.' },
  ],
};

export const TEAM_NAMES = ['Vương Đức Anh', 'Đàm Khánh An', 'Vũ Thúy Mai'];

const acts = (stage: number, titles: string[]) =>
  titles.map((title, i) => ({ id: `s${stage}a${i + 1}`, title, status: 'todo' as ActivityStatus }));

/** Cấu trúc 6 giai đoạn theo đề cương. Thời gian để trống cho đến khi được xác minh. */
export const DEFAULT_STAGES: Stage[] = [
  {
    id: 'gd1', order: 1, title: 'Hình thành ý tưởng và xây dựng kế hoạch',
    description: 'Xác định vấn đề, tổng quan tài liệu, giả thuyết, mục tiêu, phương pháp và kế hoạch nghiên cứu.',
    period: '', periodVerified: false, status: 'none',
    activities: acts(1, ['Xác định vấn đề nghiên cứu', 'Tìm hiểu tài liệu', 'Xây dựng giả thuyết khoa học', 'Xác định mục tiêu và phương pháp', 'Lập kế hoạch nghiên cứu', 'Phê duyệt kế hoạch và đánh giá rủi ro']),
  },
  {
    id: 'gd2', order: 2, title: 'Thiết kế và triển khai khảo sát',
    description: 'Xây dựng công cụ khảo sát, thu thập và làm sạch dữ liệu, chọn mẫu cho giai đoạn tiếp theo.',
    period: '', periodVerified: false, status: 'none',
    activities: acts(2, ['Xây dựng phiếu khảo sát lần 1', 'Lựa chọn phương pháp khảo sát', 'Triển khai thu thập dữ liệu', 'Kiểm tra, làm sạch dữ liệu', 'Lựa chọn 30 học sinh tham gia giai đoạn tiếp theo', 'Thiết kế và triển khai khảo sát lần 2']),
  },
  {
    id: 'gd3', order: 3, title: 'Thiết kế và chế tạo RESET-AI',
    description: 'Nguyên lý, linh kiện, sơ đồ, lập trình, lắp ráp, kiểm thử và cải tiến trạm RESET-AI.',
    period: '', periodVerified: false, status: 'none',
    activities: acts(3, ['Xây dựng nguyên lý hoạt động', 'Lựa chọn linh kiện, ESP32-S3 và các thành phần', 'Thiết kế sơ đồ', 'Lập trình', 'Lắp ráp thiết bị', 'Kiểm thử', 'Ghi nhận lỗi và quá trình cải tiến']),
  },
  {
    id: 'gd4', order: 4, title: 'Thử nghiệm can thiệp',
    description: 'Xây dựng nhiệm vụ, chọn mẫu – phân nhóm, thu thập đồng thuận và tổ chức thử nghiệm quy trình RESET-AI.',
    period: '', periodVerified: false, status: 'none',
    activities: acts(4, ['Xây dựng nhiệm vụ Toán, Ngữ văn', 'Tham khảo đánh giá của giáo viên bộ môn', 'Xây dựng phương án chọn mẫu và phân nhóm', 'Thu thập đồng thuận tham gia', 'Tổ chức thử nghiệm quy trình RESET-AI', 'Ghi nhận số liệu và quan sát thực tế']),
  },
  {
    id: 'gd5', order: 5, title: 'Phân tích và đánh giá',
    description: 'Tổng hợp, xử lý thống kê, đánh giá tác động và giới hạn; kết luận tương xứng với bằng chứng.',
    period: '', periodVerified: false, status: 'none',
    activities: acts(5, ['Tổng hợp dữ liệu', 'Xử lý thống kê', 'So sánh kết quả nếu đủ dữ liệu', 'Đánh giá khả năng hỗ trợ thói quen tự tư duy', 'Phân tích giới hạn của nghiên cứu', 'Rút ra kết luận phù hợp với bằng chứng']),
  },
  {
    id: 'gd6', order: 6, title: 'Hoàn thiện báo cáo khoa học',
    description: 'Báo cáo kết quả, báo cáo tóm tắt, hoàn thiện nhật ký – minh chứng và rà soát hồ sơ theo phụ lục.',
    period: '', periodVerified: false, status: 'none',
    activities: acts(6, ['Báo cáo kết quả nghiên cứu', 'Báo cáo tóm tắt', 'Hoàn thiện nhật ký và minh chứng', 'Kiểm tra hồ sơ theo phụ lục', 'Giáo viên rà soát, xác nhận', 'Xuất hồ sơ']),
  },
];

export const DEFAULT_DOSSIER: { id: string; code: string; title: string }[] = [
  { id: 'pl2', code: 'Phụ lục II', title: 'Đăng ký dự thi' },
  { id: 'pl3', code: 'Phụ lục III', title: 'Thuyết minh của đơn vị' },
  { id: 'pl4', code: 'Phụ lục IV', title: 'Kế hoạch nghiên cứu' },
  { id: 'pl5', code: 'Phụ lục V', title: 'Báo cáo kết quả' },
  { id: 'pl6', code: 'Phụ lục VI', title: 'Báo cáo tóm tắt' },
  { id: 'pl7', code: 'Phụ lục VII', title: 'Các phiếu cam kết, phê duyệt và đánh giá rủi ro liên quan' },
  { id: 'pl8', code: 'Phụ lục VIII', title: 'Nhật ký nghiên cứu và minh chứng dữ liệu' },
  { id: 'pl9', code: 'Phụ lục IX', title: 'Khai báo sử dụng công nghệ số, AI' },
];

export const ENTRY_STATUS: Record<EntryStatus, { label: string; tone: string }> = {
  draft: { label: 'Bản nháp', tone: 'neutral' },
  submitted: { label: 'Chờ giáo viên xác nhận', tone: 'warn' },
  returned: { label: 'Cần bổ sung', tone: 'danger' },
  verified: { label: 'Đã xác nhận', tone: 'ok' },
};

export const STAGE_STATUS: Record<StageStatus, { label: string; tone: string }> = {
  none: { label: 'Chưa có hồ sơ', tone: 'neutral' },
  collecting: { label: 'Đang bổ sung hồ sơ', tone: 'info' },
  reviewing: { label: 'Chờ rà soát', tone: 'warn' },
  confirmed: { label: 'Đã xác nhận hồ sơ', tone: 'ok' },
};

export const ACTIVITY_STATUS: Record<ActivityStatus, string> = {
  todo: 'Chưa ghi nhận',
  doing: 'Đang thực hiện',
  done: 'Đã thực hiện',
};

export const ORIGIN: Record<ContentOrigin, { label: string; hint: string }> = {
  original: { label: 'Dữ liệu gốc', hint: 'Ghi từ tài liệu, tệp, sản phẩm tạo ra tại thời điểm thực hiện.' },
  retrospective: { label: 'Nội dung hồi cứu', hint: 'Được nhóm nhớ lại và ghi bổ sung sau thời điểm thực hiện.' },
  inferred: { label: 'Nội dung suy luận', hint: 'Được suy ra từ minh chứng khác, chưa có ghi chép trực tiếp.' },
};

export const DATE_CERTAINTY: Record<DateCertainty, string> = {
  exact: 'Chính xác',
  range: 'Khoảng thời gian đã xác định',
  approximate: 'Ước lượng gần đúng',
};

export const EVIDENCE_KIND: Record<EvidenceKind, string> = {
  thiet_bi: 'Ảnh/video thiết bị',
  khao_sat: 'Hoạt động/dữ liệu khảo sát',
  thu_nghiem: 'Thử nghiệm',
  phan_tich: 'Kết quả phân tích',
  bien_ban: 'Biên bản, kế hoạch',
  tai_lieu: 'Tài liệu, bản thảo',
  ma_nguon: 'Mã nguồn, tài liệu kỹ thuật',
  hoa_don: 'Hóa đơn, chứng từ',
  khac: 'Khác',
};

/** Thứ tự ưu tiên khi chọn minh chứng nổi bật */
export const FEATURED_PRIORITY: EvidenceKind[] = ['thiet_bi', 'khao_sat', 'thu_nghiem', 'phan_tich'];

export const RESULT_SECTION: Record<ResultSection, { title: string; empty: string }> = {
  survey: { title: 'Kết quả khảo sát hành vi học sinh', empty: 'Chưa có kết quả khảo sát được công bố.' },
  device: { title: 'Kết quả thiết kế và chế tạo trạm RESET-AI', empty: 'Chưa có kết quả thiết kế – chế tạo được công bố.' },
  intervention: { title: 'Kết quả thử nghiệm can thiệp và đánh giá tác động', empty: 'Chưa có dữ liệu thử nghiệm can thiệp được công bố. Không đưa ra kết luận về hiệu quả khi chưa có dữ liệu.' },
};

export const CHART_TYPE: Record<ChartType, string> = {
  bar: 'Biểu đồ cột',
  proportion: 'Biểu đồ tỷ lệ (giá trị / tổng)',
  table: 'Bảng so sánh',
  text: 'Kết quả mô tả (không biểu đồ)',
};

export const EVIDENCE_LEVEL: Record<EvidenceLevel, { label: string; note: string }> = {
  descriptive: { label: 'Thống kê mô tả', note: 'Số liệu mô tả – không dùng để kết luận về hiệu quả.' },
  preliminary: { label: 'Kết quả bước đầu', note: 'Kết quả bước đầu – chưa đủ dữ liệu để kết luận về hiệu quả.' },
  sufficient: { label: 'Đã kiểm định', note: 'Đã có phân tích thống kê đủ để hỗ trợ kết luận nêu kèm.' },
};

export const DOSSIER_STATUS: Record<DossierStatus, { label: string; tone: string }> = {
  missing: { label: 'Chưa có tệp', tone: 'neutral' },
  drafting: { label: 'Đang soạn', tone: 'info' },
  reviewing: { label: 'Chờ giáo viên duyệt', tone: 'warn' },
  done: { label: 'Hoàn thành', tone: 'ok' },
};

/** Định dạng tệp được phép tải lên */
export const ACCEPT_FILES =
  '.jpg,.jpeg,.png,.pdf,.doc,.docx,.xls,.xlsx,.csv,.mp4,.txt,.md,.json,.ino,.c,.cpp,.h,.hpp,.py,.js,.ts,.zip';
export const MAX_FILE_MB = 200;
