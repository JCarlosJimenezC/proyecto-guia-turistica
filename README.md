# Guía Turística Multimedia de Costa Rica

> Proyecto Final del curso **IF7102 – Multimedios** · I Ciclo 2026
> Universidad de Costa Rica · Sede Regional de Guanacaste · Recinto de Liberia
> Carrera de Informática Empresarial · **Grupo #1**

Aplicación web interactiva que permite explorar destinos turísticos de Costa Rica
a través de un mapa cantonal navegable, contenido multimedia (audio, video,
galería de imágenes) y datos cargados dinámicamente desde archivos JSON.
Construida íntegramente con **Web Components nativos** (Custom Elements,
Shadow DOM, HTML Templates y ES Modules), sin frameworks ni librerías externas.

---

## Tabla de contenidos

1. [Vista previa](#vista-previa)
2. [Tecnologías](#tecnologías)
3. [Estructura del proyecto](#estructura-del-proyecto)
4. [Setup inicial desde cero](#setup-inicial-desde-cero)
5. [Cómo ejecutar el proyecto](#cómo-ejecutar-el-proyecto)
6. [Despliegue en GitHub Pages](#despliegue-en-github-pages)
7. [Decisiones técnicas (el porqué de cada herramienta)](#decisiones-técnicas-el-porqué-de-cada-herramienta)
8. [Custom Elements implementados](#custom-elements-implementados)
9. [Flujo de datos y eventos](#flujo-de-datos-y-eventos)
10. [Datos: estructura de los JSON](#datos-estructura-de-los-json)
11. [Equipo de trabajo (Grupo #1)](#equipo-de-trabajo-grupo-1)
12. [Créditos multimedia](#créditos-multimedia)

---

## Vista previa

La aplicación se compone de tres vistas que se intercambian dinámicamente:

| Vista | Descripción |
|---|---|
| **Mapa** | Mapa SVG de Costa Rica con los 84 cantones agrupados por las 6 regiones socioeconómicas (MIDEPLAN). Hover/click para resaltar regiones; al seleccionar una se hace zoom y aparecen puntos animados con los destinos de esa región. |
| **Listado** | Cuadrícula de tarjetas (`<destino-card>`) con los destinos filtrados por la región activa. |
| **Detalle** | Vista completa de un destino con galería navegable, descripción, lista de actividades y reproductor de audio nativo. |

---

## Tecnologías

Únicamente APIs nativas del navegador:

- **HTML5** + **CSS3** + **JavaScript ES6+** (módulos)
- **Web Components**: Custom Elements v1, Shadow DOM v1, HTML Templates
- **APIs multimedia nativas**: `<audio>`, `<video>`, `HTMLMediaElement`
- **Fetch API** para la carga dinámica de los JSON
- **SVG** inline para el mapa (con animaciones SMIL nativas)

> No se utilizan frameworks ni librerías externas. La única dependencia de
> desarrollo (`servor`) sirve únicamente para levantar un servidor local
> con auto-reload durante el desarrollo.

---

## Estructura del proyecto

```
proyecto-guia-turistica/
├── src/
│   ├── index.html                    ← Punto de entrada, importa los módulos
│   ├── modules/
│   │   └── app.js                    ← Orquestación de vistas y eventos
│   ├── data/
│   │   ├── destinos.json             ← Catálogo de destinos turísticos
│   │   └── mapa.json                 ← Configuración de regiones y cantones
│   ├── components/                   ← Un archivo .js por Custom Element
│   │   ├── app-header.js
│   │   ├── mapa-interactivo.js
│   │   ├── destino-card.js
│   │   ├── destino-detalle.js
│   │   ├── galeria-imagenes.js
│   │   └── audio-guia.js
│   ├── assets/
│   │   ├── img/                      ← Imágenes de destinos + Cantones_de_Costa_Rica.svg
│   │   ├── audio/                    ← Audio guías por destino
│   │   └── video/                    ← Videos por destino
│   └── css/
│       └── global.css                ← Reset, fuentes y variables CSS
├── docs/                             ← Documentación técnica (PDF, diagramas)
├── CREDITOS.md                       ← Fuentes y licencias de recursos multimedia
├── README.md                         ← Este archivo
├── package.json                      ← Solo para servidor de desarrollo
└── .gitignore
```

---

## Setup inicial desde cero

Esta sección documenta los comandos exactos que se utilizaron para crear el
proyecto desde cero. **Si solo querés correr la aplicación, podés saltar
directamente a la sección [Cómo ejecutar el proyecto](#cómo-ejecutar-el-proyecto).**
Esta sección sirve como referencia histórica del setup y para que cualquier
miembro del equipo pueda replicar el entorno en una máquina nueva.

### 1. Prerrequisitos del sistema

```bash
# Node.js LTS (incluye npm)
# Descargar desde https://nodejs.org

# Habilitar Corepack (necesario para usar pnpm sin instalación global)
corepack enable

# Activar la versión específica de pnpm que usa el proyecto
corepack prepare pnpm@10.32.1 --activate

# Verificar instalación
node -v        # debería mostrar v18+ o superior
pnpm -v        # debería mostrar 10.32.1
```

### 2. Inicialización del repositorio y del proyecto

```bash
# Crear la carpeta y entrar
mkdir proyecto-guia-turistica
cd proyecto-guia-turistica

# Inicializar Git
git init

# Inicializar package.json (acepta los defaults o configurá según preferencia)
pnpm init
```

### 3. Instalación de dependencias de desarrollo

```bash
# servor: servidor estático con auto-reload (para servir los ES Modules)
pnpm add -D servor

# gh-pages: utilidad para desplegar la carpeta src/ a GitHub Pages
pnpm add -D gh-pages
```

### 4. Configuración de scripts en `package.json`

El archivo `package.json` quedó configurado así:

```json
{
  "name": "proyecto-guia-turistica",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev":    "pnpx servor src/ index.html 1234 --reload",
    "build":  "echo 'Build script'",
    "deploy": "gh-pages -d src"
  },
  "packageManager": "pnpm@10.32.1",
  "devDependencies": {
    "gh-pages": "^6.3.0",
    "servor":   "^4.0.2"
  }
}
```

Significado de cada script:

| Script | Comando real | Para qué sirve |
|---|---|---|
| `pnpm run dev` | `pnpx servor src/ index.html 1234 --reload` | Levanta el servidor local de desarrollo apuntando a la carpeta `src/`, con `index.html` como entrada y recarga automática del navegador al guardar cambios. |
| `pnpm run build` | _no aplica_ | Placeholder. El proyecto no requiere paso de compilación porque usa solo APIs nativas; los archivos en `src/` ya están listos para producción. |
| `pnpm run deploy` | `gh-pages -d src` | Publica el contenido de `src/` en la rama `gh-pages` del repositorio, desde donde GitHub Pages sirve el sitio. |

### 5. Estructura de carpetas creada

```bash
mkdir -p src/components src/data src/assets/img src/assets/audio src/assets/video src/css docs
touch src/index.html src/modules/app.js src/css/global.css
touch CREDITOS.md README.md .gitignore
```

A partir de aquí se fueron creando los archivos `.js` de los Custom Elements
y poblando los JSON.

---

## Cómo ejecutar el proyecto

Los **ES Modules** (`<script type="module">`) requieren ser servidos vía HTTP;
no funcionan abriendo `index.html` directamente con doble clic. Por lo tanto
hay que levantar un servidor local. A continuación se ofrecen tres opciones,
elegí la que te resulte más cómoda.

### Opción 1: con pnpm 

Es la opción configurada en `package.json` y la que usamos durante el desarrollo.

```bash
# Clonar el repositorio
git clone https://github.com/<usuario>/proyecto-guia-turistica.git
cd proyecto-guia-turistica

# Instalar dependencias (solo la primera vez)
pnpm install

# Levantar el servidor con recarga automática
pnpm run dev
```

La aplicación queda disponible en **http://localhost:1234**. Cualquier cambio
que se guarde en un archivo `.html`, `.css`, `.js` o `.json` recarga el
navegador automáticamente gracias al flag `--reload` de `servor`.

---

## Despliegue en GitHub Pages

El proyecto está configurado para desplegarse automáticamente en GitHub Pages
mediante la dependencia `gh-pages`. El despliegue toma el contenido de la
carpeta `src/` y lo publica en una rama llamada `gh-pages` del repositorio.

### Despliegue manual desde tu máquina

```bash
# Asegurate de tener todos los cambios commiteados en main
git status

# Ejecutar el script de despliegue
pnpm run deploy
```

Internamente este comando ejecuta `gh-pages -d src`, que:

1. Crea (o actualiza) una rama llamada `gh-pages` en el repositorio remoto.
2. Sube el contenido completo de `src/` a esa rama.
3. GitHub detecta el cambio y reconstruye el sitio en su CDN (suele tardar
   1–2 minutos).

### Configuración inicial (solo una vez por repositorio)

1. Subí el repositorio a GitHub (`git push -u origin main`).
2. En GitHub, andá a **Settings → Pages**.
3. En **Source**, seleccioná `Deploy from a branch` y elegí la rama `gh-pages`
   con la carpeta `/ (root)`.
4. Guardá los cambios.
5. Ejecutá `pnpm run deploy` por primera vez para crear la rama y subir el
   contenido.

Una vez configurado, la aplicación queda disponible en una URL del estilo:

```
https://<usuario>.github.io/proyecto-guia-turistica/
```

> 💡 Para cumplir con el requisito del enunciado de que la aplicación debe
> ejecutarse localmente sin dependencias de internet, conservamos siempre
> la opción de correrla con `pnpm run dev`. El despliegue en GitHub Pages
> es una facilidad adicional para revisión remota, no un reemplazo.

---

## Decisiones técnicas (el porqué de cada herramienta)

Esta sección documenta las decisiones de herramientas y por qué se eligió cada
una sobre alternativas más comunes. El enunciado pide que el equipo entienda
y pueda explicar cada componente; lo mismo aplica al stack.

### ¿Por qué `pnpm` en lugar de `npm` o `yarn`?

- **Velocidad**: `pnpm` es notablemente más rápido en instalaciones limpias
  porque usa un almacén de paquetes global con enlaces simbólicos en lugar
  de copiar los archivos por proyecto.
- **Espacio en disco**: como los paquetes se comparten entre proyectos, no se
  duplican `node_modules` por cada repositorio.
- **Reproducibilidad**: el `pnpm-lock.yaml` y el campo `packageManager` en
  `package.json` (combinado con Corepack) garantizan que cualquier integrante
  use exactamente la misma versión de pnpm, evitando "en mi máquina sí funciona".

### ¿Por qué `servor` en lugar de `live-server` o `http-server`?

- **Cero configuración**: un solo comando con tres argumentos (`carpeta`,
  `archivo entrada`, `puerto`) y listo.
- **Tamaño**: pesa muy poco comparado con alternativas como `live-server`.
- **Soporte nativo de SPA**: hace fallback automático a `index.html` si la URL
  no encuentra un archivo, útil cuando se experimenta con rutas en el
  navegador.
- **Auto-reload incluido** vía el flag `--reload`, sin necesidad de plugins
  extra.

### ¿Por qué `pnpm run dev` en lugar de `pnpx servor ...` directamente?

Aunque ambos hacen lo mismo, ejecutar `pnpm run dev` ofrece ventajas:

- **Estandarización**: cualquier integrante levanta el servidor con el mismo
  comando, sin tener que recordar los argumentos exactos de `servor`.
- **Documentación implícita**: el comando real queda registrado en
  `package.json`. Si mañana cambiamos de servidor, solo se modifica el script
  y el comando del equipo no cambia.
- **Menos errores de tipeo**: `pnpm run dev` es difícil de equivocar; los
  argumentos de `servor` son fáciles de olvidar.

### ¿Por qué Web Components nativos en lugar de un framework?

Esta decisión la dicta el enunciado: el curso busca que demostremos dominio de
las APIs nativas del navegador. Pero más allá del requerimiento académico, hay
ventajas reales:

- **Sin transpilación**: el código que escribimos es el mismo que corre en el
  navegador. Esto facilita el debugging.
- **Encapsulación garantizada**: el Shadow DOM aísla los estilos de cada
  componente sin convenciones manuales como BEM.
- **Portabilidad**: un Custom Element como `<destino-card>` puede usarse
  mañana en una página de WordPress, en otro proyecto vanilla, o incluso
  dentro de React, sin modificaciones.

### ¿Por qué dividir el proyecto en `src/` separado de la raíz?

- **Claridad**: la raíz del repositorio queda solo con archivos de
  configuración, documentación y carpetas de soporte (`docs/`).
- **Despliegue limpio**: `gh-pages -d src` publica solamente lo necesario para
  que el sitio funcione, sin exponer `node_modules`, `package.json` o archivos
  internos del equipo.

---

## Custom Elements implementados

Cada componente vive en su propio archivo dentro de `src/components/` y
encapsula sus estilos mediante Shadow DOM.

| Custom Element | Atributos observados | Eventos emitidos | Descripción |
|---|---|---|---|
| `<app-header>` | `active-region` | `region-selected`, `volver-mapa` | Barra superior con logo (clickeable, vuelve al mapa) y tabs por región. |
| `<mapa-interactivo>` | — | `region-seleccionada`, `destino-selected` | Mapa SVG cantonal con coloreado por región, zoom dinámico y puntos animados de los destinos. |
| `<destino-card>` | `destino-id`, `nombre`, `imagen`, `region` | `destino-selected` | Tarjeta resumen con imagen, nombre y región. |
| `<destino-detalle>` | (recibe el destino vía propiedad `.destino`) | — | Vista completa del destino. Integra `<galeria-imagenes>` y `<audio-guia>`. |
| `<galeria-imagenes>` | `imagenes` (JSON serializado) | — | Galería con navegación anterior/siguiente. |
| `<audio-guia>` | `src`, `label` | — | Reproductor de audio personalizado con play/pause y barra de progreso. |

---

## Flujo de datos y eventos

La comunicación entre componentes se hace a través de **CustomEvents** que
burbujean hasta `document`, donde `modules/app.js` los escucha y orquesta los cambios
de vista. No hay comunicación directa componente-a-componente.

```
Usuario hace clic en una región del mapa
            │
            ▼
   <mapa-interactivo>
            │
            │  emite "region-seleccionada"
            │  detail: { regionNombre: "Chorotega" }
            ▼
         modules/app.js
            │
            │  filtra destinos.json por region
            │  renderiza <destino-card> en el grid
            │  cambia a vista-listado
            ▼
   <destino-card>  (varios)
            │
            │  emite "destino-selected"
            │  detail: { id: "chorotega-001" }
            ▼
         modules/app.js
            │
            │  busca el destino completo
            │  crea <destino-detalle> con la propiedad .destino
            │  cambia a vista-detalle
            ▼
   <destino-detalle>
       contiene
   <galeria-imagenes> + <audio-guia>
```

Los puntos del mapa también pueden emitir `destino-selected` directamente,
ofreciendo un atajo desde el mapa hasta el detalle del destino.

---

## Datos: estructura de los JSON

### `data/destinos.json`

Catálogo de destinos turísticos. Cada destino contiene los campos pedidos
en el enunciado más algunos campos auxiliares para el mapa:

```json
{
  "id": "chorotega-001",
  "nombre": "Tamarindo",
  "region": "Chorotega",
  "zona_turistica": "Pacífico Norte",
  "provincia": "Guanacaste",
  "canton": "Santa Cruz",
  "descripcion": "...",
  "imagen_portada": "assets/img/tamarindo.webp",
  "galeria": ["assets/img/tamarindo-1.webp", "..."],
  "audio": "assets/audio/tamarindo-guia.mp3",
  "video": "assets/video/tamarindo.mp4",
  "actividades": ["Surf", "Snorkel", "..."],
  "lat": 10.2993,
  "lng": -85.8371
}
```

### `data/mapa.json`

Configuración del mapa cantonal. Cada región contiene su color, descripción
y la lista de cantones que la conforman (84 en total, agrupados según las
6 regiones socioeconómicas oficiales de MIDEPLAN).

```json
{
  "svgPath": "assets/img/Cantones_de_Costa_Rica.svg",
  "viewBox": "0 0 648.29871 612.98956",
  "regiones": [
    {
      "nombre": "Chorotega",
      "color": "#F59E0B",
      "descripcion": "...",
      "cantones": [
        { "id": "501", "nombre": "Liberia", "provincia": "Guanacaste" },
        ...
      ]
    }
  ]
}
```

> Convención: la región se identifica siempre por su `nombre` (capitalizado,
> con tildes) en todos los archivos del proyecto. Esta es la única clave
> canónica.

---

## Equipo de trabajo (Grupo #1)

| Rol | Integrante | Responsabilidades principales |
|---|---|---|
| Líder / Arquitecto de componentes |Juan Carlos Jiménez Castrillo - C33980 | Arquitectura, registro de Custom Elements, integración final |
| Componentes de navegación | Joshua Obando Gonzalez - C35652 | `<app-header>`, flujo de eventos, `<mapa-interactivo>` |
| Componentes de destino | Demian Ramírez Sandoval - C36462 | `<destino-card>`, `<destino-detalle>`, `<galeria-imagenes>` |
| Productor multimedia | Maylo Daring Parra Aguirre - C35880 | Edición de imágenes/audio/video y estructura del JSON |
| Diseño UI/UX | Kener Josué Sosa Rodríguez - C37730 | Estilos globales, paleta de colores, experiencia de usuario |

> Todos los integrantes comprenden y pueden explicar cualquier Custom Element
> durante la presentación.

---

                ┌───────────────────────┐
                │        MAPA           │
                │  <mapa-interactivo>  │
                └─────────┬────────────┘
                          │
          (clic en región │  "region-seleccionada")
                          ▼
                ┌───────────────────────┐
                │       LISTADO         │
                │  <destino-card> []   │
                └───────┬───────┬──────┘
                        │       │
        (clic destino   │       │ botón volver mapa
     "destino-selected")│       │ "volver-mapa"
                        ▼       ▼
                ┌───────────────────────┐
                │       DETALLE         │
                │ <destino-detalle>     │
                └─────────┬────────────┘
                          │
               (botón volver)
                          │
                          ▼
                      LISTADO
---
## Créditos multimedia

Las fuentes y licencias de cada imagen, audio y video utilizados se encuentran
documentadas en el archivo [`CREDITOS.md`](./CREDITOS.md) en la raíz del
repositorio. Todos los recursos son de libre uso (Creative Commons o dominio
público) o de producción propia del grupo.

---

_Curso IF7102 — Multimedios | Lic. Alonso Chavarría Cubero | UCR Sede Guanacaste, I Ciclo 2026_