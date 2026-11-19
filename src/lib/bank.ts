import { TopicGroup, type Bank, type PaperSet, type Question, type Topic } from './types';

export const HOT_THRESHOLD = 4;
export const TOP_SET_SIZE = 100;
const LETTERS: readonly string[] = ['A', 'B', 'C', 'D'];

export class BankError extends Error {
  readonly code = 'bank/invalid';
}

type RawQuestion = { id: string; q: string; options: string[]; answer: string; explanation: string; likely?: number };
type RawTopic = { key: string; name: string; group: string; questions: unknown[] };

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function isRawQuestion(v: unknown): v is RawQuestion {
  if (!isRecord(v)) return false;
  return (
    typeof v.id === 'string' &&
    typeof v.q === 'string' &&
    typeof v.explanation === 'string' &&
    typeof v.answer === 'string' &&
    LETTERS.includes(v.answer) &&
    Array.isArray(v.options) &&
    v.options.length === 4 &&
    v.options.every((o) => typeof o === 'string') &&
    (v.likely === undefined || typeof v.likely === 'number')
  );
}

function isRawTopic(v: unknown): v is RawTopic {
  return isRecord(v) && typeof v.key === 'string' && typeof v.name === 'string' && typeof v.group === 'string' && Array.isArray(v.questions);
}

function toGroup(group: string): TopicGroup {
  return Object.values(TopicGroup).find((g) => g === group) ?? TopicGroup.Topic;
}

function isIdList(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((x) => typeof x === 'string');
}

/** Reads the optional "sets" list: each entry is one full paper, as question ids in paper order. */
function readSets(raw: unknown, byId: Map<string, Question>): PaperSet[] {
  if (raw === undefined) return [];
  if (!Array.isArray(raw) || !raw.every(isIdList)) throw new BankError('The paper sets in the question bank are malformed.');
  const used = new Set<string>();
  return raw.map((ids, i): PaperSet => {
    const questions = ids.map((id) => {
      const q = byId.get(id);
      if (!q) throw new BankError(`Set ${i + 1} lists a question that is not in the bank.`);
      if (used.has(id)) throw new BankError(`Set ${i + 1} repeats a question from another set.`);
      used.add(id);
      q.set = i + 1;
      return q;
    });
    return { n: i + 1, questions };
  });
}

export function loadBank(raw: unknown): Bank {
  if (!isRecord(raw) || typeof raw.checked !== 'string' || typeof raw.exam !== 'string' || !Array.isArray(raw.topics)) {
    throw new BankError('The question bank file is malformed.');
  }
  const all: Question[] = [];
  const topics: Topic[] = [];
  for (const t of raw.topics) {
    if (!isRawTopic(t)) throw new BankError('A topic in the question bank is malformed.');
    if (t.key === 'all') throw new BankError('"all" is reserved and cannot be a topic key.');
    const questions = t.questions.map((q, i): Question => {
      if (!isRawQuestion(q)) throw new BankError(`Question ${i + 1} in "${t.name}" is malformed.`);
      return {
        id: q.id,
        n: i + 1,
        topic: t.key,
        text: q.q,
        options: q.options,
        answer: LETTERS.indexOf(q.answer),
        explanation: q.explanation,
        likely: q.likely ?? 0,
        order: all.length + i,
        set: 0,
      };
    });
    all.push(...questions);
    topics.push({ key: t.key, name: t.name, group: toGroup(t.group), questions });
  }
  const top = all
    .filter((q) => q.likely > 0)
    .sort((a, b) => b.likely - a.likely || a.order - b.order)
    .slice(0, TOP_SET_SIZE);
  const byId = new Map(all.map((q) => [q.id, q]));
  if (byId.size !== all.length) throw new BankError('Two questions in the bank share the same id.');
  return {
    checked: raw.checked,
    examDate: raw.exam,
    topics,
    all,
    byId,
    topicByKey: new Map(topics.map((t) => [t.key, t])),
    top,
    sets: readSets(raw.sets, byId),
  };
}

export function isHot(q: Question): boolean {
  return q.likely >= HOT_THRESHOLD;
}
