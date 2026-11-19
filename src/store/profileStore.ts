import { useSyncExternalStore } from 'react';
import { examByKey } from '@/data';
import { accrueTime, createLiveMock, finishLiveMock, goToQuestion } from '@/lib/mock';
import { emptyProfile } from '@/lib/profile';
import { MockType, type Exam, type ExamKey, type LiveMock, type MockRecord, type Profile, type StudyMode } from '@/lib/types';
import { getCurrentExam, getCurrentUser, loadProfile, saveProfile, setCurrentExam, setCurrentUser } from '@/services/storage';

/** Enough for every paper set to be taken several times without the oldest attempts dropping out. */
const MAX_MOCKS_KEPT = 80;

export type ProfileState = { user: string | null; examKey: ExamKey | null; profile: Profile; storageOk: boolean };

function readProfile(user: string | null, exam: Exam | null): Profile {
  return user && exam ? loadProfile({ name: user, examKey: exam.key }, exam.knownIds) : emptyProfile();
}

function initialState(): ProfileState {
  const user = getCurrentUser();
  const exam = user ? examByKey(getCurrentExam()) : null;
  return { user, examKey: exam?.key ?? null, profile: readProfile(user, exam), storageOk: true };
}

let state: ProfileState = initialState();
const listeners = new Set<() => void>();

function activeExam(): Exam | null {
  return examByKey(state.examKey);
}

function emit(next: ProfileState): void {
  state = next;
  listeners.forEach((l) => l());
}

function commit(profile: Profile): void {
  const storageOk = state.user && state.examKey ? saveProfile({ name: state.user, examKey: state.examKey }, profile) : true;
  emit({ ...state, profile, storageOk });
}

function update(fn: (p: Profile) => Profile): void {
  commit(fn(state.profile));
}

export const profileStore = {
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  getState(): ProfileState {
    return state;
  },
  /** Signing in always leads to the exam choice. */
  login(name: string): void {
    setCurrentUser(name);
    setCurrentExam(null);
    emit({ user: name, examKey: null, profile: emptyProfile(), storageOk: true });
  },
  logout(): void {
    setCurrentUser(null);
    setCurrentExam(null);
    emit({ user: null, examKey: null, profile: emptyProfile(), storageOk: true });
  },
  selectExam(examKey: ExamKey): void {
    const exam = examByKey(examKey);
    if (!state.user || !exam) return;
    setCurrentExam(exam.key);
    emit({ ...state, examKey: exam.key, profile: readProfile(state.user, exam), storageOk: true });
  },
  /** Back to the exam choice; the course's progress stays saved. */
  leaveExam(): void {
    setCurrentExam(null);
    emit({ ...state, examKey: null, profile: emptyProfile(), storageOk: true });
  },
  answer(questionId: string, choice: number): void {
    const now = Date.now();
    update((p) => (p.answers[questionId] ? p : { ...p, answers: { ...p.answers, [questionId]: [choice, now] } }));
  },
  clearAnswers(questionIds: readonly string[]): void {
    const drop = new Set(questionIds);
    update((p) => ({ ...p, answers: Object.fromEntries(Object.entries(p.answers).filter(([id]) => !drop.has(id))) }));
  },
  setMode(mode: StudyMode): void {
    update((p) => ({ ...p, mode }));
  },
  /** Starts a timed mock. `setNo` names the paper for MockType.Set. Returns false when there is nothing to start. */
  startMock(type: MockType, setNo: number | null = null): boolean {
    const exam = activeExam();
    if (!exam) return false;
    if (type === MockType.Set && !exam.bank.sets.some((s) => s.n === setNo)) return false;
    const now = Date.now();
    update((p) => ({ ...p, live: createLiveMock({ type, setNo, bank: exam.bank, answers: p.answers, random: Math.random, now }) }));
    return true;
  },
  updateLive(fn: (live: LiveMock) => LiveMock): void {
    update((p) => (p.live ? { ...p, live: fn(p.live) } : p));
  },
  goToQuestion(index: number): void {
    const now = Date.now();
    update((p) => (p.live ? { ...p, live: goToQuestion(p.live, index, now) } : p));
  },
  accrueLiveTime(): void {
    const now = Date.now();
    update((p) => (p.live ? { ...p, live: accrueTime(p.live, now) } : p));
  },
  finishLive(): MockRecord | null {
    const live = state.profile.live;
    const exam = activeExam();
    if (!live || !exam) return null;
    const record = finishLiveMock(live, exam, Date.now());
    update((p) => ({ ...p, live: null, mocks: [record, ...p.mocks].slice(0, MAX_MOCKS_KEPT) }));
    return record;
  },
  quitLive(): void {
    update((p) => ({ ...p, live: null }));
  },
  replace(profile: Profile): void {
    commit(profile);
  },
  resetAll(): void {
    commit(emptyProfile());
  },
};

export function useProfileState<T>(selector: (s: ProfileState) => T): T {
  return useSyncExternalStore(profileStore.subscribe, () => selector(profileStore.getState()));
}
