import { ChangeDetectionStrategy, Component, computed, HostListener, OnDestroy, signal } from '@angular/core';
import { BreathAudio } from './breath-audio';

type Phase = 'breathing' | 'holding' | 'recovery';
type Settings = { rounds: number; breathing: number; holding: number };

const countdown = ['', 'eins', 'zwei', 'drei', 'vier', 'fünf'];
const phaseAnnouncement: Record<Phase, string> = {
  breathing: 'Atmen.',
  holding: 'Stopp. Atem halten.',
  recovery: 'Jetzt einatmen',
};

@Component({
  selector: 'app-breath-timer',
  templateUrl: './breath-timer.html',
  styleUrl: './breath-timer.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BreathTimer implements OnDestroy {
  readonly profiles = [
    { name: 'Mein Rhythmus', rounds: 5, breathing: 45, holding: 120 },
    { name: 'Kurze Einheit', rounds: 2, breathing: 30, holding: 20 },
    { name: 'Mittlere Einheit', rounds: 3, breathing: 45, holding: 45 },
  ];
  readonly settings = signal<Settings>({ rounds: 5, breathing: 45, holding: 120 });
  readonly profile = signal('0');
  readonly gong = signal(true);
  readonly voice = signal(true);
  readonly midpoint = signal(false);
  readonly heartbeat = signal(false);
  readonly music = signal(false);
  readonly phase = signal<Phase | null>(null);
  readonly round = signal(1);
  readonly remaining = signal(0);
  readonly duration = signal(1);
  readonly status = signal('');
  readonly labels = { breathing: 'Atmen', holding: 'Atem halten', recovery: 'Erholungsatem' };
  readonly progress = computed(() => 1 - this.remaining() / this.duration());
  readonly time = computed(() => {
    const seconds = Math.ceil(this.remaining() / 1000);
    return Math.floor(seconds / 60) + ':' + String(seconds % 60).padStart(2, '0');
  });
  readonly valid = computed(() => Object.entries(this.settings()).every(([key, value]) =>
    Number.isInteger(value) && value >= (key === 'rounds' ? 1 : 10) && value <= (key === 'rounds' ? 10 : key === 'holding' ? 120 : 180)
  ));

  private readonly audio = new BreathAudio();
  private timer?: ReturnType<typeof setInterval>;
  private deadline = 0;
  private lastSecond = 0;
  private halfway = false;
  private wakeLock?: WakeLockSentinel;
  private session = 0;

  selectProfile(value: string) {
    const profile = this.profiles[Number(value)];
    if (!profile || this.phase()) return;
    this.profile.set(value);
    this.settings.set({ rounds: profile.rounds, breathing: profile.breathing, holding: profile.holding });
  }

  edit(key: keyof Settings, value: number) {
    if (this.phase()) return;
    this.profile.set('custom');
    this.settings.update(settings => ({ ...settings, [key]: value }));
  }

  async preview() {
    await this.audio.unlock();
    this.audio.gong();
  }

  start() {
    if (this.phase() || !this.valid()) return;
    const needsAudio = this.gong() || this.midpoint() || this.heartbeat() || this.music();
    const audioReady = needsAudio ? this.audio.unlock() : undefined;
    this.status.set('');
    this.round.set(1);
    this.enter('breathing', false);
    this.timer = setInterval(() => this.tick(), 50);
    const session = ++this.session;
    void this.keepScreenAwake(session);
    void audioReady?.then(() => {
      if (session !== this.session || !this.phase()) return;
      this.audio.startBackground(this.heartbeat(), this.music());
      if (this.phase() === 'breathing' && this.gong()) this.audio.gong();
    });
  }

  endHold() {
    if (this.phase() === 'holding') this.enter('recovery');
  }

  endRecovery() {
    if (this.phase() !== 'recovery') return;
    if (this.round() >= this.settings().rounds) {
      this.finish('Einheit beendet. Atme normal weiter.');
    } else {
      this.round.update(round => round + 1);
      this.enter('breathing');
    }
  }

  stop() { this.finish('Einheit gestoppt. Atme normal weiter.'); }

  @HostListener('document:visibilitychange')
  visibilityChanged() {
    if (document.hidden && this.phase()) this.stop();
  }

  @HostListener('document:keydown.escape')
  escape() { if (this.phase()) this.stop(); }

  private enter(phase: Phase, playGong = true) {
    const seconds = phase === 'recovery' ? 15 : this.settings()[phase];
    const duration = seconds * 1000;
    this.phase.set(phase);
    this.duration.set(duration);
    this.remaining.set(duration);
    this.deadline = performance.now() + duration;
    this.lastSecond = seconds;
    this.halfway = false;
    if (playGong && this.gong()) this.audio.gong();
    if (this.voice()) {
      const initialCue = phase === 'recovery' ? undefined : this.countdownCue(phase, seconds);
      this.audio.say(initialCue ? phaseAnnouncement[phase] + ' ' + initialCue : phaseAnnouncement[phase]);
    }
  }

  private tick() {
    const phase = this.phase();
    if (!phase) return;
    const left = Math.max(0, this.deadline - performance.now());
    this.remaining.set(left);
    if (!left) {
      if (phase === 'breathing') this.enter('holding');
      else if (phase === 'holding') this.endHold();
      else this.endRecovery();
      return;
    }
    const second = Math.ceil(left / 1000);
    const cue = this.countdownCue(phase, second);
    if (!this.halfway && left <= this.duration() / 2) {
      this.halfway = true;
      if (this.midpoint() && second > 5) this.audio.gong(true);
    }
    if (second !== this.lastSecond && cue && this.voice()) {
      if (!this.audio.say(cue, second === 5 && phase !== 'recovery' ? 1.3 : 1) && this.gong()) {
        this.audio.gong(true);
      }
    }
    this.lastSecond = second;
  }

  private countdownCue(phase: Phase, seconds: number): string | undefined {
    if (phase !== 'recovery') {
      if (seconds === 15 && this.duration() > 30_000) {
        return phase === 'breathing' ? 'Noch fünfzehn Sekunden atmen.' : 'Noch fünfzehn Sekunden.';
      }
      if (seconds === 10) return phase === 'breathing' ? 'Noch zehn Sekunden atmen.' : 'Noch zehn Sekunden.';
      if (seconds === 5) return 'Noch fünf Sekunden.';
    }
    return countdown[seconds];
  }

  private async keepScreenAwake(session: number) {
    try {
      const lock = await navigator.wakeLock?.request('screen');
      if (session === this.session && this.phase()) this.wakeLock = lock;
      else await lock?.release();
    } catch {
      // The browser may disable wake locks.
    }
  }

  private finish(message: string) {
    this.clearSession();
    this.phase.set(null);
    this.status.set(message);
    if (this.voice()) this.audio.say(message);
    if (this.gong()) this.audio.gong();
  }

  private clearSession() {
    this.audio.stopBackground();
    clearInterval(this.timer);
    this.timer = undefined;
    this.session++;
    void this.wakeLock?.release().catch(() => {});
    this.wakeLock = undefined;
  }

  ngOnDestroy() { this.clearSession(); this.audio.stop(); }
}
