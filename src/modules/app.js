/**
 * app.js
 * Orquestación principal de la aplicación.
 */

// ── IMPORTS DE COMPONENTES ───────────────────────────────────────────────────

import '../components/app-header.js';
import '../components/mapa-interactivo.js';
import '../components/destino-card.js';
import '../components/galeria-imagenes.js';
import '../components/audio-guia.js';
import '../components/destino-detalle.js';

// ── ESTADO GLOBAL ────────────────────────────────────────────────────────────

let destinos       = [];
let regionActiva   = null;
let cambioDesdeApp = false;

// ── REFERENCIAS DOM (se asignan luego) ───────────────────────────────────────

let gridDestinos;
let tituloRegion;
let vistaMapa;
let vistaListado;
let vistaDetalle;
let contenedorDetalle;
let btnVolver;
let btnVolverMapa;
let appHeader;

// ── VISTAS ───────────────────────────────────────────────────────────────────

function mostrarVista(vista) {
  [vistaMapa, vistaListado, vistaDetalle].forEach(v => v.classList.remove("activa"));
  vista.classList.add("activa");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function sincronizarHeader(region) {
  if (!appHeader) return;

  cambioDesdeApp = true;

  if (region == null) {
    appHeader.removeAttribute("active-region");
  } else {
    appHeader.setAttribute("active-region", region);
  }

  cambioDesdeApp = false;
}

function volverAlMapa() {
  regionActiva = null;
  sincronizarHeader(null);
  mostrarVista(vistaMapa);
}

// ── DATOS ────────────────────────────────────────────────────────────────────

async function cargarDestinos() {
  try {
    const res = await fetch("./data/destinos.json");
    if (!res.ok) throw new Error("Error al cargar JSON");

    const datos = await res.json();
    destinos = datos.destinos;

  } catch (err) {
    console.error("[app] Error:", err);
    if (gridDestinos) {
      gridDestinos.innerHTML = "<p class='error'>Error al cargar destinos.</p>";
    }
  }
}

// ── RENDER ───────────────────────────────────────────────────────────────────

function renderizarDestinos(region) {
  gridDestinos.innerHTML = "";
  tituloRegion.textContent = region;

  const filtrados = destinos.filter(d => d.region === region);

  if (!filtrados.length) {
    gridDestinos.innerHTML = `<p class='error'>No hay destinos en ${region}</p>`;
    return;
  }

  filtrados.forEach(destino => {
    const card = document.createElement("destino-card");

    card.setAttribute("destino-id", destino.id);
    card.setAttribute("nombre", destino.nombre);
    card.setAttribute("imagen", destino.imagen_portada);
    card.setAttribute("region", destino.zona_turistica || destino.region);

    gridDestinos.appendChild(card);
  });
}

// ── DETALLE ──────────────────────────────────────────────────────────────────

function mostrarDetalle(id) {
  const destino = destinos.find(d => d.id === id);
  if (!destino) return;

  contenedorDetalle.innerHTML = "";

  const detalle = document.createElement("destino-detalle");
  detalle.destino = destino;

  contenedorDetalle.appendChild(detalle);

  mostrarVista(vistaDetalle);
}

// ── EVENTOS ──────────────────────────────────────────────────────────────────

function registrarEventos() {

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

  document.addEventListener("volver-mapa", () => {
    volverAlMapa();
  });

  if (btnVolver) {
    btnVolver.addEventListener("click", () => mostrarVista(vistaListado));
  }

  if (btnVolverMapa) {
    btnVolverMapa.addEventListener("click", () => volverAlMapa());
  }
}

// ── INIT ─────────────────────────────────────────────────────────────────────

function init() {

  // Referencias DOM (seguras)
  gridDestinos      = document.getElementById("grid-destinos");
  tituloRegion      = document.getElementById("titulo-region");
  vistaMapa         = document.getElementById("vista-mapa");
  vistaListado      = document.getElementById("vista-listado");
  vistaDetalle      = document.getElementById("vista-detalle");
  contenedorDetalle = document.getElementById("contenedor-detalle");
  btnVolver         = document.getElementById("btn-volver");
  btnVolverMapa     = document.getElementById("btn-volver-mapa");
  appHeader         = document.querySelector("app-header");

  registrarEventos();
  cargarDestinos();
  sincronizarHeader(null);
}

document.addEventListener("DOMContentLoaded", init);