import type { DictionaryEntry, DictionaryLookupFn, LookupResult } from './dictionary'

export const BINARY_MAGIC = 'CJDICTV2'
export const BINARY_HEADER_SIZE = 64

export const BinaryDictionaryFlags = {
  HasQuickTable: 1,
  HasFrequency: 2,
  QuickDerivedDefault: 4,
} as const

export type BinaryDictionaryHeader = {
  versionMajor: number
  versionMinor: number
  flags: number
  entryCount: number
  headerSize: number
  codepointsOffset: number
  cangjieOffset: number
  quickOffset: number
  frequencyOffset: number
  payloadBytes: number
  payloadCrc32: number
  sourceHash32: number
  buildEpochSec: number
}

export type BinaryDictionaryData = {
  header: BinaryDictionaryHeader
  codepoints: Uint32Array
  cangjieTable: Uint8Array
  quickTable?: Uint8Array
  frequency?: Uint32Array
}

export type BinaryEncodeOptions = {
  includeQuickTable?: boolean
  frequencyByChar?: Map<string, number>
  sourceHash32?: number
  buildEpochSec?: number
}

const CODE_MAX_LENGTH = 5
const SLOT_SIZE = 6
const UNSET_BYTE = 255

const CODE_PATTERN = /^[A-Z]{1,5}$/u

function deriveQuickFromCangjie(cangjie: string): string {
  const chars = Array.from(cangjie)
  if (chars.length <= 2) {
    return cangjie
  }

  const first = chars[0]
  const last = chars[chars.length - 1]
  return `${first}${last}`
}

function ensureCode(code: string, label: string): string {
  const normalized = code.trim().toUpperCase()
  if (!CODE_PATTERN.test(normalized)) {
    throw new Error(`${label} must be A-Z and length 1..5`)
  }
  return normalized
}

function codeToSlot(code: string): Uint8Array {
  const slot = new Uint8Array(SLOT_SIZE)
  slot.fill(UNSET_BYTE)
  slot[0] = code.length

  for (let index = 0; index < CODE_MAX_LENGTH; index += 1) {
    const char = code[index]
    if (!char) {
      break
    }
    slot[index + 1] = char.charCodeAt(0) - 65
  }

  return slot
}

function slotToCode(table: Uint8Array, recordIndex: number): string {
  const base = recordIndex * SLOT_SIZE
  const length = table[base] ?? 0

  if (length < 1 || length > CODE_MAX_LENGTH) {
    throw new Error(`Invalid slot length ${length} at index ${recordIndex}`)
  }

  let code = ''
  for (let index = 0; index < length; index += 1) {
    const value = table[base + 1 + index]
    if (value === undefined || value > 25) {
      throw new Error(`Invalid slot value ${String(value)} at index ${recordIndex}`)
    }
    code += String.fromCharCode(value + 65)
  }

  return code
}

function binarySearchCodepoint(table: Uint32Array, target: number): number {
  let low = 0
  let high = table.length - 1

  while (low <= high) {
    const mid = (low + high) >> 1
    const value = table[mid]
    if (value === target) {
      return mid
    }
    if (value < target) {
      low = mid + 1
    } else {
      high = mid - 1
    }
  }

  return -1
}

function codePointFromChar(char: string): number {
  const chars = Array.from(char)
  if (chars.length !== 1) {
    throw new Error('Lookup input must be exactly one Unicode character')
  }

  const codePoint = chars[0]?.codePointAt(0)
  if (codePoint === undefined) {
    throw new Error('Failed to resolve Unicode codepoint')
  }

  return codePoint
}

function readU32(view: DataView, offset: number): number {
  return view.getUint32(offset, true)
}

function writeU32(view: DataView, offset: number, value: number): void {
  view.setUint32(offset, value >>> 0, true)
}

function writeU16(view: DataView, offset: number, value: number): void {
  view.setUint16(offset, value, true)
}

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff

  for (let offset = 0; offset < bytes.length; offset += 1) {
    crc ^= bytes[offset] ?? 0
    for (let bit = 0; bit < 8; bit += 1) {
      const mask = -(crc & 1)
      crc = (crc >>> 1) ^ (0xedb88320 & mask)
    }
  }

  return (crc ^ 0xffffffff) >>> 0
}

type NormalizedEntry = {
  char: string
  cangjie: string
  quick: string
  codepoint: number
}

