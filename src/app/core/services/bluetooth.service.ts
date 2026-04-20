import { Injectable, numberAttribute } from '@angular/core';
import { BleClient, ScanResult } from '@capacitor-community/bluetooth-le';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Tts } from '../../services/tts';
import { NavNode } from '../models/node.model';


@Injectable({
  providedIn: 'root',
})
export class BluetoothService {

  private isScanning = false;
  private targetNode: NavNode | null = null;
  // Guardamos la ultima zona en la que estuvo el usuario para no repetir el mismo mensaje
  private lastAnnouncedZone: 'LEJOS' | 'CERCA' | 'INMEDIATO' | '' = '';

  //Variables para el filtro exponencial
  private filteredRssi: number | null = null;
  private readonly WEIGHT = 0.2  // 20% de peso al valor nuevo, 80% al historial

  // Funcion de aviso para el Handover (transicion)
  private onArrivalCallback: (() => void) | null = null;

  constructor(
    private tts: Tts
  ){}

  // onArrival como parametro para conectar con el motor principal
  async startIndoorNavigation(node: NavNode, onArrival: ()=> void) {
    this.targetNode = node;
    this.lastAnnouncedZone = '';
    this.filteredRssi = null; // Reiniciamos el filtro al iniciar la navegación
    this.onArrivalCallback = onArrival;

    try {
      // Despertamos la antena del bluetooth
      await BleClient.initialize();
      this.tts.speak(`Modo interiores activado. Buscando la señal de ${node.name}.`);
      this.isScanning = true;

      // Empezamos a escuchar continuamente
      await BleClient.requestLEScan({}, (result) => {
        this.processSignal(result);
      });
    } catch (error) {
      console.error('Error iniciando navegacion por Bluetooth', error);
      this.tts.speak("Error al iniciar el radar. Por favor, verifica que el Bluetooth esté encendido."); 
    }
  }

  // Procesamos cada señal recibida 
  private processSignal(result: ScanResult) {
    if (!this.targetNode || !this.targetNode.bleUuid) return;
    //==========================================================
      // // Extraemos el ID del dispositivo que acabamos de escuchar
      // const deviceId = result.device.deviceId;

      // // ¿Es el dispositivo que estamos buscando?
      // if (deviceId === this.targetNode.bleUuid) {
      //   const rssi = result.rssi; // La fuerza de la señal (ej: -65)
      //   if (rssi !== undefined) {
      //     this.evaluateDistance(rssi);
      //   } 
      // }
    //==========================================================
    if (result.device.deviceId === this.targetNode.bleUuid && result.rssi !== undefined) {
      this.applyExponentialFilter(result.rssi);
    }
  }

  private applyExponentialFilter(rawRssi: number) {
    if (this.filteredRssi === null) {
      this.filteredRssi = rawRssi; // Primera lectura, no hay historial
    } else {
      // y_n = w * x_n + (1-w) * y_{n-1}
      this.filteredRssi = (this.WEIGHT * rawRssi) + ((1 - this.WEIGHT) * this.filteredRssi);
    }
    // Evaluamos la distancia basandonos en la señal suavizada
    this.evaluateDistance(this.filteredRssi);
  }

  // LA LÓGICA DE ZONAS BASADA EN LA FUERZA DE LA SEÑAL (RSSI)
  // private evaluateDistance(rssi: number) {
  //   let currentZone: 'LEJOS' | 'CERCA' | 'INMEDIATO' = 'LEJOS';

  //   // Estos valores en negativo (dBm) son un estándar aproximado. 
  //   // Más adelante, en la facultad, los calibraremos con medidas exactas.
  //   if (rssi >= -55) {
  //     currentZone = 'INMEDIATO'; // A menos de 1 metro
  //   } else if (rssi >= -75) {
  //     currentZone = 'CERCA';     // Entre 1 y 4 metros
  //   } else {
  //     currentZone = 'LEJOS';     // A más de 4 metros
  //   }

  //   if (currentZone !== this.lastAnnouncedZone) {
  //     this.lastAnnouncedZone = currentZone;

  //     if (currentZone === 'LEJOS') {
  //       Haptics.impact({ style: ImpactStyle.Light });
  //       this.tts.speak("Señal detectada. Continúa avanzando.");
      
  //     } else if (currentZone === 'CERCA') {
  //       Haptics.impact({ style: ImpactStyle.Medium });
  //       this.tts.speak(`Te estás acercando a ${this.targetNode?.name}.`);
      
  //     } else if (currentZone === 'INMEDIATO') {
  //       Haptics.vibrate({ duration: 1500 });
  //       this.tts.speak(`Has llegado a ${this.targetNode?.name}. ${this.targetNode?.ttsInstruction}`);
        
  //       // ¡Llegó al punto! Apagamos el Bluetooth.
  //       this.stopIndoorNavigation();
  //     }
  //   }
  // }

  private evaluateDistance(rssi: number) {
    let currentZone: 'LEJOS' | 'CERCA' | 'INMEDIATO' = 'LEJOS';

    // AJUSTE PARA 1 METRO: Basado en las pruebas de la literatura científica
    if (rssi >= -60) {
      currentZone = 'INMEDIATO'; // <= 1 metro (Zona de búsqueda NFC)
    } else if (rssi >= -75) {
      currentZone = 'CERCA';     // Entre 1 y 4 metros
    } else {
      currentZone = 'LEJOS';     // A más de 4 metros
    }

    if (currentZone !== this.lastAnnouncedZone) {
      this.lastAnnouncedZone = currentZone;

      if (currentZone === 'LEJOS') {
        Haptics.impact({ style: ImpactStyle.Light });
        this.tts.speak("Señal detectada. Avanza por el pasillo.");
      
      } else if (currentZone === 'CERCA') {
        Haptics.impact({ style: ImpactStyle.Medium });
        this.tts.speak(`A unos pasos de ${this.targetNode?.name}. Acércate a la pared.`);
      
      } else if (currentZone === 'INMEDIATO') {
        Haptics.vibrate({ duration: 1500 });
        this.tts.speak(`Estás a un metro. ${this.targetNode?.ttsInstruction}`);
        
        // Apagamos el Bluetooth porque ya llegamos a la meta de esta etapa
        this.stopIndoorNavigation();
        
        // ¡EL HANDOVER! Le avisamos al NavigationService que pase a la siguiente fase (NFC)
        if (this.onArrivalCallback) {
          this.onArrivalCallback();
        }
      }
    }
  }

  // 4. APAGAR EL ESCÁNER DE FORMA SEGURA
  async stopIndoorNavigation() {
    if (this.isScanning) {
      await BleClient.stopLEScan();
      this.isScanning = false;
      this.targetNode = null;
      this.onArrivalCallback = null; 
      console.log("Escáner Bluetooth apagado para ahorrar batería.");
    }
  }


}
