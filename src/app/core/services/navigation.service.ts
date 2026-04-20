import { Injectable } from '@angular/core';
import { Geolocation, Position } from '@capacitor/geolocation';
import { KeepAwake } from '@capacitor-community/keep-awake'; 
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Tts } from '../../services/tts';
import { Route } from '../models/route.model';
import { NavNode } from '../models/node.model';
import { BluetoothService } from './bluetooth.service';
import { BehaviorSubject } from 'rxjs';


@Injectable({
  providedIn: 'root',
})
export class NavigationService {

  private isNavigating = false;
  private watchId: string | null = null;
  
  public currentNavState = new BehaviorSubject<{tech: string, instruction: string}>({tech: 'CARGANDO', instruction: 'Calculando ruta...'})

  //Objeto actual al que el usuario debe llegar
  private currentTargetNode: NavNode | null = null;
  //Para recordar la ultima vez que hablamos
  private lastAnnouncedDistance: number = -1;
  //private fullRoute: Route | null = null;
  public fullRoute: Route | null = null;
  private currentStepIndex: number = 0;

  constructor(
    private tts: Tts,
    private bleService: BluetoothService
  ) {

  }

  //Iniciar la ruta
  async startNavigation(route:Route) {
    await this.stopNavigation(true);
    this.lastAnnouncedDistance = -1;
    this.isNavigating = true;

    // Guardamos la tuta completa y empezamos en el paso 0
    this.fullRoute = route;
    this.currentStepIndex = 0;

    await KeepAwake.keepAwake();  // Mantener la pantalla encendida durante la navegacion
    console.log("la pantalla se mantendra encendida durante la navegacion");

    this.executeCurrentStep();

    // const firstGpsNode = route.steps.find(step => step.type === 'GPS');
    // if (!firstGpsNode || !firstGpsNode.latitude || !firstGpsNode.longitude) {
    //   this.tts.speak("Esta ruta no tiene coordenadas exteriores configuradas.");
    //   return;
    // }
    // this.currentTargetNode = firstGpsNode;
    // this.tts.speak(`Iniciando navegación. Dirígete hacia ${this.currentTargetNode.name}.`);

    // //Verificamos los permisos de GPS
    // const permission = await Geolocation.checkPermissions();
    // if (permission.location !== 'granted') { //granted es el estado que indica que el usuario ha dado permiso para acceder a su ubicación
    //   const request = await Geolocation.requestPermissions();
    //   if (request.location !== 'granted') {
    //     this.tts.speak("No tengo permisos de ubicación. No puedo iniciar la ruta.");
    //     return;
    //   }
    // }
    // this.startGpsTracking(route);
  }

  private executeCurrentStep() {
    // Si no hay ruta o ya pasamos el último paso, terminamos
    if (!this.fullRoute || this.currentStepIndex >= this.fullRoute.steps.length) {
      this.tts.speak("Has completado toda la ruta. Navegación finalizada.");
      this.stopNavigation(true);
      return;
    }

    // Obtenemos el nodo actual según el índice
    this.currentTargetNode = this.fullRoute.steps[this.currentStepIndex];

    // Evaluamos qué tecnología necesita este nodo
    if (this.currentTargetNode.type === 'GPS') {
      this.currentNavState.next({tech: 'GPS', instruction: `Dirígete hacia ${this.currentTargetNode.name}`});
      this.startGpsNode();
    } 
    else if (this.currentTargetNode.type === 'BLE') {
      this.currentNavState.next({tech: 'BLUETOOTH', instruction: `Buscando señal de ${this.currentTargetNode.name}`});
      // Pasamos el control al BLE, y cuando termine, avanzará automáticamente
      this.bleService.startIndoorNavigation(this.currentTargetNode, () => {
        this.currentStepIndex++;
        setTimeout(() => {
          this.executeCurrentStep(); 
        }, 4000); // Esperamos 4 seg para que termine de hablar antes de encender el siguiente
      });
    }
    else if (this.currentTargetNode.type === 'NFC') {
      this.currentNavState.next({tech: 'NFC', instruction: `Acércate al tag de ${this.currentTargetNode.name}`});
      this.tts.speak(this.currentTargetNode.ttsInstruction);
      // Aquí activaremos el escáner NFC más adelante
    }
  }

