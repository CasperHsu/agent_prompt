export const Tag = {
  BOOLEAN: 0x01,
  INTEGER: 0x02,
  BIT_STRING: 0x03,
  OCTET_STRING: 0x04,
  NULL: 0x05,
  OBJECT_IDENTIFIER: 0x06,
  UTF8_STRING: 0x0c,
  PRINTABLE_STRING: 0x13,
  UTC_TIME: 0x17,
  GENERALIZED_TIME: 0x18,
  SEQUENCE: 0x30,
  SET: 0x31,
  CONTEXT_0: 0xa0,
  CONTEXT_1: 0xa1,
} as const;

function encodeLength(len: number): Buffer {
  if (len < 0x80) return Buffer.from([len]);
  const bytes: number[] = [];
  let n = len;
  while (n > 0) {
    bytes.unshift(n & 0xff);
    n >>>= 8;
  }
  return Buffer.from([0x80 | bytes.length, ...bytes]);
}

export function encodeTLV(tag: number, value: Buffer): Buffer {
  return Buffer.concat([Buffer.from([tag]), encodeLength(value.length), value]);
}

export function encodeInteger(n: number | bigint): Buffer {
  let big = typeof n === "bigint" ? n : BigInt(n);
  if (big === 0n) return encodeTLV(Tag.INTEGER, Buffer.from([0x00]));

  const bytes: number[] = [];
  const negative = big < 0n;
  if (negative) throw new Error("Negative integers not supported");

  while (big > 0n) {
    bytes.unshift(Number(big & 0xffn));
    big >>= 8n;
  }
  if (bytes[0] & 0x80) bytes.unshift(0x00);
  return encodeTLV(Tag.INTEGER, Buffer.from(bytes));
}

export function encodeIntegerFromBytes(bytes: Buffer): Buffer {
  let start = 0;
  while (start < bytes.length - 1 && bytes[start] === 0x00 && !(bytes[start + 1] & 0x80)) {
    start++;
  }
  let payload = bytes.subarray(start);
  if (payload[0] & 0x80) payload = Buffer.concat([Buffer.from([0x00]), payload]);
  return encodeTLV(Tag.INTEGER, payload);
}

export function encodeBoolean(v: boolean): Buffer {
  return encodeTLV(Tag.BOOLEAN, Buffer.from([v ? 0xff : 0x00]));
}

export function encodeNull(): Buffer {
  return encodeTLV(Tag.NULL, Buffer.alloc(0));
}

export function encodeOctetString(value: Buffer): Buffer {
  return encodeTLV(Tag.OCTET_STRING, value);
}

export function encodeSequence(...parts: Buffer[]): Buffer {
  return encodeTLV(Tag.SEQUENCE, Buffer.concat(parts));
}

export function encodeOid(oid: string): Buffer {
  const parts = oid.split(".").map((p) => parseInt(p, 10));
  if (parts.length < 2) throw new Error("Invalid OID");
  const bytes: number[] = [parts[0] * 40 + parts[1]];
  for (let i = 2; i < parts.length; i++) {
    let n = parts[i];
    const buf: number[] = [n & 0x7f];
    n >>>= 7;
    while (n > 0) {
      buf.unshift((n & 0x7f) | 0x80);
      n >>>= 7;
    }
    bytes.push(...buf);
  }
  return encodeTLV(Tag.OBJECT_IDENTIFIER, Buffer.from(bytes));
}

export type ParsedTLV = {
  tag: number;
  length: number;
  value: Buffer;
  totalLength: number;
};

export function parseTLV(buf: Buffer, offset = 0): ParsedTLV {
  if (offset >= buf.length) throw new Error("ASN.1: out of bounds");
  const tag = buf[offset];
  let cursor = offset + 1;
  let length: number;
  const lenByte = buf[cursor++];
  if ((lenByte & 0x80) === 0) {
    length = lenByte;
  } else {
    const nBytes = lenByte & 0x7f;
    if (nBytes === 0 || nBytes > 4) throw new Error("ASN.1: unsupported length form");
    length = 0;
    for (let i = 0; i < nBytes; i++) {
      length = (length << 8) | buf[cursor++];
    }
  }
  const value = buf.subarray(cursor, cursor + length);
  return { tag, length, value, totalLength: cursor + length - offset };
}

export function parseSequenceChildren(buf: Buffer): ParsedTLV[] {
  const seq = parseTLV(buf);
  if (seq.tag !== Tag.SEQUENCE) throw new Error("ASN.1: expected SEQUENCE");
  return parseChildren(seq.value);
}

export function parseChildren(content: Buffer): ParsedTLV[] {
  const items: ParsedTLV[] = [];
  let offset = 0;
  while (offset < content.length) {
    const item = parseTLV(content, offset);
    items.push(item);
    offset += item.totalLength;
  }
  return items;
}

export function readIntegerAsNumber(tlv: ParsedTLV): number {
  if (tlv.tag !== Tag.INTEGER) throw new Error("ASN.1: not an INTEGER");
  let n = 0;
  for (const b of tlv.value) n = (n << 8) | b;
  return n;
}
