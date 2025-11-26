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
  {
    path: 'impressum',
    loadComponent: () => import('./impressum/impressum').then(m => m.Impressum)
  },
  {
    path: 'aim-trainer',
    loadComponent: () => import('./aim-trainer/aim-trainer').then(m => m.AimTrainer)
  },
  { path: '**', redirectTo: '' },
];
