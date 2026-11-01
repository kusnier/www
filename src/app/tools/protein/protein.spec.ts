import { TestBed } from '@angular/core/testing';
import { Protein } from './protein';

describe('Protein calculator', () => {
  it('recalculates and clears invalid results as form input changes', async () => {
    await TestBed.configureTestingModule({ imports: [Protein] }).compileComponents();
    const fixture = TestBed.createComponent(Protein);
    fixture.detectChanges();
    const page = fixture.nativeElement as HTMLElement;
    expect(page.querySelector('.amount')?.textContent).toContain('128');
    fixture.componentInstance.update('hours', 0);
    fixture.detectChanges();
    expect(page.querySelector('.amount')?.textContent).toContain('64');
    fixture.componentInstance.reset();
    fixture.detectChanges();
    expect(page.querySelector('.amount')).toBeNull();
    expect(page.querySelector('.errors')?.textContent).toContain('Gewicht');
  });
});
