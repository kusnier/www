const voiceClips = [
  '1', '2', '3', '4', '5', 'noch-10-sekunden', 'noch-15-sekunden',
  'letzter-atemzug', 'erholungsatem', 'weiteratmen', 'einheit-beendet', 'einheit-gestoppt',
] as const;

export type VoiceClip = typeof voiceClips[number];

export class BreathAudio {
  private context?: AudioContext;
  private readonly clips = new Map<VoiceClip, Promise<AudioBuffer | undefined>>();
  private speech?: AudioBufferSourceNode;
  private speechRequest = 0;
  private music?: AudioBufferSourceNode;
  private heartbeat?: { source: AudioBufferSourceNode; gain: GainNode; step: number };

  startBackground(music: boolean) {
    this.stopBackground();
    const context = this.context;
    if (music && context?.state === 'running') {
      this.music = this.loop(context, context.destination, 24, musicSample);
    }
  }

  stopBackground() {
    this.music?.stop();
    this.music?.disconnect();
    this.music = undefined;
    this.stopHeartbeat();
  }

  startHeartbeat(remaining: number) {
    const context = this.context;
    if (this.heartbeat || context?.state !== 'running') return;
    const gain = context.createGain();
    gain.gain.value = 1.5;
    gain.connect(context.destination);
    const source = this.loop(context, gain, 60 / 36, heartbeatSample);
    this.heartbeat = { source, gain, step: 0 };
    this.updateHeartbeat(remaining);
  }

  updateHeartbeat(remaining: number) {
    const heartbeat = this.heartbeat;
    if (!heartbeat) return;
    // Raise the volume every three seconds during the final 15 seconds.
    const step = Math.max(0, 5 - Math.floor(remaining / 3000));
    if (step === heartbeat.step) return;
    heartbeat.step = step;
    heartbeat.gain.gain.setTargetAtTime(1.5 + .2 * step, heartbeat.gain.context.currentTime, .06);
  }

  stopHeartbeat() {
    this.heartbeat?.source.stop();
    this.heartbeat?.source.disconnect();
    this.heartbeat?.gain.disconnect();
    this.heartbeat = undefined;
  }

  private loop(context: AudioContext, destination: AudioNode, seconds: number, sample: (time: number) => number) {
    const rate = 22050;
    const buffer = context.createBuffer(1, Math.round(seconds * rate), rate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = sample(i / rate);
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    source.connect(destination);
    source.start();
    return source;
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

  preloadVoice() {
    const context = this.context;
    if (!context) return;
    for (const clip of voiceClips) {
      if (!this.clips.has(clip)) {
        const url = new URL('audio/breath-timer/' + clip + '.wav', document.baseURI);
        this.clips.set(clip, fetch(url).then(response => {
          if (!response.ok) throw new Error('Could not load voice clip');
          return response.arrayBuffer();
        }).then(bytes => context.decodeAudioData(bytes)).catch(() => {
          this.clips.delete(clip);
          return undefined;
        }));
      }
    }
  }

  async say(clip: VoiceClip, fallback?: () => void) {
    this.stopSpeech();
    const request = this.speechRequest;
    this.preloadVoice();
    const context = this.context;
    const buffer = await this.clips.get(clip);
    if (request !== this.speechRequest) return;
    if (!buffer || !context || context.state !== 'running') {
      fallback?.();
      return;
    }

    const source = context.createBufferSource();
    source.buffer = buffer;
    source.connect(context.destination);
    source.onended = () => {
      source.disconnect();
      if (this.speech === source) this.speech = undefined;
    };
    this.speech = source;
    source.start();
  }

  stopSpeech() {
    this.speechRequest++;
    this.speech?.stop();
    this.speech = undefined;
  }

  stop() {
    this.stopBackground();
    this.stopSpeech();
    if (this.context) void this.context.close().catch(() => {});
    this.context = undefined;
    this.clips.clear();
  }
}

function heartbeatSample(time: number) {
  function pulse(age: number, frequency: number) {
    const length = .27;
    if (age < 0 || age >= length) return 0;
    const envelope = Math.sin(Math.PI * age / length) ** 2 * Math.exp(-8 * age);
    return envelope * Math.sin(2 * Math.PI * frequency * age);
  }
  return .078 * pulse(time, 47) + .014 * pulse(time - .17, 49);
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
