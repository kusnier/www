
import { ChangeDetectionStrategy, Component, model } from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { MatSliderModule } from '@angular/material/slider';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [MatSliderModule, MatSelectModule, MatFormFieldModule, MatRadioModule],
  templateUrl: './settings.html',
  styleUrls: ['./settings.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Settings {
  readonly distance = model<number>();
  readonly size = model<number>();
  readonly shape = model<'circle' | 'square'>('circle');
  readonly mode = model<'horizontal' | 'vertical'>('horizontal');

  updateDistance(event: Event) {
    const input = event.target as HTMLInputElement;
    this.distance.set(Number(input.value));
  }

  updateSize(event: Event) {
    const input = event.target as HTMLInputElement;
    this.size.set(Number(input.value));
  }
}
