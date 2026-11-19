import { attemptNumber } from '@/lib/analysis';
import { formatClock, formatDateTime } from '@/lib/dates';
import { mockLabel } from '@/lib/mock';
import { formatMarks } from '@/lib/scoring';
import type { Marking, MockRecord } from '@/lib/types';

type MockHistoryTableProps = { mocks: readonly MockRecord[]; marking: Marking };

function nameOf(mock: MockRecord, mocks: readonly MockRecord[]): string {
  const attempt = attemptNumber(mock, mocks);
  return attempt === null ? mockLabel(mock) : `${mockLabel(mock)} · attempt ${attempt}`;
}

export function MockHistoryTable({ mocks, marking }: MockHistoryTableProps) {
  return (
    <div className="panel tablewrap">
      <table className="data passbook">
        <thead>
          <tr>
            <th>Date</th>
            <th>Mock</th>
            <th className="n">Right / Wrong / Skip</th>
            <th className="n">Credit</th>
            <th className="n">Debit</th>
            <th className="n">Net</th>
            <th className="n">Time</th>
          </tr>
        </thead>
        <tbody>
          {mocks.map((m) => (
            <tr key={m.id}>
              <td>
                <a href={`#review-${m.id}`}>{formatDateTime(m.startedAt)}</a>
              </td>
              <td>{nameOf(m, mocks)}</td>
              <td className="n">
                {m.right} / {m.wrong} / {m.skipped}
              </td>
              <td className="n cr">+{formatMarks(m.right * marking.right)}</td>
              <td className="n dr">−{formatMarks(m.wrong * marking.wrong)}</td>
              <td className="n">
                <strong>{formatMarks(m.net)}</strong> <span className="muted">/ {formatMarks(m.maxMarks)}</span>
              </td>
              <td className="n">{formatClock(m.usedMs / 1000)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
