import { Component } from '@angular/core';
import { MatCardModule } from "@angular/material/card";
import { MatDividerModule } from "@angular/material/divider";

@Component({
  selector: 'app-impressum',
  imports: [MatCardModule, MatDividerModule],
  templateUrl: './impressum.html',
  styleUrl: './impressum.scss'
})
export class Impressum {

}
