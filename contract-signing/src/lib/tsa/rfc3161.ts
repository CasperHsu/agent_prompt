import { randomBytes } from "node:crypto";
import {
  Tag,
  encodeBoolean,
  encodeInteger,
  encodeIntegerFromBytes,
  encodeNull,
  encodeOctetString,
  encodeOid,
  encodeSequence,
  parseChildren,
  parseTLV,
  readIntegerAsNumber,
} from "@/lib/asn1/der";

const OID_SHA256 = "2.16.840.1.101.3.4.2.1";

export type BuildTimeStampReqOptions = {
  messageHash: Buffer;
  certReq?: boolean;
  policy?: string;
};

export function buildTimeStampReq(opts: BuildTimeStampReqOptions): {
  request: Buffer;
  nonce: Buffer;
} {
  if (opts.messageHash.length !== 32) {
    throw new Error("messageHash must be 32 bytes (SHA-256)");
  }

  const messageImprint = encodeSequence(
    encodeSequence(encodeOid(OID_SHA256), encodeNull()),
    encodeOctetString(opts.messageHash)
  );

  const parts: Buffer[] = [encodeInteger(1), messageImprint];

  if (opts.policy) parts.push(encodeOid(opts.policy));

  const nonce = randomBytes(8);
  parts.push(encodeIntegerFromBytes(nonce));

  if (opts.certReq) parts.push(encodeBoolean(true));

  return { request: encodeSequence(...parts), nonce };
}

export type PKIStatus =
  | "granted"
  | "grantedWithMods"
  | "rejection"
  | "waiting"
  | "revocationWarning"
  | "revocationNotification";

const PKI_STATUS: Record<number, PKIStatus> = {
  0: "granted",
  1: "grantedWithMods",
  2: "rejection",
  3: "waiting",
  4: "revocationWarning",
  5: "revocationNotification",
};

export type TimeStampResp = {
  status: PKIStatus;
  statusCode: number;
  statusText?: string;
  failInfoBits?: string;
  timeStampToken?: Buffer;
};

export function parseTimeStampResp(buf: Buffer): TimeStampResp {
  const outer = parseTLV(buf);
  if (outer.tag !== Tag.SEQUENCE) {
    throw new Error("Invalid TimeStampResp: outer tag is not SEQUENCE");
  }
  const children = parseChildren(outer.value);
  if (children.length === 0 || children[0].tag !== Tag.SEQUENCE) {
    throw new Error("Invalid TimeStampResp: missing PKIStatusInfo");
  }

  const statusInfoChildren = parseChildren(children[0].value);
  const statusCode = readIntegerAsNumber(statusInfoChildren[0]);
  let statusText: string | undefined;
  let failInfoBits: string | undefined;

  for (let i = 1; i < statusInfoChildren.length; i++) {
    const c = statusInfoChildren[i];
    if (c.tag === Tag.SEQUENCE) {
      const texts = parseChildren(c.value);
      statusText = texts.map((t) => t.value.toString("utf8")).join(" / ");
    } else if (c.tag === 0x03) {
      failInfoBits = c.value.toString("hex");
    }
  }

  let timeStampToken: Buffer | undefined;
  if (children.length >= 2) {
    timeStampToken = Buffer.concat([
      Buffer.from([children[1].tag]),
      encodeLengthCompat(children[1].length),
      children[1].value,
    ]);
  }

  const status = PKI_STATUS[statusCode] ?? "rejection";

  return { status, statusCode, statusText, failInfoBits, timeStampToken };
}

function encodeLengthCompat(len: number): Buffer {
  if (len < 0x80) return Buffer.from([len]);
  const bytes: number[] = [];
  let n = len;
  while (n > 0) {
    bytes.unshift(n & 0xff);
    n >>>= 8;
  }
  return Buffer.from([0x80 | bytes.length, ...bytes]);
}

export type TstInfo = {
  policy: string;
  hashAlgorithmOid: string;
  hashedMessage: Buffer;
  serialNumber: string;
  genTime: Date;
};

export function parseTstInfoFromToken(token: Buffer): TstInfo | null {
  try {
    const ts = findTstInfoOctetString(token);
    if (!ts) return null;
    const root = parseTLV(ts);
    if (root.tag !== Tag.SEQUENCE) return null;
    const items = parseChildren(root.value);
    if (items.length < 5) return null;

    const policy = readOid(items[1]);
    const imprint = parseChildren(items[2].value);
    const algo = parseChildren(imprint[0].value);
    const hashAlgorithmOid = readOid(algo[0]);
    const hashedMessage = imprint[1].value;
    const serialNumberHex = items[3].value.toString("hex");
    const genTimeStr = items[4].value.toString("ascii");
    const genTime = parseGeneralizedTime(genTimeStr);

    return {
      policy,
      hashAlgorithmOid,
      hashedMessage,
      serialNumber: serialNumberHex,
      genTime,
    };
  } catch {
    return null;
  }
}

function findTstInfoOctetString(buf: Buffer): Buffer | null {
  function walk(b: Buffer): Buffer | null {
    let offset = 0;
    while (offset < b.length) {
      let item;
      try {
        item = parseTLV(b, offset);
      } catch {
        return null;
      }
      if (item.tag === Tag.OCTET_STRING) {
        try {
          const inner = parseTLV(item.value);
          if (inner.tag === Tag.SEQUENCE) {
            const itemsInner = parseChildren(inner.value);
            if (itemsInner.length >= 5 && itemsInner[0].tag === Tag.INTEGER) {
              return item.value;
            }
          }
        } catch {}
      }
      if (isConstructed(item.tag)) {
        const r = walk(item.value);
        if (r) return r;
      }
      offset += item.totalLength;
    }
    return null;
  }
  return walk(buf);
}

function isConstructed(tag: number): boolean {
  return (tag & 0x20) !== 0;
}

function readOid(tlv: ReturnType<typeof parseTLV>): string {
  if (tlv.tag !== Tag.OBJECT_IDENTIFIER) throw new Error("not OID");
  const bytes = tlv.value;
  const first = bytes[0];
  const arcs: number[] = [Math.floor(first / 40), first % 40];
  let n = 0;
  for (let i = 1; i < bytes.length; i++) {
    n = (n << 7) | (bytes[i] & 0x7f);
    if ((bytes[i] & 0x80) === 0) {
      arcs.push(n);
      n = 0;
    }
  }
  return arcs.join(".");
}

function parseGeneralizedTime(s: string): Date {
  const m = s.match(
    /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})(?:\.(\d+))?Z$/
  );
  if (!m) throw new Error("Invalid GeneralizedTime: " + s);
  const [, y, mo, d, h, mi, se, frac] = m;
  const ms = frac ? Math.round(parseFloat("0." + frac) * 1000) : 0;
  return new Date(Date.UTC(+y, +mo - 1, +d, +h, +mi, +se, ms));
}