function normalizeEntries(entries: DictionaryEntry[]): NormalizedEntry[] {
  if (entries.length === 0) {
    throw new Error('Cannot encode empty dictionary')
  }

  const map = new Map<number, NormalizedEntry>()

  for (const entry of entries) {
    const codepoint = codePointFromChar(entry.char)
    const cangjie = ensureCode(entry.cangjie, 'cangjie')
    const quick = ensureCode(entry.quick, 'quick')

    map.set(codepoint, {
      char: entry.char,
      cangjie,
      quick,
      codepoint,
    })
  }

  return Array.from(map.values()).sort((left, right) => left.codepoint - right.codepoint)
}

export function encodeDictionaryBinary(
  entries: DictionaryEntry[],
  options: BinaryEncodeOptions = {},
): Uint8Array {
  const normalized = normalizeEntries(entries)
  const entryCount = normalized.length

  const includeQuickTable =
    options.includeQuickTable ??
    normalized.some((entry) => entry.quick !== deriveQuickFromCangjie(entry.cangjie))

  const includeFrequency = (options.frequencyByChar?.size ?? 0) > 0

  const codepointsBytes = entryCount * 4
  const cangjieBytes = entryCount * SLOT_SIZE
  const quickBytes = includeQuickTable ? entryCount * SLOT_SIZE : 0
  const frequencyBytes = includeFrequency ? entryCount * 4 : 0

  const payloadBytes = codepointsBytes + cangjieBytes + quickBytes + frequencyBytes
  const totalBytes = BINARY_HEADER_SIZE + payloadBytes

  const buffer = new Uint8Array(totalBytes)
  const view = new DataView(buffer.buffer)
  const textEncoder = new TextEncoder()
  buffer.set(textEncoder.encode(BINARY_MAGIC), 0)

  const codepointsOffset = BINARY_HEADER_SIZE
  const cangjieOffset = codepointsOffset + codepointsBytes
  const quickOffset = includeQuickTable ? cangjieOffset + cangjieBytes : 0
  const frequencyOffset = includeFrequency
    ? (includeQuickTable ? quickOffset + quickBytes : cangjieOffset + cangjieBytes)
    : 0

  let flags = 0
  if (includeQuickTable) {
    flags |= BinaryDictionaryFlags.HasQuickTable
  }
  if (includeFrequency) {
    flags |= BinaryDictionaryFlags.HasFrequency
  }
  if (!includeQuickTable) {
    flags |= BinaryDictionaryFlags.QuickDerivedDefault
  }

  writeU16(view, 8, 2)
  writeU16(view, 10, 0)
  writeU32(view, 12, flags)
  writeU32(view, 16, entryCount)
  writeU32(view, 20, BINARY_HEADER_SIZE)
  writeU32(view, 24, codepointsOffset)
  writeU32(view, 28, cangjieOffset)
  writeU32(view, 32, quickOffset)
  writeU32(view, 36, frequencyOffset)
  writeU32(view, 40, payloadBytes)
  writeU32(view, 48, options.sourceHash32 ?? 0)
  writeU32(view, 52, options.buildEpochSec ?? Math.floor(Date.now() / 1000))
  writeU32(view, 56, 0)
  writeU32(view, 60, 0)

  const codepointView = new Uint32Array(buffer.buffer, codepointsOffset, entryCount)
  const cangjieView = new Uint8Array(buffer.buffer, cangjieOffset, cangjieBytes)
  const quickView = includeQuickTable && quickOffset > 0
    ? new Uint8Array(buffer.buffer, quickOffset, quickBytes)
    : undefined

  for (let index = 0; index < entryCount; index += 1) {
    const entry = normalized[index]
    codepointView[index] = entry.codepoint

    cangjieView.set(codeToSlot(entry.cangjie), index * SLOT_SIZE)

    if (quickView) {
      quickView.set(codeToSlot(entry.quick), index * SLOT_SIZE)
    }

    if (includeFrequency && frequencyOffset > 0) {
      const rank = options.frequencyByChar?.get(entry.char) ?? 0
      writeU32(view, frequencyOffset + index * 4, rank)
    }
  }

  const payload = new Uint8Array(buffer.buffer, BINARY_HEADER_SIZE, payloadBytes)
  writeU32(view, 44, crc32(payload))

  return buffer
}

