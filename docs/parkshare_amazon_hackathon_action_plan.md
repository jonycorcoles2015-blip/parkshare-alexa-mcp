# ParkShare Amazon Hackathon - Action Plan

Fecha: 2026-10-02

## Situacion

ParkShare v189 sigue en revision de Google Play. No conviene enviar la candidatura final hasta saber si Google la aprueba o marca otro problema, pero si conviene dejar preparada la parte de hackathon.

## Punto clave

Amazon no pide una app movil generica. El hackathon exige una pista principal: Fire TV, Alexa+, Bee o Ring.

La opcion mas fuerte para ParkShare es Alexa+ usando un MCP server real. La experiencia simulada web queda como respaldo visual para explicar el flujo en el video.

## Plan recomendado

1. Mantener v189 esperando revision.
2. Preparar un MCP server real llamado `parkshare-alexa-mcp-server`.
3. Exponer herramientas reales de ParkShare para Alexa+:
   - `find_nearby_place`;
   - `find_parking_near_destination`;
   - `get_road_alerts`;
   - `release_parking_spot`;
   - `confirm_previous_spot_free`.
4. Usar la demo web llamada "ParkShare Alexa+ Driving Copilot Simulator" como apoyo visual:
   - buscar parking cerca del destino;
   - buscar supermercados/farmacias/restaurantes desde ubicacion actual;
   - consultar radares, controles, accidentes y retenciones;
   - preguntar si se ha dejado libre la plaza antes de iniciar otra ruta.
5. Preparar repo GitHub con codigo, README, smoke test y licencia.
6. Grabar video demo en ingles de menos de 3 minutos.
7. Cuando v189 este aprobada, anadir capturas/enlace de la app movil y enviar.

## Lo que NO hay que hacer

- No presentar ParkShare como si fuera una integracion publicada en Alexa+ si solo tenemos MCP local/no conectado a herramientas Amazon finales.
- No presentar el simulador web como implementacion principal.
- No marcar AWS Builder si no hay una integracion AWS real en codigo.
- No marcar Nebius/NVIDIA si no usamos su tecnologia exigida.
- No esperar sin preparar nada: el plazo de Amazon termina el 23 de octubre de 2026.

## Texto corto para explicar la espera

ParkShare is currently under Google Play review for its latest Android build. While that review is pending, the hackathon submission focuses on a new Alexa+ MCP server built during the hackathon window, using the mobile app as the product context.

## Checklist del usuario

- Avisar cuando Google Play cambie el estado de v189.
- Entrar en Devpost y confirmar que la cuenta funciona.
- Decidir si el repositorio MCP sera publico o privado.
- Confirmar si se puede subir el video a YouTube o Vimeo.
- Cuando la app este disponible, grabar 20-30 segundos de la app real funcionando.

## Checklist de Codex

- Preparar el texto final de Devpost.
- Preparar el guion del video.
- Preparar la estructura del repo MCP/demo.
- Revisar que la candidatura no prometa funciones que no se muestran.
- Preparar una version final lista para copiar en Devpost.
