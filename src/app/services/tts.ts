import { Injectable } from '@angular/core';
import { TextToSpeech } from '@capacitor-community/text-to-speech'

@Injectable({
  providedIn: 'root',
})
export class Tts {

  constructor() {}
  
  async speak(textToSay: string){
    try {
      //Detenemos cualquier otro audio anterior para que no se sobrepongan
      await TextToSpeech.stop();
     //Reproducimos  el nuevo texto
     await TextToSpeech.speak({
       text: textToSay,
       lang: 'es-ES',  //Lenguaje español de España
       rate: 1.5,      //Velocidad normal de reproduccion
       pitch: 1.0,     //Tono de voz normal
       volume:1.0,  
       category: 'ambient'  //Permite que el audio se reproduzca incluso si el dispositivo esta en modo silencio
     })
    }catch (error) {
      console.error('Error al reproducir el texto:', error);
    }
  } 

  //Funcion para callar el audio de la app si el usuario hace otra accion
  async stop() {
    await TextToSpeech.stop();
  }
}
