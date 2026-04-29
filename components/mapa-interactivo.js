/**
 * <mapa-interactivo>
 * Custom Element: Mapa interactivo de Costa Rica por cantones agrupados en
 * regiones socioeconómicas (MIDEPLAN).
 *
 * Eventos emitidos:
 *   - 'region-seleccionada' → detail: { regionNombre }
 *
 * @author Grupo 5 - IF7102
 */

class MapaInteractivo extends HTMLElement {

  constructor() {
    super();
    this.attachShadow({ mode: "open" });

    this._config = null;
    this._cantonToRegion = new Map();
    this._regionToPaths  = new Map();
    this._regionActiva   = null;
  }

  // ── Ciclo de vida ──────────────────────────────────────────────────────────

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
    } catch (err) {
      console.error("[mapa-interactivo]", err);
      this._config = null;
    }
  }

  _resolverIdCanton(path) {
    const label = path.getAttribute("inkscape:label") || "";
    const matchLabel = label.match(/^(\d{3})\b/);
    if (matchLabel && this._cantonToRegion.has(matchLabel[1])) {
      return matchLabel[1];
    }
    const idBase = (path.id || "").split("_")[0];
    if (this._cantonToRegion.has(idBase)) {
      return idBase;
    }
    return null;
  }

  // ── Render del Shadow DOM ──────────────────────────────────────────────────

  _render() {
    if (!this._config) {
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

        /* Mapa: ahora ocupa todo el ancho disponible y tiene fondo oscuro */
        .mapa-wrapper {
          position: relative;
          width: 100%;
          background-color: #111827;
          border: 1px solid #1f2937;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 8px 32px rgba(0,0,0,0.4);
        }

        object {
          display: block;
          width: 100%;
          height: 720px;
        }

        /* Tooltip: región arriba (grande), cantón abajo (pequeño) */
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
          font-weight: 400;
          opacity: 0.7;
          display: block;
          margin-top: 4px;
        }

        /* Leyenda */
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

        .leyenda-item:hover {
          background: rgba(255,255,255,0.1);
        }

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

        /* Panel de selección */
        .panel {
          display: none;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          margin-top: 1.5rem;
          padding: 1.25rem 1.5rem;
          background-color: rgba(17, 24, 39, 0.7);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 12px;
          width: 100%;
          color: #e5e7eb;
          animation: fadeIn 0.25s ease;
        }

        .panel.visible { display: flex; }

        .panel-info {
          display: flex;
          flex-direction: column;
          gap: 0.3rem;
        }

        .panel-region {
          font-size: 1.25rem;
          font-weight: 700;
          color: #fff;
        }

        .panel-descripcion {
          font-size: 0.875rem;
          font-weight: 400;
          color: #9ca3af;
          max-width: 540px;
          line-height: 1.5;
        }

        .panel-acciones {
          display: flex;
          gap: 0.5rem;
          flex-shrink: 0;
        }

        .btn-ver {
          background: linear-gradient(135deg, var(--color-primario, #0F6E56) 0%, var(--color-primario-oscuro, #085041) 100%);
          color: white;
          padding: 0.7rem 1.5rem;
          border-radius: 8px;
          font-weight: 700;
          font-size: 0.95rem;
          border: none;
          cursor: pointer;
          transition: opacity 0.15s ease, transform 0.15s ease;
          font-family: inherit;
        }

        .btn-ver:hover:not(:disabled) {
          opacity: 0.9;
          transform: translateY(-1px);
        }

        .btn-ver:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }

        .btn-reset {
          background: rgba(255,255,255,0.05);
          color: #d1d5db;
          padding: 0.7rem 1rem;
          border-radius: 8px;
          font-size: 0.875rem;
          border: 1px solid rgba(255,255,255,0.1);
          cursor: pointer;
          transition: background 0.15s ease;
          font-family: inherit;
        }

        .btn-reset:hover {
          background: rgba(255,255,255,0.1);
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        @media (max-width: 768px) {
          .panel { flex-direction: column; align-items: flex-start; }
          .titulo { font-size: 1.6rem; }
          object { height: 480px; }
        }
      </style>

      <h2 class="titulo">Explorá Costa Rica</h2>
      <p class="subtitulo">Seleccioná una región para comenzar</p>

      <div class="mapa-wrapper">
        <object
          id="crmap"
          data="${this._config.svgPath}"
          type="image/svg+xml"
        >Tu navegador no soporta SVG.</object>
        <div id="tooltip"></div>
      </div>

      <ul class="leyenda">${leyendaHTML}</ul>

      <div id="panel" class="panel">
        <div class="panel-info">
          <span id="nombre-region" class="panel-region"></span>
          <span id="desc-region" class="panel-descripcion"></span>
        </div>
        <div class="panel-acciones">
          <button id="btn-ver" class="btn-ver">Ver destinos →</button>
          <button id="btn-reset" class="btn-reset">Reiniciar</button>
        </div>
      </div>
    `;
  }

  // ── Lógica del mapa ────────────────────────────────────────────────────────

  _inicializarMapa() {
    if (!this._config) return;

    const sr           = this.shadowRoot;
    const mapObject    = sr.getElementById("crmap");
    const tooltip      = sr.getElementById("tooltip");
    const panel        = sr.getElementById("panel");
    const btnVer       = sr.getElementById("btn-ver");
    const btnReset     = sr.getElementById("btn-reset");
    const itemsLeyenda = sr.querySelectorAll(".leyenda-item");

    const viewBoxOriginal = this._config.viewBox;

    this._config.regiones.forEach(region => {
      region.cantones.forEach(canton => {
        this._cantonToRegion.set(canton.id, {
          ...region,
          cantonNombre: canton.nombre
        });
      });
    });

    itemsLeyenda.forEach(item => {
      item.addEventListener("mouseenter", () => this._resaltarRegion(item.dataset.region));
      item.addEventListener("mouseleave", () => this._quitarResaltado());
      item.addEventListener("click", () => {
        const regionObj = this._config.regiones.find(r => r.nombre === item.dataset.region);
        if (regionObj) this._seleccionarRegion(regionObj);
      });
    });

    btnReset.addEventListener("click", () => {
      const svgDoc = mapObject.contentDocument || mapObject.getSVGDocument();
      if (svgDoc) svgDoc.documentElement.setAttribute("viewBox", viewBoxOriginal);
      this._regionActiva = null;
      this._quitarResaltado();
      panel.classList.remove("visible");
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

    const onLoad = () => {
      const svgDoc = mapObject.contentDocument || mapObject.getSVGDocument();
      if (!svgDoc) return;
      this._aplicarInteracciones(svgDoc, tooltip);
    };

    mapObject.addEventListener("load", onLoad);
    if (mapObject.contentDocument || mapObject.getSVGDocument()) onLoad();
  }

  _aplicarInteracciones(svgDoc, tooltip) {
    svgDoc.documentElement.setAttribute("viewBox", this._config.viewBox);

    // Hacer que el SVG ocupe todo el espacio disponible (preserva aspect ratio)
    svgDoc.documentElement.setAttribute("preserveAspectRatio", "xMidYMid meet");
    svgDoc.documentElement.style.width  = "100%";
    svgDoc.documentElement.style.height = "100%";
    svgDoc.documentElement.style.display = "block";

    // Fondo oscuro para el SVG mismo, por si acaso
    if (svgDoc.documentElement.style) {
      svgDoc.documentElement.style.backgroundColor = "#111827";
    }

    const sinMapear = [];

    svgDoc.querySelectorAll("path").forEach(path => {
      const idCanton = this._resolverIdCanton(path);

      if (!idCanton) {
        const label = path.getAttribute("inkscape:label") || "";
        sinMapear.push({ id: path.id || "(sin id)", label: label || "(sin label)" });
        path.style.fill        = "#374151";
        path.style.stroke      = "#1f2937";
        path.style.strokeWidth = "0.3";
        return;
      }

      const region = this._cantonToRegion.get(idCanton);

      if (!this._regionToPaths.has(region.nombre)) {
        this._regionToPaths.set(region.nombre, []);
      }
      this._regionToPaths.get(region.nombre).push(path);

      path.style.fill           = region.color;
      path.style.stroke         = "#0b1220";
      path.style.strokeWidth    = "0.4";
      path.style.transition     = "fill 0.2s ease, opacity 0.2s ease, stroke-width 0.2s ease";
      path.style.cursor         = "pointer";
      path.dataset.regionNombre = region.nombre;
      path.dataset.cantonId     = idCanton;
      path.dataset.cantonNombre = region.cantonNombre;

      // Tooltip: región arriba grande, cantón abajo pequeño
      path.addEventListener("mouseover", (e) => {
        this._resaltarRegion(region.nombre);
        tooltip.innerHTML = `
          <span class="tooltip-region">Región ${region.nombre}</span>
          <span class="tooltip-canton">Cantón: ${region.cantonNombre}</span>
        `;
        tooltip.style.display = "block";
        this._moverTooltip(e, tooltip);
      });

      path.addEventListener("mousemove", (e) => this._moverTooltip(e, tooltip));

      path.addEventListener("mouseout", () => {
        this._quitarResaltado();
        tooltip.style.display = "none";
      });

      path.addEventListener("click", () => this._seleccionarRegion(region));
    });

    if (sinMapear.length > 0) {
      console.warn(`[mapa-interactivo] ${sinMapear.length} paths sin mapear:`);
      console.table(sinMapear);
    }
  }

  // ── Selección y zoom a una región completa ─────────────────────────────────

  _seleccionarRegion(region) {
    const sr           = this.shadowRoot;
    const mapObject    = sr.getElementById("crmap");
    const panel        = sr.getElementById("panel");
    const nombreRegion = sr.getElementById("nombre-region");
    const descRegion   = sr.getElementById("desc-region");
    const btnVer       = sr.getElementById("btn-ver");
    const itemsLeyenda = sr.querySelectorAll(".leyenda-item");

    const svgDoc = mapObject.contentDocument || mapObject.getSVGDocument();
    if (!svgDoc) return;

    const paths = this._regionToPaths.get(region.nombre);
    if (!paths || paths.length === 0) return;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    paths.forEach(p => {
      const b = p.getBBox();
      if (b.width === 0 && b.height === 0) return;
      minX = Math.min(minX, b.x);
      minY = Math.min(minY, b.y);
      maxX = Math.max(maxX, b.x + b.width);
      maxY = Math.max(maxY, b.y + b.height);
    });

    if (minX !== Infinity) {
      const margin = 20;
      svgDoc.documentElement.setAttribute(
        "viewBox",
        `${minX - margin} ${minY - margin} ${maxX - minX + margin * 2} ${maxY - minY + margin * 2}`
      );
    }

    this._regionActiva = region.nombre;
    nombreRegion.textContent = `Región ${region.nombre}`;
    descRegion.textContent   = region.descripcion || "";
    btnVer.textContent       = `Ver destinos →`;
    btnVer.disabled          = false;
    panel.classList.add("visible");

    itemsLeyenda.forEach(i => {
      i.classList.toggle("activa", i.dataset.region === region.nombre);
    });

    this._resaltarRegion(region.nombre);
  }

  // ── Resaltado: la región hovereada se ve fuerte, las demás se desvanecen ──

  _resaltarRegion(regionNombre) {
    this._regionToPaths.forEach((paths, nombre) => {
      const esActiva = (nombre === regionNombre);
      paths.forEach(p => {
        p.style.opacity     = esActiva ? "1"   : "0.2";
        p.style.strokeWidth = esActiva ? "0.6" : "0.4";
      });
    });
  }

  _quitarResaltado() {
    if (this._regionActiva) {
      this._resaltarRegion(this._regionActiva);
      return;
    }
    this._regionToPaths.forEach(paths => {
      paths.forEach(p => {
        p.style.opacity     = "1";
        p.style.strokeWidth = "0.4";
      });
    });
  }

  _moverTooltip(e, tooltip) {
    tooltip.style.left = e.clientX + 14 + "px";
    tooltip.style.top  = e.clientY + 14 + "px";
  }
}

customElements.define("mapa-interactivo", MapaInteractivo);