export function decodeDictionaryBinary(input: ArrayBuffer | Uint8Array): BinaryDictionaryData {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input)
  if (bytes.byteLength < BINARY_HEADER_SIZE) {
    throw new Error('Binary dictionary too small')
  }

  const headerView = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const textDecoder = new TextDecoder()
  const magic = textDecoder.decode(bytes.subarray(0, BINARY_MAGIC.length))
  if (magic !== BINARY_MAGIC) {
    throw new Error(`Invalid binary dictionary magic: ${magic}`)
  }

  const versionMajor = headerView.getUint16(8, true)
  const versionMinor = headerView.getUint16(10, true)
  const flags = readU32(headerView, 12)
  const entryCount = readU32(headerView, 16)
  const headerSize = readU32(headerView, 20)
  const codepointsOffset = readU32(headerView, 24)
  const cangjieOffset = readU32(headerView, 28)
  const quickOffset = readU32(headerView, 32)
  const frequencyOffset = readU32(headerView, 36)
  const payloadBytes = readU32(headerView, 40)
  const payloadCrc32 = readU32(headerView, 44)
  const sourceHash32 = readU32(headerView, 48)
  const buildEpochSec = readU32(headerView, 52)

  if (versionMajor !== 2) {
    throw new Error(`Unsupported binary dictionary version: ${versionMajor}.${versionMinor}`)
  }

  if (headerSize !== BINARY_HEADER_SIZE) {
    throw new Error(`Invalid header size: ${headerSize}`)
  }

  if (bytes.byteLength !== headerSize + payloadBytes) {
    throw new Error('Binary dictionary payload size mismatch')
  }

  const payload = new Uint8Array(bytes.buffer, bytes.byteOffset + BINARY_HEADER_SIZE, payloadBytes)
  const actualCrc = crc32(payload)
  if (actualCrc !== payloadCrc32) {
    throw new Error(`Binary dictionary CRC mismatch: expected ${payloadCrc32}, got ${actualCrc}`)
  }

  const codepointsBytes = entryCount * 4
  const cangjieBytes = entryCount * SLOT_SIZE
  const quickBytes = (flags & BinaryDictionaryFlags.HasQuickTable) !== 0 ? entryCount * SLOT_SIZE : 0
  const frequencyBytes = (flags & BinaryDictionaryFlags.HasFrequency) !== 0 ? entryCount * 4 : 0

  const expectedPayloadBytes = codepointsBytes + cangjieBytes + quickBytes + frequencyBytes
  if (expectedPayloadBytes !== payloadBytes) {
    throw new Error('Binary dictionary payload layout mismatch')
  }

  if (codepointsOffset !== BINARY_HEADER_SIZE) {
    throw new Error('Invalid codepoints offset')
  }
  if (cangjieOffset !== codepointsOffset + codepointsBytes) {
    throw new Error('Invalid cangjie offset')
  }

  const expectedQuickOffset = quickBytes > 0 ? cangjieOffset + cangjieBytes : 0
  if (quickOffset !== expectedQuickOffset) {
    throw new Error('Invalid quick offset')
  }

  const expectedFrequencyOffset = frequencyBytes > 0
    ? (quickBytes > 0 ? quickOffset + quickBytes : cangjieOffset + cangjieBytes)
    : 0
  if (frequencyOffset !== expectedFrequencyOffset) {
    throw new Error('Invalid frequency offset')
  }

  const codepoints = new Uint32Array(bytes.buffer, bytes.byteOffset + codepointsOffset, entryCount)
  const cangjieTable = new Uint8Array(bytes.buffer, bytes.byteOffset + cangjieOffset, cangjieBytes)
  const quickTable = quickBytes > 0
    ? new Uint8Array(bytes.buffer, bytes.byteOffset + quickOffset, quickBytes)
    : undefined
  let frequency: Uint32Array | undefined
  if (frequencyBytes > 0) {
    frequency = new Uint32Array(entryCount)
    for (let index = 0; index < entryCount; index += 1) {
      frequency[index] = readU32(headerView, frequencyOffset + index * 4)
    }
  }

  for (let index = 1; index < codepoints.length; index += 1) {
    if (codepoints[index] <= codepoints[index - 1]) {
      throw new Error('Codepoints table must be strictly increasing')
    }
  }

  return {
    header: {
      versionMajor,
      versionMinor,
      flags,
      entryCount,
      headerSize,
      codepointsOffset,
      cangjieOffset,
      quickOffset,
      frequencyOffset,
      payloadBytes,
      payloadCrc32,
      sourceHash32,
      buildEpochSec,
    },
    codepoints,
    cangjieTable,
    quickTable,
    frequency,
  }
}

export function createBinaryLookup(data: BinaryDictionaryData): DictionaryLookupFn {
  const hasQuickTable = (data.header.flags & BinaryDictionaryFlags.HasQuickTable) !== 0

  return (char: string): LookupResult | undefined => {
    const codepoint = codePointFromChar(char)
    const index = binarySearchCodepoint(data.codepoints, codepoint)
    if (index < 0) {
      return undefined
    }

    const cangjie = slotToCode(data.cangjieTable, index)
    const quick = hasQuickTable && data.quickTable
      ? slotToCode(data.quickTable, index)
      : deriveQuickFromCangjie(cangjie)

    return {
      cangjie,
      quick,
    }
  }
}
