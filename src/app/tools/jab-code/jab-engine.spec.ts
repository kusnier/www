import { decodeImage, encodePng } from './jab-engine';
import { packFile, unpackFile } from './jab-payload';

describe('JAB browser engine', () => {
  it('round-trips a binary File through the real worker and browser PNG codecs', async () => {
    const bytes = Uint8Array.from({ length: 2048 }, (_, index) => index % 256);
    const packed = await packFile(bytes, 'browser-test.bin', 'application/octet-stream', false);
    const png = await encodePng(packed);
    expect(png.type).toBe('image/png');
    const restored = await unpackFile(await decodeImage(new File([png], 'code.png', { type: 'image/png' })));
    expect(Array.from(restored.bytes)).toEqual(Array.from(bytes));
    expect(restored.name).toBe('browser-test.bin');
    expect(restored.verified).toBeTrue();
  }, 30000);

  it('rejects an ordinary image without leaving a result', async () => {
    const canvas = document.createElement('canvas'); canvas.width = 200; canvas.height = 200;
    const context = canvas.getContext('2d')!; context.fillStyle = '#fff'; context.fillRect(0, 0, 200, 200);
    const png = await new Promise<Blob>(resolve => canvas.toBlob(blob => resolve(blob!), 'image/png'));
    await expectAsync(decodeImage(new File([png], 'blank.png', { type: 'image/png' }))).toBeRejected();
  }, 30000);
});
