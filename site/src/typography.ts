// Czech typography: a one-letter word (k, s, v, z, o, u, a, i, also capitalised) must not end a line, so the
// space after it becomes a no-break space. Applied to Czech display texts only: the static HTML (build/pages.ts)
// and catalog texts when they are rendered. Never to values, variant codes, code or CLI snippets, nor to exports
// (CSV, TSV, clipboard), which keep plain spaces.
// Followed by spaces or a line break (source HTML wraps lines), never by an existing no-break space.
const ONE_LETTER_WORD = /(?<=^|[\s„(])([ksvzouai])[ \t\r\n]+(?=\S)/giu;

/** `text` with a no-break space after every one-letter word. */
export function cz(text: string): string {
  return text.replaceAll(ONE_LETTER_WORD, '$1 ');
}

const RAW = /^<(code|pre|script|style)\b/iu;
const RAW_END = /^<\/(code|pre|script|style)>/iu;

/** `cz` on the text between the tags of an HTML string; tags, attributes and code, pre and script stay as they are. */
export function czHtml(html: string): string {
  let raw = 0;
  return html
    .split(/(<[^>]+>)/u)
    .map((part) => {
      if (RAW.test(part)) {
        raw += 1;
      } else if (RAW_END.test(part)) {
        raw -= 1;
      } else if (!part.startsWith('<') && raw === 0) {
        return cz(part);
      }
      return part;
    })
    .join('');
}
