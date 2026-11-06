import { ChangeDetectionStrategy, Component, computed, HostListener, OnDestroy, signal } from '@angular/core';
import { BreathAudio, type VoiceClip } from './breath-audio';

type Phase = 'breathing' | 'lastBreath' | 'holding' | 'recovery';
type Settings = { rounds: number; breathing: number; holding: number };

const countdown = [undefined, '1', '2', '3', '4', '5'] as const;

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
  readonly guidedBreaths = signal(true);
  readonly midpoint = signal(false);
  readonly heartbeat = signal(false);
  readonly music = signal(false);
  readonly phase = signal<Phase | null>(null);
  readonly round = signal(1);
  readonly remaining = signal(0);
  readonly duration = signal(1);
  readonly status = signal('');
  readonly labels = { breathing: 'Atmen', lastBreath: 'Letzter Atemzug', holding: 'Atem halten', recovery: 'Erholungsatem' };
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
    const needsAudio = this.voice() || this.guidedBreaths() || this.gong() || this.midpoint() || this.heartbeat() || this.music();
    const audioReady = needsAudio ? this.audio.unlock() : undefined;
    if (this.voice() || this.guidedBreaths()) this.audio.preloadVoice();
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
      this.finish('Einheit beendet. Atme normal weiter.', 'einheit-beendet', this.guidedBreaths());
    } else {
      this.round.update(round => round + 1);
      this.enter('breathing', true, this.guidedBreaths() ? 'weiteratmen' : undefined);
    }
  }

  stop() { this.finish('Einheit gestoppt. Atme normal weiter.', 'einheit-gestoppt'); }

  @HostListener('document:visibilitychange')
  visibilityChanged() {
    if (document.hidden && this.phase()) this.stop();
  }

  @HostListener('document:keydown.escape')
  escape() { if (this.phase()) this.stop(); }

  private enter(phase: Phase, playGong = true, instruction?: VoiceClip) {
    this.audio.stopSpeech();
    const seconds = phase === 'recovery' ? 15 : phase === 'lastBreath' ? 6 : this.settings()[phase];
    const duration = seconds * 1000;
    this.phase.set(phase);
    this.duration.set(duration);
    this.remaining.set(duration);
    this.deadline = performance.now() + duration;
    this.lastSecond = seconds;
    this.halfway = false;
    if (playGong && this.gong()) this.audio.gong();
    if (this.guidedBreaths()) {
      if (phase === 'lastBreath') instruction = 'letzter-atemzug';
      if (phase === 'recovery') instruction = 'erholungsatem';
    }
    const initialCue = this.voice() ? this.countdownCue(phase, seconds) : undefined;
    const announcement = instruction ?? initialCue;
    if (announcement) void this.audio.say(announcement);
  }

  private tick() {
    const phase = this.phase();
    if (!phase) return;
    const left = Math.max(0, this.deadline - performance.now());
    this.remaining.set(left);
    if (!left) {
      if (phase === 'breathing') this.enter(this.guidedBreaths() ? 'lastBreath' : 'holding');
      else if (phase === 'lastBreath') this.enter('holding');
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
      void this.audio.say(cue, () => {
        if (this.gong()) this.audio.gong(true);
      });
    }
    this.lastSecond = second;
  }

  private countdownCue(phase: Phase, seconds: number): VoiceClip | undefined {
    if (phase === 'lastBreath') return undefined;
    if (phase !== 'recovery') {
      if (seconds === 15 && this.duration() > 30_000) {
        return 'noch-15-sekunden';
      }
      if (seconds === 10) return 'noch-10-sekunden';
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

  private finish(message: string, clip: VoiceClip, announce = false) {
    this.clearSession();
    this.phase.set(null);
    this.status.set(message);
    if (this.voice() || announce) void this.audio.say(clip);
    if (this.gong()) this.audio.gong();
  }

  private clearSession() {
    this.audio.stopBackground();
    this.audio.stopSpeech();
    clearInterval(this.timer);
    this.timer = undefined;
    this.session++;
    void this.wakeLock?.release().catch(() => {});
    this.wakeLock = undefined;
  }

  ngOnDestroy() { this.clearSession(); this.audio.stop(); }
}
