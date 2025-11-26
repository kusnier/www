import { DecimalPipe } from '@angular/common';
import { Component, ChangeDetectionStrategy, input, output, computed } from '@angular/core';

@Component({
  selector: 'app-target',
  standalone: true,
  templateUrl: './target.html',
  styleUrls: ['./target.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DecimalPipe]
})
export class Target {
  readonly ttk = input<number>(0);
  readonly x = input<number>();
  readonly y = input<number>();
  readonly size = input<number>();
  readonly shape = input<'circle' | 'square'>();
  readonly hit = output<void>();

  readonly showTtk = computed(() =>{
    const size = this.size();
    return (size != undefined) && size >= 40 && this.ttk() > 0;
  });

  onClick() { this.hit.emit(); }
}
