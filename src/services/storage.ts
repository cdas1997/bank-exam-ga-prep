import { emptyProfile, parseProfile } from '@/lib/profile';
import { ExamKey, type Profile } from '@/lib/types';

const PREFIX = 'pogp.v1.';
const USERS_KEY = `${PREFIX}users`;
const CURRENT_KEY = `${PREFIX}current`;
const EXAM_KEY = `${PREFIX}exam`;
/** The first course keeps the storage key it had before the app held more than one exam, so no saved progress moves. */
const LEGACY_EXAM: ExamKey = ExamKey.IbpsPo;
const NAME_MIN = 2;
const NAME_MAX = 24;

function read(key: string): unknown {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

function profileKey(name: string, examKey: ExamKey): string {
  const user = encodeURIComponent(name.toLowerCase());
  return examKey === LEGACY_EXAM ? `${PREFIX}user.${user}` : `${PREFIX}exam.${examKey}.user.${user}`;
}

function remove(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    /* storage blocked: nothing to clear */
  }
}

export type UsernameCheck = { ok: true; name: string } | { ok: false; message: string };

export function checkUsername(raw: string): UsernameCheck {
  const name = raw.trim().replace(/\s+/g, ' ');
  if (name.length < NAME_MIN) return { ok: false, message: `Use at least ${NAME_MIN} characters.` };
  if (name.length > NAME_MAX) return { ok: false, message: `Keep it to ${NAME_MAX} characters or fewer.` };
  return { ok: true, name };
}

export function listUsers(): string[] {
  const v = read(USERS_KEY);
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
}

export function getCurrentUser(): string | null {
  const v = read(CURRENT_KEY);
  return typeof v === 'string' ? v : null;
}

export function setCurrentUser(name: string | null): void {
  if (name === null) {
    remove(CURRENT_KEY);
    return;
  }
  write(CURRENT_KEY, name);
  const users = listUsers().filter((u) => u.toLowerCase() !== name.toLowerCase());
  write(USERS_KEY, [name, ...users]);
}

/** The exam course the signed-in user last opened, or null when they have not chosen one. */
export function getCurrentExam(): ExamKey | null {
  const v = read(EXAM_KEY);
  return Object.values(ExamKey).find((k) => k === v) ?? null;
}

export function setCurrentExam(examKey: ExamKey | null): void {
  if (examKey === null) remove(EXAM_KEY);
  else write(EXAM_KEY, examKey);
}

type ProfileSlot = { name: string; examKey: ExamKey };

/** Each exam course keeps its own progress under the same username. */
export function loadProfile({ name, examKey }: ProfileSlot, knownIds: ReadonlySet<string>): Profile {
  const v = read(profileKey(name, examKey));
  return v ? parseProfile(v, knownIds) : emptyProfile();
}

/** Returns false when the browser refuses storage (private mode, full disk). */
export function saveProfile({ name, examKey }: ProfileSlot, profile: Profile): boolean {
  return write(profileKey(name, examKey), profile);
}
