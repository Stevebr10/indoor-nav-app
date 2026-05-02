import { Injectable } from '@angular/core';
import { Preferences } from '@capacitor/preferences';
import { Route } from '../models/route.model';

//const ROUTES_KEY = 'indoor_nav_routes';
const ROUTES_KEY = 'indoor_nav_routes_v4'; // Cambiamos la clave para evitar conflictos con datos anteriores

@Injectable({
  providedIn: 'root',
})
export class StorageService {

  constructor() {}

  // Obtener todas las rutas de la base de datos
  async getRoutes(): Promise<Route[]> {
    const { value } = await Preferences.get({ key: ROUTES_KEY });
    if (value) {
      return JSON.parse(value); 
    }
    return []; 
  }

  // Guardar o actulizar la llista completa de rutas
  async saveRoutes(routes: Route[]): Promise<void> {
    await Preferences.set({
      key: ROUTES_KEY,
      value: JSON.stringify(routes), // Convierte los objetos a texto para guardarlos
    });
  }

  // Agregar o actulizar una ruta especifica
  async saveRoute(newRoute: Route): Promise<void> {
    const routes = await this.getRoutes();
    const index = routes.findIndex(r => r.id === newRoute.id);
    
    if (index > -1) {
      routes[index] = newRoute; // Si ya existe, la actualiza 
    } else {
      routes.push(newRoute); // Si no existe, la agrega
    }
    
    await this.saveRoutes(routes);
  }

  // Inyeccion de datos de prueba
  // async initMockData(): Promise<void> {
  //   const routes = await this.getRoutes();
    
  //   // Solo inyectamos los datos si la base de datos está completamente vacía
  //   if (routes.length === 0) {
  //     const mockRoute: Route = {
  //       id: 'ruta-aula-105',
  //       name: 'Aula 105',
  //       category: 'aulas',
  //       description: 'Planta Baja, al fondo del pasillo',
  //       isActive: true,
  //       steps: [
  //         //Nodo 1
  //         { 
  //           id: 'n1', 
  //           name: 'Punto Intermedio', 
  //           type: 'GPS', 
  //           latitude: -0.2405978, 
  //           longitude: -78.4836265,
  //           description: 'Exterior', 
  //           icon: 'place', 
  //           ttsInstruction: 'Llegaste al punto intermedio. Continúa hacia la entrada del edificio.' 
  //         },
  //         //Nodo 2
  //         { 
  //           id: 'n2', 
  //           name: 'Entrada Principal - Punto de prueba exterior', 
  //           type: 'GPS', 
  //           latitude: -0.240344, 
  //           longitude: -78.483604,
  //           description: 'Exterior', 
  //           icon: 'domain', 
  //           ttsInstruction: 'Llegaste a la entrada. Preparando escáner de interiores.' 
  //         },
  //         { 
  //           id: 'n3', 
  //           name: 'Pasillo Central', 
  //           type: 'BLE', 
  //           bleUuid: 'FDA50693-A4E2-4FB1-AFCF-C6EB07647825', // Simulando el ID de un beacon real
  //           description: 'Interior', 
  //           icon: 'bluetooth', 
  //           ttsInstruction: 'Modo interior activo. Sigue recto por el pasillo central.' 
  //         },
  //         { 
  //           id: 'n4', 
  //           name: 'Puerta Destino', 
  //           type: 'NFC', 
  //           nfcPayload: 'aula-105', // Lo que leerá el celular al tocar la etiqueta
  //           description: 'Destino', 
  //           icon: 'nfc', 
  //           ttsInstruction: 'Has llegado a la zona. Busca la etiqueta táctil en el marco de la puerta.' 
  //         }
  //       ]
  //     };
  //     await this.saveRoute(mockRoute);
  //   }
  // }
  
  // async initMockData(): Promise<void> {
  //   const routes = await this.getRoutes();
    
    
  //   if (routes.length === 0) {
  //     const mockRoute: Route = {
  //       id: 'ruta-depa-1',
  //       name: 'Departamento Piso 1',
  //       category: 'departamentos',
  //       description: 'Prueba completa: GPS, Pasillo y Gradas',
  //       isActive: true,
  //       steps: [
  //         // NODO 1: GPS (Acercamiento)
  //         { 
  //           id: 'n1', 
  //           name: 'Punto Intermedio', 
  //           type: 'GPS', 
  //           latitude: -0.2405978, 
  //           longitude: -78.4836265,
  //           description: 'Exterior', 
  //           icon: 'place', 
  //           // INSTRUCCIÓN BASADA EN REFERENCIAS FÍSICAS
  //           ttsInstruction: 'Llegaste al punto intermedio. Ubica la pared a tu izquierda y avanza recto siguiendo la pared hacia la entrada principal.' 
  //         },
  //         // NODO 2: GPS (Handover al Bluetooth)
  //         { 
  //           id: 'n2', 
  //           name: 'Entrada Principal', 
  //           type: 'GPS', 
  //           latitude: -0.240344, 
  //           longitude: -78.483604,
  //           description: 'Exterior', 
  //           icon: 'domain', 
  //           // INSTRUCCIÓN BASADA EN REFERENCIAS FÍSICAS
  //           ttsInstruction: 'Llegaste a la entrada principal. Toca el marco de la puerta, ingresa y mantente a la izquierda del pasillo. Iniciando radar de interiores.' 
  //         },
  //         // NODO 3: BLE 1 (El Beacon del pasillo)
  //         { 
  //           id: 'n3', 
  //           name: 'Pasillo Central', 
  //           type: 'BLE', 
  //           // DATOS EXACTOS DEL PRIMER BEACON CONFIGURADO
  //           bleUuid: 'FDA50693-A4E2-4FB1-AFCF-C6EB07647825', 
  //           bleMajor: 10065,
  //           bleMinor: 26049,
  //           description: 'Interior', 
  //           icon: 'bluetooth', 
  //           // INSTRUCCIÓN BASADA EN REFERENCIAS FÍSICAS
  //           ttsInstruction: 'Modo interior activo. Avanza 7 metros usando la pared izquierda como guía hasta encontrar el inicio de las gradas.' 
  //         },
  //         // NODO 4: BLE 2 (El Beacon de las gradas/primer piso)
  //         { 
  //           id: 'n4', 
  //           name: 'Gradas al Primer Piso', 
  //           type: 'BLE', 
  //           // DATOS EXACTOS DEL SEGUNDO BEACON CONFIGURADO
  //           bleUuid: 'D546DF97-4757-47EF-BE09-3E2DCBDD0C77', 
  //           bleMajor: 9747,
  //           bleMinor: 29671,
  //           description: 'Interior', 
  //           icon: 'bluetooth', 
  //           ttsInstruction: 'Estás en el primer piso. La puerta del departamento está inmediatamente al frente tuyo.' 
  //         },
  //         // NODO 5: NFC (El Tag de la puerta final)
  //         { 
  //           id: 'n5', 
  //           name: 'Puerta Destino', 
  //           type: 'NFC', 
  //           nfcPayload: 'depa-1', 
  //           description: 'Destino', 
  //           icon: 'nfc', 
  //           ttsInstruction: 'Has llegado a la zona. Busca la etiqueta táctil en el marco derecho de la puerta y escanéala.' 
  //         }
  //       ]
  //     };
  //     await this.saveRoute(mockRoute);
  //   }
  // }

