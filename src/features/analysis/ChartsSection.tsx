import { ActivityChart } from '@/components/charts/ActivityChart';
import { TrendChart, type TrendPoint } from '@/components/charts/TrendChart';
import type { DayActivity } from '@/lib/analysis';

type ChartsSectionProps = {
  trend: readonly (TrendPoint & { accuracy: number })[];
  /** marks of the real section, which the scores are scaled to */
  maxMarks: number;
  activity: readonly DayActivity[];
};

export function ChartsSection({ trend, maxMarks, activity }: ChartsSectionProps) {
  return (
    <section className="charts">
      <div className="panel chartcard">
        <h3>Mock scores, scaled to {maxMarks}</h3>
        {trend.length ? (
          <>
            <TrendChart
              points={trend}
              max={maxMarks}
              unit={`/ ${maxMarks}`}
              ariaLabel={`Mock scores scaled to ${maxMarks}: ${trend.map((p) => `${p.label} ${p.value.toFixed(2)}`).join(', ')}`}
            />
            <details className="tableview">
              <summary>Show as table</summary>
              <div className="tablewrap">
                <table className="data">
                  <thead>
                    <tr>
                      <th>Mock</th>
                      <th>Type and date</th>
                      <th className="n">Score / {maxMarks}</th>
                      <th className="n">Accuracy</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trend.map((p) => (
                      <tr key={p.label}>
                        <td>{p.label}</td>
                        <td>{p.detail}</td>
                        <td className="n">{p.value.toFixed(2)}</td>
                        <td className="n">{p.accuracy}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          </>
        ) : (
          <div className="empty-chart">Your mock scores will be plotted here after your first mock.</div>
        )}
      </div>
      <div className="panel chartcard">
        <h3>Questions answered, last 7 days</h3>
        <ActivityChart bars={activity} />
        <details className="tableview">
          <summary>Show as table</summary>
          <div className="tablewrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Day</th>
                  <th className="n">Questions</th>
                </tr>
              </thead>
              <tbody>
                {activity.map((d) => (
                  <tr key={d.key}>
                    <td>{d.longLabel}</td>
                    <td className="n">{d.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </div>
    </section>
  );
}
