import { Routes } from '@angular/router';
import { HomeComponent } from './features/home/home.component'; 
import { DestinationsComponent } from './features/destinations/destinations.component';
import { ActiveNavigationComponent } from './features/active-navigation/active-navigation.component';

export const routes: Routes = [
    {
        path: '',
        redirectTo: 'home',
        pathMatch: 'full'
    },
    {
        path: 'home',
        component: HomeComponent
    },
    {
        path: 'destinations/:category', // Los dos puntos ":" indican que "category" es una variable que cambia (ej. "aulas" o "baños")
        component: DestinationsComponent
    },
    {
        path: 'active-nav',
        component: ActiveNavigationComponent
    }
];
