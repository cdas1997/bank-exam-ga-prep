import { Button } from '@/components/ui/Button';
import { setStats } from '@/lib/scoring';
import type { Exam, ExamKey } from '@/lib/types';
import { loadProfile } from '@/services/storage';
import { ExamCard } from './ExamCard';

type ExamPickerPageProps = {
  exams: readonly Exam[];
  user: string;
  now: number;
  onPick: (examKey: ExamKey) => void;
  onSwitchUser: () => void;
};

export function ExamPickerPage({ exams, user, now, onPick, onSwitchUser }: ExamPickerPageProps) {
  return (
    <main className="wrap picker">
      <div className="picker-in">
        <header className="stack-sm">
          <p className="label">Signed in as {user}</p>
          <h1>Choose your exam</h1>
          <p className="muted">
            Each exam has its own questions, mock tests and analysis, and your progress is saved separately for each. You can
            switch exams at any time from the top of the page.
          </p>
        </header>
        <div className="examgrid">
          {exams.map((exam) => {
            const saved = loadProfile({ name: user, examKey: exam.key }, exam.knownIds);
            return (
              <ExamCard
                key={exam.key}
                exam={exam}
                done={setStats(exam.bank.all, saved.answers).done}
                mocksTaken={saved.mocks.length}
                now={now}
                onOpen={() => onPick(exam.key)}
              />
            );
          })}
        </div>
        <div>
          <Button variant="link" onClick={onSwitchUser}>
            Not {user}? Switch user
          </Button>
        </div>
      </div>
    </main>
  );
}
