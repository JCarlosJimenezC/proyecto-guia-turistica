/**
 * <mapa-interactivo>
 * Custom Element: Mapa interactivo de Costa Rica por cantones agrupados en
 * regiones socioeconómicas (MIDEPLAN).
 *
 * Compatible con SVGs cuyos cantones están fragmentados en múltiples paths
 * (id pattern: "###" o "###_NN" o "path####" con inkscape:label).
 *
 * Eventos emitidos:
 *   - 'region-seleccionada' → detail: { regionId, regionNombre }
 *
 * @author Grupo 5 - IF7102
 */

class MapaInteractivo extends HTMLElement {

  constructor() {
    super();
    this.attachShadow({ mode: "open" });

    this._config = null;
    this._cantonToRegion = new Map();   // 'idCanton' → { region, cantonNombre }
    this._regionToPaths  = new Map();   // 'idRegion' → [SVGPathElement, ...]
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

  // ── Resolución de ID de cantón a partir de un path ─────────────────────────
  // Soporta múltiples formatos:
  //   1. id="216"           → ID directo
  //   2. id="606_05"        → fragmento; toma solo lo previo al "_"
  //   3. id="path3884" + inkscape:label="612 Monteverde" → usa el label
  //   4. id="607_01" pero label "613 Puerto Jiménez" → label tiene prioridad
  _resolverIdCanton(path) {
    const label = path.getAttribute("inkscape:label") || "";

    // Prioridad 1: label con formato "### Algo"
    const matchLabel = label.match(/^(\d{3})\b/);
    if (matchLabel && this._cantonToRegion.has(matchLabel[1])) {
      return matchLabel[1];
    }

    // Prioridad 2: id directo o fragmentado por "_"
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
      <li class="leyenda-item" data-region="${r.id}">
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
          font-size: 2rem;
          font-weight: 700;
          color: var(--color-primario-oscuro, #085041);
          margin-bottom: 0.25rem;
          text-align: center;
        }

        .subtitulo {
          color: var(--color-texto-suave, #5F5E5A);
          margin-bottom: 1.5rem;
          text-align: center;
        }

        .mapa-wrapper {
          position: relative;
          width: 100%;
          max-width: 720px;
          background-color: #f4f7fb;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 4px 16px rgba(0,0,0,0.12);
        }

        object {
          display: block;
          width: 100%;
          height: 580px;
        }

        #tooltip {
          position: fixed;
          background: rgba(0,0,0,0.85);
          color: white;
          padding: 6px 10px;
          border-radius: 8px;
          display: none;
          pointer-events: none;
          font-size: 0.875rem;
          font-weight: 600;
          z-index: 200;
          backdrop-filter: blur(4px);
          font-family: inherit;
        }

        #tooltip .tooltip-region {
          font-size: 0.75rem;
          font-weight: 400;
          opacity: 0.8;
          display: block;
          margin-top: 2px;
        }

        .leyenda {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 0.75rem 1.25rem;
          list-style: none;
          padding: 1rem 0 0.5rem;
          margin: 0;
          width: 100%;
          max-width: 720px;
        }

        .leyenda-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.875rem;
          color: var(--color-texto, #2A2A28);
          cursor: pointer;
          padding: 4px 8px;
          border-radius: 6px;
          transition: background 0.15s ease;
        }

        .leyenda-item:hover {
          background: var(--color-fondo-suave, #F1EFE8);
        }

        .leyenda-item.activa {
          background: var(--color-fondo-suave, #F1EFE8);
          font-weight: 700;
        }

        .leyenda-color {
          width: 16px;
          height: 16px;
          border-radius: 4px;
          flex-shrink: 0;
          border: 1px solid rgba(0,0,0,0.1);
        }

        .panel {
          display: none;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          margin-top: 1.5rem;
          padding: 1rem 1.5rem;
          background-color: var(--color-fondo-card, #fff);
          border: 1px solid var(--color-borde, #D3D1C7);
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.08);
          width: 100%;
          max-width: 720px;
          font-weight: 600;
          font-size: 1.1rem;
          color: var(--color-primario-oscuro, #085041);
          animation: fadeIn 0.25s ease;
        }

        .panel.visible { display: flex; }

        .panel-info {
          display: flex;
          flex-direction: column;
          gap: 0.15rem;
        }

        .panel-region {
          font-size: 1.15rem;
          font-weight: 700;
        }

        .panel-descripcion {
          font-size: 0.875rem;
          font-weight: 400;
          color: var(--color-texto-suave, #5F5E5A);
          max-width: 380px;
          line-height: 1.4;
        }

        .panel-acciones {
          display: flex;
          gap: 0.5rem;
          flex-shrink: 0;
        }

        .btn-ver {
          background: linear-gradient(135deg, var(--color-primario, #0F6E56) 0%, var(--color-primario-oscuro, #085041) 100%);
          color: white;
          padding: 0.6rem 1.5rem;
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
          background: var(--color-fondo-suave, #F1EFE8);
          color: var(--color-texto-suave, #5F5E5A);
          padding: 0.6rem 1rem;
          border-radius: 8px;
          font-size: 0.875rem;
          border: 1px solid var(--color-borde, #D3D1C7);
          cursor: pointer;
          transition: background 0.15s ease;
          font-family: inherit;
        }

        .btn-reset:hover {
          background: var(--color-borde-claro, #E8E6DD);
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        @media (max-width: 600px) {
          .panel { flex-direction: column; align-items: flex-start; }
          .titulo { font-size: 1.5rem; }
          object { height: 420px; }
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

    // Indexar canton → región
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
        const regionObj = this._config.regiones.find(r => r.id === item.dataset.region);
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
      const region = this._config.regiones.find(r => r.id === this._regionActiva);
      this.dispatchEvent(new CustomEvent("region-seleccionada", {
        bubbles: true,
        composed: true,
        detail: {
          regionId: region.id,
          regionNombre: region.nombre
        }
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

  // ── Aplicar estilos e interacciones a cada path ────────────────────────────

  _aplicarInteracciones(svgDoc, tooltip) {
    svgDoc.documentElement.setAttribute("viewBox", this._config.viewBox);

    const sinMapear = [];

    svgDoc.querySelectorAll("path").forEach(path => {
      const idCanton = this._resolverIdCanton(path);

      if (!idCanton) {
        const label = path.getAttribute("inkscape:label") || "";
        sinMapear.push({ id: path.id || "(sin id)", label: label || "(sin label)" });
        path.style.fill        = "#e5e7eb";
        path.style.stroke      = "#ffffff";
        path.style.strokeWidth = "0.3";
        return;
      }

      const region = this._cantonToRegion.get(idCanton);

      if (!this._regionToPaths.has(region.id)) {
        this._regionToPaths.set(region.id, []);
      }
      this._regionToPaths.get(region.id).push(path);

      path.style.fill           = region.color;
      path.style.stroke         = "#ffffff";
      path.style.strokeWidth    = "0.3";
      path.style.transition     = "fill 0.2s ease, opacity 0.2s ease";
      path.style.cursor         = "pointer";
      path.dataset.regionId     = region.id;
      path.dataset.cantonId     = idCanton;
      path.dataset.cantonNombre = region.cantonNombre;

      path.addEventListener("mouseover", (e) => {
        this._resaltarRegion(region.id);
        tooltip.innerHTML = `
          ${region.cantonNombre}
          <span class="tooltip-region">Región ${region.nombre}</span>
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

    const paths = this._regionToPaths.get(region.id);
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

    this._regionActiva = region.id;
    nombreRegion.textContent = `Región ${region.nombre}`;
    descRegion.textContent   = region.descripcion || "";
    btnVer.textContent       = `Ver destinos →`;
    btnVer.disabled          = false;
    panel.classList.add("visible");

    itemsLeyenda.forEach(i => {
      i.classList.toggle("activa", i.dataset.region === region.id);
    });

    this._resaltarRegion(region.id);
  }

  // ── Helpers de resaltado ───────────────────────────────────────────────────

  _resaltarRegion(regionId) {
    this._regionToPaths.forEach((paths, id) => {
      const opacidad = (id === regionId) ? "1" : "0.35";
      paths.forEach(p => { p.style.opacity = opacidad; });
    });
  }

  _quitarResaltado() {
    if (this._regionActiva) {
      this._resaltarRegion(this._regionActiva);
      return;
    }
    this._regionToPaths.forEach(paths => {
      paths.forEach(p => { p.style.opacity = "1"; });
    });
  }

  _moverTooltip(e, tooltip) {
    tooltip.style.left = e.clientX + 14 + "px";
    tooltip.style.top  = e.clientY + 14 + "px";
  }
}

customElements.define("mapa-interactivo", MapaInteractivo);