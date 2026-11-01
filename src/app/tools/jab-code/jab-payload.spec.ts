import { MAX_FILE_BYTES, packFile, unpackFile } from './jab-payload';

describe('JAB file envelope', () => {
  it('restores every byte value, embedded zeros and original file metadata', async () => {
    const bytes = Uint8Array.from({ length: 1024 }, (_, index) => index % 256);
    const restored = await unpackFile(await packFile(bytes, 'daten.bin', 'application/octet-stream', false));
    expect(Array.from(restored.bytes)).toEqual(Array.from(bytes));
    expect(restored.name).toBe('daten.bin');
    expect(restored.type).toBe('application/octet-stream');
    expect(restored.verified).toBeTrue();
    expect(restored.text).toBeNull();
  });
  it('preserves Unicode including emoji and combining characters', async () => {
    const text = 'Grüße 👋 — 東京 e\u0301\nZweite Zeile';
    const output = await unpackFile(await packFile(new TextEncoder().encode(text), 'nachricht.txt', 'text/plain', true));
    expect(output.text).toBe(text);
  });
  it('refuses a file with a changed byte instead of offering corrupt data', async () => {
    const packed = await packFile(new Uint8Array([0, 255, 0, 128]), 'test.bin', '', false);
    packed[packed.length - 1] ^= 1;
    await expectAsync(unpackFile(packed)).toBeRejectedWithError(/Prüfsumme/);
  });
  it('rejects truncated or malformed envelopes', async () => {
    const packed = await packFile(new Uint8Array([1, 2]), 'test.bin', '', false);
    await expectAsync(unpackFile(packed.slice(0, -1))).toBeRejectedWithError(/Dateigröße/);
    await expectAsync(unpackFile(packed.slice(0, 7))).toBeRejectedWithError(/Dateikopf/);
    new DataView(packed.buffer).setUint32(6, 0xffffffff, true);
    await expectAsync(unpackFile(packed)).toBeRejectedWithError(/Dateikopf/);
  });
  it('enforces byte capacity without truncation', async () => {
    await expectAsync(packFile(new Uint8Array(), 'empty.bin', '', false)).toBeRejected();
    await expectAsync(packFile(new Uint8Array(MAX_FILE_BYTES + 1), 'large.bin', '', false)).toBeRejected();
    const full = new Uint8Array(MAX_FILE_BYTES).fill(255);
    expect((await unpackFile(await packFile(full, 'full.bin', '', false))).bytes.length).toBe(MAX_FILE_BYTES);
  });
  it('reads external raw JAB messages without claiming verified file metadata', async () => {
    const output = await unpackFile(new TextEncoder().encode('Plain external JAB message'));
    expect(output.text).toBe('Plain external JAB message');
    expect(output.verified).toBeFalse();
    expect(output.checksum).toBeNull();
    const binary = await unpackFile(new Uint8Array([255, 254, 0]));
    expect(binary.name).toBe('jab-daten.bin');
    expect(binary.text).toBeNull();
  });
  it('sanitizes file paths while retaining a useful download name', async () => {
    const output = await unpackFile(await packFile(new Uint8Array([1]), '../privat\\test.bin', '', false));
    expect(output.name).toBe('.._privat_test.bin');
  });
});
