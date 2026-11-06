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
    const { fixture, timer, clock, say } = setup();
    expect(timer.settings()).toEqual({ rounds: 5, breathing: 45, holding: 120 });
    timer.start();
    clock.and.returnValue(45000);
    tick(50);
    expect(timer.phase()).toBe('lastBreath');
    expect(say).toHaveBeenCalledWith('Letzter tiefer Atemzug. Locker ausatmen.');
    clock.and.returnValue(51000);
    tick(50);
    expect(timer.phase()).toBe('holding');
    expect(timer.time()).toBe('2:00');
    timer.endHold();
    expect(timer.phase()).toBe('recovery');
    expect(say).toHaveBeenCalledWith('Tief einatmen. Kurz halten, solange es angenehm ist.');
    timer.endRecovery();
    expect(timer.round()).toBe(2);
    expect(timer.phase()).toBe('breathing');
    expect(say).toHaveBeenCalledWith('Locker ausatmen. Weiteratmen.');
    fixture.destroy();
  }));

  it('announces only the remaining time in both phases', fakeAsync(() => {
    const { fixture, timer, clock, say } = setup();
    timer.guidedBreaths.set(false);
    timer.start();
    for (const second of [30, 35, 40, 41, 42, 43, 44, 45, 150, 155, 160, 161, 162, 163, 164, 165]) {
      clock.and.returnValue(second * 1000);
      tick(100);
    }
    expect(say.calls.allArgs().map(([message]) => message)).toEqual([
      'Noch fünfzehn Sekunden.', 'Noch zehn Sekunden.', 'fünf', 'vier', 'drei', 'zwei', 'eins',
      'Noch fünfzehn Sekunden.', 'Noch zehn Sekunden.', 'fünf', 'vier', 'drei', 'zwei', 'eins',
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
    timer.guidedBreaths.set(false);
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

  it('skips the 15-second notice for phases of 30 seconds or less', fakeAsync(() => {
    const { fixture, timer, clock, say } = setup();
    timer.guidedBreaths.set(false);
    timer.edit('breathing', 30);
    timer.edit('holding', 20);
    timer.start();
    for (const second of [15, 20, 30, 35, 40]) {
      clock.and.returnValue(second * 1000);
      tick(100);
    }
    expect(say.calls.allArgs().map(([message]) => message)).toEqual([
      'Noch zehn Sekunden.', 'Noch zehn Sekunden.',
    ]);
    fixture.destroy();
  }));
});
