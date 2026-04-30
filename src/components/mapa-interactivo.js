/**
 * <mapa-interactivo>
 * Custom Element: Mapa interactivo de Costa Rica por cantones agrupados en
 * regiones socioeconómicas (MIDEPLAN).
 *
 * Eventos emitidos:
 *   - region-seleccionada detail: { regionNombre }
 *
 * @author Grupo 5 - IF7102
 */

class MapaInteractivo extends HTMLElement {

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._config = null;
    this._svgText = null;
    this._cantonToRegion = new Map();
    this._regionToPaths = new Map();
    this._regionActiva = null;
    this._viewBoxMapa = null; // bounding box real de todos los cantones
  }

  async connectedCallback() {
    await this._cargarConfig();
    this._render();
    this._inicializarMapa();
  }

  async _cargarConfig() {
    try {
      const res = await fetch("./data/mapa.json");
      if (!res.ok) throw new Error("No se pudo cargar mapa.json");
      this._config = await res.json();
      const svgRes = await fetch(this._config.svgPath);
      if (!svgRes.ok) throw new Error("No se pudo cargar el SVG");
      this._svgText = await svgRes.text();
    } catch (err) {
      console.error("[mapa-interactivo]", err);
      this._config = null;
    }
  }

  _resolverIdCanton(path) {
    const label = path.getAttribute("inkscape:label") || "";
    const matchLabel = label.match(/^(\d{3})\b/);
    if (matchLabel && this._cantonToRegion.has(matchLabel[1])) return matchLabel[1];
    const idBase = (path.id || "").split("_")[0];
    if (this._cantonToRegion.has(idBase)) return idBase;
    return null;
  }

  _render() {
    if (!this._config || !this._svgText) {
      this.shadowRoot.innerHTML = `<p style="color:red">Error al cargar el mapa.</p>`;
      return;
    }

    const leyendaHTML = this._config.regiones.map(r => `
      <li class="leyenda-item" data-region="${r.nombre}">
        <span class="leyenda-color" style="background:${r.color}"></span>
        <span class="leyenda-nombre">${r.nombre}</span>
      </li>
    `).join("");

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: flex;
          flex-direction: column;
          align-items: center;
          width: 100%;
        }
        .titulo {
          font-size: 2.25rem;
          font-weight: 700;
          color: var(--color-primario, #0F6E56);
          margin-bottom: 0.25rem;
          text-align: center;
        }
        .subtitulo {
          color: var(--color-texto-suave, #9ca3af);
          margin-bottom: 1.5rem;
          text-align: center;
          font-size: 1rem;
        }
        .mapa-wrapper {
          position: relative;
          width: 100%;
          background-color: #111827;
          border: 1px solid #1f2937;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 8px 32px rgba(0,0,0,0.4);
        }
        #svg-container {
          width: 100%;
          display: block;
        }
        #svg-container svg {
          width: 100%;
          height: auto;
          max-height: 80vh;
          display: block;
        }
        #tooltip {
          position: fixed;
          background: rgba(15, 23, 42, 0.95);
          color: white;
          padding: 10px 14px;
          border-radius: 10px;
          display: none;
          pointer-events: none;
          z-index: 200;
          backdrop-filter: blur(8px);
          font-family: inherit;
          border: 1px solid rgba(255,255,255,0.1);
          box-shadow: 0 4px 16px rgba(0,0,0,0.4);
          min-width: 180px;
        }
        #tooltip .tooltip-region {
          font-size: 1rem;
          font-weight: 700;
          color: #fff;
          display: block;
          line-height: 1.2;
        }
        #tooltip .tooltip-canton {
          font-size: 0.8rem;
          opacity: 0.7;
          display: block;
          margin-top: 4px;
        }
        #panel-overlay {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          z-index: 100;
          display: none;
          background: linear-gradient(
            to top,
            rgba(8, 12, 28, 0.98) 55%,
            rgba(8, 12, 28, 0.0) 100%
          );
          padding: 2.5rem 2rem 1.75rem;
          animation: slideUp 0.3s ease;
        }
        #panel-overlay.visible { display: block; }
        .panel-inner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
        }
        .panel-info {
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
        }
        .panel-region-row {
          display: flex;
          align-items: center;
          gap: 0.65rem;
        }
        .panel-color-dot {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          border: 2px solid rgba(255,255,255,0.35);
          flex-shrink: 0;
        }
        .panel-region {
          font-size: 1.5rem;
          font-weight: 800;
          color: #fff;
          letter-spacing: -0.02em;
        }
        .panel-descripcion {
          font-size: 0.875rem;
          color: #9ca3af;
          max-width: 560px;
          line-height: 1.5;
          margin-left: calc(16px + 0.65rem);
        }
        .panel-acciones {
          display: flex;
          gap: 0.5rem;
          flex-shrink: 0;
        }
        .btn-ver {
          background: linear-gradient(135deg, var(--color-primario, #0F6E56) 0%, var(--color-primario-oscuro, #085041) 100%);
          color: white;
          padding: 0.8rem 1.75rem;
          border-radius: 10px;
          font-weight: 700;
          font-size: 1rem;
          border: none;
          cursor: pointer;
          transition: opacity 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease;
          font-family: inherit;
          box-shadow: 0 4px 14px rgba(15, 110, 86, 0.45);
        }
        .btn-ver:hover:not(:disabled) {
          opacity: 0.9;
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(15, 110, 86, 0.6);
        }
        .btn-ver:disabled { opacity: 0.45; cursor: not-allowed; }
        .btn-reset {
          background: rgba(255,255,255,0.07);
          color: #d1d5db;
          padding: 0.8rem 1rem;
          border-radius: 10px;
          font-size: 0.875rem;
          border: 1px solid rgba(255,255,255,0.12);
          cursor: pointer;
          transition: background 0.15s ease;
          font-family: inherit;
        }
        .btn-reset:hover { background: rgba(255,255,255,0.14); }
        .leyenda {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 0.75rem 1.25rem;
          list-style: none;
          padding: 1.25rem 0 0.5rem;
          margin: 0;
          width: 100%;
        }
        .leyenda-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.9rem;
          color: var(--color-texto-claro, #e5e7eb);
          cursor: pointer;
          padding: 6px 12px;
          border-radius: 999px;
          transition: background 0.15s ease;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
        }
        .leyenda-item:hover { background: rgba(255,255,255,0.1); }
        .leyenda-item.activa {
          background: rgba(255,255,255,0.15);
          font-weight: 700;
          border-color: rgba(255,255,255,0.25);
        }
        .leyenda-color {
          width: 14px;
          height: 14px;
          border-radius: 4px;
          flex-shrink: 0;
          border: 1px solid rgba(255,255,255,0.2);
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @media (max-width: 768px) {
          .panel-inner { flex-direction: column; align-items: flex-start; }
          .titulo { font-size: 1.6rem; }
          .panel-descripcion { display: none; }
        }
      </style>

      <h2 class="titulo">Explora Costa Rica</h2>
      <p class="subtitulo">Selecciona una region para comenzar</p>

      <div class="mapa-wrapper">
        <div id="svg-container"></div>
        <div id="tooltip"></div>
        <div id="panel-overlay">
          <div class="panel-inner">
            <div class="panel-info">
              <div class="panel-region-row">
                <span id="panel-color-dot" class="panel-color-dot"></span>
                <span id="nombre-region" class="panel-region"></span>
              </div>
              <span id="desc-region" class="panel-descripcion"></span>
            </div>
            <div class="panel-acciones">
              <button id="btn-ver" class="btn-ver">Ver destinos</button>
              <button id="btn-reset" class="btn-reset">x Reiniciar</button>
            </div>
          </div>
        </div>
      </div>

      <ul class="leyenda">${leyendaHTML}</ul>
    `;
  }

  _inicializarMapa() {
    if (!this._config || !this._svgText) return;

    const sr = this.shadowRoot;
    const svgContainer = sr.getElementById("svg-container");
    const tooltip = sr.getElementById("tooltip");
    const panelOverlay = sr.getElementById("panel-overlay");
    const btnVer = sr.getElementById("btn-ver");
    const btnReset = sr.getElementById("btn-reset");
    const itemsLeyenda = sr.querySelectorAll(".leyenda-item");

    // Inyectar SVG inline
    svgContainer.innerHTML = this._svgText;
    const svgEl = svgContainer.querySelector("svg");

    // Quitar dimensiones fijas de Inkscape
    svgEl.removeAttribute("width");
    svgEl.removeAttribute("height");
    svgEl.style.removeProperty("width");
    svgEl.style.removeProperty("height");
    svgEl.setAttribute("preserveAspectRatio", "xMidYMid meet");
    svgEl.style.width = "100%";
    svgEl.style.height = "auto";

    this._config.regiones.forEach(region => {
      region.cantones.forEach(canton => {
        this._cantonToRegion.set(canton.id, { ...region, cantonNombre: canton.nombre });
      });
    });

    // Aplicar interacciones y colores
    this._aplicarInteracciones(svgEl, tooltip, panelOverlay, itemsLeyenda);

    // Calcular el viewBox real basado en los paths coloreados (elimina el espacio vacío del SVG)
    this._ajustarViewBoxAlMapa(svgEl);

    itemsLeyenda.forEach(item => {
      item.addEventListener("mouseenter", () => this._resaltarRegion(item.dataset.region));
      item.addEventListener("mouseleave", () => this._quitarResaltado());
      item.addEventListener("click", () => {
        const regionObj = this._config.regiones.find(r => r.nombre === item.dataset.region);
        if (regionObj) this._seleccionarRegion(regionObj, svgEl, panelOverlay, itemsLeyenda);
      });
    });

    btnReset.addEventListener("click", () => {
      // Volver al viewBox del mapa completo (no el original de Inkscape)
      svgEl.setAttribute("viewBox", this._viewBoxMapa);
      this._regionActiva = null;
      this._quitarResaltado();
      panelOverlay.classList.remove("visible");
      itemsLeyenda.forEach(i => i.classList.remove("activa"));
    });

    btnVer.addEventListener("click", () => {
      if (!this._regionActiva) return;
      this.dispatchEvent(new CustomEvent("region-seleccionada", {
        bubbles: true,
        composed: true,
        detail: { regionNombre: this._regionActiva }
      }));
    });
  }

  // Calcula el bounding box de TODOS los cantones mapeados y lo usa como viewBox
  _ajustarViewBoxAlMapa(svgEl) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    this._regionToPaths.forEach(paths => {
      paths.forEach(p => {
        try {
          const b = p.getBBox();
          if (b.width === 0 && b.height === 0) return;
          minX = Math.min(minX, b.x);
          minY = Math.min(minY, b.y);
          maxX = Math.max(maxX, b.x + b.width);
          maxY = Math.max(maxY, b.y + b.height);
        } catch (e) { }
      });
    });

    if (minX !== Infinity) {
      const margin = 8;
      this._viewBoxMapa = `${minX - margin} ${minY - margin} ${maxX - minX + margin * 2} ${maxY - minY + margin * 2}`;
      svgEl.setAttribute("viewBox", this._viewBoxMapa);
    } else {
      // Fallback al viewBox del JSON
      this._viewBoxMapa = this._config.viewBox;
      svgEl.setAttribute("viewBox", this._viewBoxMapa);
    }
  }

  _aplicarInteracciones(svgEl, tooltip, panelOverlay, itemsLeyenda) {
    svgEl.querySelectorAll("path").forEach(path => {
      const idCanton = this._resolverIdCanton(path);

      if (!idCanton) {
        path.style.fill = "#374151";
        path.style.stroke = "#1f2937";
        path.style.strokeWidth = "0.3";
        return;
      }

      const region = this._cantonToRegion.get(idCanton);

      if (!this._regionToPaths.has(region.nombre)) {
        this._regionToPaths.set(region.nombre, []);
      }
      this._regionToPaths.get(region.nombre).push(path);

      path.style.fill = region.color;
      path.style.stroke = "#0b1220";
      path.style.strokeWidth = "0.4";
      path.style.transition = "fill 0.2s ease, opacity 0.2s ease, stroke-width 0.2s ease";
      path.style.cursor = "pointer";

      path.addEventListener("mouseover", (e) => {
        this._resaltarRegion(region.nombre);
        tooltip.innerHTML = `
          <span class="tooltip-region">Region ${region.nombre}</span>
          <span class="tooltip-canton">Canton: ${region.cantonNombre}</span>
        `;
        tooltip.style.display = "block";
        this._moverTooltip(e, tooltip);
      });

      path.addEventListener("mousemove", (e) => this._moverTooltip(e, tooltip));

      path.addEventListener("mouseout", () => {
        this._quitarResaltado();
        tooltip.style.display = "none";
      });

      path.addEventListener("click", () =>
        this._seleccionarRegion(region, svgEl, panelOverlay, itemsLeyenda)
      );
    });
  }

  _seleccionarRegion(region, svgEl, panelOverlay, itemsLeyenda) {
    const sr = this.shadowRoot;
    const paths = this._regionToPaths.get(region.nombre);
    if (!paths || paths.length === 0) return;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    paths.forEach(p => {
      try {
        const b = p.getBBox();
        if (b.width === 0 && b.height === 0) return;
        minX = Math.min(minX, b.x);
        minY = Math.min(minY, b.y);
        maxX = Math.max(maxX, b.x + b.width);
        maxY = Math.max(maxY, b.y + b.height);
      } catch (e) { }
    });

    if (minX !== Infinity) {
      const margin = 30;
      // Espacio extra abajo para el overlay del panel
      const vbParts = this._viewBoxMapa.split(" ").map(Number);
      const panelReserve = vbParts[3] * 0.3;
      svgEl.setAttribute(
        "viewBox",
        `${minX - margin} ${minY - margin} ${maxX - minX + margin * 2} ${maxY - minY + margin * 2 + panelReserve}`
      );
    }

    this._regionActiva = region.nombre;
    sr.getElementById("panel-color-dot").style.background = region.color;
    sr.getElementById("nombre-region").textContent = "Region " + region.nombre;
    sr.getElementById("desc-region").textContent = region.descripcion || "";
    sr.getElementById("btn-ver").disabled = false;

    panelOverlay.classList.remove("visible");
    void panelOverlay.offsetWidth;
    panelOverlay.classList.add("visible");

    itemsLeyenda.forEach(i =>
      i.classList.toggle("activa", i.dataset.region === region.nombre)
    );

    this._resaltarRegion(region.nombre);
  }

  _resaltarRegion(regionNombre) {
    this._regionToPaths.forEach((paths, nombre) => {
      const activa = nombre === regionNombre;
      paths.forEach(p => {
        p.style.opacity = activa ? "1" : "0.2";
        p.style.strokeWidth = activa ? "0.6" : "0.4";
      });
    });
  }

  _quitarResaltado() {
    if (this._regionActiva) { this._resaltarRegion(this._regionActiva); return; }
    this._regionToPaths.forEach(paths => {
      paths.forEach(p => { p.style.opacity = "1"; p.style.strokeWidth = "0.4"; });
    });
  }

  _moverTooltip(e, tooltip) {
    tooltip.style.left = e.clientX + 14 + "px";
    tooltip.style.top = e.clientY + 14 + "px";
  }
}

customElements.define("mapa-interactivo", MapaInteractivo);