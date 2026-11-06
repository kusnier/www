import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import hljs from 'highlight.js/lib/core';
import json from 'highlight.js/lib/languages/json';
import 'highlight.js/styles/github-dark.css';
import { compareJson, Difference, parseJson } from './json-diff';

hljs.registerLanguage('json', json);

type Side = 'left' | 'right';

@Component({
  selector: 'app-json-compare',
  templateUrl: './json-compare.html',
  styleUrl: './json-compare.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JsonCompare {
  private readonly incoming = inject(Router).getCurrentNavigation()?.extras.info;
  readonly left = signal(typeof this.incoming === 'string' ? this.incoming : '');
  readonly right = signal('');
  readonly errors = signal<Partial<Record<Side, string>>>({});
  readonly result = signal<{ differences: Array<Difference & { oldHtml: string; newHtml: string }>; truncated: boolean } | null>(null);
  readonly sides: Side[] = ['left', 'right'];
  readonly labels = { added: 'Hinzugefügt', removed: 'Entfernt', changed: 'Geändert' };

  edit(side: Side, value: string) {
    this[side].set(value);
    this.errors.set({});
    this.result.set(null);
  }

  example() {
    this.edit('left', JSON.stringify({ name: 'Demo', active: false, roles: ['reader'], legacy: true }, null, 2));
    this.edit('right', JSON.stringify({ name: 'Demo', active: true, roles: ['reader', 'editor'] }, null, 2));
    this.compare();
  }

  format(side: Side) {
    const value = this.read(side);
    if (value !== undefined) this.edit(side, JSON.stringify(value, null, 2));
  }

  compare() {
    this.errors.set({});
    const left = this.read('left');
    const right = this.read('right');
    if (left === undefined || right === undefined) {
      this.result.set(null);
      return;
    }
    const { differences, truncated } = compareJson(left, right);
    this.result.set({
      truncated,
      differences: differences.map(diff => ({
        ...diff, oldHtml: this.highlight(diff.before), newHtml: this.highlight(diff.after),
      })),
    });
  }

  private read(side: Side) {
    try {
      return parseJson(this[side]());
    } catch (error) {
      const message = error instanceof SyntaxError ? 'Ungültiges JSON. Prüfe Anführungszeichen, Klammern und Kommas.' : (error as Error).message;
      this.errors.update(errors => ({ ...errors, [side]: message }));
      return undefined;
    }
  }

  private highlight(value: unknown): string {
    if (value === undefined) return '';
    const text = JSON.stringify(value, null, 2);
    return hljs.highlight(text.length > 2400 ? text.slice(0, 2400) + '\n…' : text, { language: 'json' }).value;
  }
}
