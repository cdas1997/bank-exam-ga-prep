import { examPhase, phaseLabel } from '@/lib/dates';
import { describeMarking, formatPlain } from '@/lib/scoring';
import type { Exam } from '@/lib/types';

type ExamCardProps = { exam: Exam; done: number; mocksTaken: number; now: number; onOpen: () => void };

export function ExamCard({ exam, done, mocksTaken, now, onOpen }: ExamCardProps) {
  const phase = examPhase(exam.bank.examDate, exam.endDate, now);
  const total = exam.bank.all.length;
  const sets = exam.bank.sets.length;
  const started = done > 0 || mocksTaken > 0;
  return (
    <button type="button" className="examcard" onClick={onOpen}>
      {phase ? <span className={`examtag ${phase.kind}`}>{phaseLabel(phase)}</span> : null}
      <span className="examname">{exam.name}</span>
      <span className="examdate">
        <span className="examdate-label">Exam date</span> {exam.dateLabel}
      </span>
      <span className="examdesc">
        {exam.section}. {total} questions{sets ? ` in ${sets} full sets` : ''}, timed mocks, topic-wise Q&amp;A with PDF export, and your analysis.
      </span>
      <span className="specline">
        50 Q · {formatPlain(exam.maxMarks)} marks · 35 min · −{describeMarking(exam.marking).wrong} per wrong answer
      </span>
      <span className="examprogress">
        {started ? `${done} of ${total} questions done · ${mocksTaken} mock${mocksTaken === 1 ? '' : 's'} taken` : 'Not started yet'}
      </span>
      <span className="examgo">{started ? 'Continue' : 'Open course'} →</span>
    </button>
  );
}
