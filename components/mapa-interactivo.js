/**
 * <mapa-interactivo>
 * Custom Element: Mapa interactivo de Costa Rica.
 *
 * Carga su configuración desde /data/mapa.json de forma autónoma.
 * Al seleccionar una provincia hace zoom y muestra un panel con
 * el botón "Ver destinos".
 *
 * Eventos emitidos:
 *   - 'provincia-seleccionada' → detail: { region: string, nombre: string }
 *
 * Uso:
 *   <mapa-interactivo></mapa-interactivo>
 *
 * @author Grupo 5 - IF7102
 */

class MapaInteractivo extends HTMLElement {

  constructor() {
    super();
    this.attachShadow({ mode: "open" });

    // Estado interno
    this._config        = null;
    this._selectedPath  = null;
    this._regionSel     = null;
    this._nombreSel     = null;
  }

  // ── Ciclo de vida ──────────────────────────────────────────────────────────

  async connectedCallback() {
    await this._cargarConfig();
    this._render();
    this._inicializarMapa();
  }

  // ── Carga de configuración ─────────────────────────────────────────────────

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

  // ── Render del Shadow DOM ──────────────────────────────────────────────────

  _render() {
    if (!this._config) {
      this.shadowRoot.innerHTML = `<p style="color:red">Error al cargar el mapa.</p>`;
      return;
    }

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
          background-color: #0a1345;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 4px 16px rgba(0,0,0,0.12);
        }

        object {
          display: block;
          width: 100%;
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
          font-weight: 700;
          z-index: 200;
          backdrop-filter: blur(4px);
          font-family: inherit;
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

        .panel.visible {
          display: flex;
        }

        .panel-acciones {
          display: flex;
          gap: 0.5rem;
        }

        .btn-ver {
          background: linear-gradient(135deg, var(--color-primario, #0F6E56) 0%, var(--color-primario-oscuro, #085041) 100%);
          color: white;
          padding: 0.5rem 1.5rem;
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
          padding: 0.5rem 1rem;
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
        }
      </style>

      <h2 class="titulo">Explorá Costa Rica</h2>
      <p class="subtitulo">Seleccioná una provincia para comenzar</p>

      <div class="mapa-wrapper">
        <object
          id="crmap"
          data="${this._config.svgPath}"
          type="image/svg+xml"
          width="100%"
          height="580"
        >Tu navegador no soporta SVG.</object>
        <div id="tooltip"></div>
      </div>

      <div id="panel" class="panel">
        <span id="nombre-prov"></span>
        <div class="panel-acciones">
          <button id="btn-ver" class="btn-ver">Ver destinos →</button>
          <button id="btn-reset" class="btn-reset">Reiniciar zoom</button>
        </div>
      </div>
    `;
  }

  // ── Lógica del mapa ────────────────────────────────────────────────────────

  _inicializarMapa() {
    if (!this._config) return;

    const sr         = this.shadowRoot;
    const mapObject  = sr.getElementById("crmap");
    const tooltip    = sr.getElementById("tooltip");
    const panel      = sr.getElementById("panel");
    const nombreProv = sr.getElementById("nombre-prov");
    const btnVer     = sr.getElementById("btn-ver");
    const btnReset   = sr.getElementById("btn-reset");

    const viewBox    = this._config.viewBox;
    // Construir lookup id → { nombre, region } desde el JSON
    const lookup = {};
    this._config.provincias.forEach(p => { lookup[p.id] = p; });

    const aplicarInteracciones = (svgDoc) => {
      if (!svgDoc) return;
      svgDoc.documentElement.setAttribute("viewBox", viewBox);

      svgDoc.querySelectorAll("path[id]").forEach((path) => {
        path.style.fill        = "#9790ee";
        path.style.stroke      = "#f4f4fd";
        path.style.strokeWidth = "2";
        path.style.transition  = "fill 0.2s ease";

        path.addEventListener("mouseover", (e) => {
          if (this._selectedPath !== path) path.style.fill = "#202060";
          path.style.cursor = "pointer";
          tooltip.textContent   = lookup[path.id]?.nombre || path.id;
          tooltip.style.display = "block";
          this._moverTooltip(e, tooltip);
        });

        path.addEventListener("mousemove", (e) => this._moverTooltip(e, tooltip));

        path.addEventListener("mouseout", () => {
          if (this._selectedPath !== path) path.style.fill = "#9790ee";
          tooltip.style.display = "none";
        });

        path.addEventListener("click", () => {
          if (this._selectedPath && this._selectedPath !== path) {
            this._selectedPath.style.fill = "#9790ee";
          }
          this._selectedPath = path;
          path.style.fill = "#202060";

          // Zoom
          const bbox   = path.getBBox();
          const margin = 40;
          svgDoc.documentElement.setAttribute(
            "viewBox",
            `${bbox.x - margin} ${bbox.y - margin} ${bbox.width + margin * 2} ${bbox.height + margin * 2}`
          );

          // Datos de la provincia desde el JSON
          const prov = lookup[path.id];
          this._regionSel  = prov?.region  || null;
          this._nombreSel  = prov?.nombre  || path.id;

          nombreProv.textContent = this._nombreSel;
          btnVer.textContent     = `Ver destinos de ${this._nombreSel} →`;
          btnVer.disabled        = !this._regionSel;
          panel.classList.add("visible");
        });
      });
    };

    // Reset zoom
    btnReset.addEventListener("click", () => {
      const svgDoc = mapObject.contentDocument || mapObject.getSVGDocument();
      if (svgDoc) svgDoc.documentElement.setAttribute("viewBox", viewBox);
      if (this._selectedPath) {
        this._selectedPath.style.fill = "#9790ee";
        this._selectedPath = null;
      }
      this._regionSel = null;
      this._nombreSel = null;
      panel.classList.remove("visible");
    });

    // Ver destinos → emite evento hacia app.js
    btnVer.addEventListener("click", () => {
      if (!this._regionSel) return;
      this.dispatchEvent(new CustomEvent("provincia-seleccionada", {
        bubbles: true,
        composed: true,
        detail: { region: this._regionSel, nombre: this._nombreSel }
      }));
    });

    // Cargar SVG
    const onLoad = () => {
      const svgDoc = mapObject.contentDocument || mapObject.getSVGDocument();
      aplicarInteracciones(svgDoc);
    };

    mapObject.addEventListener("load", onLoad);
    if (mapObject.contentDocument || mapObject.getSVGDocument()) onLoad();
  }

  _moverTooltip(e, tooltip) {
    tooltip.style.left = e.clientX + 14 + "px";
    tooltip.style.top  = e.clientY + 14 + "px";
  }
}

customElements.define("mapa-interactivo", MapaInteractivo);