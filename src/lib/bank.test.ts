import { describe, expect, it } from 'vitest';
import { BankError, loadBank } from './bank';
import { makeSetBank, makeTestBank } from './testBank';

const question = (id: string) => ({ id, q: `Q ${id}?`, options: ['w', 'x', 'y', 'z'], answer: 'A', explanation: 'e' });
const rawBank = (sets: unknown) => ({ checked: 'test', exam: '2026-11-26', topics: [{ key: 't', name: 'T', group: 'static', questions: [question('q1'), question('q2')] }], sets });

describe('question bank', () => {
  it('has no paper sets unless the file lists them', () => {
    const bank = makeTestBank(5);
    expect(bank.sets).toEqual([]);
    expect(bank.all.every((q) => q.set === 0)).toBe(true);
  });

  it('builds full paper sets in the listed order', () => {
    const bank = makeSetBank();
    expect(bank.sets.map((s) => s.questions.length)).toEqual([50, 50]);
    expect(bank.sets[0]?.questions[0]?.id).toBe('b0');
    expect(bank.sets[1]?.questions[49]?.id).toBe('a49');
    expect(bank.byId.get('a30')?.set).toBe(2);
    expect(new Set(bank.sets.flatMap((s) => s.questions.map((q) => q.id))).size).toBe(100);
  });

  it('keeps the topic group named in the file', () => {
    expect(loadBank(rawBank([])).topics[0]?.group).toBe('static');
  });

  it('rejects a set that names an unknown question or reuses one', () => {
    expect(() => loadBank(rawBank([['q1', 'nope']]))).toThrow(BankError);
    expect(() => loadBank(rawBank([['q1'], ['q1']]))).toThrow(BankError);
    expect(() => loadBank(rawBank('bad'))).toThrow(BankError);
  });
});
