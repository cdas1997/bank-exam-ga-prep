import { describe, expect, it } from 'vitest';
import { Strength, describeMarking, formatMarks, netMarks, setStats, strengthOf } from './scoring';
import { IBPS_MARKING, SBI_MARKING, makeTestBank } from './testBank';

describe('scoring', () => {
  it('deducts a quarter of 1.2 marks for each wrong IBPS answer', () => {
    expect(netMarks(40, 10, IBPS_MARKING)).toBeCloseTo(45);
    expect(formatMarks(netMarks(0, 3, IBPS_MARKING))).toBe('-0.90');
    expect(describeMarking(IBPS_MARKING)).toEqual({ right: '1.2', wrong: '0.30' });
  });

  it('deducts a quarter mark for each wrong SBI answer', () => {
    expect(formatMarks(netMarks(40, 10, SBI_MARKING))).toBe('37.50');
    expect(describeMarking(SBI_MARKING)).toEqual({ right: '1', wrong: '0.25' });
  });

  it('counts right, wrong and unanswered questions', () => {
    const bank = makeTestBank(5);
    const qs = bank.topicByKey.get('a')?.questions ?? [];
    const stats = setStats(qs, { a0: [1, 0], a1: [0, 0], a2: [1, 0] });
    expect(stats).toEqual({ right: 2, wrong: 1, done: 3, total: 5 });
  });

  it('only judges strength after three attempts', () => {
    expect(strengthOf({ right: 0, wrong: 0, done: 0, total: 5 })).toBe(Strength.None);
    expect(strengthOf({ right: 2, wrong: 0, done: 2, total: 5 })).toBe(Strength.Early);
    expect(strengthOf({ right: 3, wrong: 1, done: 4, total: 5 })).toBe(Strength.Strong);
    expect(strengthOf({ right: 2, wrong: 2, done: 4, total: 5 })).toBe(Strength.Average);
    expect(strengthOf({ right: 1, wrong: 3, done: 4, total: 5 })).toBe(Strength.Weak);
  });
});