  private async startGpsNode() {
    if (!this.currentTargetNode || !this.currentTargetNode.latitude || !this.currentTargetNode.longitude) {
      this.tts.speak("Esta ruta no tiene coordenadas exteriores configuradas.");
      return;
    }

    this.tts.speak(`Iniciando navegación. Dirígete hacia ${this.currentTargetNode.name}.`);

    //Verificamos los permisos de GPS
    const permission = await Geolocation.checkPermissions();
    if (permission.location !== 'granted') { 
      const request = await Geolocation.requestPermissions();
      if (request.location !== 'granted') {
        this.tts.speak("No tengo permisos de ubicación. No puedo iniciar la ruta.");
        return;
      }
    }
    
    // Rastrear la posicion en tiempo real
    this.watchId = await Geolocation.watchPosition({
      enableHighAccuracy: true, 
      timeout: 10000,           
      maximumAge: 0             
    }, (position, err) => {
      if (err) {
        console.error("Error de GPS:", err);
        return;
      }
      
      if (position && this.currentTargetNode) {
        this.processNewPosition(position);
      }
    });
  }

  //Rastrear la posicion en tiempo real
  private async startGpsTracking(route: Route) {
    // Geolocation.watchPosition hace que el celular nos avise cada vez que da un paso
    this.watchId = await Geolocation.watchPosition({
      enableHighAccuracy: true, // Forzar uso de satélite (consume más batería, pero es vital aquí)
      timeout: 10000,           // Tiempo de espera para obtener la posicion
      maximumAge: 0             // No usar posiciones anteriores
    }, (position, err) => {
      if (err) {
        console.error("Error de GPS:", err);
        return;
      }
      
      if (position && this.currentTargetNode) {
        this.processNewPosition(position);
      }
    });
  }

  // Logica matematica basica para recibir un nuevo punto
  private processNewPosition(position: Position) {
    if (!this.currentTargetNode || !this.currentTargetNode.latitude || !this.currentTargetNode.longitude) return;
    
    const distanceToTarget = this.calculateDistance(
      position.coords.latitude, position.coords.longitude,
      this.currentTargetNode.latitude, this.currentTargetNode.longitude
    );

    const roundedDistance = Math.round(distanceToTarget);
    console.log(`Distancia al objetivo: ${roundedDistance}m (Margen de error GPS: ${position.coords.accuracy}m)`);

    // Logica de proximidad con vibracion 
    if (roundedDistance <= 15) { 
      Haptics.vibrate({duration: 1500});
      this.tts.speak(`Estás en la zona de ${this.currentTargetNode.name}. Preparando sensores de interiores.`);
      
      // APAGAMOS SOLO EL GPS para el handover
      if (this.watchId) {
        Geolocation.clearWatch({ id: this.watchId });
        this.watchId = null;
      }

      // ¡EL HANDOVER! Avanzamos al siguiente paso del arreglo (ej. El BLE del pasillo)
      this.currentStepIndex++;
      setTimeout(() => {
        this.executeCurrentStep(); 
      }, 4000); 

    } else {
      if(roundedDistance <= 30) {
         if (this.lastAnnouncedDistance === -1 || Math.abs(this.lastAnnouncedDistance - roundedDistance) >= 5) { 
          this.lastAnnouncedDistance = roundedDistance;
          Haptics.impact({ style: ImpactStyle.Heavy});
          this.tts.speak(`Acercándote. A ${roundedDistance} metros de tu destino.`);
        }
      } else {
        if (this.lastAnnouncedDistance === -1 || Math.abs(this.lastAnnouncedDistance - roundedDistance) >= 10) {
          this.lastAnnouncedDistance = roundedDistance;
          Haptics.impact({ style: ImpactStyle.Medium });
          this.tts.speak(`A ${roundedDistance} metros.`);
        }
      }
    }
  }

  // Formula de Haversine
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3;
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  // Detener todo de forma segura
  async stopNavigation(silent: boolean = false) {
    this.isNavigating = false;
    this.fullRoute = null;
    this.currentTargetNode = null;
    
    if (this.watchId) {
      await Geolocation.clearWatch({ id: this.watchId });
      this.watchId = null;
    }
    
    // También apagamos el BLE por si estaba encendido
    await this.bleService.stopIndoorNavigation();
    
    // liberamos la pantalla para ahorrar bateria
    await KeepAwake.allowSleep();
    console.log("GPS apagado.");
    
    if(!silent) {
      this.tts.speak("Navegacion detenida.");
    }
  }
}
