# Servidor push de Mi Motivación 6.0

**No subas esta carpeta a GitHub Pages como parte de la aplicación pública.** Este servidor debe ejecutarse por separado en un alojamiento Node.js **siempre activo**, con HTTPS y almacenamiento persistente.

## Preparación

1. En un equipo con Node.js 20 o superior, abre esta carpeta y ejecuta `npm install`.
2. Genera las claves VAPID con `npx web-push generate-vapid-keys`. Guarda **la clave privada únicamente en el servidor**.
3. Configura las variables de entorno: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_EMAIL=mailto:tu-correo@example.com`, `PAIRING_CODE` (código largo y secreto), `ALLOWED_ORIGIN=https://andresf300-cyber.github.io`, `DATA_FILE=/ruta/persistente/subscriptions.json` y `PORT` si hace falta.
4. Ejecuta `npm start` o despliega este proyecto en un proveedor Node.js con proceso permanente y disco persistente. **Un servicio que se duerma no garantiza los envíos de media hora.**
5. Verifica `https://tu-servidor/health`.
6. En el iPhone abre **Mi Motivación instalada en la pantalla de inicio** > Ajustes > Notificaciones con la app cerrada. Introduce URL y código y pulsa Conectar.
7. Acepta los permisos de iOS y pulsa Enviar prueba desde el servidor.

El servidor usa la zona horaria **America/Bogota** y alterna español/italiano. Para mayor fiabilidad y privacidad, este ejemplo es para **uso personal de prueba**, no para producción multiusuario. No publiques `PAIRING_CODE` ni las claves privadas. Protege el acceso al servidor y haz copia del archivo de suscripciones. Si se pierde el archivo de suscripciones, tendrás que volver a vincular el iPhone.

El servidor es un proyecto de referencia: requiere despliegue y configuración por tu parte; subir solamente los archivos de la web a GitHub Pages **no activa** push.
