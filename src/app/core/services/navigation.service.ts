import { Injectable } from '@angular/core';
import { Geolocation, Position } from '@capacitor/geolocation';
import { KeepAwake } from '@capacitor-community/keep-awake'; 
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Tts } from '../../services/tts';
import { Route } from '../models/route.model';
import { NavNode } from '../models/node.model';
import { BluetoothService } from './bluetooth.service';
import { NfcService } from './nfc.service';
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
  private minDistanceRecorded: number = Infinity;

  constructor(
    private tts: Tts,
    private bleService: BluetoothService,
    private nfcService: NfcService
  ) {

  }

  //Iniciar la ruta
  // async startNavigation(route:Route) {
  //   await this.stopNavigation(true);
  //   this.lastAnnouncedDistance = -1;
  //   this.isNavigating = true;

  //   // Guardamos la tuta completa y empezamos en el paso 0
  //   this.fullRoute = route;
  //   this.currentStepIndex = 0;

  //   await KeepAwake.keepAwake();  // Mantener la pantalla encendida durante la navegacion
  //   console.log("la pantalla se mantendra encendida durante la navegacion");

  //   this.executeCurrentStep();

  //   // const firstGpsNode = route.steps.find(step => step.type === 'GPS');
  //   // if (!firstGpsNode || !firstGpsNode.latitude || !firstGpsNode.longitude) {
  //   //   this.tts.speak("Esta ruta no tiene coordenadas exteriores configuradas.");
  //   //   return;
  //   // }
  //   // this.currentTargetNode = firstGpsNode;
  //   // this.tts.speak(`Iniciando navegación. Dirígete hacia ${this.currentTargetNode.name}.`);

  //   // //Verificamos los permisos de GPS
  //   // const permission = await Geolocation.checkPermissions();
  //   // if (permission.location !== 'granted') { //granted es el estado que indica que el usuario ha dado permiso para acceder a su ubicación
  //   //   const request = await Geolocation.requestPermissions();
  //   //   if (request.location !== 'granted') {
  //   //     this.tts.speak("No tengo permisos de ubicación. No puedo iniciar la ruta.");
  //   //     return;
  //   //   }
  //   // }
  //   // this.startGpsTracking(route);
  // }

  // async startNavigation(route:Route) {
  //   await this.stopNavigation(true);
  //   this.lastAnnouncedDistance = -1;
  //   this.isNavigating = true;


  //   this.fullRoute = route;
    
  //   await KeepAwake.keepAwake(); 
  //   console.log("la pantalla se mantendra encendida durante la navegacion");

  //   this.tts.speak("Analizando tu posición actual para optimizar la ruta...");

  //   const permission = await Geolocation.checkPermissions();
  //   if (permission.location !== 'granted') { 
  //     const request = await Geolocation.requestPermissions();
  //     if (request.location !== 'granted') {
  //       this.tts.speak("No tengo permisos de ubicación. No puedo iniciar la ruta.");
  //       return;
  //     }
  //   }

  //   try {
  //     // 1. Obtener posición actual
  //     const currentPos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true });
      
  //     // 2. Encontrar el nodo GPS más cercano
  //     let closestNodeIndex = 0;
  //     let minDistance = Infinity;

  //     for (let i = 0; i < route.steps.length; i++) {
  //       const step = route.steps[i];
  //       if (step.type === 'GPS' && step.latitude && step.longitude) {
  //         const dist = this.calculateDistance(
  //           currentPos.coords.latitude, currentPos.coords.longitude,
  //           step.latitude, step.longitude
  //         );
  //         if (dist < minDistance) {
  //           minDistance = dist;
  //           closestNodeIndex = i;
  //         }
  //       }
  //     }

  //     // 3. Evaluar si estamos "dentro" del nodo más cercano (ej. a menos de 15m)
  //     if (minDistance <= 15) {
  //       this.tts.speak(`Ya te encuentras en ${route.steps[closestNodeIndex].name}. Iniciando desde el siguiente punto.`);
  //       // Saltamos al nodo SIGUIENTE al más cercano
  //       this.currentStepIndex = closestNodeIndex + 1;
  //     } else {
  //       // Iniciamos navegando hacia el nodo más cercano
  //       this.tts.speak(`Iniciando ruta. Dirígete hacia ${route.steps[closestNodeIndex].name}.`);
  //       this.currentStepIndex = closestNodeIndex;
  //     }

  //   } catch (e) {
  //     console.error("Error obteniendo ubicación inicial, empezando desde el paso 0", e);
  //     this.currentStepIndex = 0;
  //   }

  //   // 4. Iniciar el motor con el índice correcto
  //   this.executeCurrentStep();

  // }

  async startNavigation(route: Route) {
    await this.stopNavigation(true);
    this.lastAnnouncedDistance = -1;
    this.isNavigating = true;


    this.fullRoute = route;
    
    await KeepAwake.keepAwake(); 
    await this.tts.speak("Analizando tu posición actual con satélites. Esto puede tomar unos segundos...");

    // 1. Verificación estricta de permisos
    const permission = await Geolocation.checkPermissions();
    if (permission.location !== 'granted') { 
      const request = await Geolocation.requestPermissions();
      if (request.location !== 'granted') {
        await this.tts.speak("Necesito permisos de ubicación para poder guiarte. Por favor actívalos.");
        return;
      }
    }

    try {
      // FIX PRUEBA 2: maximumAge: 0 obliga a buscar una ubicación REAL y fresca, no de caché.
      // timeout: 15000 da 15 segundos al GPS para encontrar satélites.
      const currentPos = await Geolocation.getCurrentPosition({ 
        enableHighAccuracy: true,
        maximumAge: 0, 
        timeout: 15000 
      });
      
      let closestNodeIndex = 0;
      let minDistance = Infinity;

      // Buscar el nodo más cercano
      for (let i = 0; i < route.steps.length; i++) {
        const step = route.steps[i];
        if (step.type === 'GPS' && step.latitude && step.longitude) {
          const dist = this.calculateDistance(
            currentPos.coords.latitude, currentPos.coords.longitude,
            step.latitude, step.longitude
          );
          if (dist < minDistance) {
            minDistance = dist;
            closestNodeIndex = i;
          }
        }
      }

      // FIX ZONA MUERTA: Usamos un radio de 10m en lugar de 15m para estar más seguros
      if (minDistance <= 15) {
        const nextNode = route.steps[closestNodeIndex + 1];
        
        // Si el punto cercano es la puerta, y lo que sigue es el Bluetooth:
        if (nextNode && nextNode.type === 'BLE') {
           await this.tts.speak(`Estás cerca de ${route.steps[closestNodeIndex].name}. Avanza unos pasos más hacia el interior para conectar con el radar.`);
        } else {
           await this.tts.speak(`Ya te encuentras en ${route.steps[closestNodeIndex].name}. Iniciando ruta desde aquí.`);
        }
        this.currentStepIndex = closestNodeIndex + 1;

      } else {
        await this.tts.speak(`Iniciando ruta. Dirígete hacia ${route.steps[closestNodeIndex].name}.`);
        this.currentStepIndex = closestNodeIndex;
      }

    } catch (e) {
      console.error("Error obteniendo ubicación inicial", e);
      // Si el GPS falla (Prueba 3), avisamos al usuario
      await this.tts.speak("Tengo problemas leyendo tu GPS. Asegúrate de estar a cielo abierto. Empezaremos desde el inicio de la ruta.");
      this.currentStepIndex = 0;
    }

    // Iniciar el motor
    this.executeCurrentStep();
}

  private async executeCurrentStep() {
    // Si no hay ruta o ya pasamos el último paso, terminamos
    if (!this.fullRoute || this.currentStepIndex >= this.fullRoute.steps.length) {
      await this.tts.speak("Has completado toda la ruta. Navegación finalizada.");
      this.stopNavigation(true);
      return;
    }

    // Obtenemos el nodo actual según el índice
    this.currentTargetNode = this.fullRoute.steps[this.currentStepIndex];
    this.minDistanceRecorded = Infinity; 
    this.lastAnnouncedDistance = -1;

    // Evaluamos qué tecnología necesita este nodo
    if (this.currentTargetNode.type === 'GPS') {
      this.currentNavState.next({tech: 'GPS', instruction: `Dirígete hacia ${this.currentTargetNode.name}`});
      this.startGpsNode();
    } 
    else if (this.currentTargetNode.type === 'BLE') {
      this.currentNavState.next({tech: 'BLUETOOTH', instruction: `Buscando señal de ${this.currentTargetNode.name}`});
      // Pasamos el control al BLE, y cuando termine, avanzará automáticamente
      this.bleService.startIndoorNavigation(this.currentTargetNode, async () => {
        this.currentStepIndex++;
        //setTimeout(() => {
          this.executeCurrentStep(); 
        //}, 4000); // Esperamos 4 seg para que termine de hablar antes de encender el siguiente
      });
    }
    else if (this.currentTargetNode.type === 'NFC') {
      // CORRECCIÓN CRÍTICA: Apagamos el Bluetooth ANTES de empezar con el NFC.
      await this.bleService.stopIndoorNavigation();
      this.currentNavState.next({tech: 'NFC', instruction: `Acércate al tag de ${this.currentTargetNode.name}`});
      this.nfcService.startNfcListener(this.currentTargetNode, async () => {
        this.currentNavState.next({
          tech: 'SUCCESS',
          instruction: `¡Excelente! Has llegado a ${this.currentTargetNode?.name}.`
        })
        // Cuando el usuario escanee la etiqueta correcta, se ejecuta esto:
        await this.tts.speak(`¡Excelente! Has llegado a ${this.currentTargetNode?.name}. Navegación completada con éxito.`);
        //this.stopNavigation(true);
      });
    }
  }

  private async startGpsNode() {
    if (!this.currentTargetNode || !this.currentTargetNode.latitude || !this.currentTargetNode.longitude) {
      this.tts.speak("Esta ruta no tiene coordenadas exteriores configuradas.");
      return;
    }

    // this.tts.speak(`Iniciando navegación. Dirígete hacia ${this.currentTargetNode.name}.`);

    // //Verificamos los permisos de GPS
    // const permission = await Geolocation.checkPermissions();
    // if (permission.location !== 'granted') { 
    //   const request = await Geolocation.requestPermissions();
    //   if (request.location !== 'granted') {
    //     this.tts.speak("No tengo permisos de ubicación. No puedo iniciar la ruta.");
    //     return;
    //   }
    // }

    //Aqui, no me convence la solucion pero hay que probarla
    //=================================================

    // const currentPosition = await Geolocation.getCurrentPosition({ enableHighAccuracy: true }); //Obtenemos la posición actual del usuario para comparar con la distancia al nodo GPS. Si ya está cerca, saltamos directo al BLE sin esperar a la primera actualización del watchPosition, lo que puede tardar unos segundos.
    
    // const initialDistance = this.calculateDistance(
    //   currentPosition.coords.latitude, currentPosition.coords.longitude,
    //   this.currentTargetNode!.latitude!, this.currentTargetNode!.longitude!
    // );

    // if (Math.round(initialDistance) <= 15) {
    //   this.tts.speak("Ya te encuentras en el edificio. Saltando navegación exterior.");
    //   this.currentStepIndex++;
    //   this.executeCurrentStep(); // Saltamos directo al BLE
    //   return; 
    // }

    //=================================================
    
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
  // private processNewPosition(position: Position) {
  //   if (!this.currentTargetNode || !this.currentTargetNode.latitude || !this.currentTargetNode.longitude) return;
    
  //   const distanceToTarget = this.calculateDistance(
  //     position.coords.latitude, position.coords.longitude,
  //     this.currentTargetNode.latitude, this.currentTargetNode.longitude
  //   );

  //   const roundedDistance = Math.round(distanceToTarget);
  //   console.log(`Distancia al objetivo: ${roundedDistance}m (Margen de error GPS: ${position.coords.accuracy}m)`);

  //   // Logica de proximidad con vibracion 
  //   if (roundedDistance <= 15) { 
  //     Haptics.vibrate({duration: 1500});
  //     this.tts.speak(`Estás en la zona de ${this.currentTargetNode.name}. Preparando sensores de interiores.`);
      
  //     // APAGAMOS SOLO EL GPS para el handover
  //     if (this.watchId) {
  //       Geolocation.clearWatch({ id: this.watchId });
  //       this.watchId = null;
  //     }

  //     // ¡EL HANDOVER! Avanzamos al siguiente paso del arreglo (ej. El BLE del pasillo)
  //     this.currentStepIndex++;
  //     setTimeout(() => {
  //       this.executeCurrentStep(); 
  //     }, 4000); 

  //   } else {
  //     if(roundedDistance <= 30) {
  //        if (this.lastAnnouncedDistance === -1 || Math.abs(this.lastAnnouncedDistance - roundedDistance) >= 5) { 
  //         this.lastAnnouncedDistance = roundedDistance;
  //         Haptics.impact({ style: ImpactStyle.Heavy});
  //         this.tts.speak(`Acercándote. A ${roundedDistance} metros de tu destino.`);
  //       }
  //     } else {
  //       if (this.lastAnnouncedDistance === -1 || Math.abs(this.lastAnnouncedDistance - roundedDistance) >= 10) {
  //         this.lastAnnouncedDistance = roundedDistance;
  //         Haptics.impact({ style: ImpactStyle.Medium });
  //         this.tts.speak(`A ${roundedDistance} metros.`);
  //       }
  //     }
  //   }
  // }

  // private processNewPosition(position: Position) {
  //   if (!this.currentTargetNode || !this.currentTargetNode.latitude || !this.currentTargetNode.longitude) return;
    
  //   const distanceToTarget = this.calculateDistance(
  //     position.coords.latitude, position.coords.longitude,
  //     this.currentTargetNode.latitude, this.currentTargetNode.longitude
  //   );

  //   const roundedDistance = Math.round(distanceToTarget);
  //   console.log(`Distancia al objetivo: ${roundedDistance}m (Margen de error GPS: ${position.coords.accuracy}m)`);

  //   // Logica de proximidad con vibracion 
  //   if (roundedDistance <= 15) { 
  //     Haptics.vibrate({duration: 1500});
  //     this.tts.speak(`Estás en la zona de ${this.currentTargetNode.name}. Preparando sensores de interiores.`);
      
  //     // APAGAMOS SOLO EL GPS para el handover
  //     if (this.watchId) {
  //       Geolocation.clearWatch({ id: this.watchId });
  //       this.watchId = null;
  //     }

  //     // ¡EL HANDOVER! Avanzamos al siguiente paso del arreglo (ej. El BLE del pasillo)
  //     this.currentStepIndex++;
  //     setTimeout(() => {
  //       this.executeCurrentStep(); 
  //     }, 4000); 

  //   } else {
      
  //     // --- LA ZONA DE SILENCIO (Solo hablamos si es MAYOR a 25) ---
      
  //     if (roundedDistance > 25 && roundedDistance <= 50) {
  //        // Aviso cada 5 metros
  //        if (this.lastAnnouncedDistance === -1 || Math.abs(this.lastAnnouncedDistance - roundedDistance) >= 5) { 
  //         this.lastAnnouncedDistance = roundedDistance;
  //         Haptics.impact({ style: ImpactStyle.Heavy});
  //         this.tts.speak(`Acercándote. A ${roundedDistance} metros de tu destino.`);
  //       }
  //     } 
  //     else if (roundedDistance > 50) {
  //       // Aviso cada 10 metros
  //       if (this.lastAnnouncedDistance === -1 || Math.abs(this.lastAnnouncedDistance - roundedDistance) >= 10) {
  //         this.lastAnnouncedDistance = roundedDistance;
  //         Haptics.impact({ style: ImpactStyle.Medium });
  //         this.tts.speak(`A ${roundedDistance} metros.`);
  //       }
  //     }
  //   }
  // }

  private async processNewPosition(position: Position) {
    if (!this.currentTargetNode || !this.currentTargetNode.latitude || !this.currentTargetNode.longitude) return;
    
    const distanceToTarget = this.calculateDistance(
      position.coords.latitude, position.coords.longitude,
      this.currentTargetNode.latitude, this.currentTargetNode.longitude
    );

    const roundedDistance = Math.round(distanceToTarget);
    console.log(`Distancia al objetivo: ${roundedDistance}m (Margen error GPS: ${Math.round(position.coords.accuracy)}m)`);

    // TRUCO DE GEOFENCING: Guardamos la distancia más corta a la que hemos estado
    if (roundedDistance < this.minDistanceRecorded) {
        this.minDistanceRecorded = roundedDistance;
    }

    // MAGIA DE ACCESIBILIDAD: Radios dinámicos
    const nextNode = this.fullRoute?.steps[this.currentStepIndex + 1];
    const isNextNodeBLE = nextNode && nextNode.type === 'BLE';
    
    // Si el siguiente nodo es Bluetooth (Puerta), exigimos estar a 10m de exactitud.
    // Si el siguiente es otro GPS (Punto intermedio en la calle), somos flexibles y perdonamos a los 20m.
    const successRadius = isNextNodeBLE ? 15 : 25;  // 10 y 20
    // Lógica inteligente: Si entró al radio, O si pasó de largo pero estuvo muy cerca
    const passedBy = (roundedDistance > this.minDistanceRecorded + 5) && (this.minDistanceRecorded <= successRadius + 10);

    if (roundedDistance <= successRadius || passedBy) { 
      Haptics.vibrate({duration: 1500});

      if (this.watchId) {
        Geolocation.clearWatch({ id: this.watchId });
        this.watchId = null;
      }
      
      if (isNextNodeBLE) {
         await this.tts.speak(`Llegaste a la entrada. Sigue avanzando lentamente mientras activo el radar.`);
      } else {
         await this.tts.speak(`Pasando por ${this.currentTargetNode.name}. ${this.currentTargetNode.ttsInstruction}`);
      }
      
      this.currentStepIndex++;
      //setTimeout(() => {
        this.executeCurrentStep(); 
      //}, 5000); // 5 seg para que termine de hablar antes del siguiente paso

    } else {
      // AVISOS PERIÓDICOS
      if (roundedDistance > successRadius && roundedDistance <= 40) {
         if (this.lastAnnouncedDistance === -1 || Math.abs(this.lastAnnouncedDistance - roundedDistance) >= 5) { 
          this.lastAnnouncedDistance = roundedDistance;
          Haptics.impact({ style: ImpactStyle.Heavy});
          this.tts.speak(`A ${roundedDistance} metros.`);
        }
      } 
      else if (roundedDistance > 40) {
        if (this.lastAnnouncedDistance === -1 || Math.abs(this.lastAnnouncedDistance - roundedDistance) >= 15) {
          this.lastAnnouncedDistance = roundedDistance;
          Haptics.impact({ style: ImpactStyle.Light});
          this.tts.speak(`A ${roundedDistance} metros de tu destino.`);
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

    this.currentStepIndex = 0;
    this.currentNavState.next({tech: 'CARGANDO', instruction: 'Calculando ruta...'});
    
    if (this.watchId) {
      await Geolocation.clearWatch({ id: this.watchId });
      this.watchId = null;
    }
    
    // También apagamos el BLE por si estaba encendido
    await this.bleService.stopIndoorNavigation();
    await this.nfcService.stopNfcListener();
    
    // liberamos la pantalla para ahorrar bateria
    await KeepAwake.allowSleep();
    console.log("GPS apagado.");
    
    if(!silent) {
      this.tts.speak("Navegacion detenida.");
    }
  }
}
