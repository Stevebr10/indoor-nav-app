import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Tts } from '../../services/tts';
import { StorageService } from '../../core/services/storage.service';
import { Route } from '../../core/models/route.model';

@Component({
  selector: 'app-destinations',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './destinations.component.html',
  styleUrl: './destinations.component.css',
})
export class DestinationsComponent implements OnInit {
  categoryName: string = '';
  destinations: Route[] = [];
  currentFocus: string | null = null;
  lastTapTime: number = 0;

  constructor(
    private route: ActivatedRoute,   // Para acceder a los paramtetros de la ruta
    private router: Router,
    private location: Location,      // Para el boton de atras
    private tts: Tts,
    private storage: StorageService,
    private cdr: ChangeDetectorRef
  ){}

  async ngOnInit() {
    this.categoryName = this.route.snapshot.paramMap.get('category') || '';
    const allRoutes = await this.storage.getRoutes();
    this.destinations = allRoutes.filter(r => r.category === this.categoryName && r.isActive);
    this.cdr.detectChanges();

    setTimeout(() => {
     this.tts.speak(`Lista de ${this.categoryName}. Tienes ${this.destinations.length} destinos disponibles. Recuerda que tienes un botón para regresar en la parte superior de la pantalla. Explora tocando para escuchar las opciones.`);
    }, 1000);
  }

  //Motor de accedibilidad 1 toque / 2 toques
  handleInteraction(destination: Route) {
    const currentTime = new Date().getTime();
    const timeSinceLastTap = currentTime - this.lastTapTime;

    if(this.currentFocus !== destination.id) {
      //Primer toque: dar foco visual y leer la opcion
      this.currentFocus = destination.id;
      this.lastTapTime = currentTime;
      this.tts.speak(`Destino: ${destination.name}. ${destination.description}. Toca dos veces para iniciar la navegación.`)

    } else {
      //Segundo Toque: Ejecutar la accion
      if(timeSinceLastTap < 500) {
        this.tts.speak(`Iniciando ruta hacia ${destination.name}.`);
        console.log(`Listo para iniciar sensores hacia la ruta ID: ${destination.id}`);
        //Aqui iria la logica para iniciar los sensores y la navegacion
      } else {
        this.lastTapTime = currentTime;
        this.tts.speak(`Destino: ${destination.name}. Toca dos veces para iniciar.`);
      }
    }
  }

  goBack() {
    this.tts.speak('Regresando a las categorías principales.');
    this.location.back();
  }
  handleBackInteraction() {
    const currentTime = new Date().getTime();
    const timeSinceLastTap = currentTime - this.lastTapTime;

    // Usamos 'backBtn' como un ID especial para identificar que estamos tocando este botón
    if (this.currentFocus !== 'backBtn') {
      this.currentFocus = 'backBtn';
      this.lastTapTime = currentTime;
      this.tts.speak('Botón de regresar. Toca dos veces para volver a las categorías principales.');
    } else {
      if (timeSinceLastTap < 500) {
        // Doble toque rápido = Regresar
        this.tts.speak('Regresando.');
        this.location.back();
      } else {
        // Toque lento = Repaso
        this.lastTapTime = currentTime;
        this.tts.speak('Botón de regresar. Toca dos veces para volver.');
      }
    }
  }
}
