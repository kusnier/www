import { Component, computed, OnDestroy, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { decodeImage, encodePng } from './jab-engine';
import { JabFile, MAX_FILE_BYTES, packFile, unpackFile } from './jab-payload';

@Component({
  selector: 'app-jab-code',
  imports: [FormsModule],
  templateUrl: './jab-code.html',
  styleUrl: './jab-code.scss',
})
export class JabCode implements OnDestroy {
  readonly tab = signal<'create' | 'read'>('create');
  readonly source = signal<'text' | 'file'>('text');
  readonly text = signal('Hallo von kusnier.net!');
  readonly textBytes = computed(() => new TextEncoder().encode(this.text()).length);
  readonly selectedFile = signal<File | null>(null);
  readonly busy = signal('');
  readonly error = signal('');
  readonly codeUrl = signal('');
  readonly codeName = signal('jab-code.png');
  readonly decoded = signal<JabFile | null>(null);
  readonly fileUrl = signal('');
  readonly maxBytes = MAX_FILE_BYTES;
  private destroyed = false;

  clearCode() {
    if (this.codeUrl()) URL.revokeObjectURL(this.codeUrl());
    this.codeUrl.set(''); this.error.set('');
  }

  chooseSource(source: 'text' | 'file') { this.source.set(source); this.clearCode(); }
  editText(text: string) { this.text.set(text); this.clearCode(); }

  selectFile(event: Event) {
    this.clearCode();
    const file = (event.target as HTMLInputElement).files?.[0] ?? null;
    this.selectedFile.set(file);
    if (file && (!file.size || file.size > MAX_FILE_BYTES)) this.error.set('Bitte eine nicht leere Datei bis 2 KiB (2.048 Bytes) auswählen.');
  }

  async generate() {
    if (this.busy()) return;
    this.clearCode(); this.busy.set('Code wird erzeugt und automatisch zurückgelesen …');
    try {
      const isText = this.source() === 'text';
      const file = this.selectedFile();
      if (!isText && !file) throw new Error('Bitte zuerst eine Datei auswählen.');
      if (!isText && file!.size > MAX_FILE_BYTES) throw new Error('Die Datei ist größer als 2 KiB (2.048 Bytes).');
      const bytes = isText ? new TextEncoder().encode(this.text()) : new Uint8Array(await file!.arrayBuffer());
      const name = isText ? 'nachricht.txt' : file!.name;
      const payload = await packFile(bytes, name, isText ? 'text/plain;charset=utf-8' : file!.type || 'application/octet-stream', isText);
      const png = await encodePng(payload);
      if (!this.destroyed) {
        this.codeUrl.set(URL.createObjectURL(png));
        this.codeName.set(name.replace(/\.[^.]+$/, '') + '-jab.png');
      }
    } catch (error) { if (!this.destroyed) this.error.set(error instanceof Error ? error.message : 'Der Code konnte nicht erzeugt werden.'); }
    finally { this.busy.set(''); }
  }

  async read(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file || this.busy()) return;
    if (this.fileUrl()) URL.revokeObjectURL(this.fileUrl());
    this.fileUrl.set(''); this.decoded.set(null); this.error.set('');
    this.busy.set('Code wird gelesen und die Prüfsumme kontrolliert …');
    try {
      const result = await unpackFile(await decodeImage(file));
      if (!this.destroyed) {
        this.decoded.set(result);
        this.fileUrl.set(URL.createObjectURL(new Blob([new Uint8Array(result.bytes).buffer], { type: 'application/octet-stream' })));
      }
    } catch (error) { if (!this.destroyed) this.error.set(error instanceof Error ? error.message : 'Das Bild konnte nicht gelesen werden.'); }
    finally { this.busy.set(''); (event.target as HTMLInputElement).value = ''; }
  }

  ngOnDestroy() {
    this.destroyed = true;
    if (this.codeUrl()) URL.revokeObjectURL(this.codeUrl());
    if (this.fileUrl()) URL.revokeObjectURL(this.fileUrl());
  }
}
