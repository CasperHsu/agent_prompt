import { PDFDocument, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { loadContractFont } from "./font";

export type GenerateContractPdfInput = {
  title: string;
  bodyMarkdown: string;
  signerName: string;
  signerEmail: string;
  signedAt: Date;
  contentHash: string;
  sealHash: string;
  signatureImagePng: Buffer;
  verificationLevel: "basic" | "medium" | "strong";
  templateName: string;
};

const A4 = { width: 595.28, height: 841.89 };
const MARGIN_X = 60;
const MARGIN_TOP = 70;
const MARGIN_BOTTOM = 80;

export async function generateContractPdf(
  input: GenerateContractPdfInput
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);

  const fontBytes = await loadContractFont();
  const font = await pdfDoc.embedFont(fontBytes, { subset: true });

  pdfDoc.setTitle(input.title);
  pdfDoc.setAuthor("Vision Eco 合約簽署系統");
  pdfDoc.setSubject(input.templateName);
  pdfDoc.setCreator("Vision Eco Contract Signing");
  pdfDoc.setCreationDate(input.signedAt);
  pdfDoc.setModificationDate(input.signedAt);
  pdfDoc.setKeywords([
    "contract",
    input.templateName,
    `contentHash:${input.contentHash}`,
    `sealHash:${input.sealHash}`,
  ]);

  const layout = new PageLayout(pdfDoc, font);

  layout.drawHeader(input.title, input.templateName, input.verificationLevel);
  layout.gap(14);

  for (const block of parseMarkdown(input.bodyMarkdown)) {
    layout.drawBlock(block);
  }

  layout.gap(20);
  await layout.drawSignatureBlock(input);
  layout.gap(12);
  layout.drawIntegrityFooter(input);

  layout.drawAllPageFooters();

  return pdfDoc.save();
}

class PageLayout {
  private page: PDFPage;
  private y: number;
  private readonly fontSize = 11;
  private readonly lineHeight = 17;

  constructor(private doc: PDFDocument, private font: PDFFont) {
    this.page = doc.addPage([A4.width, A4.height]);
    this.y = A4.height - MARGIN_TOP;
  }

  private maxY = () => MARGIN_BOTTOM;

  private ensureRoom(rows: number): void {
    if (this.y - rows * this.lineHeight < this.maxY()) {
      this.page = this.doc.addPage([A4.width, A4.height]);
      this.y = A4.height - MARGIN_TOP;
    }
  }

  gap(px: number) {
    this.y -= px;
  }

  drawHeader(title: string, templateName: string, level: string) {
    this.page.drawText(title, {
      x: MARGIN_X,
      y: this.y,
      size: 20,
      font: this.font,
      color: rgb(0.05, 0.05, 0.05),
    });
    this.y -= 26;
    const levelLabel =
      level === "basic" ? "基本驗證" : level === "medium" ? "中等驗證" : "強驗證";
    this.page.drawText(`${templateName}・${levelLabel}`, {
      x: MARGIN_X,
      y: this.y,
      size: 10,
      font: this.font,
      color: rgb(0.4, 0.4, 0.45),
    });
    this.y -= 18;
    this.page.drawLine({
      start: { x: MARGIN_X, y: this.y },
      end: { x: A4.width - MARGIN_X, y: this.y },
      thickness: 0.5,
      color: rgb(0.85, 0.85, 0.88),
    });
    this.y -= 14;
  }

  drawBlock(block: Block) {
    if (block.kind === "heading") {
      this.ensureRoom(2);
      this.gap(6);
      const size = block.level === 1 ? 16 : block.level === 2 ? 13 : 12;
      this.page.drawText(block.text, {
        x: MARGIN_X,
        y: this.y,
        size,
        font: this.font,
        color: rgb(0.1, 0.1, 0.12),
      });
      this.y -= size + 6;
    } else if (block.kind === "paragraph") {
      this.drawWrappedText(block.text, MARGIN_X, A4.width - MARGIN_X * 2);
      this.gap(6);
    } else if (block.kind === "list-item") {
      this.drawWrappedText(`・${block.text}`, MARGIN_X + 8, A4.width - MARGIN_X * 2 - 8);
    }
  }

  private drawWrappedText(text: string, x: number, maxWidth: number) {
    const lines = wrapText(text, this.font, this.fontSize, maxWidth);
    for (const line of lines) {
      this.ensureRoom(1);
      this.page.drawText(line, {
        x,
        y: this.y,
        size: this.fontSize,
        font: this.font,
        color: rgb(0.15, 0.15, 0.18),
      });
      this.y -= this.lineHeight;
    }
  }

