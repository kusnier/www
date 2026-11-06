export class BreathAudio {
  private context?: AudioContext;

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
    window.speechSynthesis?.cancel();
    if (this.context) void this.context.close().catch(() => {});
    this.context = undefined;
  }
}
