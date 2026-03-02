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

# Flujo (GitFlow Estándar)
Hacer una rama desde main -> PR a develop -> PR a main
Otra Opcion: El estándar correcto de la industria es: Hacer la rama desde develop -> PR a develop -> PR de develop a main.

## Paso1: Guardar tus cambios actuales en develop
   # 1. Ver los archivos modificados (para asegurarnos)
   git status

   # 2. Agregar todos los cambios al "carrito"
   git add .

   # 3. Ponerle una etiqueta descriptiva (Commit)
   git commit -m "refactor: arquitectura inicial, ruteo y servicio TTS nativo"

   # 4. Subir los cambios a GitHub en la rama develop
   git push origin develop

## Paso 2: Tu primer Pull Request a Producción (main)

   1. Ve a tu repositorio en GitHub desde el navegador.
   2. Verás un botón verde grande o un mensaje amarillo que dice "Compare & pull request" (porque detectó que subiste cosas a develop). Haz clic ahí.
   3. Asegúrate de que en la flecha de dirección diga: base: main  <--  compare: develop.
   4. Ponle un título, como "Release: V1.0 Arquitectura Base y TTS".
   5. Haz clic en "Create pull request".
   6. Luego, haz clic en "Merge pull request" y confirma.

## Paso 3: Tu Flujo de Trabajo Oficial de ahora en adelante
   1. Preparar y crear la rama (En VS Code):
   git checkout develop           # Siempre sitúate en develop primero
   git pull origin develop        # Descarga lo último de la nube por si acaso
   git checkout -b feat/nfc-reader # Crea una nueva rama para tu tarea específica

   2. Trabajar y Subir (En VS Code):
   Escribes tu código, lo pruebas en tu celular, y cuando esté listo:
   git add .
   git commit -m "feat: modulo de lectura nfc agregado"
   git push origin feat/nfc-reader

   3. Probar y Aprobar (En GitHub)
   Abres un PR de feat/nfc-reader hacia develop.
   Lo apruebas y lo unes (Merge).
   Aquí es donde tu servidor de pruebas (si configuras uno más adelante) compilaría la app automáticamente.
   
   4. Lanzamiento a Producción (En GitHub):
   Cuando tengas varias funcionalidades en develop y sepas que todo en conjunto funciona perfecto en los pasillos de tu facultad, abres un PR general de develop hacia main para tu entrega oficial.