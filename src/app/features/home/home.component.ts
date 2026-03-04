import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Tts } from '../../services/tts';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { StorageService } from '../../core/services/storage.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
})
export class HomeComponent implements OnInit {

  categories: string[] = [];
  currentFocus: string | null = null;
  adminTimer: any; // Temporizador para el botón oculto
  lastTapTime: number = 0; // Para detectar doble toque

  constructor(
    private tts: Tts,
    private storage: StorageService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {

  }
  async ngOnInit() {
    // Inyectamois los datos de prueba si la base de datos esta vacia
    await this.storage.initMockData();

    //Leer la base de datos para obtener las categorias unicas
    const routes = await this.storage.getRoutes();
    this.categories = [...new Set(routes.map(r => r.category))];
    this.cdr.detectChanges();
    
    // Resumen de bienvenida para probar el motor de voz
    setTimeout(() => {
      this.tts.speak(`Pantalla principal. Tienes ${this.categories.length} categoría disponible. 
        Explora tocando la pantalla. Toca dos veces para entrar.`);
    }, 1000);
  }

  handleInteraction(category: string) {
    const currentTime = new Date().getTime();
    const timeSinceLastTap = currentTime - this.lastTapTime;

    if (this.currentFocus !== category) {
      //Primer toque: dar foco visual y leer la opcion
      this.currentFocus = category;
      this.lastTapTime = currentTime;
      this.tts.speak(`Categoría ${category}. Toca dos veces para abrir la lista de destinos.`);
    } else {
      if(timeSinceLastTap < 500) {
        this.tts.speak(`Entrando a la categoria ${category}`);
        console.log(`Navengando a la categoria ${category}`);
        this.router.navigate(['/destinations', category]);
        return;
      } else {
        this.lastTapTime = currentTime;
         this.tts.speak(`Categoría ${category}. Toca dos veces para abrir la lista de destinos.`);
      }
    }
  }

  //Gestion del modo admin (toque prolongado por 3 segundos)
  startAdminPress() {
    this.adminTimer = setTimeout(() => {
      this.tts.speak('Modo administrador activado');
      //Navegar a la pantalla de administracion
      //this.router.navigate(['/admin']);
      console.log('Navegando a la pantalla de administracion - login');
    }, 3000);
  }

  cancelAdminPress() {
    clearTimeout(this.adminTimer); // Cancela si el usuario suelta el dedo antes
  }

  probarVoz() {
    this.tts.speak('Boton de categorias Aulas presionado');
  }
}
