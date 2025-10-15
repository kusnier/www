import { Routes } from '@angular/router';
import { Welcome } from './welcome/welcome';

export const routes: Routes = [
  { path: '', component: Welcome },
  {
    path: 'iban',
    loadComponent: () => import('./tools/iban/iban').then(m => m.Iban)
  },
  {
    path: 'jwt-decoder',
    loadComponent: () => import('./tools/jwt-decoder/jwt-decoder').then(m => m.JwtDecoder)
  },
  { path: '**', redirectTo: '' },
];
