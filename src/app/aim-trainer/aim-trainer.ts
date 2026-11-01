import { AfterViewInit, ChangeDetectionStrategy, Component, computed, ElementRef, HostListener, OnDestroy, signal, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { aimStatistics, AimMode, Point, targetPosition } from './aim-math';

@Component({
  selector: 'app-aim-trainer',
  imports: [FormsModule],
  templateUrl: './aim-trainer.html',
  styleUrl: './aim-trainer.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AimTrainer implements AfterViewInit, OnDestroy {
  @ViewChild('arena', { static: true }) arena!: ElementRef<HTMLElement>;
  readonly mode = signal<AimMode>('random');
  readonly duration = signal(30);
  readonly size = signal(48);
  readonly spread = signal(0.75);
  readonly shape = signal<'circle' | 'square'>('circle');
  readonly phase = signal<'idle' | 'countdown' | 'playing' | 'finished' | 'aborted'>('idle');
  readonly countdown = signal(3);
  readonly remaining = signal(30000);
  readonly elapsed = signal(0);
  readonly reactions = signal<number[]>([]);
  readonly misses = signal(0);
  readonly position = signal<Point>({ x: 100, y: 100 });
  readonly field = signal({ width: 600, height: 400 });
  readonly notice = signal('');
  readonly best = signal(0);
  readonly newBest = signal(false);
  readonly locked = computed(() => this.phase() === 'countdown' || this.phase() === 'playing');
  readonly statistics = computed(() => aimStatistics(this.reactions(), this.misses(), this.elapsed()));
  readonly seconds = computed(() => Math.ceil(this.remaining() / 1000));
  readonly progress = computed(() => Math.max(0, Math.min(100, this.remaining() / (this.duration() * 1000) * 100)));
  readonly pace = computed(() => this.statistics().perSecond.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
  readonly lastReaction = computed(() => Math.round(this.reactions().at(-1) ?? 0));
  readonly modes: { value: AimMode; label: string }[] = [
    { value: 'random', label: 'Zufällig' }, { value: 'horizontal', label: 'Horizontal' }, { value: 'vertical', label: 'Vertikal' },
  ];
  private timer?: ReturnType<typeof setInterval>;
  private observer?: ResizeObserver;
  private countdownEnd = 0;
  private started = 0;
  private deadline = 0;
  private targetShown = 0;
  private roundKey = '';
  private readonly records = new Map<string, number>();

  configure(key: 'mode' | 'duration' | 'size' | 'shape' | 'spread', value: string | number) {
    if (this.locked()) return;
    if (key === 'mode' && ['random', 'horizontal', 'vertical'].includes(String(value))) this.mode.set(value as AimMode);
    else if (key === 'shape' && ['circle', 'square'].includes(String(value))) this.shape.set(value as 'circle' | 'square');
    else if (key === 'duration' && [15, 30, 60].includes(Number(value))) this.duration.set(Number(value));
    else if (key === 'size' && [28, 48, 64].includes(Number(value))) this.size.set(Number(value));
    else if (key === 'spread' && Number.isFinite(Number(value)) && Number(value) >= 0.3 && Number(value) <= 0.9) this.spread.set(Number(value));
    else return;
    this.phase.set('idle'); this.notice.set(''); this.newBest.set(false);
    this.reactions.set([]); this.misses.set(0); this.elapsed.set(0); this.remaining.set(this.duration() * 1000);
  }

  ngAfterViewInit() {
    this.observer = new ResizeObserver(entries => {
      const rect = entries[0].contentRect;
      this.resize(Math.round(rect.width), Math.round(rect.height));
    });
    this.observer.observe(this.arena.nativeElement);
  }

  resize(width: number, height: number) {
    if (width < 100 || height < 100) return;
    const previous = this.field();
    if (previous.width === width && previous.height === height) return;
    if (this.locked()) this.stop('Spielfeldgröße geändert. Bitte starte die Runde neu.');
    this.field.set({ width, height });
  }

  startGame() {
    if (this.locked()) return;
    this.clearTimer();
    this.reactions.set([]); this.misses.set(0); this.elapsed.set(0);
    this.remaining.set(this.duration() * 1000); this.countdown.set(3);
    this.notice.set(''); this.newBest.set(false);
    this.roundKey = [this.mode(), this.duration(), this.size(), this.shape(), this.spread(), this.field().width, this.field().height].join(':');
    this.best.set(this.records.get(this.roundKey) ?? 0);
    this.countdownEnd = performance.now() + 3000;
    this.phase.set('countdown');
    this.timer = setInterval(() => this.tick(), 50);
    this.arena.nativeElement.focus({ preventScroll: true });
  }

  private tick() {
    const now = performance.now();
    if (this.phase() === 'countdown') {
      if (now < this.countdownEnd) { this.countdown.set(Math.ceil((this.countdownEnd - now) / 1000)); return; }
      this.started = now; this.deadline = now + this.duration() * 1000;
      this.phase.set('playing'); this.showTarget(now);
    }
    if (this.phase() === 'playing') {
      this.elapsed.set(Math.min(this.duration() * 1000, Math.max(0, now - this.started)));
      this.remaining.set(Math.max(0, this.deadline - now));
      if (now >= this.deadline) this.finish();
    }
  }

  private showTarget(now: number) {
    const { width, height } = this.field();
    this.position.set(targetPosition(width, height, this.size(), this.spread(), this.mode(), this.reactions().length,
      this.reactions().length ? this.position() : null));
    this.targetShown = now;
  }

  hitTarget() {
    if (this.phase() !== 'playing') return;
    const now = performance.now();
    if (now >= this.deadline) { this.finish(); return; }
    this.reactions.update(values => [...values, Math.max(0, now - this.targetShown)]);
    this.elapsed.set(Math.max(0, now - this.started));
    this.showTarget(now);
  }

  targetPointer(event: PointerEvent) {
    event.stopPropagation();
    if (event.button !== 0 || !event.isPrimary) return;
    event.preventDefault();
    this.hitTarget();
  }

  targetKeyboard(event: MouseEvent) {
    event.stopPropagation();
    if (event.detail === 0) this.hitTarget();
  }

  miss(event: PointerEvent) {
    if (event.button !== 0 || !event.isPrimary || this.phase() !== 'playing') return;
    if (performance.now() >= this.deadline) { this.finish(); return; }
    this.misses.update(count => count + 1);
  }

  private finish() {
    this.clearTimer(); this.remaining.set(0); this.elapsed.set(this.duration() * 1000);
    this.phase.set('finished');
    const hits = this.reactions().length;
    if (hits > this.best()) {
      this.newBest.set(true); this.best.set(hits); this.records.set(this.roundKey, hits);
    }
  }

  stop(message = 'Runde abgebrochen. Dein Zwischenstand zählt nicht als Bestwert.') {
    if (!this.locked()) return;
    if (this.phase() === 'playing') this.elapsed.set(Math.min(this.duration() * 1000, Math.max(0, performance.now() - this.started)));
    this.clearTimer(); this.phase.set('aborted'); this.notice.set(message);
  }

  @HostListener('document:visibilitychange')
  visibilityChanged() {
    if (document.hidden) this.stop('Tab gewechselt. Die Runde wurde für vergleichbare Ergebnisse abgebrochen.');
  }

  @HostListener('document:keydown.escape')
  escape() { this.stop(); }

  private clearTimer() { if (this.timer !== undefined) clearInterval(this.timer); this.timer = undefined; }
  ngOnDestroy() { this.clearTimer(); this.observer?.disconnect(); }
}
