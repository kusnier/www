import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-iban',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatDividerModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './iban.html',
  styleUrls: ['./iban.scss']
})
export class Iban implements OnInit {


  generatedIban: string | null = null;
  generatedIbanSpaced: string | null = null;
  ibanInput: string = '';
  validationResult: 'valid' | 'invalid' | null = null;

  ngOnInit(): void {
    this.generateIban();
  }

  generateIban(): void {
    const bankCode = this.randomDigits(8);
    const accountNumber = this.randomDigits(10).padStart(10, '0');
    const base = `DE00${bankCode}${accountNumber}`;
    const checksum = this.calculateChecksum(base);
    this.generatedIban = `DE${checksum}${bankCode}${accountNumber}`;
    this.generatedIbanSpaced = this.formatIban(this.generatedIban);
  }

  validateIbanLive(): void {
    const iban = this.ibanInput.replace(/\s+/g, '').toUpperCase();
    if (iban.length < 15) {
      this.validationResult = null;
      return;
    }

    const rearranged = iban.slice(4) + iban.slice(0, 4);
    const numeric = rearranged.replace(/[A-Z]/g, ch => (ch.charCodeAt(0) - 55).toString());
    try {
      const mod97 = BigInt(numeric) % 97n;
      this.validationResult = mod97 === 1n ? 'valid' : 'invalid';
    } catch {
      this.validationResult = 'invalid';
    }
  }

  private randomDigits(length: number): string {
    return Array.from({ length }, () => Math.floor(Math.random() * 10)).join('');
  }

  private calculateChecksum(iban: string): string {
    const rearranged = iban.slice(4) + iban.slice(0, 4);
    const numeric = rearranged.replace(/[A-Z]/g, ch =>
      (ch.charCodeAt(0) - 55).toString()
    );
    const mod97 = BigInt(numeric) % 97n;
    const checksum = 98n - mod97;
    return checksum.toString().padStart(2, '0');
  }

  private formatIban(iban: string): string {
    return iban.replace(/(.{4})/g, '$1 ').trim();
  }

  copy(text: string | null): void {
    if (text) navigator.clipboard.writeText(text);
  }
}
