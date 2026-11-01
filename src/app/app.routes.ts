import { Routes } from '@angular/router';
import { Welcome } from './welcome/welcome';

export const routes: Routes = [
  { path: '', component: Welcome },
  {
    path: 'jab-code',
    title: 'Datei ↔ JAB-Code – Generator & Decoder | kusnier.net',
    loadComponent: () => import('./tools/jab-code/jab-code').then(m => m.JabCode)
  },
  {
    path: 'proteinrechner',
    title: 'Proteinrechner – Dein täglicher Proteinbedarf | kusnier.net',
    loadComponent: () => import('./tools/protein/protein').then(m => m.Protein)
  },
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
    title: 'Aim Trainer – Präzision & Reaktion | kusnier.net',
    loadComponent: () => import('./aim-trainer/aim-trainer').then(m => m.AimTrainer)
  },
  { path: '**', redirectTo: '' },
];
