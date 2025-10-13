import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class IbanService {

  private static lettersToNumber(char: string): string {
    return (char.charCodeAt(0) - 55).toString(); // A=10, B=11, ...
  }

  private static replaceLettersWithNumbers(input: string): string {
    return input.split('').map(ch => /[A-Z]/.test(ch) ? this.lettersToNumber(ch) : ch).join('');
  }

  private static mod97(num: string): number {
    let remainder = 0;
    for (let i = 0; i < num.length; i += 7) {
      remainder = parseInt(remainder.toString() + num.substring(i, i + 7), 10) % 97;
    }
    return remainder;
  }

  static calculateCheckDigits(country: string, bban: string): string {
    const rearranged = bban + country.toUpperCase() + '00';
    const numeric = this.replaceLettersWithNumbers(rearranged);
    const remainder = this.mod97(numeric);
    const check = 98 - remainder;
    return check.toString().padStart(2, '0');
  }

  static generateIbanFrom(blz: string, account: string): string {
    const blzClean = blz.replace(/\D/g, '').padStart(8, '0').slice(-8);
    const accClean = account.replace(/\D/g, '').padStart(10, '0').slice(-10);
    const bban = blzClean + accClean;
    const check = this.calculateCheckDigits('DE', bban);
    return `DE${check}${bban}`;
  }

  static generateRandomGermanIban(): string {
    const blz = Math.floor(Math.random() * 1_0000_0000).toString().padStart(8, '0');
    const konto = Math.floor(Math.random() * 1_0000_0000_00).toString().padStart(10, '0');
    return this.generateIbanFrom(blz, konto);
  }

  static validateIban(iban: string): boolean {
    const cleaned = iban.replace(/\s+/g, '').toUpperCase();
    if (!/^DE\d{20}$/.test(cleaned)) return false;
    const rearranged = cleaned.substring(4) + cleaned.substring(0, 4);
    const numeric = this.replaceLettersWithNumbers(rearranged);
    return this.mod97(numeric) === 1;
  }

  static formatIban(iban: string): string {
    return iban.replace(/\s+/g, '').replace(/(.{4})/g, '$1 ').trim();
  }
}
