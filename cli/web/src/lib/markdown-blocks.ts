/**
 * Extract per-element prose blocks from a manifold's Markdown file so each
 * card in the visualiser can render its own inline accordion body without
 * forcing the reader to jump to a separate narrative section.
 *
 * Satisfies: U2 (narrative alongside structure), B2 (legibility),
 *            RT-7 (sanitised markdown reused in-place).
 */

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Find the heading `### ID:` (or `#### ID:`, any level 1–6) and return the
 * markdown that follows it up to the next heading of equal or higher
 * level. Empty string if the heading is not present.
 */
export function extractMdBlock(md: string, id: string): string {
  if (!md || !id) return '';
  const headingRe = new RegExp(
    `^(#{1,6})\\s+${escapeRe(id)}:[^\\n]*$`,
    'm',
  );
  const m = headingRe.exec(md);
  if (!m) return '';
  const level = m[1].length;
  const fromIdx = (m.index ?? 0) + m[0].length;
  const after = md.slice(fromIdx);
  const endRe = new RegExp(`\\n#{1,${level}}\\s+\\S`);
  const end = endRe.exec(after);
  const endIdx = end ? end.index : after.length;
  return after.slice(0, endIdx).trim();
}
