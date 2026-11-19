import { loadBank } from './bank';
import type { Bank, Marking } from './types';

export const IBPS_MARKING: Marking = { right: 1.2, wrong: 0.3 };
export const SBI_MARKING: Marking = { right: 1, wrong: 0.25 };

function rawTopic(key: string, count: number, likelyFor: (i: number) => number) {
  return {
    key,
    name: `Topic ${key}`,
    group: 'topic',
    questions: Array.from({ length: count }, (_, i) => ({
      id: `${key}${i}`,
      q: `Question ${key}${i}?`,
      options: ['w', 'x', 'y', 'z'],
      answer: 'B',
      explanation: `Because ${key}${i}.`,
      likely: likelyFor(i),
    })),
  };
}

/** A small bank for unit tests: two topics, likelihood scores 1-5. */
export function makeTestBank(perTopic = 30): Bank {
  return loadBank({ checked: 'test', exam: '2026-10-04', topics: [rawTopic('a', perTopic, (i) => (i % 5) + 1), rawTopic('b', perTopic, () => 2)] });
}

/** A bank with two full paper sets of 50: each set takes 25 questions from each of two topics, topic b first. */
export function makeSetBank(): Bank {
  const ids = (key: string, from: number): string[] => Array.from({ length: 25 }, (_, i) => `${key}${from + i}`);
  return loadBank({
    checked: 'test',
    exam: '2026-11-26',
    topics: [rawTopic('a', 50, () => 3), rawTopic('b', 50, () => 3)],
    sets: [
      [...ids('b', 0), ...ids('a', 0)],
      [...ids('b', 25), ...ids('a', 25)],
    ],
  });
}
