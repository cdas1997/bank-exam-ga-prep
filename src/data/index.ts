import { loadBank } from '@/lib/bank';
import { ExamKey, type Exam } from '@/lib/types';
import ibpsPoRaw from './bank.json';
import sbiClerkRaw from './sbi-clerk-bank.json';

const PAPER_QUESTIONS = 50;

type ExamConfig = Omit<Exam, 'knownIds' | 'maxMarks'>;

function defineExam(config: ExamConfig): Exam {
  return { ...config, maxMarks: PAPER_QUESTIONS * config.marking.right, knownIds: new Set(config.bank.byId.keys()) };
}

const sbiClerk = defineExam({
  key: ExamKey.SbiClerk,
  name: 'SBI Clerk Mains 2026',
  brand: 'SBI Clerk GA Prep',
  body: 'SBI',
  section: 'General / Financial Awareness',
  dateLabel: '26 & 27 Nov 2026 (tentative)',
  endDate: '2026-11-27',
  syllabus: 'Current Affairs, Banking & Financial Awareness and Static GK',
  rankedAgainst: 'the questions recalled from the October 2026 SBI Clerk Mains and other 2026 bank exams',
  examDayTip: 'Exam day. Read your mistakes once in Revision mode, then stop and rest.',
  guide: [
    {
      title: 'Take one or two full sets a day',
      note: '8 sets of 50 questions, 35 minutes each, with the topic mix of the real section. Reattempt any set you score low on.',
    },
    {
      title: 'Review every wrong and skipped question',
      note: 'Each answer comes with the key fact and the facts an examiner could ask next.',
    },
    {
      title: 'Read the Q&A topic by topic',
      note: 'All 400 questions with answers, to read like a revision book or print as a PDF.',
    },
    {
      title: 'Come back here to see what to fix',
      note: 'Weak topics, your pace, and the marks you lose to wrong guesses.',
    },
  ],
  marking: { right: 1, wrong: 0.25 },
  pdf: { prefix: 'sbi-clerk-ga-qa', title: 'SBI Clerk Mains GA Q and A' },
  bank: loadBank(sbiClerkRaw),
});

const ibpsPo = defineExam({
  key: ExamKey.IbpsPo,
  name: 'IBPS PO Mains 2026',
  brand: 'PO Mains GA Prep',
  body: 'IBPS',
  section: 'General, Economy & Banking Awareness',
  dateLabel: '4 Oct 2026',
  endDate: '2026-10-04',
  syllabus: 'General, Economy, Banking, Digital & Financial Awareness',
  rankedAgainst: 'past IBPS PO Mains papers and 2026 bank exams',
  examDayTip: 'Exam day. Skim the September set in Revision mode, then stop and rest.',
  guide: [
    {
      title: 'Practise the Top 100 first',
      note: 'The questions ranked most likely to appear, from past IBPS PO Mains papers and 2026 bank exams.',
    },
    {
      title: 'Then the month sets, newest first',
      note: 'Most GA questions are current affairs from the last three to five months.',
    },
    {
      title: 'Take a full mock every day from here',
      note: '50 questions in 35 minutes, marked the IBPS way. Your score trend appears below.',
    },
    {
      title: 'Come back here to see what to fix',
      note: 'Weak topics, your pace, and the marks you lose to wrong guesses.',
    },
  ],
  marking: { right: 1.2, wrong: 0.3 },
  pdf: { prefix: 'po-mains-ga-qa', title: 'PO Mains GA Q and A' },
  bank: loadBank(ibpsPoRaw),
});

/** Upcoming exam first. */
export const EXAMS: readonly Exam[] = [sbiClerk, ibpsPo];

export function examByKey(key: ExamKey | null): Exam | null {
  return EXAMS.find((e) => e.key === key) ?? null;
}
