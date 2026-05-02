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
      // CORRECCIÓN MAGISTRAL: Solo prendemos el escáner si estaba apagado.
      // Si venimos de un Beacon anterior, ya está prendido, solo cambiamos el targetNode.
      if (!this.isScanning){
        // Despertamos la antena del bluetooth
        await BleClient.initialize();
        this.tts.speak(`Activando Modo interior. Buscando la señal de ${node.name}.`);
        this.isScanning = true;

        // CORRECCIÓN 1: Exigir a Android que reporte continuamente (OBLIGATORIO)
        // Empezamos a escuchar continuamente
        await BleClient.requestLEScan({allowDuplicates: true}, (result) => {
          this.processSignal(result);
        });
      }
      
    } catch (error) {
      console.error('Error iniciando navegacion por Bluetooth', error);
      this.tts.speak("Error al iniciar el radar. Por favor, verifica que el Bluetooth esté encendido."); 
    }
  }

  // Procesamos cada señal recibida 
  // private processSignal(result: ScanResult) {
  //   if (!this.targetNode || !this.targetNode.bleUuid) return;
  //   //==========================================================
  //     // // Extraemos el ID del dispositivo que acabamos de escuchar
  //     // const deviceId = result.device.deviceId;

  //     // // ¿Es el dispositivo que estamos buscando?
  //     // if (deviceId === this.targetNode.bleUuid) {
  //     //   const rssi = result.rssi; // La fuerza de la señal (ej: -65)
  //     //   if (rssi !== undefined) {
  //     //     this.evaluateDistance(rssi);
  //     //   } 
  //     // }
  //   //==========================================================
  //   if (result.device.deviceId === this.targetNode.bleUuid && result.rssi !== undefined) {
  //     this.applyExponentialFilter(result.rssi);
  //   }
  // }

  private processSignal(result: ScanResult) {
    if (!this.targetNode || !this.targetNode.bleUuid) return;

    // 1. Buscamos específicamente los datos de fabricante de Apple (Código 76)
    // Capacitor a veces lo pasa como string "76" o como número 76.
    const appleData = result.manufacturerData?.["76"] || result.manufacturerData?.[76];
    if (!appleData) return;

    // 2. Convertimos a un arreglo de bytes manipulable
    const bytes = new Uint8Array(appleData.buffer, appleData.byteOffset, appleData.byteLength);

    // 3. VALIDACIÓN ESTRICTA iBEACON: 
    // Siempre empieza con 0x02 (tipo iBeacon) y 0x15 (Longitud de 21 bytes restantes)
    // El arreglo debe tener al menos 23 bytes en total.
    if (bytes.length >= 23 && bytes[0] === 0x02 && bytes[1] === 0x15) {
      
      // 4. Extraemos el UUID del Beacon (Bytes 2 al 17)
      let uuid = '';
      for (let i = 2; i <= 17; i++) {
        uuid += bytes[i].toString(16).padStart(2, '0');
      }
      uuid = uuid.toUpperCase();
      
      // Limpiamos el UUID de nuestra base de datos para compararlo (ej. quitamos guiones)
      const targetUuid = this.targetNode.bleUuid.replace(/-/g, '').toUpperCase();

      // 5. Extraemos el Major y el Minor (Operaciones a nivel de bits - Big Endian)
      // Major está en los bytes 18 y 19
      const major = (bytes[18] << 8) | bytes[19];
      // Minor está en los bytes 20 y 21
      const minor = (bytes[20] << 8) | bytes[21];

      // 6. Evaluamos si es nuestro Beacon exacto
      const isCorrectUuid = uuid === targetUuid;
      const isCorrectMajor = this.targetNode.bleMajor === undefined || this.targetNode.bleMajor === major;
      const isCorrectMinor = this.targetNode.bleMinor === undefined || this.targetNode.bleMinor === minor;

      if (isCorrectUuid && isCorrectMajor && isCorrectMinor && result.rssi !== undefined) {
        // ¡Lo encontramos! Pasamos la señal a nuestra fórmula matemática
        this.applyExponentialFilter(result.rssi);
      }
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

  private async evaluateDistance(rssi: number) {
    let currentZone: 'LEJOS' | 'CERCA' | 'INMEDIATO' = 'LEJOS';

    // AJUSTE PARA 1 METRO: Basado en las pruebas de la literatura científica
    if (rssi >= -72) { // cambios de -60 a -72. Esto amplia la meta a unos 3 o 4 metros
      currentZone = 'INMEDIATO'; // <= 1 metro (Zona de búsqueda NFC)
    } else if (rssi >= -85) {  // cambio de -75 a -85
      currentZone = 'CERCA';     // Entre 1 y 4 metros
    } else {
      currentZone = 'LEJOS';     // A más de 4 metros
    }

    if (currentZone !== this.lastAnnouncedZone) {
      this.lastAnnouncedZone = currentZone;

      if (currentZone === 'LEJOS') {
        Haptics.impact({ style: ImpactStyle.Light });
        this.tts.speak("Señal detectada. Avanza por el pasillo.");
        //this.tts.speak("Señal débil. Sigue avanzando por el pasillo.");
      
      } else if (currentZone === 'CERCA') {
        Haptics.impact({ style: ImpactStyle.Medium });
        //this.tts.speak(`A unos pasos de ${this.targetNode?.name}. Acércate a la pared.`);
        this.tts.speak(`Acercándose a ${this.targetNode?.name}.`);
      
      } else if (currentZone === 'INMEDIATO') {
        Haptics.vibrate({ duration: 1500 });

        // 1. Guardamos la instrucción y el callback temporalmente
        const finalInstruction = this.targetNode?.ttsInstruction;
        const callback = this.onArrivalCallback;
        // 2. Anulamos el objetivo actual para que el celular no siga 
        // escaneando ni gritando "Llegaste" mientras la voz está hablando.
        this.targetNode = null;
        this.onArrivalCallback = null;
        // 3. Esperamos a que la voz TERMINE de hablar (Evita que se corte)
        await this.tts.speak(`${finalInstruction}`);
        //this.tts.speak(`${this.targetNode?.ttsInstruction}`);
        //this.tts.speak(`Estás a un metro. ${this.targetNode?.ttsInstruction}`);
        
        // Apagamos el Bluetooth porque ya llegamos a la meta de esta etapa
        //await this.stopIndoorNavigation();
        
        // ¡EL HANDOVER! Le avisamos al NavigationService que pase a la siguiente fase (NFC)
        // if (this.onArrivalCallback) {
        //   this.onArrivalCallback(); 
        // }

        // 4. Pasamos al siguiente paso de la ruta
        if (callback) {
          callback(); 
        }
      }
    }
  }

  // 4. APAGAR EL ESCÁNER DE FORMA SEGURA
  async stopIndoorNavigation() {
    if (this.isScanning) {
      try { await BleClient.stopLEScan(); } catch(e){}
      this.isScanning = false;
      this.targetNode = null;
      this.onArrivalCallback = null; 
      console.log("Escáner Bluetooth apagado para ahorrar batería.");
    }
  }


}