  async initMockData(): Promise<void> {
    const routes = await this.getRoutes();
    
    
    if (routes.length === 0) {
      const mockRoutes: Route[] = [
        {
          id: 'ruta-depa-1',
          name: 'Departamento Piso 1 (Gradas)',
          category: 'departamentos',
          description: 'Ruta con esquina exterior, pasillo y escaleras.',
          isActive: true,
          steps: [
            { 
              id: 'n1', 
              name: 'Punto Intermedio (Esquina)', 
              type: 'GPS', 
              latitude: -0.2405978, 
              longitude: -78.4836265,
              description: 'Exterior', 
              icon: 'place', 
              // O&M: Giros y referencia táctil
              ttsInstruction: 'Estás en la esquina. Gira a tu izquierda, usa la pared derecha como guía y avanza hasta la entrada del edificio.' 
            },
            { 
              id: 'n2', 
              name: 'Entrada Principal', 
              type: 'GPS', 
              latitude: -0.240344, 
              longitude: -78.483604,
              description: 'Exterior', 
              icon: 'domain', 
              // O&M: Orientación de entrada
              ttsInstruction: 'Llegaste a la entrada principal. Ingresa al edificio. Camina 5 metros recto por el pasillo central.' 
            },
            { 
              id: 'n3', 
              name: 'Inicio de Gradas', 
              type: 'BLE', 
              bleUuid: 'FDA50693-A4E2-4FB1-AFCF-C6EB07647825', 
              bleMajor: 10065,
              bleMinor: 26049,
              description: 'Interior', 
              icon: 'stairs', 
              // O&M: Acción específica de seguridad (pasamanos)
              ttsInstruction: 'Atención. Estás frente a las gradas. Sujétate del pasamanos y comienza a subir al primer piso.' 
            },
            { 
              id: 'n4', 
              name: 'Descanso de las gradas', 
              type: 'BLE', 
              bleUuid: 'D546DF97-4757-47EF-BE09-3E2DCBDD0C77', 
              bleMajor: 9747,
              bleMinor: 29671,
              description: 'Interior', 
              icon: 'bluetooth', 
              // O&M: Orientación espacial de llegada
              ttsInstruction: 'Estás a la mitad de las gradas. Sigue subiendo. Al terminar, la ventana estará a tu izquierda y la puerta a tu derecha.' 
            },
            { 
              id: 'n5', 
              name: 'Puerta Destino', 
              type: 'NFC', 
              nfcPayload: 'depa-1', 
              description: 'Destino', 
              icon: 'nfc', 
              ttsInstruction: 'Llegaste a la puerta. Busca la etiqueta táctil en el marco derecho de la puerta y acerca tu celular.' 
            }
          ]
        },
        // AGREGAMOS UNA SEGUNDA RUTA DE EJEMPLO
        {
          id: 'ruta-oficina-102',
          name: 'Oficina Administrativa',
          category: 'departamentos', // O puedes cambiar la categoría
          description: 'Ruta recta por planta baja.',
          isActive: true,
          steps: [
            { 
              id: 'of1', 
              name: 'Entrada Principal', 
              type: 'GPS', 
              latitude: -0.240344, 
              longitude: -78.483604,
              description: 'Exterior', 
              icon: 'domain', 
              ttsInstruction: 'Llegaste a la entrada. Ingresa y mantente pegado a la pared izquierda.' 
            },
            { 
              id: 'of2', 
              name: 'Puerta Oficina', 
              type: 'NFC', 
              nfcPayload: 'oficina-102', 
              description: 'Destino', 
              icon: 'nfc', 
              ttsInstruction: 'La oficina está aquí. Escanea el marco izquierdo.' 
            }
          ]
        }
      ];
      await this.saveRoutes(mockRoutes);
    }
  }

}
