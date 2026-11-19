import { describe, expect, it } from 'vitest';
import { BackupError, decodeBackup, encodeBackup } from './backup';
import { emptyProfile, parseProfile } from './profile';
import { ExamKey, MockType } from './types';

describe('backup and stored-data validation', () => {
  const known = new Set(['q1', 'q2']);
  const ibps = { key: ExamKey.IbpsPo, knownIds: known };
  const sbi = { key: ExamKey.SbiClerk, knownIds: known };

  it('round-trips answers and mocks through a backup code', () => {
    const profile = { ...emptyProfile(), answers: { q1: [2, 1700000000000] as const } };
    const restored = decodeBackup(encodeBackup(profile, ExamKey.SbiClerk), sbi);
    expect(restored.answers).toEqual({ q1: [2, 1700000000000] });
    expect(restored.mocks).toEqual([]);
  });

  it('rejects text that is not a backup code', () => {
    expect(() => decodeBackup('hello there', ibps)).toThrow(BackupError);
  });

  it('refuses a code made in the other exam course', () => {
    const code = encodeBackup({ ...emptyProfile(), answers: { q1: [2, 5] as const } }, ExamKey.SbiClerk);
    expect(() => decodeBackup(code, ibps)).toThrow(BackupError);
  });

  it('reads a code made before exams existed as an IBPS PO code', () => {
    const legacy = btoa(JSON.stringify({ v: 1, answers: { q2: [1, 9] }, mocks: [] }));
    expect(decodeBackup(legacy, ibps).answers).toEqual({ q2: [1, 9] });
    expect(() => decodeBackup(legacy, sbi)).toThrow(BackupError);
  });

  it('keeps the set number of a paper-set mock and drops one without it', () => {
    const base = { id: 'm1', questionIds: ['q1'], responses: { q1: 0 }, seconds: { q1: 3 }, startedAt: 1, right: 0, wrong: 1, skipped: 0, net: -0.25, maxMarks: 1, usedMs: 5, limitSecs: 10 };
    const parsed = parseProfile({ answers: {}, mocks: [{ ...base, type: 'set', setNo: 3 }, { ...base, id: 'm2', type: 'set' }, { ...base, id: 'm3', type: 'quick' }] }, known);
    expect(parsed.mocks.map((m) => [m.id, m.type, m.setNo])).toEqual([
      ['m1', MockType.Set, 3],
      ['m3', MockType.Quick, null],
    ]);
  });

  it('drops malformed entries and questions this bank does not have', () => {
    const parsed = parseProfile(
      { answers: { q1: [1, 5], q9: [0, 5], q2: 'bad' }, mocks: [{ id: 'x' }], live: { nope: true }, mode: 'revision' },
      known,
    );
    expect(parsed.answers).toEqual({ q1: [1, 5] });
    expect(parsed.mocks).toEqual([]);
    expect(parsed.live).toBeNull();
    expect(parsed.mode).toBe('revision');
  });
});
