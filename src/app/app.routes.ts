import { Routes } from '@angular/router';
import { Welcome } from './welcome/welcome';
import { Iban } from './tools/iban/iban';

export const routes: Routes = [
  { path: '', component: Welcome },
  { path: 'iban', component: Iban },
  { path: '**', redirectTo: '' }
];
