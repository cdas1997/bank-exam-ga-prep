import { Button } from '@/components/ui/Button';
import { setHistory } from '@/lib/analysis';
import { formatClock } from '@/lib/dates';
import { MOCK_CONFIG } from '@/lib/mock';
import { formatMarks, formatPlain } from '@/lib/scoring';
import type { MockRecord, PaperSet } from '@/lib/types';

type SetGridProps = {
  sets: readonly PaperSet[];
  mocks: readonly MockRecord[];
  maxMarks: number;
  disabled: boolean;
  onStart: (setNo: number) => void;
};

export function SetGrid({ sets, mocks, maxMarks, disabled, onStart }: SetGridProps) {
  return (
    <div className="setgrid">
      {sets.map((set) => {
        const history = setHistory(mocks, set.n);
        const taken = history.attempts > 0;
        return (
          <div key={set.n} className={`setcard${taken ? ' is-taken' : ''}`}>
            <h3>Set {set.n}</h3>
            <span className="spec">
              {set.questions.length} Q · {formatClock(MOCK_CONFIG.set.seconds)}
            </span>
            {taken ? (
              <p className="setstate">
                Best <strong>{formatMarks(history.best ?? 0)}</strong> / {formatPlain(maxMarks)}
                <br />
                Last {formatMarks(history.last ?? 0)}
                <br />
                {history.attempts} attempt{history.attempts === 1 ? '' : 's'}
              </p>
            ) : (
              <p className="setstate">Not attempted yet</p>
            )}
            <Button
              variant={taken ? 'secondary' : 'primary'}
              disabled={disabled}
              aria-label={`${taken ? 'Reattempt' : 'Start'} set ${set.n}`}
              onClick={() => onStart(set.n)}
            >
              {taken ? 'Reattempt' : 'Start'}
            </Button>
          </div>
        );
      })}
    </div>
  );
}
