import { createHash } from "node:crypto";
import {
  buildTimeStampReq,
  parseTimeStampResp,
  parseTstInfoFromToken,
} from "./rfc3161";

export type TimestampResult = {
  provider: string;
  status: "granted" | "grantedWithMods" | "rejected" | "stub";
  tokenBase64: string | null;
  genTime: Date | null;
  hashAlgorithm: string;
  messageHashHex: string;
  serialNumber: string | null;
  raw?: {
    statusCode: number;
    statusText?: string;
    failInfoBits?: string;
  };
};

export interface TsaProvider {
  readonly name: string;
  applyTimestamp(payload: Buffer): Promise<TimestampResult>;
}

export class Rfc3161TsaClient implements TsaProvider {
  readonly name: string;
  constructor(
    private readonly config: {
      name: string;
      url: string;
      username?: string;
      password?: string;
      policy?: string;
      certReq?: boolean;
      timeoutMs?: number;
    }
  ) {
    this.name = config.name;
  }

  async applyTimestamp(payload: Buffer): Promise<TimestampResult> {
    const messageHash = createHash("sha256").update(payload).digest();
    const { request } = buildTimeStampReq({
      messageHash,
      certReq: this.config.certReq ?? true,
      policy: this.config.policy,
    });

    const headers: Record<string, string> = {
      "Content-Type": "application/timestamp-query",
      Accept: "application/timestamp-reply",
    };
    if (this.config.username && this.config.password) {
      const credentials = Buffer.from(
        `${this.config.username}:${this.config.password}`
      ).toString("base64");
      headers.Authorization = `Basic ${credentials}`;
    }

    const controller = new AbortController();
    const timer = setTimeout(
      () => controller.abort(),
      this.config.timeoutMs ?? 15_000
    );

    let respBuf: Buffer;
    try {
      const res = await fetch(this.config.url, {
        method: "POST",
        headers,
        body: new Uint8Array(request),
        signal: controller.signal,
      });
      if (!res.ok) {
        throw new Error(
          `TSA HTTP error ${res.status} ${res.statusText} from ${this.config.url}`
        );
      }
      const arr = await res.arrayBuffer();
      respBuf = Buffer.from(arr);
    } finally {
      clearTimeout(timer);
    }

    const parsed = parseTimeStampResp(respBuf);
    if (!parsed.timeStampToken) {
      return {
        provider: this.name,
        status: "rejected",
        tokenBase64: null,
        genTime: null,
        hashAlgorithm: "SHA-256",
        messageHashHex: messageHash.toString("hex"),
        serialNumber: null,
        raw: {
          statusCode: parsed.statusCode,
          statusText: parsed.statusText,
          failInfoBits: parsed.failInfoBits,
        },
      };
    }

    const tstInfo = parseTstInfoFromToken(parsed.timeStampToken);

    return {
      provider: this.name,
      status: parsed.status === "granted" ? "granted" : "grantedWithMods",
      tokenBase64: parsed.timeStampToken.toString("base64"),
      genTime: tstInfo?.genTime ?? null,
      hashAlgorithm: "SHA-256",
      messageHashHex: messageHash.toString("hex"),
      serialNumber: tstInfo?.serialNumber ?? null,
      raw: {
        statusCode: parsed.statusCode,
        statusText: parsed.statusText,
      },
    };
  }
}

export class StubTsaProvider implements TsaProvider {
  readonly name = "dev-stub";

  async applyTimestamp(payload: Buffer): Promise<TimestampResult> {
    const messageHash = createHash("sha256").update(payload).digest();
    const now = new Date();
    const fakeTokenInfo = Buffer.from(
      JSON.stringify({
        provider: "dev-stub",
        warning:
          "This is NOT a real RFC 3161 timestamp token. Configure TWCA_TSA_URL for production.",
        messageHashHex: messageHash.toString("hex"),
        genTime: now.toISOString(),
      })
    );
    return {
      provider: this.name,
      status: "stub",
      tokenBase64: fakeTokenInfo.toString("base64"),
      genTime: now,
      hashAlgorithm: "SHA-256",
      messageHashHex: messageHash.toString("hex"),
      serialNumber: null,
    };
  }
}

export function getTsaProvider(): TsaProvider {
  const url = process.env.TWCA_TSA_URL;
  if (!url) return new StubTsaProvider();
  return new Rfc3161TsaClient({
    name: "TWCA",
    url,
    username: process.env.TWCA_TSA_USERNAME,
    password: process.env.TWCA_TSA_PASSWORD,
    policy: process.env.TWCA_TSA_POLICY_OID,
    certReq: true,
  });
}
