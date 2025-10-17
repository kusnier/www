import { CommonModule } from '@angular/common';
import { Component, signal, computed, effect } from '@angular/core';
import { MatDividerModule } from "@angular/material/divider";
import { MatCardModule } from "@angular/material/card";
import { MatButtonModule } from "@angular/material/button";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { MatIconModule } from "@angular/material/icon";
import hljs from 'highlight.js/lib/core';
import json from 'highlight.js/lib/languages/json';
import 'highlight.js/styles/github-dark.css';

hljs.registerLanguage('json', json);

interface JwtDecoded {
  header?: Record<string, any>;
  payload?: Record<string, any>;
  signature?: string;
  valid?: boolean;
  error?: string;
}

@Component({
  selector: 'app-jwt-decoder',
  templateUrl: './jwt-decoder.html',
  styleUrls: ['./jwt-decoder.scss'],
  imports: [
    CommonModule,
    MatDividerModule,
    MatCardModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule
  ]
})
export class JwtDecoder {

  jwtInput = signal('');
  decoded = signal<JwtDecoded | null>(null);
  copied = signal<string | null>(null);

  constructor() {
    effect(() => this.decodeJwt(this.jwtInput()));
  }

  private decodeJwt(token: string) {
    if (!token || !token.includes('.')) {
      this.decoded.set(null);
      return;
    }

    try {
      const [header, payload, signature] = token.split('.');
      const headerObj = JSON.parse(atob(this.padBase64(header)));
      const payloadObj = JSON.parse(atob(this.padBase64(payload)));

      const now = Math.floor(Date.now() / 1000);
      const exp = payloadObj.exp;
      const valid = !exp || exp > now;

      this.decoded.set({
        header: headerObj,
        payload: payloadObj,
        signature,
        valid
      });
    } catch {
      this.decoded.set({ error: 'Ungültiges JWT-Format' });
    }
  }

  formatJson(data: any): string {
    if (!data) return '';
    try {
      return JSON.stringify(data, null, 2);
    } catch {
      return String(data);
    }
  }

  highlightJson(data: any): string {
    if (!data) return '';
    const jsonStr = this.formatJson(data);
    return hljs.highlight(jsonStr, { language: 'json' }).value;
  }

  copy(text: string, label: string) {
    if (!text) return;
    navigator.clipboard.writeText(text);
    this.copied.set(label);
    setTimeout(() => this.copied.set(null), 2000);
  }

  private padBase64(input: string): string {
    const mod = input.length % 4;
    if (mod === 2) return input + '==';
    if (mod === 3) return input + '=';
    if (mod === 1) return input + '===';
    return input;
  }

  expirationDate = computed(() => {
    const payload = this.decoded()?.payload;
    if (!payload?.['exp']) return null;
    const date = new Date(payload['exp'] * 1000);
    return date.toLocaleString();
  });

  timeRemaining = computed(() => {
    const payload = this.decoded()?.payload;
    if (!payload?.['exp']) return null;
    const diffSec = payload['exp'] - Math.floor(Date.now() / 1000);
    if (diffSec <= 0) return 'abgelaufen';
    const mins = Math.floor(diffSec / 60);
    const secs = diffSec % 60;
    return `${mins} min ${secs}s`;
  });
}
