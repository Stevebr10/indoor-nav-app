import { Injectable } from '@angular/core';
import { CapacitorNfc } from '@capgo/capacitor-nfc'; 
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Tts } from '../../services/tts';
import { NavNode } from '../models/node.model';

@Injectable({
  providedIn: 'root',
})
export class NfcService {
  private isListening = false;
  private targetNode: NavNode | null = null;
  private onArrivalCallback: (() => void) | null = null;
  private nfcListenerHandle: any = null;

  constructor(
    private tts: Tts
  ) {

  }

  async startNfcListener(node: NavNode, onArrival: () => void) {
    this.targetNode = node;
    this.onArrivalCallback = onArrival;
    this.isListening = true;

    try {
      this.tts.speak(node.ttsInstruction || "Escanea la etiqueta NFC con la parte tracera de tu dispositivo");
      this.nfcListenerHandle = await CapacitorNfc.addListener('nfcEvent', (event) => {
        if (this.isListening) {
          this.processTag(event);
        }
      });
      //Activar el escaner del celular 
      await CapacitorNfc.startScanning({
        invalidateAfterFirstRead: false, // No invalidamos después de la primera lectura para permitir múltiples escaneos
        alertMessage: 'Acerca el telefono a la etiqueta de la puerta'
      });

    } catch (error) {
      console.error("Error iniciando NFC:", error);
      this.tts.speak("Error al iniciar el lector NFC. Por favor, verifica que el NFC esté activado y que tu dispositivo sea compatible.");
    }
  }

  private processTag(event: any) {
    const payloadString = JSON.stringify(event).toLowerCase();
    const targetPayload = this.targetNode?.nfcPayload?.toLowerCase() || '';

    if (targetPayload && payloadString.includes(targetPayload)) {
      //EL EXITO
      Haptics.vibrate({duration: 2000});
      this.tts.speak("Destino confirmado. Has llegado a tu destino");

      this.stopNfcListener();

      if (this.onArrivalCallback) {
        this.onArrivalCallback();
      }
    } else {
      // Si toca otra etiqueta, damos feedback de error
      Haptics.impact({style: ImpactStyle.Heavy});
      this.tts.speak("Esta etiqueta no corresponde a tu destino. Sigue explorando el pasillo.")
    }
  }

  async stopNfcListener () {
    this.isListening = false;
    // Apagamos la antena
    try {
      await CapacitorNfc.stopScanning();

    } catch (error) {
      console.log("El escáner NFC ya estaba detenido o no requería apagado manual.")
    }

    if (this.nfcListenerHandle) {
      this.nfcListenerHandle.remove();
      this.nfcListenerHandle = null;
    }

    this.targetNode = null;
    this.onArrivalCallback = null;
    console.log("Lector NFC apagado para ahorrar batería.")
  }

}
