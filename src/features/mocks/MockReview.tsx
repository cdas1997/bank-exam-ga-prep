import { useState } from 'react';
import { TopBar } from '@/components/layout/TopBar';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { EmptyState } from '@/components/ui/EmptyState';
import { QuestionCard } from '@/features/bank';
import { navigate } from '@/hooks/useHashRoute';
import { accuracyOf, mockTopicBreakdown } from '@/lib/analysis';
import { formatClock } from '@/lib/dates';
import { mockLabel } from '@/lib/mock';
import { EXAM_PACE_SECS, formatMarks } from '@/lib/scoring';
import { MockType, type Exam, type MockRecord } from '@/lib/types';
import { profileStore } from '@/store/profileStore';

type ReviewFilter = 'all' | 'wrong' | 'skipped' | 'right';

type MockReviewProps = {
  exam: Exam;
  mock: MockRecord;
  /** which attempt at this paper set it was; null for other mocks */
  attempt: number | null;
  canStartNew: boolean;
};

export function MockReview({ exam, mock, attempt, canStartNew }: MockReviewProps) {
  const { bank, marking } = exam;
  const label = mockLabel(mock);
  const [filter, setFilter] = useState<ReviewFilter>('all');
  const attempted = mock.right + mock.wrong;
  const answeredIds = mock.questionIds.filter((id) => mock.responses[id] !== undefined);
  const pace = answeredIds.length ? answeredIds.reduce((sum, id) => sum + (mock.seconds[id] ?? 0), 0) / answeredIds.length : null;
  const rows = mock.questionIds
    .map((id, index) => ({ q: bank.byId.get(id), index, response: mock.responses[id] }))
    .filter((r) => r.q !== undefined)
    .filter(({ q, response }) => {
      if (filter === 'wrong') return response !== undefined && response !== q?.answer;
      if (filter === 'skipped') return response === undefined;
      if (filter === 'right') return response === q?.answer;
      return true;
    });

  function handleNew(): void {
    if (profileStore.startMock(mock.type, mock.setNo)) navigate({ name: 'mock' });
  }

  return (
    <>
      <TopBar>
        <a className="back" href="#mocks">
          ← Mock tests
        </a>
        <Button variant="primary" disabled={!canStartNew} onClick={handleNew}>
          {mock.type === MockType.Set ? `Reattempt ${label.toLowerCase()}` : `New ${label.toLowerCase()}`}
        </Button>
      </TopBar>
      <main className="wrap stack">
        <header className="thead">
          <p className="label">
            {label}
            {attempt === null ? '' : ` · attempt ${attempt}`} · {new Date(mock.startedAt).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
          </p>
          <span className="hero-num">
            {formatMarks(mock.net)}
            <small>/ {formatMarks(mock.maxMarks)} marks</small>
          </span>
          <div className="facts">
            <span>Accuracy {attempted ? `${accuracyOf(mock.right, mock.wrong)}%` : '–'}</span>
            <span>
              Attempted {attempted} of {mock.questionIds.length}
            </span>
            <span>
              Time used {formatClock(mock.usedMs / 1000)} of {formatClock(mock.limitSecs)}
            </span>
            {pace !== null ? (
              <span>
                {Math.round(pace)}s per answered question (exam pace {EXAM_PACE_SECS}s)
              </span>
            ) : null}
          </div>
        </header>
        <div className="panel tablewrap">
          <table className="data passbook">
            <thead>
              <tr>
                <th>Particulars</th>
                <th className="n">Qs</th>
                <th className="n">Credit</th>
                <th className="n">Debit</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Right answers</td>
                <td className="n">{mock.right}</td>
                <td className="n cr">+{formatMarks(mock.right * marking.right)}</td>
                <td className="n" />
              </tr>
              <tr>
                <td>Wrong answers</td>
                <td className="n">{mock.wrong}</td>
                <td className="n" />
                <td className="n dr">−{formatMarks(mock.wrong * marking.wrong)}</td>
              </tr>
              <tr>
                <td>Not attempted</td>
                <td className="n">{mock.skipped}</td>
                <td className="n" />
                <td className="n" />
              </tr>
              <tr className="bal">
                <td>Net marks</td>
                <td className="n" />
                <td className="n" colSpan={2}>
                  {formatMarks(mock.net)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <section className="stack-sm">
          <h2 className="h2">By topic in this mock</h2>
          <div className="panel tablewrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Topic</th>
                  <th className="n">Right</th>
                  <th className="n">Wrong</th>
                  <th className="n">Skipped</th>
                  <th className="n">Net</th>
                </tr>
              </thead>
              <tbody>
                {mockTopicBreakdown(mock, bank, marking).map((r) => (
                  <tr key={r.topic.key}>
                    <td>
                      <a href={`#set-${r.topic.key}`}>{r.topic.name}</a>
                    </td>
                    <td className="n">{r.right}</td>
                    <td className="n">{r.wrong}</td>
                    <td className="n">{r.skipped}</td>
                    <td className="n">{formatMarks(r.net)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <section className="stack-sm">
          <h2 className="h2">Review every question</h2>
          <div className="chips" role="group" aria-label="Show">
            <Chip label="All" count={mock.questionIds.length} pressed={filter === 'all'} onPress={() => setFilter('all')} />
            <Chip label="Wrong" count={mock.wrong} pressed={filter === 'wrong'} onPress={() => setFilter('wrong')} />
            <Chip label="Skipped" count={mock.skipped} pressed={filter === 'skipped'} onPress={() => setFilter('skipped')} />
            <Chip label="Right" count={mock.right} pressed={filter === 'right'} onPress={() => setFilter('right')} />
          </div>
          {rows.length ? (
            <div className="qlist">
              {rows.map(({ q, index, response }) =>
                q ? (
                  <QuestionCard
                    key={q.id}
                    question={q}
                    label={`Q${index + 1}`}
                    context={bank.topicByKey.get(q.topic)?.name}
                    choice={response}
                    display="result"
                    unanswered="skipped"
                    secondsSpent={mock.seconds[q.id]}
                  />
                ) : null,
              )}
            </div>
          ) : (
            <EmptyState>Nothing in this group.</EmptyState>
          )}
        </section>
      </main>
    </>
  );
}
