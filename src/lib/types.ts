import type { Timestamp } from 'firebase/firestore';

export type Role = 'teacher' | 'student';

/** Trạng thái kiểm duyệt nhật ký */
export type EntryStatus = 'draft' | 'submitted' | 'returned' | 'verified';

/** Phân biệt dữ liệu gốc, nội dung hồi cứu và nội dung suy luận */
export type ContentOrigin = 'original' | 'retrospective' | 'inferred';

/** Mức độ chắc chắn của ngày thực hiện */
export type DateCertainty = 'exact' | 'range' | 'approximate';

export type StageStatus = 'none' | 'collecting' | 'reviewing' | 'confirmed';
export type ActivityStatus = 'todo' | 'doing' | 'done';

export interface Activity {
  id: string;
  title: string;
  status: ActivityStatus;
  assignee?: string;
}

export interface Stage {
  id: string;
  order: number;
  title: string;
  description: string;
  period: string;
  periodVerified: boolean;
  status: StageStatus;
  activities: Activity[];
}

export interface Member {
  name: string;
  role: string;
  note?: string;
}

export interface ProjectInfo {
  name: string;
  field: string;
  unit: string;
  period: string;
  basis: string;
  members: Member[];
  advisor: string;
  objectives: string;
  questions: string;
  deviceIntro: string;
  process3T: { title: string; desc: string }[];
}

export interface Entry {
  id: string;
  code: string;
  stageId: string;
  activityTitle: string;
  dateStart: string; // yyyy-mm-dd
  dateEnd: string; // yyyy-mm-dd hoặc rỗng
  dateCertainty: DateCertainty;
  dateNote: string;
  location: string;
  performers: string[]; // tên thành viên
  performersNote: string;
  collaborators: string;
  objective: string;
  content: string;
  method: string;
  result: string;
  difficulties: string;
  solutions: string;
  lessons: string;
  nextSteps: string;
  origin: ContentOrigin;
  originNote: string;
  status: EntryStatus;
  teacherComment: string;
  verifiedAt: Timestamp | null;
  verifiedByUid: string;
  verifiedByName: string;
  version: number;
  importKey?: string;
  createdAt: Timestamp | null;
  createdBy: string;
  createdByName: string;
  updatedAt: Timestamp | null;
  updatedBy: string;
  updatedByName: string;
}

export type EntryEditable = Pick<
  Entry,
  | 'stageId' | 'activityTitle' | 'dateStart' | 'dateEnd' | 'dateCertainty' | 'dateNote' | 'location'
  | 'performers' | 'performersNote' | 'collaborators' | 'objective' | 'content' | 'method' | 'result'
  | 'difficulties' | 'solutions' | 'lessons' | 'nextSteps' | 'origin' | 'originNote'
>;

export interface HistoryItem {
  id: string;
  action: string;
  note: string;
  version: number;
  byUid: string;
  byName: string;
  at: Timestamp | null;
}

export type EvidenceKind =
  | 'thiet_bi' | 'khao_sat' | 'thu_nghiem' | 'phan_tich' | 'bien_ban'
  | 'tai_lieu' | 'ma_nguon' | 'hoa_don' | 'khac';

export interface Evidence {
  id: string;
  entryId: string;
  entryCode: string;
  fileName: string;
  storagePath: string;
  contentType: string;
  size: number;
  description: string;
  kind: EvidenceKind;
  providedBy: string;
  collectedDate: string;
  uploadedAt: Timestamp | null;
  uploadedBy: string;
  uploadedByName: string;
  approved: boolean;
  featured: boolean;
  sensitive: boolean;
  approvedAt?: Timestamp | null;
}

export type ResultSection = 'survey' | 'device' | 'intervention';
export type ChartType = 'bar' | 'proportion' | 'table' | 'text';
export type EvidenceLevel = 'descriptive' | 'preliminary' | 'sufficient';

export interface ResultRow {
  label: string;
  value: number;
  total?: number;
  note?: string;
}

export interface StoredFile {
  name: string;
  path: string;
  size: number;
  contentType: string;
  uploadedAtISO: string;
  uploadedByName: string;
}

export interface ResultItem {
  id: string;
  section: ResultSection;
  order: number;
  title: string;
  chartType: ChartType;
  unit: string;
  sampleSize: string;
  source: string;
  collectedAt: string;
  rows: ResultRow[];
  interpretation: string;
  evidenceLevel: EvidenceLevel;
  published: boolean;
  rawFiles: StoredFile[];
  updatedAt: Timestamp | null;
  updatedByName: string;
}

export type DossierStatus = 'missing' | 'drafting' | 'reviewing' | 'done';

export interface DossierItem {
  id: string;
  code: string;
  title: string;
  owner: string;
  status: DossierStatus;
  note: string;
  files: StoredFile[];
  published: boolean;
  updatedAt: Timestamp | null;
  updatedByName: string;
}

export interface PublicStats {
  stages: number;
  entries: number;
  evidenceApproved: number;
  entriesVerified: number;
  updatedAt: Timestamp | null;
}

export interface RoleDoc {
  id: string; // email
  role: Role;
  name: string;
}
