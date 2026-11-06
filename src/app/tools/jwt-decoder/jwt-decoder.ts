import { CommonModule } from '@angular/common';
import { Component, signal, computed, effect } from '@angular/core';
import { RouterLink } from '@angular/router';
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
  payloadText?: string;
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
    RouterLink,
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
      const headerObj = JSON.parse(this.decodeSegment(header));
      const payloadText = this.decodeSegment(payload);
      const payloadObj = JSON.parse(payloadText);

      const now = Math.floor(Date.now() / 1000);
      const exp = payloadObj.exp;
      const valid = !exp || exp > now;

      this.decoded.set({
        header: headerObj,
        payload: payloadObj,
        payloadText,
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

  private decodeSegment(input: string): string {
    const base64 = input.replace(/-/g, '+').replace(/_/g, '/');
    const bytes = Uint8Array.from(atob(base64), char => char.charCodeAt(0));
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
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
