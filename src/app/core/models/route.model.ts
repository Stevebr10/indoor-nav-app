// Aqui se definen la lista ordenada de nodos es decir el grafo que conecta el punto inicla con el final

import { NavNode } from './node.model';

export interface Route {
    id: string;            // Identificador unico de la ruta
    name: string;  
    category: string;     //Categoria para el menu
    description: string;   //Detalles adicionales de la ruta
    isActive: boolean;     //Para que el admin pueda activar o desactivar la ruta sin eliminarla
    steps: NavNode[];      //Lista ordenada de nodos que forman la ruta

}