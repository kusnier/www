export class BreathAudio {
  private context?: AudioContext;
  private background: AudioBufferSourceNode[] = [];

  startBackground(heartbeat: boolean, music: boolean) {
    this.stopBackground();
    const context = this.context;
    if (!context || context.state !== 'running') return;
    if (heartbeat) this.loop(1.25, heartbeatSample);
    if (music) this.loop(24, musicSample);
  }

  stopBackground() {
    for (const source of this.background) {
      source.stop();
      source.disconnect();
    }
    this.background = [];
  }

  private loop(seconds: number, sample: (time: number) => number) {
    const context = this.context!;
    const rate = 22050;
    const buffer = context.createBuffer(1, Math.round(seconds * rate), rate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = sample(i / rate);
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    source.connect(context.destination);
    source.start();
    this.background.push(source);
  }

  async unlock() {
    try {
      this.context ??= new AudioContext();
      if (this.context.state === 'suspended') await this.context.resume();
    } catch {
      // The visual timer is also usable without audio.
    }
  }

  gong(soft = false) {
    const context = this.context;
    if (!context || context.state !== 'running') return;
    const start = context.currentTime;
    for (const [frequency, volume, decay] of [[146, .13, 2.2], [215, .075, 1.7], [332, .04, 1.3], [511, .018, .85]]) {
      const tone = context.createOscillator();
      const envelope = context.createGain();
      tone.type = 'sine';
      tone.frequency.value = frequency;
      envelope.gain.setValueAtTime(.0001, start);
      envelope.gain.exponentialRampToValueAtTime(volume * (soft ? .4 : 1), start + .035);
      envelope.gain.exponentialRampToValueAtTime(.0001, start + decay);
      tone.connect(envelope).connect(context.destination);
      tone.start(start);
      tone.stop(start + decay);
    }
  }

  say(message: string): boolean {
    const speech = window.speechSynthesis;
    const voice = speech?.getVoices().find(item => item.localService && /^de\b/i.test(item.lang));
    if (!voice) return false;
    speech.cancel();
    const utterance = new SpeechSynthesisUtterance(message);
    utterance.lang = voice.lang;
    utterance.voice = voice;
    speech.speak(utterance);
    return true;
  }

  stop() {
    this.stopBackground();
    window.speechSynthesis?.cancel();
    if (this.context) void this.context.close().catch(() => {});
    this.context = undefined;
  }
}

function heartbeatSample(time: number) {
  function pulse(age: number, frequency: number) {
    if (age < 0 || age >= .24) return 0;
    const angle = 2 * Math.PI * frequency * age;
    const envelope = Math.sin(Math.PI * age / .24) ** 2 * Math.exp(-9 * age);
    return envelope * (Math.sin(angle) + .35 * Math.sin(2 * angle));
  }
  return .14 * pulse(time, 62) + .08 * pulse(time - .19, 76);
}

const chords = [
  [130.81, 196, 261.63, 329.63],
  [110, 164.81, 261.63, 329.63],
  [87.31, 130.81, 220, 261.63],
  [98, 146.83, 196, 293.66],
];

function musicSample(time: number) {
  const chord = Math.floor(time / 6);
  const age = time % 6;
  const fade = Math.sin(Math.PI * age / 6) ** 2;
  return .012 * fade * chords[chord].reduce((sum, frequency, index) =>
    sum + Math.sin(2 * Math.PI * frequency * age + .15 * Math.sin(2 * Math.PI * age / (3 + index))), 0);
}
