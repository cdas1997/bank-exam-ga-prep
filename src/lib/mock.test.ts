import { describe, expect, it } from 'vitest';
import { isHot } from './bank';
import { attemptNumber, setHistory } from './analysis';
import { MOCK_CONFIG, PaletteState, accrueTime, createLiveMock, finishLiveMock, goToQuestion, mockLabel, paletteState, pickMockQuestions } from './mock';
import { IBPS_MARKING, SBI_MARKING, makeSetBank, makeTestBank } from './testBank';
import { MockType } from './types';

function seeded(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}

describe('mock tests', () => {
  const bank = makeTestBank(40);

  it('draws 50 distinct questions for a full mock, about 70% high-chance', () => {
    const picked = pickMockQuestions({ type: MockType.Full, bank, answers: {}, random: seeded(7) });
    expect(picked).toHaveLength(50);
    expect(new Set(picked.map((q) => q.id)).size).toBe(50);
    expect(picked.filter(isHot).length).toBe(Math.min(35, bank.all.filter(isHot).length));
  });

  it('builds a weak-areas mock that starts with past mistakes', () => {
    const answers = { a0: [0, 1] as const, a1: [3, 1] as const, b0: [0, 1] as const };
    const picked = pickMockQuestions({ type: MockType.Weak, bank, answers, random: seeded(3) });
    expect(picked).toHaveLength(MOCK_CONFIG.weak.questions);
    expect(picked.map((q) => q.id)).toEqual(expect.arrayContaining(['a0', 'a1', 'b0']));
  });

  it('times each question and marks the result the IBPS way', () => {
    const start = 1_000_000;
    let live = createLiveMock({ type: MockType.Quick, bank, answers: {}, random: seeded(11), now: start });
    const [first = '', second = ''] = live.questionIds;
    live = { ...live, responses: { [first]: 1, [second]: 0 } };
    live = goToQuestion(live, 1, start + 30_000);
    live = accrueTime(live, start + 50_000);
    expect(live.seconds[first]).toBeCloseTo(30);
    expect(live.seconds[second]).toBeCloseTo(20);
    expect(paletteState(live, 0)).toBe(PaletteState.Answered);
    expect(paletteState(live, 5)).toBe(PaletteState.NotVisited);
    const record = finishLiveMock(live, { bank, marking: IBPS_MARKING }, start + 60_000);
    expect(record.setNo).toBeNull();
    expect(record.right).toBe(1);
    expect(record.wrong).toBe(1);
    expect(record.skipped).toBe(18);
    expect(record.net).toBeCloseTo(0.9);
    expect(record.maxMarks).toBeCloseTo(24);
  });

  it('never counts time past the end of the clock', () => {
    const live = createLiveMock({ type: MockType.Quick, bank, answers: {}, random: seeded(5), now: 0 });
    const record = finishLiveMock(live, { bank, marking: IBPS_MARKING }, 10 * 60 * 60 * 1000);
    expect(record.usedMs).toBe(MOCK_CONFIG.quick.seconds * 1000);
  });
});

describe('full paper sets', () => {
  const bank = makeSetBank();
  const exam = { bank, marking: SBI_MARKING };

  function takeSet(setNo: number, now: number, wrongCount: number) {
    let live = createLiveMock({ type: MockType.Set, setNo, bank, answers: {}, random: seeded(1), now });
    const responses = Object.fromEntries(live.questionIds.map((id, i) => [id, i < wrongCount ? 0 : 1]));
    live = { ...live, responses };
    return finishLiveMock(live, exam, now + 20 * 60_000);
  }

  it('gives the same 50 questions in paper order with a 35-minute clock', () => {
    const first = createLiveMock({ type: MockType.Set, setNo: 2, bank, answers: {}, random: seeded(1), now: 0 });
    const again = createLiveMock({ type: MockType.Set, setNo: 2, bank, answers: { b25: [0, 1] }, random: seeded(99), now: 5 });
    expect(first.questionIds).toHaveLength(50);
    expect(first.questionIds).toEqual(bank.sets[1]?.questions.map((q) => q.id));
    expect(again.questionIds).toEqual(first.questionIds);
    expect(first.setNo).toBe(2);
    expect(first.limitSecs).toBe(35 * 60);
    expect(mockLabel(first)).toBe('Set 2');
  });

  it('has nothing to draw for a set the bank does not have', () => {
    expect(pickMockQuestions({ type: MockType.Set, setNo: 9, bank, answers: {}, random: seeded(1) })).toEqual([]);
  });

  it('marks a set the SBI way: +1 right, -0.25 wrong, out of 50', () => {
    const record = takeSet(1, 1_000, 10);
    expect(record.right).toBe(40);
    expect(record.wrong).toBe(10);
    expect(record.net).toBeCloseTo(37.5);
    expect(record.maxMarks).toBe(50);
  });

  it('saves every reattempt and reports the best and the latest score', () => {
    const first = takeSet(1, 1_000, 20);
    const other = takeSet(2, 2_000, 0);
    const second = takeSet(1, 3_000, 4);
    const mocks = [second, other, first];
    expect(setHistory(mocks, 1)).toEqual({ attempts: 2, best: 45, last: 45 });
    expect(setHistory([first, other, second], 1).last).toBe(25);
    expect(setHistory(mocks, 2)).toEqual({ attempts: 1, best: 50, last: 50 });
    expect(setHistory(mocks, 3)).toEqual({ attempts: 0, best: null, last: null });
    expect(attemptNumber(first, mocks)).toBe(1);
    expect(attemptNumber(second, mocks)).toBe(2);
    expect(attemptNumber(other, mocks)).toBe(1);
  });
});
