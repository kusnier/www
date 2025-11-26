import { Component, ChangeDetectionStrategy, signal, computed, model } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatSliderModule } from '@angular/material/slider';
import { MatSelectModule } from '@angular/material/select';
import { Settings } from './settings/settings';
import { Target } from './target/target';
import { MatDivider } from "@angular/material/divider";
import { DecimalPipe } from '@angular/common';

@Component({
  selector: 'app-aim-trainer',
  standalone: true,
  imports: [MatButtonModule, MatSliderModule, MatSelectModule, Settings, Target, MatDivider, DecimalPipe],
  templateUrl: './aim-trainer.html',
  styleUrls: ['./aim-trainer.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AimTrainer {
  readonly distance = model<number>(150);
  readonly size = model<number>(50);
  readonly shape = model<'circle' | 'square'>('circle');
  readonly mode = model<'horizontal' | 'vertical'>('horizontal');
  readonly currentIndex = signal<number>(0);
  readonly score = signal<number>(0);
  readonly timeLeft = signal<number>(30);
  readonly gameActive = signal<boolean>(false);

  readonly positions = computed(() => {
    const centerX = 300;
    const centerY = 300;
    const dist = this.distance();
    const halfSize = this.size() / 2;
    const mode = this.mode();

    // Berechne Positionen symmetrisch zur Mitte
    const leftX = Math.max(0, centerX - dist - halfSize);
    const rightX = Math.min(600 - this.size(), centerX + dist - halfSize);
    const topY = Math.max(0, centerY - dist - halfSize);
    const bottomY = Math.min(600 - this.size(), centerY + dist - halfSize);

    return mode === 'horizontal'
      ? [
          { x: leftX, y: centerY - halfSize },
          { x: rightX, y: centerY - halfSize }
        ]
      : [
          { x: centerX - halfSize, y: topY },
          { x: centerX - halfSize, y: bottomY }
        ];
  });

  readonly hitTimestamps = signal<number[]>([]);
  readonly avgTimePerHit = computed(() => {
    const hits = this.score();
    const totalTime = 30 - this.timeLeft();
    return hits > 0 ? totalTime / hits : 0;
  });

  readonly ttk = computed(() => {
    const arr = this.hitTimestamps();
    if (arr.length < 2) return 0;
    return arr[arr.length - 1] - arr[arr.length - 2];
  });

  readonly currentTarget = computed(() => this.positions()[this.currentIndex()]);

  private timerId: any;

  startGame() {
    this.score.set(0);
    this.timeLeft.set(30999);
    this.gameActive.set(true);
    this.currentIndex.set(0);
    this.hitTimestamps.set([]);

    clearInterval(this.timerId);
    this.timerId = setInterval(() => {
      this.timeLeft.update(t => {
        if (t <= 1) {
          clearInterval(this.timerId);
          this.gameActive.set(false);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  }


  hitTarget() {
    if (!this.gameActive()) return;

    const now = performance.now();
    this.hitTimestamps.update(arr => [...arr, now]);

    this.score.update(s => s + 1);
    this.currentIndex.update(i => (i === 0 ? 1 : 0));
  }

}
