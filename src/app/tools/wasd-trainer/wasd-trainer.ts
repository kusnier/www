import { ChangeDetectionStrategy, Component, ElementRef, HostListener, OnDestroy, signal, ViewChild } from '@angular/core';
import { advance, HAZARD_RADIUS, HEIGHT, Level, LEVELS, makeRound, PLAYER_RADIUS, ROUND_SECONDS, Round, STEP, visibleHazards, WIDTH } from './dodge-round';

const directions: Record<string, string> = {
  KeyW: 'up', ArrowUp: 'up', KeyS: 'down', ArrowDown: 'down',
  KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right',
};

@Component({
  selector: 'app-wasd-trainer',
  templateUrl: './wasd-trainer.html',
  styleUrl: './wasd-trainer.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WasdTrainer implements OnDestroy {
  @ViewChild('arena', { static: true }) private arena!: ElementRef<HTMLElement>;
  readonly phase = signal<'idle' | 'countdown' | 'playing' | 'paused' | 'finished'>('idle');
  readonly level = signal<Level>('medium');
  readonly levels = LEVELS;
  readonly levelKeys: Level[] = ['easy', 'medium', 'hard'];
  readonly seconds = ROUND_SECONDS;
  readonly width = WIDTH;
  readonly height = HEIGHT;
  readonly playerRadius = PLAYER_RADIUS;
  readonly hazardRadius = HAZARD_RADIUS;
  readonly countdown = signal(3);
  readonly player = signal({ x: WIDTH / 2, y: HEIGHT / 2 });
  readonly obstacles = signal<ReturnType<typeof visibleHazards>>([]);
  readonly elapsed = signal(0);
  readonly outcome = signal<Round['outcome']>(null);
  readonly best = signal<number | null>(null);
  private seed = 0;
  private round?: Round;
  private readonly keys = new Set<string>();
  private readonly records = new Map<Level, number>();
  private frame = 0;
  private lastTime = 0;
  private accumulated = 0;
  private countdownEnd = 0;

  selectLevel(value: string) {
    if (!this.levelKeys.includes(value as Level) || this.active()) return;
    this.level.set(value as Level);
    this.best.set(this.records.get(this.level()) ?? null);
    this.phase.set('idle');
    this.elapsed.set(0);
    this.player.set({ x: WIDTH / 2, y: HEIGHT / 2 });
    this.obstacles.set([]);
  }

  start(replay = false) {
    if (this.active()) return;
    if (!replay || !this.round) this.seed = Math.floor(Math.random() * 4294967296);
    this.round = makeRound(this.level(), this.seed);
    this.outcome.set(null);
    this.draw(this.round);
    this.accumulated = 0;
    this.beginCountdown();
  }

  resume() {
    if (this.phase() === 'paused') this.beginCountdown();
  }

  private beginCountdown() {
    this.keys.clear();
    this.countdown.set(3);
    this.countdownEnd = performance.now() + 3000;
    this.phase.set('countdown');
    this.arena.nativeElement.focus();
    this.frame = requestAnimationFrame(this.tick);
  }

  private tick = (now: number) => {
    const round = this.round;
    if (!round || !this.active()) return;
    if (this.phase() === 'countdown') {
      this.countdown.set(Math.max(1, Math.ceil((this.countdownEnd - now) / 1000)));
      if (now >= this.countdownEnd) {
        this.lastTime = now;
        this.phase.set('playing');
      }
    } else {
      // Limit catch-up after a stalled frame. Focus and visibility handle actual pauses.
      this.accumulated += Math.min(now - this.lastTime, 100) / 1000;
      this.lastTime = now;
      const held = new Set(Array.from(this.keys, key => directions[key]));
      const direction = {
        x: Number(held.has('right')) - Number(held.has('left')),
        y: Number(held.has('down')) - Number(held.has('up')),
      };
      while (this.accumulated >= STEP && !round.outcome) {
        advance(round, direction);
        this.accumulated -= STEP;
      }
      this.draw(round);
      if (round.outcome) {
        const best = Math.max(round.elapsed, this.records.get(this.level()) ?? 0);
        this.records.set(this.level(), best);
        this.best.set(best);
        this.outcome.set(round.outcome);
        this.phase.set('finished');
        this.keys.clear();
        return;
      }
    }
    this.frame = requestAnimationFrame(this.tick);
  };

  private draw(round: Round) {
    this.player.set({ ...round.player });
    this.elapsed.set(round.elapsed);
    this.obstacles.set(visibleHazards(round));
  }

  active() {
    return this.phase() === 'countdown' || this.phase() === 'playing';
  }

  press(event: KeyboardEvent) {
    if (!this.active()) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      this.pause();
    } else if (Object.hasOwn(directions, event.code) && !event.ctrlKey && !event.altKey && !event.metaKey) {
      event.preventDefault();
      this.keys.add(event.code);
    }
  }

  @HostListener('window:keyup', ['$event'])
  release(event: KeyboardEvent) { this.keys.delete(event.code); }

  @HostListener('window:blur')
  pause() {
    if (!this.active()) return;
    cancelAnimationFrame(this.frame);
    this.keys.clear();
    this.phase.set('paused');
  }

  @HostListener('document:visibilitychange')
  visibility() { if (document.hidden) this.pause(); }

  ngOnDestroy() { cancelAnimationFrame(this.frame); }
}
