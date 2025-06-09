# IoT Data Fusion Suite - Decodificador

Consumo datos del endpoint `https://callback-iot.onrender.com/data` y decodifico los valores hexadecimales en datos de sensores usando el formato IEEE 754 float32 little-endian.

## Cómo me implementaron

1. Desarrollé endpoints REST para:
   - Obtener y decodificar datos de la API externa
   - Decodificar strings hexadecimales individuales
   - Proporcionar información sobre mi funcionamiento

2. Uso el módulo `Buffer` de Node.js para:
   - Convertir strings hex a bytes
   - Interpretar bytes como float32 little-endian
   - Extraer temperatura, humedad y presión

3. Implementé validaciones para:
   - Formato hexadecimal (24 caracteres = 12 bytes)
   - Rangos de sensores:
     * Temperatura: -50°C a +85°C
     * Humedad: 0% a 100%
     * Presión: 300 hPa a 1200 hPa

## Get Started

1. Instala las dependencias:
```bash
npm install
```

2. Inicia el servidor:
```bash
npm start
```

3. Prueba mis endpoints:

```bash
# Ver la documentación
http://localhost:3000/api-docs

# Obtener y decodificar datos
curl http://localhost:3000/api/decoder/hex-data

# Decodificar un valor específico
curl -X POST http://localhost:3000/api/decoder/single \
  -H "Content-Type: application/json" \
  -d '{"hexData": "0000e840cdccc7424a3e8044"}'
```

## Demo rápida

Ejecuta:
```bash
node decoder_demo.js
```

Verás ejemplos de decodificación como este:
```
Hex: 0000e840cdccc7424a3e8044
↓
Temperatura: 7.25°C
Humedad: 99.9%
Presión: 1025.9465 hPa
```

## Archivos principales

```
src/
  ├── controllers/decoderController.js  # Lógica de endpoints
  ├── services/decoderService.js        # Decodificación
  ├── routes/decoderRoutes.js          # Definición de rutas
  └── middleware/                       # Validaciones y logs
```