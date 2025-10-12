import { Component } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatToolbarModule } from '@angular/material/toolbar';
import { BrowserModule } from '@angular/platform-browser';

@Component({
  selector: 'app-welcome',
  imports: [
    MatToolbarModule,
    MatCardModule
],
  templateUrl: './welcome.html',
  styleUrl: './welcome.scss'
})
export class Welcome {

}
