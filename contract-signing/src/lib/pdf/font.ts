import { promises as fs } from "node:fs";
import path from "node:path";

const DEFAULT_FONT_PATHS = [
  path.resolve(process.cwd(), "assets/fonts/NotoSansTC-Regular.otf"),
  "/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc",
];

let cachedBuffer: Uint8Array | null = null;

export async function loadContractFont(): Promise<Uint8Array> {
  if (cachedBuffer) return cachedBuffer;

  const override = process.env.CONTRACT_PDF_FONT_PATH;
  const candidates = override ? [override, ...DEFAULT_FONT_PATHS] : DEFAULT_FONT_PATHS;

  let lastErr: unknown = null;
  for (const p of candidates) {
    try {
      const buf = await fs.readFile(p);
      cachedBuffer = new Uint8Array(buf);
      return cachedBuffer;
    } catch (err) {
      lastErr = err;
    }
  }

  throw new Error(
    `Cannot load contract font. Tried: ${candidates.join(", ")}. Set CONTRACT_PDF_FONT_PATH or place a TTF/OTF in assets/fonts/. Last error: ${String(lastErr)}`
  );
}
