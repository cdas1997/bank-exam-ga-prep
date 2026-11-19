import { describe, expect, it } from 'vitest';
import { examPhase, phaseLabel } from './dates';

const at = (month: number, day: number, hour = 10): number => new Date(2026, month - 1, day, hour).getTime();

describe('exam phase', () => {
  it('counts the days to the first exam day', () => {
    expect(examPhase('2026-11-26', '2026-11-27', at(11, 19))).toEqual({ kind: 'before', daysLeft: 7 });
    expect(phaseLabel({ kind: 'before', daysLeft: 7 })).toBe('7 days to exam');
    expect(phaseLabel({ kind: 'before', daysLeft: 1 })).toBe('1 day to exam');
  });

  it('treats every day of a two-day exam as exam day', () => {
    expect(examPhase('2026-11-26', '2026-11-27', at(11, 26, 7))).toEqual({ kind: 'during' });
    expect(examPhase('2026-11-26', '2026-11-27', at(11, 27, 23))).toEqual({ kind: 'during' });
    expect(examPhase('2026-11-26', '2026-11-27', at(11, 28, 0))).toEqual({ kind: 'after' });
    expect(phaseLabel({ kind: 'during' })).toBe('Exam today');
  });

  it('says a past one-day exam is over and rejects a bad date', () => {
    expect(examPhase('2026-10-04', '2026-10-04', at(11, 19))).toEqual({ kind: 'after' });
    expect(examPhase('soon', '2026-10-04', at(11, 19))).toBeNull();
  });
});
