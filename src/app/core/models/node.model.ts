//Definicion de un nodel GPS -BLE - NFC

export type NodeType = 'GPS' | 'BLE' | 'NFC' | 'HANDOVER' | 'SUCCESS';

export interface NavNode {
    id: string;            // Identificador unico del nodo
    name: string;          // Nombre del nodo
    type: NodeType;          // Tipo del nodo o la tencologia que dispara este nodo
    
    // Metadatos opciones dependiendo del tipo del nodo
    latitude?: number;      // Solo para nodos del GPS
    longitude?: number;     // Solo para nodos del gps
    bleUuid?: string;       // Identificador unico del Beacon
    nfcPayload?: string;    // El texto que tendra grabada el nodo NFC 

    // Interfaz y acccesibilidad
    description: string;     // Texto de apoyo visual 
    icon: string;            // Nombre del icono del material symbols 
    ttsInstruction: string;  // El texto exacto que el motor de voz leerá al llegar aquí
}