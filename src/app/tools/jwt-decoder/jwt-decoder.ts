import { CommonModule } from '@angular/common';
import { Component, signal, computed, effect } from '@angular/core';
import { MatDividerModule } from "@angular/material/divider";


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
    MatDividerModule
]
})
export class JwtDecoder {

  jwtInput = signal('');
  decoded = signal<JwtDecoded | null>(null);

  constructor() {
    effect(() => {
      // Live decode when input changes
      const value = this.jwtInput();
      this.decodeJwt(value);
    });
  }

  private decodeJwt(token: string) {
    if (!token || !token.includes('.')) {
      this.decoded.set(null);
      return;
    }

    try {
      const [header, payload, signature] = token.split('.');
      const headerObj = JSON.parse(atob(header));
      const payloadObj = JSON.parse(atob(payload));

      const now = Math.floor(Date.now() / 1000);
      const exp = payloadObj.exp;
      const valid = !exp || exp > now;

      this.decoded.set({
        header: headerObj,
        payload: payloadObj,
        signature,
        valid
      });
    } catch (error) {
      this.decoded.set({
        error: 'Ungültiges JWT-Format'
      });
    }
  }

  formatJson(data: any): string {
    return JSON.stringify(data, null, 2);
  }

  copy(text: string) {
    navigator.clipboard.writeText(text);
  }

  expirationDate = computed(() => {
    const payload = this.decoded()?.payload;
    if (!payload?.['exp']) return null;
    const date = new Date(payload['exp'] * 1000);
    return date.toLocaleString();
  });
}
