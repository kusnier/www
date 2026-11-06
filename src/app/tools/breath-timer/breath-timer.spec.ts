import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { BreathAudio } from './breath-audio';
import { BreathTimer } from './breath-timer';

describe('Breath timer', () => {
  function setup() {
    const clock = spyOn(performance, 'now').and.returnValue(0);
    spyOn(BreathAudio.prototype, 'unlock').and.resolveTo();
    spyOn(BreathAudio.prototype, 'gong');
    const say = spyOn(BreathAudio.prototype, 'say').and.returnValue(true);
    const fixture = TestBed.createComponent(BreathTimer);
    const timer = fixture.componentInstance;
    fixture.detectChanges();
    return { fixture, timer, clock, say };
  }

  it('uses the personal profile and allows ending the hold and recovery early', fakeAsync(() => {
    const { fixture, timer, clock } = setup();
    expect(timer.settings()).toEqual({ rounds: 5, breathing: 45, holding: 120 });
    timer.start();
    clock.and.returnValue(45000);
    tick(50);
    expect(timer.phase()).toBe('holding');
    expect(timer.time()).toBe('2:00');
    timer.endHold();
    expect(timer.phase()).toBe('recovery');
    timer.endRecovery();
    expect(timer.round()).toBe(2);
    expect(timer.phase()).toBe('breathing');
    fixture.destroy();
  }));

  it('announces both countdowns and their phase transitions once', fakeAsync(() => {
    const { fixture, timer, clock, say } = setup();
    timer.start();
    for (const second of [30, 35, 40, 41, 42, 43, 44, 45, 150, 155, 160, 161, 162, 163, 164, 165]) {
      clock.and.returnValue(second * 1000);
      tick(100);
    }
    expect(say.calls.allArgs().map(([message]) => message)).toEqual([
      'Atmen.', 'Noch fünfzehn Sekunden atmen.', 'Noch zehn Sekunden atmen.', 'Noch fünf Sekunden.',
      'vier', 'drei', 'zwei', 'eins', 'Stopp. Atem halten.',
      'Noch fünfzehn Sekunden.', 'Noch zehn Sekunden.', 'Noch fünf Sekunden.',
      'vier', 'drei', 'zwei', 'eins', 'Jetzt einatmen',
    ]);
    timer.stop();
    clock.and.returnValue(200000);
    tick(1000);
    expect(timer.phase()).toBeNull();
    expect(timer.round()).toBe(1);
    fixture.destroy();
  }));

  it('finishes after the last recovery instead of starting another round', fakeAsync(() => {
    const { fixture, timer, clock } = setup();
    timer.edit('rounds', 1);
    timer.edit('breathing', 10);
    timer.edit('holding', 10);
    timer.start();
    clock.and.returnValue(10000);
    tick(50);
    clock.and.returnValue(20000);
    tick(50);
    expect(timer.phase()).toBe('recovery');
    clock.and.returnValue(35000);
    tick(50);
    expect(timer.phase()).toBeNull();
    expect(timer.status()).toContain('Einheit beendet');
    fixture.destroy();
  }));

  it('announces 15 seconds even when it is the starting duration', fakeAsync(() => {
    const { fixture, timer, clock, say } = setup();
    timer.edit('breathing', 15);
    timer.edit('holding', 15);
    timer.start();
    tick(100);
    clock.and.returnValue(15000);
    tick(100);
    expect(say.calls.allArgs().map(([message]) => message)).toEqual([
      'Atmen. Noch fünfzehn Sekunden atmen.',
      'Stopp. Atem halten. Noch fünfzehn Sekunden.',
    ]);
    fixture.destroy();
  }));
});
