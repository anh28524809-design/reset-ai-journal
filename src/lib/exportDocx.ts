import type { Entry, Evidence, ProjectInfo, Stage } from './types';
import { ENTRY_STATUS, EVIDENCE_KIND, ORIGIN } from './defaults';
import { downloadBlob, fmtCertainty, fmtRange, fmtTs, sortEntries } from './format';

/**
 * Xuất nhật ký theo đúng các cột của Phụ lục VIII (Kế hoạch 5999):
 * TT | Ngày | Nội dung | Địa điểm thực hiện | Người thực hiện | Minh chứng | Kết quả | Xác nhận của người hướng dẫn nghiên cứu
 * Ô ký để trống cho chữ ký tay — ứng dụng không tạo chữ ký.
 */
export async function exportPhuLucVIII(opts: {
  project: ProjectInfo;
  stages: Stage[];
  entries: Entry[];
  evidence: Evidence[];
  scope: 'verified' | 'all';
}): Promise<void> {
  const d = await import('docx');
  const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, PageOrientation } = d;
  const { project, stages, scope } = opts;
  const entries = sortEntries(scope === 'verified' ? opts.entries.filter((e) => e.status === 'verified') : opts.entries);
  const evByEntry = new Map<string, Evidence[]>();
  for (const ev of opts.evidence) {
    const arr = evByEntry.get(ev.entryId) ?? [];
    arr.push(ev);
    evByEntry.set(ev.entryId, arr);
  }
  const stageName = (id: string) => stages.find((s) => s.id === id)?.title ?? '';

  type P = InstanceType<typeof Paragraph>;
  const p = (text: string, o: { bold?: boolean; italics?: boolean; center?: boolean; size?: number } = {}): P =>
    new Paragraph({
      alignment: o.center ? AlignmentType.CENTER : AlignmentType.LEFT,
      spacing: { after: 80 },
      children: [new TextRun({ text, bold: o.bold, italics: o.italics, size: o.size })],
    });
  const lines = (text: string, size = 22): P[] =>
    (text || '').split('\n').map((t) => new Paragraph({ children: [new TextRun({ text: t, size })] }));

  const widths = [5, 11, 26, 11, 12, 14, 11, 10];
  const head = ['TT', 'Ngày', 'Nội dung', 'Địa điểm thực hiện', 'Người thực hiện', 'Minh chứng', 'Kết quả', 'Xác nhận của người hướng dẫn nghiên cứu'];
  const cell = (children: P[], i: number) => new TableCell({ children, width: { size: widths[i], type: WidthType.PERCENTAGE } });

  const rows = [
    new TableRow({
      tableHeader: true,
      children: head.map((h, i) =>
        cell([new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: h, bold: true, size: 22 })] })], i),
      ),
    }),
    ...entries.map((e, idx) => {
      const evs = (evByEntry.get(e.id) ?? []).map((x) => `• ${x.description || x.fileName} (${EVIDENCE_KIND[x.kind] ?? ''})`);
      const performers = [e.performers.join(', '), e.performersNote].filter(Boolean).join(' – ');
      const confirm =
        e.status === 'verified'
          ? `Đã xác nhận trên hệ thống: ${fmtTs(e.verifiedAt)} – ${e.verifiedByName} (phiên bản v${e.version})`
          : ENTRY_STATUS[e.status].label;
      const content = [`[${e.code}] ${e.activityTitle}`, e.content, `(${ORIGIN[e.origin]?.label ?? ''})`].filter(Boolean).join('\n');
      return new TableRow({
        children: [
          cell(lines(String(idx + 1)), 0),
          cell(lines(`${fmtRange(e)}\n${fmtCertainty(e)}`), 1),
          cell(lines(content), 2),
          cell(lines(e.location), 3),
          cell(lines(performers + (e.collaborators ? `\nPhối hợp: ${e.collaborators}` : '')), 4),
          cell(lines(evs.join('\n') || 'Chưa tải minh chứng'), 5),
          cell(lines(e.result), 6),
          cell(lines(confirm), 7),
        ],
      });
    }),
  ];

  const detail = entries.flatMap((e) => {
    const f = (label: string, v: string) =>
      new Paragraph({
        spacing: { after: 40 },
        children: [new TextRun({ text: `${label}: `, bold: true, size: 22 }), new TextRun({ text: v || '—', size: 22 })],
      });
    return [
      p(`${e.code} · ${e.activityTitle}`, { bold: true }),
      f('Giai đoạn', stageName(e.stageId)),
      f('Thời gian thực hiện', `${fmtRange(e)} (${fmtCertainty(e)})`),
      f('Ngày nhập hệ thống', fmtTs(e.createdAt)),
      f('Nguồn gốc nội dung', `${ORIGIN[e.origin]?.label ?? ''}${e.originNote ? ` – ${e.originNote}` : ''}`),
      f('Mục tiêu hoạt động', e.objective),
      f('Phương pháp/cách thức', e.method),
      f('Khó khăn phát sinh', e.difficulties),
      f('Cách khắc phục/điều chỉnh', e.solutions),
      f('Bài học kinh nghiệm', e.lessons),
      f('Công việc tiếp theo', e.nextSteps),
      f('Nhận xét của giáo viên', e.teacherComment),
      new Paragraph({ text: '' }),
    ];
  });

  const now = new Date();
  const doc = new Document({
    styles: { default: { document: { run: { font: 'Times New Roman', size: 26 } } } },
    sections: [
      {
        properties: {
          page: { size: { orientation: PageOrientation.LANDSCAPE }, margin: { top: 1000, bottom: 1000, left: 1000, right: 1000 } },
        },
        children: [
          p('PHỤ LỤC VIII', { bold: true, center: true }),
          p(`(Kèm theo ${project.basis})`, { italics: true, center: true }),
          p('NHẬT KÝ NGHIÊN CỨU VÀ MINH CHỨNG DỮ LIỆU', { bold: true, center: true, size: 28 }),
          p(
            `Bản xuất từ ứng dụng RESET-AI lúc ${now.toLocaleString('vi-VN')}. Phạm vi: ${
              scope === 'verified' ? 'chỉ các nhật ký đã được giáo viên xác nhận' : 'toàn bộ nhật ký, kể cả bản chưa xác nhận'
            }. Đây là hồ sơ tổng hợp bổ sung từ quá trình nghiên cứu đã thực hiện; nguồn gốc nội dung được ghi ở từng dòng.`,
            { italics: true, size: 20 },
          ),
          p('I - THÔNG TIN CHUNG', { bold: true }),
          p(`Tên dự án dự thi: ${project.name}`),
          p(`Lĩnh vực dự thi: ${project.field}`),
          ...project.members.map((m, i) => p(`${i === 0 ? 'Học sinh/nhóm trưởng' : 'Thành viên'}: ${m.name}${m.note ? ` – ${m.note}` : ''}`)),
          p(`Người hướng dẫn nghiên cứu: ${project.advisor}`),
          p(`Cơ sở giáo dục phổ thông / Đơn vị dự thi: ${project.unit}`),
          p(`Thời gian thực hiện: ${project.period}`),
          p('II - NHẬT KÝ THỰC HIỆN', { bold: true }),
          new Table({ rows, width: { size: 100, type: WidthType.PERCENTAGE } }),
          new Paragraph({ text: '' }),
          p('CHI TIẾT CÁC TRƯỜNG NHẬT KÝ', { bold: true }),
          ...detail,
          p('Xác nhận của người hướng dẫn nghiên cứu (Ký, ghi rõ họ tên)', { bold: true }),
          new Paragraph({ text: '' }),
          new Paragraph({ text: '' }),
          p('Học sinh/trưởng nhóm nghiên cứu (Ký, ghi rõ họ tên)', { bold: true }),
        ],
      },
    ],
  });
  const blob = await Packer.toBlob(doc);
  downloadBlob(blob, `Phu_luc_VIII_Nhat_ky_RESET-AI_${now.toISOString().slice(0, 10)}.docx`);
}