  async drawSignatureBlock(input: GenerateContractPdfInput) {
    this.ensureRoom(6);
    this.gap(8);
    this.page.drawLine({
      start: { x: MARGIN_X, y: this.y },
      end: { x: A4.width - MARGIN_X, y: this.y },
      thickness: 0.5,
      color: rgb(0.85, 0.85, 0.88),
    });
    this.y -= 14;

    this.page.drawText("簽署人簽名", {
      x: MARGIN_X,
      y: this.y,
      size: 12,
      font: this.font,
      color: rgb(0.1, 0.1, 0.12),
    });
    this.y -= 6;

    const sigImage = await this.doc.embedPng(input.signatureImagePng);
    const sigWidth = 220;
    const ratio = sigImage.width === 0 ? 1 : sigImage.height / sigImage.width;
    const sigHeight = Math.min(80, sigWidth * ratio);
    this.ensureRoom(Math.ceil(sigHeight / this.lineHeight) + 3);
    this.y -= sigHeight;
    this.page.drawImage(sigImage, {
      x: MARGIN_X,
      y: this.y,
      width: sigWidth,
      height: sigHeight,
    });

    this.y -= 18;

    const meta = [
      `簽署人：${input.signerName}`,
      `Email：${input.signerEmail}`,
      `簽署時間：${input.signedAt.toLocaleString("zh-TW", {
        timeZone: "Asia/Taipei",
      })}（台北時間）`,
    ];
    for (const m of meta) {
      this.ensureRoom(1);
      this.page.drawText(m, {
        x: MARGIN_X,
        y: this.y,
        size: 10,
        font: this.font,
        color: rgb(0.25, 0.25, 0.28),
      });
      this.y -= 14;
    }
  }

  drawIntegrityFooter(input: GenerateContractPdfInput) {
    this.ensureRoom(5);
    this.gap(6);
    this.page.drawLine({
      start: { x: MARGIN_X, y: this.y },
      end: { x: A4.width - MARGIN_X, y: this.y },
      thickness: 0.5,
      color: rgb(0.85, 0.85, 0.88),
    });
    this.y -= 14;

    const integrity = [
      "文件完整性資訊：",
      `文件指紋（SHA-256）：${input.contentHash}`,
      `封存指紋（SHA-256）：${input.sealHash}`,
      "本電子契約依《電子簽章法》規定簽署，與書面簽名具同等法律效力。",
    ];
    for (const line of integrity) {
      const lines = wrapText(line, this.font, 9, A4.width - MARGIN_X * 2);
      for (const l of lines) {
        this.ensureRoom(1);
        this.page.drawText(l, {
          x: MARGIN_X,
          y: this.y,
          size: 9,
          font: this.font,
          color: rgb(0.35, 0.35, 0.38),
        });
        this.y -= 12;
      }
    }
  }

  drawAllPageFooters() {
    const pages = this.doc.getPages();
    pages.forEach((p, idx) => {
      const text = `第 ${idx + 1} 頁，共 ${pages.length} 頁`;
      const w = this.font.widthOfTextAtSize(text, 9);
      p.drawText(text, {
        x: (A4.width - w) / 2,
        y: 36,
        size: 9,
        font: this.font,
        color: rgb(0.55, 0.55, 0.58),
      });
    });
  }
}

type Block =
  | { kind: "heading"; level: 1 | 2 | 3; text: string }
  | { kind: "paragraph"; text: string }
  | { kind: "list-item"; text: string };

function parseMarkdown(md: string): Block[] {
  const blocks: Block[] = [];
  const lines = md.split(/\r?\n/);
  let buf: string[] = [];

  const flush = () => {
    if (buf.length === 0) return;
    blocks.push({ kind: "paragraph", text: buf.join(" ") });
    buf = [];
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (line === "") {
      flush();
      continue;
    }
    const h = line.match(/^(#{1,3})\s+(.+)$/);
    if (h) {
      flush();
      blocks.push({
        kind: "heading",
        level: h[1].length as 1 | 2 | 3,
        text: h[2],
      });
      continue;
    }
    const li = line.match(/^[-*]\s+(.+)$/);
    if (li) {
      flush();
      blocks.push({ kind: "list-item", text: li[1] });
      continue;
    }
    buf.push(line);
  }
  flush();
  return blocks;
}

function wrapText(
  text: string,
  font: PDFFont,
  size: number,
  maxWidth: number
): string[] {
  if (font.widthOfTextAtSize(text, size) <= maxWidth) return [text];

  const lines: string[] = [];
  let current = "";

  for (const ch of Array.from(text)) {
    const probe = current + ch;
    if (font.widthOfTextAtSize(probe, size) <= maxWidth) {
      current = probe;
    } else {
      if (current) lines.push(current);
      current = ch;
    }
  }
  if (current) lines.push(current);

  return lines;
}
