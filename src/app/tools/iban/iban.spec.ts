import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Iban } from './iban';

describe('Iban', () => {
  let component: Iban;
  let fixture: ComponentFixture<Iban>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Iban]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Iban);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
