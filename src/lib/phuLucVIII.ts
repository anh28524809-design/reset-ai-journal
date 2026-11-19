/**
 * 16 dòng nhật ký đúng như bản Phụ lục VIII (ngày 18/11/2026) do nhóm lập.
 * Khi nhập vào hệ thống, mỗi dòng được đánh dấu là "Nội dung hồi cứu", ở trạng thái Bản nháp,
 * và PHẢI được giáo viên xác nhận lại trong ứng dụng. Không tự gán trạng thái "Đã xác nhận".
 * Các trường không có trong Phụ lục VIII (khó khăn, bài học, …) để trống cho nhóm bổ sung.
 */
export interface PaperRow {
  tt: number;
  dateText: string;
  dateStart: string;
  dateEnd: string;
  stageId: string;
  activityTitle: string;
  content: string;
  location: string;
  performersText: string;
  performers: string[];
  evidenceText: string;
  result: string;
  paperConfirm: string;
}

const DA = 'Vương Đức Anh';
const KA = 'Đàm Khánh An';
const GV = 'Vũ Thúy Mai';
const SCHOOL = 'Trường THPT Chuyên Bắc Kạn';

export const PHU_LUC_VIII_ROWS: PaperRow[] = [
  { tt: 1, dateText: '01/8/2026', dateStart: '2026-08-01', dateEnd: '', stageId: 'gd1', activityTitle: 'Họp nhóm lần 1 với GVHD',
    content: 'Họp nhóm lần 1 với GVHD: trao đổi vấn đề thực tiễn về việc sử dụng điện thoại, AI trong học tập; đề xuất các hướng ý tưởng',
    location: SCHOOL, performersText: 'Cả nhóm, GV Vũ Thúy Mai', performers: [DA, KA, GV], evidenceText: 'Biên bản họp, ảnh buổi họp', result: 'Xác định được 2–3 hướng ý tưởng', paperConfirm: '' },
  { tt: 2, dateText: '02/8 – 15/8/2026', dateStart: '2026-08-02', dateEnd: '2026-08-15', stageId: 'gd1', activityTitle: 'Tìm đọc tài liệu, đánh giá các ý tưởng',
    content: 'Tìm đọc tài liệu, nghiên cứu liên quan; đánh giá tính mới, tính khả thi của từng ý tưởng',
    location: 'Thư viện trường', performersText: 'Đàm Khánh An (chính), Vương Đức Anh', performers: [KA, DA], evidenceText: 'Danh mục tài liệu tham khảo, ghi chú đọc', result: 'Bảng so sánh các ý tưởng', paperConfirm: '' },
  { tt: 3, dateText: '16/8 – 25/8/2026', dateStart: '2026-08-16', dateEnd: '2026-08-25', stageId: 'gd1', activityTitle: 'Chốt đề tài, câu hỏi nghiên cứu và giả thuyết',
    content: 'Chốt đề tài; xác định câu hỏi nghiên cứu, giả thuyết, giải pháp trạm RESET-AI và quy trình 3T',
    location: SCHOOL, performersText: 'Cả nhóm, GV Vũ Thúy Mai', performers: [DA, KA, GV], evidenceText: 'Biên bản chốt đề tài', result: 'Đề tài và hướng giải pháp được GVHD thống nhất', paperConfirm: '' },
  { tt: 4, dateText: '26/8 – 31/8/2026', dateStart: '2026-08-26', dateEnd: '2026-08-31', stageId: 'gd1', activityTitle: 'Lập đề cương, kế hoạch và phân công',
    content: 'Lập đề cương, kế hoạch thực hiện, phân công nhiệm vụ, dự trù kinh phí linh kiện',
    location: SCHOOL, performersText: 'Cả nhóm', performers: [DA, KA], evidenceText: 'Bản đề cương, bảng kế hoạch – phân công', result: 'Đề cương được GVHD góp ý, duyệt', paperConfirm: 'Xác nhận T8' },
  { tt: 5, dateText: '01/9 – 15/9/2026', dateStart: '2026-09-01', dateEnd: '2026-09-15', stageId: 'gd3', activityTitle: 'Thiết kế nguyên lí trạm RESET-AI',
    content: 'Thiết kế nguyên lí trạm RESET-AI: chọn linh kiện (ESP32-S3, màn hình TFT 2,8 inch, MAX98357A + loa, công tắc hành trình, mạch nguồn), vẽ sơ đồ khối, sơ đồ đấu nối',
    location: SCHOOL, performersText: 'Vương Đức Anh', performers: [DA], evidenceText: 'Sơ đồ khối, bảng linh kiện, hóa đơn mua linh kiện', result: 'Bản thiết kế trạm', paperConfirm: '' },
  { tt: 6, dateText: '01/9 – 30/9/2026', dateStart: '2026-09-01', dateEnd: '2026-09-30', stageId: 'gd1', activityTitle: 'Tổng quan tài liệu, viết cơ sở khoa học',
    content: 'Tổng quan tài liệu; viết cơ sở khoa học (AI tạo sinh, tự lực học tập, hành vi hỏi AI sớm)',
    location: 'Tại nhà, thư viện', performersText: 'Đàm Khánh An', performers: [KA], evidenceText: 'Bản nháp chương Tổng quan – Cơ sở khoa học (có lịch sử chỉnh sửa)', result: 'Bản nháp v1', paperConfirm: '' },
  { tt: 7, dateText: '16/9 – 30/9/2026', dateStart: '2026-09-16', dateEnd: '2026-09-30', stageId: 'gd3', activityTitle: 'Lắp ráp, lập trình trạm RESET-AI',
    content: 'Lắp ráp, lập trình trạm (âm thanh phát sẵn, ghi sự kiện DOCK/UNDOCK); hoàn thành thiết bị ngày 30/9',
    location: SCHOOL, performersText: 'Vương Đức Anh', performers: [DA], evidenceText: 'Ảnh/video quá trình lắp ráp, mã nguồn, ảnh thiết bị hoàn chỉnh', result: 'Thiết bị hoàn thành', paperConfirm: 'Xác nhận T9' },
  { tt: 8, dateText: '05/10 – 31/10/2026', dateStart: '2026-10-05', dateEnd: '2026-10-31', stageId: 'gd3', activityTitle: 'Thử nghiệm kĩ thuật thiết bị',
    content: 'Thử nghiệm kĩ thuật thiết bị: kiểm tra cảm biến đặt/nhấc, màn hình, loa, nguồn và pin; ghi lỗi, sửa lỗi',
    location: SCHOOL, performersText: 'Vương Đức Anh', performers: [DA], evidenceText: 'Video thử nghiệm, nhật kí sự kiện (log), bảng ghi lỗi và cách khắc phục', result: 'Đánh giá độ ổn định của thiết bị', paperConfirm: '' },
  { tt: 9, dateText: '01/10 – 15/10/2026', dateStart: '2026-10-01', dateEnd: '2026-10-15', stageId: 'gd2', activityTitle: 'Xây dựng bộ câu hỏi khảo sát đợt đầu',
    content: 'Xây dựng bộ câu hỏi khảo sát đợt đầu (dư âm chú ý khi chuyển từ điện thoại sang học tập); GVHD góp ý',
    location: SCHOOL, performersText: 'Đàm Khánh An (chính), Vương Đức Anh, GV Vũ Thúy Mai', performers: [KA, DA, GV], evidenceText: 'Bản thảo bộ câu hỏi, Google Form', result: 'Bộ câu hỏi đợt đầu', paperConfirm: '' },
  { tt: 10, dateText: '16/10 – 10/11/2026', dateStart: '2026-10-16', dateEnd: '2026-11-10', stageId: 'gd2', activityTitle: 'Triển khai khảo sát online đợt đầu',
    content: 'Triển khai khảo sát online đợt đầu (dư âm chú ý) cho học sinh toàn trường',
    location: 'Trường THPT Chuyên Bắc Kạn (online)', performersText: 'Cả nhóm', performers: [DA, KA], evidenceText: 'File kết quả Google Form, dòng 2–105', result: '104 lượt trả lời', paperConfirm: 'Xác nhận T10' },
  { tt: 11, dateText: '16/10 – 10/11/2026', dateStart: '2026-10-16', dateEnd: '2026-11-10', stageId: 'gd4', activityTitle: 'Viết phương pháp, thiết kế phương án can thiệp',
    content: 'Viết phần Phương pháp nghiên cứu; thiết kế phương án can thiệp 2 nhóm (15 RESET-AI – 15 đối chứng), rubric chấm T1',
    location: 'Tại nhà, trường', performersText: 'Đàm Khánh An', performers: [KA], evidenceText: 'Bản nháp chương Phương pháp, rubric', result: 'Bản nháp phương pháp', paperConfirm: '' },
  { tt: 12, dateText: '11/11 – 17/11/2026', dateStart: '2026-11-11', dateEnd: '2026-11-17', stageId: 'gd2', activityTitle: 'Điều chỉnh trọng tâm, xây dựng bộ câu hỏi khảo sát AI',
    content: 'Điều chỉnh trọng tâm nghiên cứu sang hành vi sử dụng AI tạo sinh khi giải bài tập; xây dựng bộ câu hỏi khảo sát AI (35 câu chính, nhóm chỉ báo C1–C5)',
    location: SCHOOL, performersText: 'Đàm Khánh An, Vương Đức Anh, GV Vũ Thúy Mai', performers: [KA, DA, GV], evidenceText: 'Bộ câu hỏi khảo sát AI, Google Form', result: 'Bộ câu hỏi khảo sát đợt 1 (AI)', paperConfirm: '' },
  { tt: 13, dateText: '17/11 – 18/11/2026', dateStart: '2026-11-17', dateEnd: '2026-11-18', stageId: 'gd2', activityTitle: 'Triển khai khảo sát online về hành vi sử dụng AI',
    content: 'Triển khai khảo sát online về hành vi sử dụng AI tạo sinh',
    location: 'Trường THPT Chuyên Bắc Kạn (online)', performersText: 'Cả nhóm', performers: [DA, KA], evidenceText: 'File kết quả Google Form, từ dòng 106', result: '390 lượt trả lời (17/11: 266; 18/11: 124)', paperConfirm: '' },
  { tt: 14, dateText: '17/11/2026', dateStart: '2026-11-17', dateEnd: '', stageId: 'gd5', activityTitle: 'Làm sạch dữ liệu, thống kê mô tả',
    content: 'Làm sạch, tách dữ liệu hai bảng hỏi; thống kê mô tả, tính Cronbach α, tương quan C1–C2 trên 257 lượt đầu',
    location: 'Tại nhà', performersText: 'Đàm Khánh An (chính), Vương Đức Anh', performers: [KA, DA], evidenceText: 'File xử lí số liệu, biểu đồ', result: 'Kết quả bước đầu: 223/257 dùng AI; 69/221 hỏi AI trước; 202/219 sẵn sàng thử 3T', paperConfirm: '' },
  { tt: 15, dateText: '17/11/2026', dateStart: '2026-11-17', dateEnd: '', stageId: 'gd6', activityTitle: 'Viết báo cáo kết quả và báo cáo tóm tắt',
    content: 'Viết báo cáo kết quả (Phụ lục V), báo cáo tóm tắt (Phụ lục VI); xây dựng bộ câu hỏi khảo sát sau can thiệp',
    location: 'Tại nhà', performersText: 'Đàm Khánh An (chính), Vương Đức Anh (phần thiết bị)', performers: [KA, DA], evidenceText: 'Phụ lục V, Phụ lục VI, bộ câu hỏi sau can thiệp (thư mục Drive)', result: 'Báo cáo bước đầu', paperConfirm: '' },
  { tt: 16, dateText: '17/11 – 18/11/2026', dateStart: '2026-11-17', dateEnd: '2026-11-18', stageId: 'gd6', activityTitle: 'Làm slide, hoàn thiện hồ sơ dự thi',
    content: 'Làm slide thuyết trình; GVHD đọc, góp ý báo cáo; hoàn thiện hồ sơ dự thi',
    location: SCHOOL, performersText: 'Cả nhóm, GV Vũ Thúy Mai', performers: [DA, KA, GV], evidenceText: 'File slide, bản báo cáo có góp ý', result: 'Hồ sơ dự thi hoàn chỉnh', paperConfirm: 'Xác nhận T11' },
];

/** Kết quả bước đầu ghi ở dòng 14 — nhập dưới dạng bản nháp CHƯA công bố, cần đối chiếu file xử lí số liệu. */
export const PHU_LUC_VIII_PRELIM_RESULT = {
  title: 'Kết quả bước đầu khảo sát hành vi sử dụng AI tạo sinh',
  unit: 'lượt trả lời',
  sampleSize: 'Khác nhau theo câu hỏi: 257 / 221 / 219 lượt hợp lệ (trên 257 lượt đầu)',
  source: 'Khảo sát online về hành vi sử dụng AI tạo sinh; file xử lí số liệu (Phụ lục VIII, dòng 14)',
  collectedAt: '17/11/2026',
  rows: [
    { label: 'Có sử dụng AI', value: 223, total: 257 },
    { label: 'Hỏi AI trước khi tự thử giải', value: 69, total: 221 },
    { label: 'Sẵn sàng thử quy trình 3T', value: 202, total: 219 },
  ],
};
