import { parseProfile } from './profile';
import { ExamKey, type Profile } from './types';

const VERSION = 1;
/** Codes made before the app had more than one exam carry no exam key; they all came from this course. */
const LEGACY_EXAM: ExamKey = ExamKey.IbpsPo;

export class BackupError extends Error {
  readonly code = 'backup/unreadable';
}

function toBase64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary);
}

function fromBase64(code: string): string {
  const binary = atob(code);
  return new TextDecoder().decode(Uint8Array.from(binary, (c) => c.charCodeAt(0)));
}

export function encodeBackup(profile: Profile, examKey: ExamKey): string {
  return toBase64(JSON.stringify({ v: VERSION, exam: examKey, answers: profile.answers, mocks: profile.mocks }));
}

type RestoreTarget = { key: ExamKey; knownIds: ReadonlySet<string> };

export function decodeBackup(code: string, exam: RestoreTarget): Profile {
  let data: unknown;
  try {
    data = JSON.parse(fromBase64(code.trim()));
  } catch {
    throw new BackupError('That code could not be read. Copy the whole code again and paste it here.');
  }
  if (typeof data !== 'object' || data === null || !('answers' in data) || !('mocks' in data)) {
    throw new BackupError('That text is not a backup code from this site.');
  }
  const from = 'exam' in data && typeof data.exam === 'string' ? data.exam : LEGACY_EXAM;
  if (from !== exam.key) {
    throw new BackupError('That code is from the other exam course. Switch to that exam and restore it there.');
  }
  return parseProfile(data, exam.knownIds);
}
