import { Fragment, useMemo, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/*
  A small markdown renderer for agent replies: paragraphs, headings, lists, quotes, code, tables,
  bold, italic and links. It builds React nodes directly, so nothing from a reply is ever injected
  as HTML. With `reveal`, words fade in one after another, so a reply that just arrived reads as if
  it were being written.
*/

type Reveal = { on: boolean; i: number; step: number };

type Block =
  | { kind: "p"; text: string }
  | { kind: "h"; level: 3 | 4; text: string }
  | { kind: "ul" | "ol"; items: string[]; start?: number }
  | { kind: "quote"; text: string }
  | { kind: "code"; text: string }
  | { kind: "table"; head: string[]; rows: string[][] };

const INLINE =
  /(`[^`\n]+`)|(\*\*[^*\n]+\*\*)|(__[^_\n]+__)|(\*[^*\s\n][^*\n]*\*)|(\b_[^_\s\n][^_\n]*_\b)|(\[[^\]\n]+\]\((?:https?:\/\/|mailto:)[^)\s]+\))|(https?:\/\/[^\s<>()]+[^\s<>().,;:!?'"])/g;

const isUl = (l: string) => /^\s*[-*•+]\s+/.test(l);
const isOl = (l: string) => /^\s*\d+[.)]\s+/.test(l);
const isTableSep = (l?: string) => !!l && /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(l);
const splitRow = (l: string) =>
  l
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((c) => c.trim());

function parseBlocks(src: string): Block[] {
  const lines = src.replace(/\r\n?/g, "\n").split("\n");
  const blocks: Block[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const t = line.trim();
    if (!t) {
      i++;
      continue;
    }
    if (t.startsWith("```")) {
      const body: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("```")) body.push(lines[i++]);
      i++;
      blocks.push({ kind: "code", text: body.join("\n") });
      continue;
    }
    const h = /^(#{1,6})\s+(.*)$/.exec(t);
    if (h) {
      blocks.push({ kind: "h", level: h[1].length <= 2 ? 3 : 4, text: h[2].replace(/#+$/, "").trim() });
      i++;
      continue;
    }
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(t)) {
      i++;
      continue;
    }
    if (t.includes("|") && isTableSep(lines[i + 1])) {
      const head = splitRow(t);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && lines[i].includes("|") && lines[i].trim()) rows.push(splitRow(lines[i++]));
      blocks.push({ kind: "table", head, rows });
      continue;
    }
    if (t.startsWith(">")) {
      const body: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith(">")) body.push(lines[i++].trim().replace(/^>\s?/, ""));
      blocks.push({ kind: "quote", text: body.join("\n") });
      continue;
    }
    if (isUl(line) || isOl(line)) {
      const ordered = isOl(line);
      const start = ordered ? parseInt(t, 10) : undefined;
      const items: string[] = [];
      while (i < lines.length) {
        const l = lines[i];
        if (ordered ? isOl(l) : isUl(l)) {
          items.push(l.replace(ordered ? /^\s*\d+[.)]\s+/ : /^\s*[-*•+]\s+/, ""));
          i++;
        } else if (l.trim() && /^\s{2,}/.test(l) && items.length) {
          items[items.length - 1] += `\n${l.trim()}`;
          i++;
        } else break;
      }
      blocks.push({ kind: ordered ? "ol" : "ul", items, start });
      continue;
    }
    const para: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !lines[i].trim().startsWith("```") &&
      !/^#{1,6}\s/.test(lines[i].trim()) &&
      !isUl(lines[i]) &&
      !isOl(lines[i]) &&
      !lines[i].trim().startsWith(">")
    ) {
      para.push(lines[i++]);
    }
    blocks.push({ kind: "p", text: para.join("\n") });
  }
  return blocks;
}

function words(text: string, key: string, rv: Reveal): ReactNode[] {
  if (!rv.on) return [text];
  return text.split(/(\s+)/).map((w, j) =>
    /^\s+$/.test(w) || !w ? (
      w
    ) : (
      <span key={`${key}w${j}`} className="word-in" style={{ animationDelay: `${rv.i++ * rv.step}ms` }}>
        {w}
      </span>
    )
  );
}

