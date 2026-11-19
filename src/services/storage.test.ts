import { beforeEach, describe, expect, it } from 'vitest';
import { emptyProfile } from '@/lib/profile';
import { ExamKey } from '@/lib/types';
import { getCurrentExam, loadProfile, saveProfile, setCurrentExam } from './storage';

const store = new Map<string, string>();
const fakeStorage = {
  getItem: (key: string): string | null => store.get(key) ?? null,
  setItem: (key: string, value: string): void => {
    store.set(key, value);
  },
  removeItem: (key: string): void => {
    store.delete(key);
  },
};

describe('saved progress per exam', () => {
  const known = new Set(['q1', 'q2']);
  const ibps = { name: 'Asha', examKey: ExamKey.IbpsPo };
  const sbi = { name: 'Asha', examKey: ExamKey.SbiClerk };

  beforeEach(() => {
    store.clear();
    Object.defineProperty(globalThis, 'localStorage', { value: fakeStorage, configurable: true });
  });

  it('keeps the two exams apart under one username', () => {
    saveProfile(ibps, { ...emptyProfile(), answers: { q1: [0, 1] } });
    saveProfile(sbi, { ...emptyProfile(), answers: { q2: [3, 2] } });
    expect(loadProfile(ibps, known).answers).toEqual({ q1: [0, 1] });
    expect(loadProfile(sbi, known).answers).toEqual({ q2: [3, 2] });
    expect(loadProfile({ name: 'Ravi', examKey: ExamKey.SbiClerk }, known).answers).toEqual({});
  });

  it('still reads IBPS PO progress saved before the app had a second exam', () => {
    store.set('pogp.v1.user.asha', JSON.stringify({ answers: { q1: [2, 7] }, mocks: [], live: null, mode: 'practice' }));
    expect(loadProfile(ibps, known).answers).toEqual({ q1: [2, 7] });
    expect(loadProfile(sbi, known).answers).toEqual({});
  });

  it('remembers the chosen exam and ignores an unknown one', () => {
    expect(getCurrentExam()).toBeNull();
    setCurrentExam(ExamKey.SbiClerk);
    expect(getCurrentExam()).toBe(ExamKey.SbiClerk);
    store.set('pogp.v1.exam', JSON.stringify('some-other-exam'));
    expect(getCurrentExam()).toBeNull();
    setCurrentExam(null);
    expect(store.has('pogp.v1.exam')).toBe(false);
  });
});
