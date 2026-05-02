import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { Router } from '@angular/router';
import { NavigationService } from '../../core/services/navigation.service';
import { Tts } from '../../services/tts';

@Component({
  selector: 'app-active-navigation',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './active-navigation.component.html',
  styleUrl: './active-navigation.component.css',
})
export class ActiveNavigationComponent implements OnInit, OnDestroy {

  navState = {tech: '', instruction: ''};
  isConfirmingCancel = false;
  currentFocus: string | null = null;
  lastTapTime: number = 0;
  private screenLoadTime: number = 0;

  constructor(

    private navigation: NavigationService,
    private tts: Tts,
    private location: Location,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {

  }

  ngOnInit() {

    //Guardamos el tiempo de carga de la pantalla para evitar que se consideren toques previos a la interacción
    this.screenLoadTime = Date.now();
    // Nos suscribimos a los cambios en tiempo real del GPS/BLE/NFC
    this.navigation.currentNavState.subscribe(state => {
      this.navState = state;
      this.cdr.detectChanges();
    });
    // Iniciamos la navegación con la ruta que el usuario seleccionó
    if (this.navigation.fullRoute) {
      this.navigation.startNavigation(this.navigation.fullRoute);

    } else {
      console.log("No se recibió ruta. Regresando al Home.");
      this.router.navigate(['/home']);  // Si no hay ruta, regresamos al inicio
    }

  }

  ngOnDestroy() {
    this.navigation.stopNavigation();
  }
  // Motor de interaccion de la pantalla principal
  handleMainScreenTap() {
    //El escudoo de tiempo para evitar que se consideren toques previos a la interacción
    if(Date.now() - this.screenLoadTime < 1000) return;

    if (this.isConfirmingCancel) return;
    this.tts.speak(`Repitiendo: ${this.navState.instruction}`);
  }

  handleCancelRequest() {
    if (Date.now() - this.screenLoadTime <1000) return;
    //const currentTime = new Date().getTime();
    const currentTime = Date.now();
    const timeSinceLastTap = currentTime - this.lastTapTime;

    if (this.currentFocus !== 'cancelBtn') {
      this.currentFocus = 'cancelBtn';
      this.lastTapTime = currentTime;
      this.tts.speak(`¿Deseas cancelar la navegación? Toca dos veces para confirmar.`);
    } else {
      if (timeSinceLastTap < 500) {
        // Doble toque msotramos la pantalla de confirmacion
        this.isConfirmingCancel = true;
        this.tts.speak("¿Estás seguro de que deseas detener la navegación? Mitad superior para sí, mitad inferior para no.");
        this.currentFocus = null;
      } else {
        this.lastTapTime = currentTime;
        this.tts.speak("Botón de detener ruta. Toca dos veces para cancelar.");
      }
    }
  }
  // --- PANTALLA DIVIDIDA: CONFIRMAR (MITAD ROJA) ---
  confirmCancel() {
    const currentTime = new Date().getTime();
    if (this.currentFocus !== 'confirmYes' || (currentTime - this.lastTapTime) >= 500) {
      this.currentFocus = 'confirmYes';
      this.lastTapTime = currentTime,
      this.tts.speak("Sí, detener ruta. Toca dos veces para confirmar.");

    } else {
      this.tts.speak("Navegación cancelada. Regresando.");
      this.location.back();
    }
  }

  // --- PANTALLA DIVIDIDA: RECHAZAR (MITAD VERDE) ---
  rejectCancel() {
    const currentTime = new Date().getTime();
    if (this.currentFocus !== 'confirmNo' || (currentTime - this.lastTapTime) >= 500) {
      this.currentFocus = 'confirmNo';
      this.lastTapTime = currentTime;
      this.tts.speak("No cancelar. Toca dos veces para continuar navegando.");
    } else {
      this.isConfirmingCancel = false; // Oculta la pantalla dividida
      this.tts.speak("Continuando ruta.");
    }
  }

  finishSuccessRoute() {
    this.tts.speak("Saliendo de la navegación. Regresando al menú principal.");
    this.navigation.stopNavigation(true);
    this.location.back();
  }


}
