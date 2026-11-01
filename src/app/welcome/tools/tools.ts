import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
@Component({ selector: 'app-tool-showcase', imports: [RouterLink], templateUrl: './tools.html', styleUrl: './tools.scss' })
export class ToolShowcase {
  readonly jwtHeader = '{\n  "alg": "HS256",\n  "typ": "JWT"\n}';
}
