import type { PdfNames } from '@/lib/types';

/** Must match the file names written by scripts/build_pdfs.py. */
export function pdfHref(pdf: PdfNames, categoryKey: string | null): string {
  return `./pdf/${pdf.prefix}-${categoryKey ?? 'all'}.pdf`;
}

/** The name the viewer's saved file gets. */
export function pdfFilename(pdf: PdfNames, categoryName: string | null): string {
  const label = (categoryName ?? 'All categories').replace(/&/g, 'and').replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, ' ').trim();
  return `${pdf.title} - ${label}.pdf`;
}