function inline(text: string, key: string, rv: Reveal): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  let n = 0;
  for (const m of text.matchAll(INLINE)) {
    const at = m.index ?? 0;
    if (at > last) out.push(...lineBreaks(text.slice(last, at), `${key}t${n}`, rv));
    const tok = m[0];
    const k = `${key}i${n++}`;
    if (m[1]) out.push(<code key={k}>{tok.slice(1, -1)}</code>);
    else if (m[2] || m[3]) out.push(<strong key={k}>{inline(tok.slice(2, -2), k, rv)}</strong>);
    else if (m[4] || m[5]) out.push(<em key={k}>{inline(tok.slice(1, -1), k, rv)}</em>);
    else if (m[6]) {
      const lm = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(tok);
      out.push(
        <a key={k} href={lm?.[2]} target="_blank" rel="noreferrer noopener">
          {inline(lm?.[1] ?? tok, k, rv)}
        </a>
      );
    } else if (m[7]) {
      let label = tok.replace(/^https?:\/\/(www\.)?/, "");
      if (label.length > 48) label = `${label.slice(0, 45)}…`;
      out.push(
        <a key={k} href={tok} target="_blank" rel="noreferrer noopener">
          {words(label, k, rv)}
        </a>
      );
    }
    last = at + tok.length;
  }
  if (last < text.length) out.push(...lineBreaks(text.slice(last), `${key}t${n}`, rv));
  return out;
}

function lineBreaks(text: string, key: string, rv: Reveal): ReactNode[] {
  const parts = text.split("\n");
  return parts.flatMap((p, j) => [
    <Fragment key={`${key}l${j}`}>{words(p, `${key}l${j}`, rv)}</Fragment>,
    j < parts.length - 1 ? <br key={`${key}b${j}`} /> : null,
  ]);
}

/** How long the word-by-word reveal of `text` takes, in ms. */
export function revealDuration(text: string): number {
  const count = text.split(/\s+/).filter(Boolean).length;
  return Math.min(count * revealStep(count), 3200);
}

function revealStep(count: number) {
  return Math.max(8, Math.min(30, 1500 / Math.max(count, 1)));
}

export function Markdown({
  text,
  reveal = false,
  className,
}: {
  text: string;
  reveal?: boolean;
  className?: string;
}) {
  const blocks = useMemo(() => parseBlocks(text || ""), [text]);
  const count = text.split(/\s+/).filter(Boolean).length;
  const rv: Reveal = { on: reveal, i: 0, step: revealStep(count) };

  return (
    <div className={cn("prose-agent", className)}>
      {blocks.map((b, bi) => {
        const k = `b${bi}`;
        switch (b.kind) {
          case "h":
            return b.level === 3 ? <h3 key={k}>{inline(b.text, k, rv)}</h3> : <h4 key={k}>{inline(b.text, k, rv)}</h4>;
          case "ul":
            return (
              <ul key={k}>
                {b.items.map((it, j) => (
                  <li key={j}>{inline(it, `${k}-${j}`, rv)}</li>
                ))}
              </ul>
            );
          case "ol":
            return (
              <ol key={k} start={b.start}>
                {b.items.map((it, j) => (
                  <li key={j}>{inline(it, `${k}-${j}`, rv)}</li>
                ))}
              </ol>
            );
          case "quote":
            return <blockquote key={k}>{inline(b.text, k, rv)}</blockquote>;
          case "code":
            return (
              <pre key={k} className={reveal ? "animate-fade" : undefined}>
                <code>{b.text}</code>
              </pre>
            );
          case "table":
            return (
              <div key={k} className={cn("overflow-x-auto", reveal && "animate-fade")}>
                <table>
                  <thead>
                    <tr>
                      {b.head.map((c, j) => (
                        <th key={j}>{inline(c, `${k}h${j}`, { ...rv, on: false })}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {b.rows.map((r, ri) => (
                      <tr key={ri}>
                        {r.map((c, j) => (
                          <td key={j}>{inline(c, `${k}r${ri}c${j}`, { ...rv, on: false })}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          default:
            return <p key={k}>{inline(b.text, k, rv)}</p>;
        }
      })}
    </div>
  );
}
