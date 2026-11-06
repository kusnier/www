import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Welcome } from './welcome';
import { provideRouter } from '@angular/router';

describe('Welcome', () => {
  let component: Welcome;
  let fixture: ComponentFixture<Welcome>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Welcome],
      providers: [provideRouter([])],
    })
    .compileComponents();

    fixture = TestBed.createComponent(Welcome);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('shows the approved stack and links the previews to the real tools', () => {
    const page = fixture.nativeElement as HTMLElement;
    expect(page.querySelector('h1')?.textContent).toContain('Sauberer Code.');
    expect(page.querySelector('.tech-stack')?.textContent).toContain('Vitest');
    expect(page.querySelector('.tech-stack')?.textContent).not.toContain('Jest');
    expect(page.querySelector('.tool-card[href="/iban"]')).not.toBeNull();
    expect(page.querySelector('.tool-card[href="/jwt-decoder"]')).not.toBeNull();
    expect(page.querySelector('.tool-card[href="/jab-code"]')).not.toBeNull();
    expect(page.querySelector('.tool-card[href="/aim-trainer"]')).not.toBeNull();
    expect(page.querySelector('.tool-card[href="/wasd-trainer"]')).not.toBeNull();
    expect(page.querySelector('.tool-card[href="/json-vergleich"]')).not.toBeNull();
    expect(page.querySelectorAll('.tool-card').length).toBe(7);
    expect(page.querySelector('#ueber-mich')).not.toBeNull();
  });
});
