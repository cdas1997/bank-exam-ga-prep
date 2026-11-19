import { Footer } from '@/components/layout/Footer';
import { PageHead } from '@/components/layout/PageHead';
import { Button, ButtonLink } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatClock } from '@/lib/dates';
import { MOCK_CONFIG, WEAK_MOCK_MIN_ANSWERS, isLiveRunning, mockLabel } from '@/lib/mock';
import { describeMarking, formatPlain } from '@/lib/scoring';
import { MockType, type Exam, type LiveMock, type MockRecord } from '@/lib/types';
import { navigate } from '@/hooks/useHashRoute';
import { useNow } from '@/hooks/useNow';
import { profileStore } from '@/store/profileStore';
import { MockHistoryTable } from './MockHistoryTable';
import { SetGrid } from './SetGrid';

type MocksPageProps = { exam: Exam; answeredCount: number; mocks: readonly MockRecord[]; live: LiveMock | null };

const RANDOM_MOCKS: readonly MockType[] = [MockType.Full, MockType.Quick, MockType.Weak];
/** A bank with fixed paper sets offers those as its full papers. */
const SHORT_MOCKS: readonly MockType[] = [MockType.Quick, MockType.Weak];

export function MocksPage({ exam, answeredCount, mocks, live }: MocksPageProps) {
  const { bank } = exam;
  const now = useNow(1000);
  const running = isLiveRunning(live, now) ? live : null;
  const marks = describeMarking(exam.marking);
  const hasSets = bank.sets.length > 0;

  function handleStart(type: MockType, setNo: number | null = null): void {
    if (profileStore.startMock(type, setNo)) navigate({ name: 'mock' });
  }

  return (
    <>
      <PageHead title="Mock tests">
        Timed tests marked the {exam.body} way: +{marks.right} for a right answer, −{marks.wrong} (a quarter of {marks.right}) for a
        wrong one, nothing for a skipped one.
      </PageHead>
      <main className="wrap stack">
        {running ? (
          <div className="resume">
            <span>
              <b>{mockLabel(running)} in progress</b>
              <br />
              <span className="small">
                {formatClock((running.endsAt - now) / 1000)} left · {Object.keys(running.responses).length} of {running.questionIds.length} answered
              </span>
            </span>
            <ButtonLink href="#mock" variant="primary">
              Resume
            </ButtonLink>
          </div>
        ) : null}
        {hasSets ? (
          <section className="stack-sm">
            <div className="sechead">
              <h2 className="h2">{bank.sets.length} full sets</h2>
              <span className="small muted">
                Each set is one full paper: 50 questions, {MOCK_CONFIG.set.seconds / 60} minutes, {formatPlain(exam.maxMarks)} marks
              </span>
            </div>
            <SetGrid sets={bank.sets} mocks={mocks} maxMarks={exam.maxMarks} disabled={Boolean(running)} onStart={(setNo) => handleStart(MockType.Set, setNo)} />
            <p className="small muted">
              Every set has the topic mix of the real section. After the result you can review each question and reattempt the
              set; every attempt is saved below.
            </p>
          </section>
        ) : null}
        <section className="mocktypes">
          {(hasSets ? SHORT_MOCKS : RANDOM_MOCKS).map((type) => {
            const cfg = MOCK_CONFIG[type];
            const locked = type === MockType.Weak && answeredCount < WEAK_MOCK_MIN_ANSWERS;
            return (
              <div key={type} className={`mtype${type === MockType.Full ? ' main' : ''}`}>
                <h3>{cfg.label}</h3>
                <span className="spec">
                  {Math.min(cfg.questions, bank.all.length)} questions · {formatClock(cfg.seconds)}
                </span>
                <p>
                  {type === MockType.Full && exam.fullMockBlurb ? exam.fullMockBlurb : cfg.blurb}
                  {locked ? ` Unlocks after you answer ${WEAK_MOCK_MIN_ANSWERS} questions in the bank (${answeredCount} so far).` : ''}
                </p>
                <Button variant={type === MockType.Full ? 'primary' : 'secondary'} disabled={locked || Boolean(running)} onClick={() => handleStart(type)}>
                  Start {cfg.label.toLowerCase()}
                </Button>
              </div>
            );
          })}
        </section>
        <p className="small muted">
          You can change or clear an answer until you submit. “Mark for review” flags a question to come back to; a marked question
          that has an answer still counts. The test submits itself when time runs out.
        </p>
        <section className="stack-sm">
          <div className="sechead">
            <h2 className="h2">Your mocks</h2>
            {mocks.length ? <span className="small muted">Open any mock to review every question</span> : null}
          </div>
          {mocks.length ? (
            <MockHistoryTable mocks={mocks} marking={exam.marking} />
          ) : (
            <EmptyState>Your finished mocks will be listed here, each with a full question-by-question review.</EmptyState>
          )}
        </section>
        <Footer checked={bank.checked} />
      </main>
    </>
  );
}
