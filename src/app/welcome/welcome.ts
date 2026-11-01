import { Component } from '@angular/core';
import { Hero } from './hero/hero';
import { ToolShowcase } from './tools/tools';
@Component({ selector: 'app-welcome', standalone: true, imports: [Hero, ToolShowcase], templateUrl: './welcome.html', styleUrl: './welcome.scss' })
export class Welcome {}
