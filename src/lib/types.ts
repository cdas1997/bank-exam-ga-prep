export const TopicGroup = {
  Focus: 'focus',
  Month: 'month',
  Topic: 'topic',
  Current: 'current',
  Banking: 'banking',
  Static: 'static',
} as const;
export type TopicGroup = (typeof TopicGroup)[keyof typeof TopicGroup];

export type Question = {
  id: string;
  /** 1-based position inside its topic */
  n: number;
  topic: string;
  text: string;
  options: readonly string[];
  /** index of the correct option */
  answer: number;
  explanation: string;
  /** 0 = unscored, otherwise 1-5 chance of appearing in the exam */
  likely: number;
  /** position across the whole bank */
  order: number;
  /** number of the full paper set this question belongs to; 0 when the bank has no sets */
  set: number;
};

export type Topic = {
  key: string;
  name: string;
  group: TopicGroup;
  questions: readonly Question[];
};

/** One full paper: a fixed list of questions in paper order. */
export type PaperSet = { n: number; questions: readonly Question[] };

export type Bank = {
  checked: string;
  examDate: string;
  topics: readonly Topic[];
  all: readonly Question[];
  byId: ReadonlyMap<string, Question>;
  topicByKey: ReadonlyMap<string, Topic>;
  top: readonly Question[];
  sets: readonly PaperSet[];
};

export type AnswerRecord = readonly [choice: number, answeredAt: number];
export type Answers = Readonly<Record<string, AnswerRecord>>;

export const MockType = { Full: 'full', Quick: 'quick', Weak: 'weak', Set: 'set' } as const;
export type MockType = (typeof MockType)[keyof typeof MockType];

export type MockRecord = {
  id: string;
  type: MockType;
  /** the paper set taken, for MockType.Set; otherwise null */
  setNo: number | null;
  startedAt: number;
  questionIds: readonly string[];
  responses: Readonly<Record<string, number>>;
  seconds: Readonly<Record<string, number>>;
  right: number;
  wrong: number;
  skipped: number;
  net: number;
  maxMarks: number;
  usedMs: number;
  limitSecs: number;
};

export type LiveMock = {
  id: string;
  type: MockType;
  setNo: number | null;
  questionIds: readonly string[];
  responses: Readonly<Record<string, number>>;
  marked: Readonly<Record<string, true>>;
  visited: readonly number[];
  seconds: Readonly<Record<string, number>>;
  index: number;
  startedAt: number;
  endsAt: number;
  limitSecs: number;
  questionShownAt: number;
};

export const StudyMode = { Practice: 'practice', Revision: 'revision' } as const;
export type StudyMode = (typeof StudyMode)[keyof typeof StudyMode];

export type Profile = {
  answers: Answers;
  mocks: readonly MockRecord[];
  live: LiveMock | null;
  mode: StudyMode;
};

export const SetFilter = { All: 'all', Todo: 'todo', Wrong: 'wrong', Right: 'right', Hot: 'hot' } as const;
export type SetFilter = (typeof SetFilter)[keyof typeof SetFilter];

export const ExamKey = { IbpsPo: 'ibps-po-mains-2026', SbiClerk: 'sbi-clerk-mains-2026' } as const;
export type ExamKey = (typeof ExamKey)[keyof typeof ExamKey];

/** Marks for a right answer and marks deducted for a wrong one. */
export type Marking = { right: number; wrong: number };

/** File-name prefix of the printed PDFs and the title used for saved copies. */
export type PdfNames = { prefix: string; title: string };

export type GuideStep = { title: string; note: string };

/** One exam course: its paper rules, its wording and its question bank. */
export type Exam = {
  key: ExamKey;
  /** e.g. "SBI Clerk Mains 2026" */
  name: string;
  /** short name shown in the header */
  brand: string;
  /** the body whose marking rules apply, e.g. "SBI" */
  body: string;
  /** name of the section, e.g. "General / Financial Awareness" */
  section: string;
  /** exam date as people say it, e.g. "26 & 27 Nov 2026 (tentative)" */
  dateLabel: string;
  /** last exam day, YYYY-MM-DD; the first day is the bank's examDate */
  endDate: string;
  /** what the bank covers, used in sentences */
  syllabus: string;
  /** what the likelihood ranking was built from */
  rankedAgainst: string;
  examDayTip: string;
  guide: readonly GuideStep[];
  marking: Marking;
  /** marks for the full section */
  maxMarks: number;
  pdf: PdfNames;
  bank: Bank;
  knownIds: ReadonlySet<string>;
};
