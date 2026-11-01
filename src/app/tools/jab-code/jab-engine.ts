interface EngineResult { pixels?: ArrayBuffer; width?: number; height?: number; bytes?: ArrayBuffer; error?: string; }

export function runEngine(message: Record<string, unknown>, transfer: Transferable[]): Promise<EngineResult> {
  return new Promise((resolve, reject) => {
    const worker = new Worker('/vendor/jabcode/worker.js');
    const timer = window.setTimeout(() => { worker.terminate(); reject(new Error('Die Verarbeitung dauert zu lange. Verwende eine kleinere Datei oder ein klareres Bild.')); }, 30000);
    const finish = () => { clearTimeout(timer); worker.terminate(); };
    worker.onmessage = ({ data }: MessageEvent<EngineResult>) => {
      finish();
      data.error ? reject(new Error(data.error)) : resolve(data);
    };
    worker.onerror = () => { finish(); reject(new Error('Die lokale JAB-Engine konnte nicht ausgeführt werden. Bitte lade die Seite neu.')); };
    worker.postMessage(message, transfer);
  });
}

export async function encodePng(bytes: Uint8Array): Promise<Blob> {
  const buffer = new Uint8Array(bytes).buffer;
  const result = await runEngine({ action: 'encode', bytes: buffer }, [buffer]);
  if (!result.pixels || !result.width || !result.height) throw new Error('Kein Codebild erzeugt.');
  const source = document.createElement('canvas');
  source.width = result.width; source.height = result.height;
  source.getContext('2d')!.putImageData(new ImageData(new Uint8ClampedArray(result.pixels), result.width, result.height), 0, 0);
  const canvas = document.createElement('canvas');
  const margin = 24;
  canvas.width = source.width + margin * 2; canvas.height = source.height + margin * 2;
  const context = canvas.getContext('2d')!;
  context.fillStyle = '#fff'; context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(source, margin, margin);
  return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('PNG konnte nicht erstellt werden.')), 'image/png'));
}

export async function decodeImage(file: File): Promise<Uint8Array> {
  if (file.size > 8 * 1024 * 1024) throw new Error('Bitte ein Codebild mit höchstens 8 MiB auswählen.');
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) throw new Error('Bitte ein PNG-, JPEG- oder WebP-Bild auswählen.');
  const bitmap = await createImageBitmap(file);
  try {
    if (bitmap.width * bitmap.height > 16000000) throw new Error('Das Bild ist zu groß. Bitte auf den Code zuschneiden oder verkleinern.');
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale)); canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext('2d')!;
    context.fillStyle = '#fff'; context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data.buffer;
    const result = await runEngine({ action: 'decode', pixels, width: canvas.width, height: canvas.height }, [pixels]);
    if (!result.bytes) throw new Error('Keine Daten im Code gefunden.');
    return new Uint8Array(result.bytes);
  } finally { bitmap.close(); }
}
