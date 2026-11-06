import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import hljs from 'highlight.js/lib/core';
import json from 'highlight.js/lib/languages/json';
import yaml from 'highlight.js/lib/languages/yaml';
import { stringify } from 'yaml';
import { compareJson, Difference, Json, parseJson } from './json-diff';
import { readYaml } from './yaml-input';

hljs.registerLanguage('json', json);
hljs.registerLanguage('yaml', yaml);

type Side = 'left' | 'right';
type Format = 'json' | 'yaml';

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
  readonly formats = signal<Record<Side, Format>>({ left: 'json', right: 'json' });
  readonly errors = signal<Partial<Record<Side, string>>>({});
  readonly result = signal<{ differences: Array<Difference & { oldHtml: string; newHtml: string }>; truncated: boolean } | null>(null);
  readonly sides: Side[] = ['left', 'right'];
  readonly labels = { added: 'Hinzugefügt', removed: 'Entfernt', changed: 'Geändert' };

  edit(side: Side, value: string) {
    this[side].set(value);
    this.errors.set({});
    this.result.set(null);
  }

  setFormat(side: Side, format: string) {
    if (format !== 'json' && format !== 'yaml') return;
    this.formats.update(formats => ({ ...formats, [side]: format }));
    this.errors.set({});
    this.result.set(null);
  }

  example() {
    this.edit('left', this.serialize({ name: 'Demo', active: false, roles: ['reader'], legacy: true }, this.formats().left));
    this.edit('right', this.serialize({ name: 'Demo', active: true, roles: ['reader', 'editor'] }, this.formats().right));
    this.compare();
  }

  format(side: Side) {
    const document = this.read(side);
    if (document) this.edit(side, document.format());
  }

  compare() {
    this.errors.set({});
    const left = this.read('left');
    const right = this.read('right');
    if (left === undefined || right === undefined) {
      this.result.set(null);
      return;
    }
    const { differences, truncated } = compareJson(left.value, right.value);
    this.result.set({
      truncated,
      differences: differences.map(diff => ({
        ...diff, oldHtml: this.highlight(diff.before, this.formats().left),
        newHtml: this.highlight(diff.after, this.formats().right),
      })),
    });
  }

  private read(side: Side) {
    try {
      if (this.formats()[side] === 'yaml') return readYaml(this[side]());
      const value = parseJson(this[side]());
      return { value, format: () => this.serialize(value, 'json') };
    } catch (error) {
      const message = error instanceof SyntaxError ? 'Ungültiges JSON. Prüfe Anführungszeichen, Klammern und Kommas.' : (error as Error).message;
      this.errors.update(errors => ({ ...errors, [side]: message }));
      return undefined;
    }
  }

  private serialize(value: Json, format: Format): string {
    return format === 'yaml' ? stringify(value).trimEnd() : JSON.stringify(value, null, 2);
  }

  private highlight(value: Json | undefined, format: Format): string {
    if (value === undefined) return '';
    const text = this.serialize(value, format);
    return hljs.highlight(text.length > 2400 ? text.slice(0, 2400) + '\n…' : text, { language: format }).value;
  }
}
