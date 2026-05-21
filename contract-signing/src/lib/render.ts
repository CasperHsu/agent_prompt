import { sha256 } from "@/lib/crypto";

const VARIABLE_RE = /\{\{\s*([\w.-]+)\s*\}\}/g;

export function renderTemplate(
  body: string,
  variables: Record<string, string | number>
): string {
  return body.replace(VARIABLE_RE, (_, key: string) => {
    const value = variables[key];
    if (value === undefined || value === null) return `{{${key}}}`;
    return String(value);
  });
}

export function extractVariables(body: string): string[] {
  const matches = body.matchAll(VARIABLE_RE);
  const set = new Set<string>();
  for (const m of matches) set.add(m[1]);
  return Array.from(set);
}

export function markdownToHtml(md: string): string {
  const esc = (s: string) =>
    s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  const lines = md.split(/\r?\n/);
  const out: string[] = [];
  let inList = false;
  let paragraph: string[] = [];

  const flushParagraph = () => {
    if (paragraph.length === 0) return;
    const text = paragraph
      .join(" ")
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    out.push(`<p>${text}</p>`);
    paragraph = [];
  };

  for (const raw of lines) {
    const line = raw.trim();

    if (line === "") {
      flushParagraph();
      if (inList) {
        out.push("</ul>");
        inList = false;
      }
      continue;
    }

    const h = line.match(/^(#{1,6})\s+(.+)$/);
    if (h) {
      flushParagraph();
      if (inList) {
        out.push("</ul>");
        inList = false;
      }
      const level = h[1].length;
      out.push(`<h${level}>${esc(h[2])}</h${level}>`);
      continue;
    }

    const li = line.match(/^[-*]\s+(.+)$/);
    if (li) {
      flushParagraph();
      if (!inList) {
        out.push("<ul>");
        inList = true;
      }
      out.push(`<li>${esc(li[1])}</li>`);
      continue;
    }

    paragraph.push(esc(line));
  }

  flushParagraph();
  if (inList) out.push("</ul>");

  return out.join("\n");
}

export function hashContractContent(html: string): string {
  return sha256(html);
}
