/**
 * Markdown sanitiser contract — the MD pipeline lives in cli/web (browser
 * code), so this suite exercises the same `unified` + `rehype-sanitize`
 * stack from the Bun runtime against a corpus of XSS payloads.
 *
 * @constraint S2 — sanitised markdown rendering
 * @constraint U2 — narrative legibility (GFM features still render)
 * @constraint RT-7 — sanitised MD + GFM + Mermaid
 */

import { describe, test, expect } from 'bun:test';

// What we assert: no *executable* HTML survives. Text content that happens
// to mention "alert(1)" as a string is fine — the sanitiser strips elements
// and preserves their text, which is harmless when rendered.
const corpus: Array<{ name: string; input: string; mustNotContain: string[] }> = [
  {
    name: 'inline <script>',
    input: 'Hello <script>alert(1)</script> world',
    mustNotContain: ['<script'],
  },
  {
    name: 'inline event handler',
    input: '<a href="#" onclick="alert(1)">click</a>',
    mustNotContain: ['onclick='],
  },
  {
    name: 'javascript: URI in autolink',
    input: '<javascript:alert(1)>',
    mustNotContain: ['href="javascript:', "href='javascript:"],
  },
  {
    name: 'data: URI in image',
    input: '<img src="data:text/html,<script>alert(1)</script>">',
    mustNotContain: ['<script', 'src="data:text/html'],
  },
];

async function tryLoadRenderer(): Promise<((s: string) => Promise<string>) | null> {
  // Prefer the real web module: its imports resolve via cli/web/node_modules,
  // so this test exercises the same pipeline the browser does.
  try {
    const mod = await import('../../cli/web/src/lib/markdown.ts');
    if (typeof mod.renderMarkdown === 'function') return mod.renderMarkdown;
  } catch {
    /* fall through to root-level resolution */
  }
  try {
    const { unified } = await import('unified');
    const remarkParse = (await import('remark-parse')).default;
    const remarkGfm = (await import('remark-gfm')).default;
    const remarkRehype = (await import('remark-rehype')).default;
    const rehypeSanitize = (await import('rehype-sanitize')).default;
    const rehypeStringify = (await import('rehype-stringify')).default;
    const processor = unified()
      .use(remarkParse)
      .use(remarkGfm)
      .use(remarkRehype, { allowDangerousHtml: false })
      .use(rehypeSanitize)
      .use(rehypeStringify);
    return async (s: string) => String(await processor.process(s));
  } catch {
    return null;
  }
}

const renderer = await tryLoadRenderer();
const skipReason =
  'cli/web dependencies (remark-rehype, rehype-sanitize, rehype-stringify) not installed at project root; run `cd cli/web && bun install` to enable';

describe('markdown sanitiser corpus', () => {
  if (!renderer) {
    test.skip(`SKIPPED — ${skipReason}`, () => {});
    return;
  }

  test('GFM table renders to a <table>', async () => {
    const html = await renderer('| h |\n|---|\n| c |\n');
    expect(html).toContain('<table>');
    expect(html).toContain('<td>c</td>');
  });

  for (const c of corpus) {
    test(`${c.name} is stripped (S2)`, async () => {
      const html = await renderer(c.input);
      for (const banned of c.mustNotContain) {
        expect(html.toLowerCase()).not.toContain(banned.toLowerCase());
      }
    });
  }
});
