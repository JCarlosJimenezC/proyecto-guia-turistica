/**
 * app.js
 * Lógica principal (orquestación) de la Guía Turística de Costa Rica.
 *
 * Convención: la región se identifica SIEMPRE por su nombre (capitalizado,
 * con tildes) en TODOS los archivos del proyecto.
 */

// ── Estado global ────────────────────────────────────────────────────────────

let destinos       = [];
let regionActiva   = null;     // null = estamos en la vista del mapa
let cambioDesdeApp = false;

// ── Referencias DOM ──────────────────────────────────────────────────────────

const gridDestinos      = document.getElementById("grid-destinos");
const tituloRegion      = document.getElementById("titulo-region");
const vistaMapa         = document.getElementById("vista-mapa");
const vistaListado      = document.getElementById("vista-listado");
const vistaDetalle      = document.getElementById("vista-detalle");
const contenedorDetalle = document.getElementById("contenedor-detalle");
const btnVolver         = document.getElementById("btn-volver");
const btnVolverMapa     = document.getElementById("btn-volver-mapa");
const appHeader         = document.querySelector("app-header");

// ── Vistas ───────────────────────────────────────────────────────────────────

function mostrarVista(vista) {
  [vistaMapa, vistaListado, vistaDetalle].forEach(v => v.classList.remove("activa"));
  vista.classList.add("activa");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function sincronizarHeader(region) {
  if (!appHeader) return;
  cambioDesdeApp = true;
  if (region === null || region === undefined) {
    appHeader.removeAttribute("active-region");
  } else {
    appHeader.setAttribute("active-region", region);
  }
  cambioDesdeApp = false;
}

// Vuelve a la vista del mapa: limpia la región activa
function volverAlMapa() {
  regionActiva = null;
  sincronizarHeader(null);
  mostrarVista(vistaMapa);
}

// ── Carga de datos ───────────────────────────────────────────────────────────

async function cargarDestinos() {
  try {
    const res = await fetch("./data/destinos.json");
    if (!res.ok) throw new Error("No se pudo cargar el JSON");
    const datos = await res.json();
    destinos = datos.destinos;
  } catch (err) {
    console.error("[app] Error al cargar destinos:", err);
    if (gridDestinos) {
      gridDestinos.innerHTML = "<p class='error'>Error al cargar los destinos.</p>";
    }
  }
}

// ── Render destinos ──────────────────────────────────────────────────────────

function renderizarDestinos(region) {
  gridDestinos.innerHTML   = "";
  tituloRegion.textContent = region;

  const filtrados = destinos.filter(d => d.region === region);

  if (filtrados.length === 0) {
    gridDestinos.innerHTML = `<p class='error'>No hay destinos disponibles para la región ${region} aún.</p>`;
    return;
  }

  filtrados.forEach(destino => {
    const card = document.createElement("destino-card");
    card.setAttribute("destino-id", destino.id);
    card.setAttribute("nombre",     destino.nombre);
    card.setAttribute("imagen",     destino.imagen_portada);
    card.setAttribute("region",     destino.zona_turistica || destino.region);
    gridDestinos.appendChild(card);
  });
}

// ── Detalle ──────────────────────────────────────────────────────────────────

function mostrarDetalle(destinoId) {
  const destino = destinos.find(d => d.id === destinoId);
  if (!destino) return;

  contenedorDetalle.innerHTML = "";
  const detalle = document.createElement("destino-detalle");
  detalle.destino = destino;
  contenedorDetalle.appendChild(detalle);

  mostrarVista(vistaDetalle);
}

// ── Eventos de los Custom Elements ───────────────────────────────────────────

document.addEventListener("region-seleccionada", (ev) => {
  regionActiva = ev.detail.regionNombre;
  renderizarDestinos(regionActiva);
  sincronizarHeader(regionActiva);
  mostrarVista(vistaListado);
});

document.addEventListener("region-selected", (ev) => {
  if (cambioDesdeApp) return;
  regionActiva = ev.detail.region;
  renderizarDestinos(regionActiva);
  mostrarVista(vistaListado);
});

document.addEventListener("destino-selected", (ev) => {
  mostrarDetalle(ev.detail.id);
});

// El logo del header pide volver al mapa
document.addEventListener("volver-mapa", () => {
  volverAlMapa();
});

// ── Botones de navegación ────────────────────────────────────────────────────

if (btnVolver)     btnVolver.addEventListener("click",     () => mostrarVista(vistaListado));
if (btnVolverMapa) btnVolverMapa.addEventListener("click", () => volverAlMapa());

// ── Arranque ─────────────────────────────────────────────────────────────────

cargarDestinos();

// La app arranca en la vista del mapa, sin región activa
sincronizarHeader(null);