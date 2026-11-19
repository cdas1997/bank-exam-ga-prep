/// <reference types="node" />
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { EXAMS } from '@/data';
import { ExamKey } from '@/lib/types';
import { pdfFilename, pdfHref } from './pdf';

const ROOT = new URL('../../../', import.meta.url);

/** The bank file each course is built from and the manifest scripts/build_pdfs.py writes for it. */
const FILES: Record<ExamKey, { bank: string; manifest: string }> = {
  [ExamKey.IbpsPo]: { bank: 'src/data/bank.json', manifest: 'public/pdf/manifest.json' },
  [ExamKey.SbiClerk]: { bank: 'src/data/sbi-clerk-bank.json', manifest: 'public/pdf/sbi-clerk-manifest.json' },
};

function publicFile(href: string): URL {
  return new URL(`public/${href.replace(/^\.\//, '')}`, ROOT);
}

describe.each(EXAMS.map((exam) => [exam.name, exam] as const))('PDF exports for %s', (_name, exam) => {
  it('were printed from the current question bank', () => {
    const files = FILES[exam.key];
    const manifest: unknown = JSON.parse(readFileSync(new URL(files.manifest, ROOT), 'utf8'));
    const bankHash = createHash('sha256').update(readFileSync(new URL(files.bank, ROOT))).digest('hex');
    expect(manifest).toMatchObject({ bankSha256: bankHash });
  });

  it('exist for every category and for the full book', () => {
    const keys = [null, ...exam.bank.topics.map((t) => t.key)];
    for (const key of keys) expect(existsSync(publicFile(pdfHref(exam.pdf, key))), pdfHref(exam.pdf, key)).toBe(true);
  });
});

describe('PDF names', () => {
  it('differ per exam so the files never collide', () => {
    const [first, second] = EXAMS;
    if (!first || !second) throw new Error('expected two exams');
    expect(pdfHref(first.pdf, null)).not.toBe(pdfHref(second.pdf, null));
    expect(pdfHref({ prefix: 'sbi-clerk-ga-qa', title: 'T' }, 'bf-rbi')).toBe('./pdf/sbi-clerk-ga-qa-bf-rbi.pdf');
    expect(pdfFilename({ prefix: 'p', title: 'SBI Clerk Mains GA Q and A' }, 'RBI & monetary policy')).toBe('SBI Clerk Mains GA Q and A - RBI and monetary policy.pdf');
  });
});
