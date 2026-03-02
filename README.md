# Indoor Nav App 📍🚶‍♂️

Proyecto de integración curricular para el desarrollo de una aplicación móvil de navegación interior asistida para personas con discapacidad visual, utilizando tecnologías de proximidad (NFC, BLE) y posicionamiento dinámico.

## 🚀 Tecnologías Principales
* **Framework:** [Angular](https://angular.io/) (v17+)
* **Mobile Runtime:** [Capacitor](https://capacitorjs.com/)
* **Estilos:** [Tailwind CSS](https://tailwindcss.com/)
* **Metodología:** iPlus + Scrum

---

## 🛠️ Configuración del Entorno

### Requisitos Previos
Asegúrate de tener instalado:
* **Node.js** (Versión LTS recomendada)
* **Angular CLI:** `npm install -g @angular/cli`
* **Ionic CLI** (Opcional, para facilitar comandos de Capacitor): `npm install -g @ionic/cli`

### Instalación y Primeros Pasos
1. **Clonar el repositorio:**
   ```bash
   git clone [https://github.com/tu-usuario/indoor-nav-app.git](https://github.com/tu-usuario/indoor-nav-app.git)
   cd indoor-nav-app

2. Instalar dependencias:
npm install

3. Levantar el servidor de desarrollo (Web):
ng serve
Accede a http://localhost:4200 en tu navegador.

🌿 Estrategia de Ramas (GitFlow Simplificado)
Para mantener la integridad del código, seguimos este flujo de trabajo:

* **main:** Rama de producción. Solo contiene código estable y funcional (versiones entregables para la defensa).
* **develop:** Rama de desarrollo activo. Aquí es donde se integran las nuevas funcionalidades, estilos y pruebas de hardware.

## Comandos de Flujo Diario
1. Empezar a trabajar:
Siempre asegúrate de estar en develop antes de escribir código.
git checkout develop

2. Guardar avances (Commits):
Utilizamos mensajes descriptivos para el respaldo.
git add .
git commit -m "feat: descripción corta del cambio"
git push origin develop

3. Pasar a Producción (Merge a Main):
Solo cuando una funcionalidad esté 100% probada y estable.
git checkout main
git merge develop
git push origin main
git checkout develop

## 📱 Despliegue en Dispositivos (Capacitor)
Para probar funciones de hardware como NFC o Bluetooth Beacons:
Construir el proyecto web:
ng build
Sincronizar con plataformas nativas:
npx cap sync
Abrir en Android Studio / Xcode:
npx cap open android  ó npx cap open ios

## 📌 Notas del Proyecto
Hardware: Las pruebas se realizan con Beacons BLE y Tags NFC en los pasillos de la facultad.
Estado Actual: Configuración inicial de arquitectura y estilos base.