import { DecimalPipe, registerLocaleData } from '@angular/common';
import localeDe from '@angular/common/locales/de';
import { Component, computed, LOCALE_ID, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { calculateProtein, Goal, ProteinInput, Sport } from './protein-calculation';
registerLocaleData(localeDe);

@Component({
  selector: 'app-protein',
  imports: [FormsModule, DecimalPipe],
  providers: [{ provide: LOCALE_ID, useValue: 'de' }],
  templateUrl: './protein.html',
  styleUrl: './protein.scss',
})
export class Protein {
  readonly input = signal<ProteinInput>({
    weight: 80, height: 180, age: 35, hours: 6,
    goal: 'muscle', sport: 'strength', bodyFat: null, meals: 4, useActualWeight: false,
  });
  readonly calculation = computed(() => calculateProtein(this.input()));
  readonly goals: { value: Goal; label: string }[] = [
    { value: 'maintain', label: 'Fit bleiben' },
    { value: 'muscle', label: 'Muskelaufbau' },
    { value: 'fat-loss', label: 'Fettabbau' },
  ];
  readonly sports: { value: Sport; label: string }[] = [
    { value: 'strength', label: 'Kraftsport' },
    { value: 'endurance', label: 'Ausdauer' },
    { value: 'mixed', label: 'Gemischt' },
  ];

  update<K extends keyof ProteinInput>(key: K, value: ProteinInput[K]) {
    this.input.update(current => ({ ...current, [key]: value }));
  }

  reset() {
    this.input.set({ weight: null, height: null, age: null, hours: null,
      goal: 'maintain', sport: 'mixed', bodyFat: null, meals: 4, useActualWeight: false });
  }
}
