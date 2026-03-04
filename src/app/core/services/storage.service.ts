import { Injectable } from '@angular/core';
import { Preferences } from '@capacitor/preferences';
import { Route } from '../models/route.model';

const ROUTES_KEY = 'indoor_nav_routes';

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
  async initMockData(): Promise<void> {
    const routes = await this.getRoutes();
    
    // Solo inyectamos los datos si la base de datos está completamente vacía
    if (routes.length === 0) {
      const mockRoute: Route = {
        id: 'ruta-aula-105',
        name: 'Aula 105',
        category: 'aulas',
        description: 'Planta Baja, al fondo del pasillo',
        isActive: true,
        steps: [
          { 
            id: 'n1', 
            name: 'Entrada Principal', 
            type: 'GPS', 
            description: 'Exterior', 
            icon: 'satellite_alt', 
            ttsInstruction: 'Estás en la entrada principal del edificio. Cambiando a sensores internos.' 
          },
          { 
            id: 'n2', 
            name: 'Pasillo Central', 
            type: 'BLE', 
            bleUuid: '1234-5678', // Simulando el ID de un beacon real
            description: 'Interior', 
            icon: 'bluetooth', 
            ttsInstruction: 'Modo interior activo. Sigue recto por el pasillo central.' 
          },
          { 
            id: 'n3', 
            name: 'Puerta Aula 105', 
            type: 'NFC', 
            nfcPayload: 'aula-105', // Lo que leerá el celular al tocar la etiqueta
            description: 'Destino', 
            icon: 'nfc', 
            ttsInstruction: 'Has llegado a la zona. Busca la etiqueta táctil en el marco de la puerta.' 
          }
        ]
      };
      await this.saveRoute(mockRoute);
    }
  }

}
