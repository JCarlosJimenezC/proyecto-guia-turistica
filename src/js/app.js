/**
 * app.js
 * Lógica principal de la Guía Turística de Costa Rica.
 */

// ── Estado global ────────────────────────────────────────────────────────────

let destinos     = [];
let regionActiva = "Chorotega";
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

// ── Mapeo región técnica → nombre turístico ──────────────────────────────────

const NOMBRES_REGION = {
  "Chorotega":        "Pacífico Norte",
  "Huetar Atlántica": "Caribe",
  "Central":          "Valle Central",
  "Pacífico Central": "Pacífico Central",
  "Brunca":           "Pacífico Sur",
};

// ── Vistas ───────────────────────────────────────────────────────────────────

function mostrarVista(vista) {
  [vistaMapa, vistaListado, vistaDetalle].forEach(v => v.classList.remove("activa"));
  vista.classList.add("activa");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function sincronizarHeader(region) {
  if (!appHeader) return;
  cambioDesdeApp = true;
  appHeader.setAttribute("active-region", region);
  cambioDesdeApp = false;
}

// ── Datos ────────────────────────────────────────────────────────────────────

async function cargarDestinos() {
  try {
    const res = await fetch("./data/destinos.json");
    if (!res.ok) throw new Error("No se pudo cargar el JSON");
    const datos = await res.json();
    destinos = datos.destinos;
  } catch (err) {
    console.error("Error al cargar destinos:", err);
    gridDestinos.innerHTML = "<p class='error'>Error al cargar los destinos.</p>";
  }
}

// ── Render destinos ──────────────────────────────────────────────────────────

function renderizarDestinos(region) {
  gridDestinos.innerHTML = "";
  tituloRegion.textContent = NOMBRES_REGION[region] || region;

  const filtrados = destinos.filter(d => d.region === region);

  if (filtrados.length === 0) {
    gridDestinos.innerHTML = "<p class='error'>No hay destinos disponibles para esta región aún.</p>";
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

// ── Eventos ──────────────────────────────────────────────────────────────────

// Provincia elegida desde <mapa-interactivo>
document.addEventListener("provincia-seleccionada", (ev) => {
  regionActiva = ev.detail.region;
  renderizarDestinos(regionActiva);
  mostrarVista(vistaListado);
  sincronizarHeader(regionActiva);
});

// Región elegida desde <app-header>
document.addEventListener("region-selected", (ev) => {
  if (cambioDesdeApp) return;
  regionActiva = ev.detail.region;
  renderizarDestinos(regionActiva);
  mostrarVista(vistaListado);
});

// Card seleccionada
document.addEventListener("destino-selected", (ev) => {
  mostrarDetalle(ev.detail.id);
});

// Volver desde detalle → listado
btnVolver.addEventListener("click", () => mostrarVista(vistaListado));

// Volver desde listado → mapa
btnVolverMapa.addEventListener("click", () => mostrarVista(vistaMapa));

// ── Arranque ─────────────────────────────────────────────────────────────────

cargarDestinos();