import { describe, expect, it } from 'vitest';
import { ExamKey } from '@/lib/types';
import { EXAMS, examByKey } from './index';

/** Questions per topic in every SBI Clerk paper set: 27 current affairs, 16 banking, 7 static. */
const SBI_SET_MIX: Record<string, number> = {
  'ca-news': 7,
  'ca-appointments': 4,
  'ca-awards': 4,
  'ca-sports': 4,
  'ca-science': 4,
  'ca-reports': 4,
  'bf-rbi': 4,
  'bf-banking': 3,
  'bf-digital': 3,
  'bf-regulators': 3,
  'bf-budget': 3,
  'sg-banking': 3,
  'sg-geography': 2,
  'sg-general': 2,
};

describe('exam courses', () => {
  it('lists the upcoming exam first and finds a course by key', () => {
    expect(EXAMS.map((e) => e.key)).toEqual([ExamKey.SbiClerk, ExamKey.IbpsPo]);
    expect(examByKey(ExamKey.IbpsPo)?.name).toBe('IBPS PO Mains 2026');
    expect(examByKey(null)).toBeNull();
  });

  it('keeps the IBPS PO course as it was: 250 questions, 60 marks, no paper sets', () => {
    const ibps = examByKey(ExamKey.IbpsPo);
    expect(ibps?.bank.all).toHaveLength(250);
    expect(ibps?.bank.sets).toEqual([]);
    expect(ibps?.maxMarks).toBeCloseTo(60);
    expect(ibps?.marking).toEqual({ right: 1.2, wrong: 0.3 });
  });

  it('gives each course its own set of question ids', () => {
    // A question may appear word for word in both courses; progress never mixes because each course saves separately.
    for (const exam of EXAMS) expect(exam.knownIds.size, exam.name).toBe(exam.bank.all.length);
  });

  describe('SBI Clerk Mains', () => {
    const sbi = examByKey(ExamKey.SbiClerk);
    const bank = sbi?.bank;

    it('is marked +1 / -0.25 out of 50 and dated 26-27 November 2026', () => {
      expect(sbi?.marking).toEqual({ right: 1, wrong: 0.25 });
      expect(sbi?.maxMarks).toBe(50);
      expect(bank?.examDate).toBe('2026-11-26');
      expect(sbi?.endDate).toBe('2026-11-27');
    });

    it('has 400 questions in 14 topics', () => {
      expect(bank?.all).toHaveLength(400);
      expect(bank?.topics.map((t) => t.key)).toEqual(Object.keys(SBI_SET_MIX));
      for (const topic of bank?.topics ?? []) expect(topic.questions.length, topic.key).toBe((SBI_SET_MIX[topic.key] ?? 0) * 8);
    });

    it('has 8 sets of 50 that use every question exactly once', () => {
      expect(bank?.sets.map((s) => s.questions.length)).toEqual([50, 50, 50, 50, 50, 50, 50, 50]);
      const ids = bank?.sets.flatMap((s) => s.questions.map((q) => q.id)) ?? [];
      expect(new Set(ids).size).toBe(400);
    });

    it('gives every set the same topic mix', () => {
      for (const set of bank?.sets ?? []) {
        const mix: Record<string, number> = {};
        for (const q of set.questions) mix[q.topic] = (mix[q.topic] ?? 0) + 1;
        expect(mix, `set ${set.n}`).toEqual(SBI_SET_MIX);
      }
    });

    it('has four distinct options and an explanation on every question', () => {
      for (const q of bank?.all ?? []) {
        expect(new Set(q.options.map((o) => o.trim().toLowerCase())).size, q.id).toBe(4);
        expect(q.explanation.length, q.id).toBeGreaterThan(20);
      }
    });
  });
});
