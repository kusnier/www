import { IbanService } from "./iban-service";

describe('IbanService', () => {
  it('should calculate correct check digits for known BBAN', () => {
    // Beispiel: BLZ=37040044, Konto=0532013000 -> bekannte IBAN: DE89 3704 0044 0532 0130 00
    const bb = '370400440532013000';
    const check = IbanService.calculateCheckDigits('DE', bb);
    expect(check).toBe('89');
    expect(IbanService.generateIbanFrom('37040044', '0532013000')).toBe('DE89370400440532013000');
  });

  it('should validate a correct IBAN', () => {
    expect(IbanService.validateIban('DE89370400440532013000')).toBeTrue();
    expect(IbanService.validateIban('DE89 3704 0044 0532 0130 00')).toBeTrue();
  });

  it('should reject invalid ibans', () => {
    expect(IbanService.validateIban('DE00370400440532013000')).toBeFalse();
    expect(IbanService.validateIban('')).toBeFalse();
    expect(IbanService.validateIban('DE12ABCDEFG')).toBeFalse();
  });

  it('should generate random valid ibans', () => {
    const iban = IbanService.generateRandomGermanIban();
    expect(iban.startsWith('DE')).toBeTrue();
    expect(IbanService.validateIban(iban)).toBeTrue();
  });
});
