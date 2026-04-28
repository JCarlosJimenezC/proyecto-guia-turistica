/**
 * <app-header>
 * Custom Element: Barra de navegación principal de la guía turística.
 *
 * Funcionalidad:
 * - Muestra el nombre de la guía y el menú de regiones disponibles.
 * - Resalta visualmente la región activa según el atributo "active-region".
 * - Emite un CustomEvent('region-selected') al hacer clic en una región.
 *
 * Atributo observado: active-region
 *
 * Eventos emitidos:
 *   - 'region-selected' → detail: { region: string }
 *
 * Uso:
 *   <app-header active-region="Chorotega"></app-header>
 *
 * @author Grupo 5 - IF7102
 */

class AppHeader extends HTMLElement {

  // ===== ATRIBUTOS OBSERVADOS =====
  static get observedAttributes() {
    return ["active-region"];
  }

  // ===== CONSTRUCTOR =====
  constructor() {
    super();
    this.attachShadow({ mode: "open" });

    // Lista de regiones disponibles
    // 'region' = identificador interno (coincide con el JSON)
    // 'label'  = nombre amigable que ve el usuario
    this.regiones = [
      { region: "Chorotega",        label: "Chorotega" },
      { region: "Huetar Norte",     label: "Huetar Norte" },
      { region: "Huetar Atlántica", label: "Huetar Atlántica" },
      { region: "Central",          label: "Central" },
      { region: "Pacífico Central", label: "Pacífico Central" },
      { region: "Brunca",           label: "Brunca" }
    ];
  }

  // ===== CICLO DE VIDA =====

  connectedCallback() {
    this.render();
  }

  attributeChangedCallback(nombre, valorAnterior, valorNuevo) {
    if (valorAnterior !== valorNuevo && this.isConnected) {
      this.actualizarRegionActiva();
    }
  }

  // ===== GETTERS =====
  get activeRegion() {
    return this.getAttribute("active-region") || "Chorotega";
  }

  // ===== RENDERIZADO =====

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          width: 100%;
        }

        /* === HEADER PRINCIPAL === */
        .header {
          background: linear-gradient(
            135deg,
            var(--color-primario-oscuro, #085041) 0%,
            var(--color-primario, #0F6E56) 100%
          );
          color: #FFFFFF;
          padding: 1rem 1.5rem;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
          position: sticky;
          top: 0;
          z-index: 100;
        }

        .header-contenido {
          max-width: 1200px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1.5rem;
          flex-wrap: wrap;
        }

        /* === LOGO === */
        .logo {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 1.25rem;
          font-weight: 600;
          flex-shrink: 0;
          letter-spacing: 0.01em;
        }

        .logo-icono {
          height: 42px;
          width: 42px;
          object-fit: contain;
          mix-blend-mode: screen;
          border-radius: 6px;
          flex-shrink: 0;
        }

        /* === NAVEGACIÓN DE REGIONES === */
        .nav-regiones {
          display: flex;
          gap: 0.5rem;
          overflow-x: auto;
          scrollbar-width: none;
          -ms-overflow-style: none;
          padding: 0.25rem 0;
          flex-grow: 1;
          justify-content: flex-end;
        }

        .nav-regiones::-webkit-scrollbar {
          display: none;
        }

        /* === TABS DE REGIÓN === */
        .tab-region {
          background-color: rgba(255, 255, 255, 0.1);
          color: #FFFFFF;
          border: 1px solid transparent;
          padding: 0.5rem 1.25rem;
          border-radius: 999px;
          font-size: 0.9rem;
          font-weight: 500;
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.2s ease;
          font-family: inherit;
        }

        .tab-region:hover {
          background-color: rgba(255, 255, 255, 0.2);
          transform: translateY(-1px);
        }

        .tab-region:focus-visible {
          outline: 2px solid #FFFFFF;
          outline-offset: 2px;
        }

        /* Estado activo */
        .tab-region.activa {
          background-color: var(--color-secundario, #BA7517);
          color: #FFFFFF;
          font-weight: 600;
          box-shadow: 0 2px 8px rgba(186, 117, 23, 0.4);
        }

        .tab-region.activa:hover {
          background-color: var(--color-secundario, #BA7517);
          transform: translateY(-1px);
          filter: brightness(1.1);
        }

        /* === RESPONSIVE === */
        @media (max-width: 768px) {
          .header {
            padding: 0.75rem 1rem;
          }

          .header-contenido {
            gap: 0.75rem;
            justify-content: flex-start;
          }

          .logo {
            font-size: 1.1rem;
            width: 100%;
          }

          .nav-regiones {
            width: 100%;
            justify-content: flex-start;
          }

          .tab-region {
            padding: 0.4rem 1rem;
            font-size: 0.85rem;
          }
        }

        @media (max-width: 480px) {
          .logo span:not(.logo-icono) {
            font-size: 1rem;
          }
        }
      </style>

      <header class="header" role="banner">
        <div class="header-contenido">

          <!-- Logo y nombre de la guía -->
          <div class="logo">
            <img class="logo-icono" src="assets/img/Logo.png" alt="Logo Guía Turística CR">
            <span>Guía Turística CR</span>
          </div>

          <!-- Navegación de regiones -->
          <nav class="nav-regiones" role="navigation" aria-label="Regiones turísticas">
            ${this.regiones.map(r => `
              <button
                class="tab-region ${r.region === this.activeRegion ? 'activa' : ''}"
                data-region="${r.region}"
                aria-label="Ver destinos de ${r.label}"
                aria-current="${r.region === this.activeRegion ? 'page' : 'false'}">
                ${r.label}
              </button>
            `).join("")}
          </nav>

        </div>
      </header>
    `;

    this.agregarEventos();
  }

  // ===== MANEJO DE EVENTOS =====

  agregarEventos() {
    const botones = this.shadowRoot.querySelectorAll(".tab-region");
    botones.forEach(boton => {
      boton.addEventListener("click", (ev) => {
        const region = ev.currentTarget.dataset.region;
        this.seleccionarRegion(region);
      });
    });
  }

  seleccionarRegion(region) {
    // Actualiza el atributo (esto disparará attributeChangedCallback)
    this.setAttribute("active-region", region);

    // Emite el CustomEvent que escucha el index.html
    const evento = new CustomEvent("region-selected", {
      bubbles: true,
      composed: true,
      detail: { region: region }
    });
    this.dispatchEvent(evento);
  }

  // Actualiza visualmente cuál tab está activa sin re-renderizar todo
  actualizarRegionActiva() {
    const botones = this.shadowRoot.querySelectorAll(".tab-region");
    botones.forEach(boton => {
      const esActiva = boton.dataset.region === this.activeRegion;
      boton.classList.toggle("activa", esActiva);
      boton.setAttribute("aria-current", esActiva ? "page" : "false");
    });
  }
}

// Registra el Custom Element con el navegador
customElements.define("app-header", AppHeader);