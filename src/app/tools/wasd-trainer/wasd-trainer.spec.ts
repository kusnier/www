import { TestBed } from '@angular/core/testing';
import { WasdTrainer } from './wasd-trainer';

describe('WASD keyboard controls', () => {
  it('moves after a slow frame and pauses when Escape is pressed', () => {
    let frame!: FrameRequestCallback;
    spyOn(window, 'requestAnimationFrame').and.callFake(callback => {
      frame = callback;
      return 1;
    });
    spyOn(window, 'cancelAnimationFrame');
    spyOn(performance, 'now').and.returnValue(0);
    const fixture = TestBed.createComponent(WasdTrainer);
    fixture.detectChanges();
    const arena: HTMLElement = fixture.nativeElement.querySelector('.arena');
    fixture.nativeElement.querySelector('button').click();
    frame(3000);
    arena.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyD', bubbles: true }));
    frame(3450);
    fixture.detectChanges();
    expect(fixture.componentInstance.phase()).toBe('playing');
    expect(Number(arena.querySelector('.player')!.getAttribute('cx'))).toBeGreaterThan(320);
    arena.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(fixture.componentInstance.phase()).toBe('paused');
  });
});
