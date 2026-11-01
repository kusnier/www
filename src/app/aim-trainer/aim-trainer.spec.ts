import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { AimTrainer } from './aim-trainer';

describe('Aim trainer round lifecycle', () => {
  let fixture: ComponentFixture<AimTrainer>, game: AimTrainer, now: number;
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [AimTrainer] }).compileComponents();
    fixture = TestBed.createComponent(AimTrainer); game = fixture.componentInstance;
    fixture.detectChanges(); now = 0;
    spyOn(performance, 'now').and.callFake(() => now);
  });
  afterEach(() => fixture.destroy());
  const pointer = () => new PointerEvent('pointerdown', { button: 0, isPrimary: true });
  function begin() { game.startGame(); now = 3000; tick(50); }

  it('starts with a countdown and ends after 30 real seconds, not 30,999', fakeAsync(() => {
    game.startGame(); expect(game.phase()).toBe('countdown'); expect(game.seconds()).toBe(30);
    game.hitTarget(); expect(game.statistics().hits).toBe(0);
    now = 3000; tick(50); expect(game.phase()).toBe('playing');
    now = 32999; tick(50); expect(game.phase()).toBe('playing'); expect(game.seconds()).toBe(1);
    now = 33000; tick(50); expect(game.phase()).toBe('finished'); expect(game.seconds()).toBe(0);
  }));
  it('measures the first target and subsequent hits independently of whole-second ticks', fakeAsync(() => {
    begin(); now = 3200; game.hitTarget(); now = 3500; game.hitTarget();
    expect(game.reactions()).toEqual([200, 300]); expect(game.statistics().average).toBe(250);
    expect(game.lastReaction()).toBe(300); game.stop();
  }));
  it('counts misses without treating the target pointer and click as two shots', fakeAsync(() => {
    begin(); now = 3200; game.targetPointer(pointer()); game.targetKeyboard(new MouseEvent('click', { detail: 1 }));
    game.miss(pointer());
    expect(game.statistics().hits).toBe(1); expect(game.misses()).toBe(1); expect(game.statistics().accuracy).toBe(50);
    game.stop();
  }));
  it('rejects hits arriving at or after the deadline', fakeAsync(() => {
    begin(); now = 33000; game.hitTarget();
    expect(game.phase()).toBe('finished'); expect(game.statistics().hits).toBe(0);
  }));
  it('locks settings during a round and clears old results when settings change afterwards', fakeAsync(() => {
    begin(); game.configure('duration', 60); expect(game.duration()).toBe(30);
    now = 3200; game.hitTarget(); game.stop();
    game.configure('duration', 15); expect(game.phase()).toBe('idle'); expect(game.seconds()).toBe(15); expect(game.statistics().hits).toBe(0);
  }));
  it('does not award records for aborted rounds, and separates completed records by configuration', fakeAsync(() => {
    begin(); now = 3200; game.hitTarget(); game.stop(); expect(game.best()).toBe(0);
    now = 4000; game.startGame(); now = 7000; tick(50); now = 7200; game.hitTarget();
    now = 37000; tick(50); expect(game.best()).toBe(1); expect(game.newBest()).toBeTrue();
    game.configure('mode', 'vertical'); now = 40000; game.startGame(); expect(game.best()).toBe(0); game.stop();
  }));
  it('aborts on resize instead of shifting targets in the middle of a run', fakeAsync(() => {
    begin(); game.resize(320, 300); expect(game.phase()).toBe('aborted'); expect(game.notice()).toContain('Spielfeldgröße');
  }));
  it('cancels its timer when leaving the page', fakeAsync(() => {
    begin(); now = 4000; tick(50); const remaining = game.remaining();
    fixture.destroy(); now = 10000; tick(5000); expect(game.remaining()).toBe(remaining);
  }));
});
