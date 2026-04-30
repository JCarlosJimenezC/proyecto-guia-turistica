/**
 * <app-header>
 * Custom Element: Barra de navegación principal de la guía turística.
 *
 * Funcionalidad:
 * - Muestra el nombre de la guía y el menú de regiones disponibles.
 * - Resalta visualmente la región activa según el atributo "active-region".
 *   Si "active-region" está vacío o no existe, no se resalta ningún tab
 *   (caso típico: el usuario está en la vista del mapa).
 * - Emite un CustomEvent('region-selected') al hacer clic en una región.
 * - Emite un CustomEvent('volver-mapa') al hacer clic en el logo o en el
 *   nombre de la guía.
 *
 * Atributo observado: active-region
 *
 * Eventos emitidos:
 *   - 'region-selected' → detail: { region: string }
 *   - 'volver-mapa'     → sin detail
 *
 * Uso:
 *   <app-header active-region="Chorotega"></app-header>
 *   <app-header></app-header>  (ninguna región activa)
 *
 * @author Grupo 5 - IF7102
 */

class AppHeader extends HTMLElement {

  static get observedAttributes() {
    return ["active-region"];
  }

  constructor() {
    super();
    this.attachShadow({ mode: "open" });

    this.regiones = [
      { region: "Chorotega",        label: "Chorotega" },
      { region: "Huetar Norte",     label: "Huetar Norte" },
      { region: "Huetar Atlántica", label: "Huetar Atlántica" },
      { region: "Central",          label: "Central" },
      { region: "Pacífico Central", label: "Pacífico Central" },
      { region: "Brunca",           label: "Brunca" }
    ];
  }

  connectedCallback() {
    this.render();
  }

  attributeChangedCallback(nombre, valorAnterior, valorNuevo) {
    if (valorAnterior !== valorNuevo && this.isConnected) {
      this.actualizarRegionActiva();
    }
  }

  get activeRegion() {
    return this.getAttribute("active-region") || null;
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          width: 100%;
        }

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
          max-width: 1400px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1.5rem;
          flex-wrap: wrap;
        }

        .logo {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          font-size: 1.25rem;
          font-weight: 600;
          flex-shrink: 0;
          letter-spacing: 0.01em;
          background: none;
          border: none;
          color: inherit;
          cursor: pointer;
          padding: 0.25rem 0.5rem;
          border-radius: 8px;
          transition: background 0.2s ease, transform 0.15s ease;
          font-family: inherit;
        }

        .logo:hover {
          background: rgba(255, 255, 255, 0.1);
          transform: translateY(-1px);
        }

        .logo:focus-visible {
          outline: 2px solid #FFFFFF;
          outline-offset: 2px;
        }

        .logo-icono {
          height: 42px;
          width: 42px;
          object-fit: contain;
          mix-blend-mode: screen;
          border-radius: 6px;
          flex-shrink: 0;
        }

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

        /* ── HAMBURGUESA: solo visible en móvil ── */
        .btn-hamburguesa {
          display: none;
          flex-direction: column;
          justify-content: center;
          gap: 5px;
          background: none;
          border: none;
          cursor: pointer;
          padding: 8px;
          border-radius: 8px;
          transition: background 0.2s ease;
          flex-shrink: 0;
        }

        .btn-hamburguesa:hover {
          background: rgba(255, 255, 255, 0.1);
        }

        .btn-hamburguesa span {
          display: block;
          width: 24px;
          height: 2px;
          background: #FFFFFF;
          border-radius: 2px;
          transition: all 0.25s ease;
        }

        /* Animación a X cuando el menú está abierto */
        .btn-hamburguesa.abierto span:nth-child(1) {
          transform: translateY(7px) rotate(45deg);
        }
        .btn-hamburguesa.abierto span:nth-child(2) {
          opacity: 0;
          transform: scaleX(0);
        }
        .btn-hamburguesa.abierto span:nth-child(3) {
          transform: translateY(-7px) rotate(-45deg);
        }

        /* ── RESPONSIVE ── */
        @media (max-width: 768px) {
          .header {
            padding: 0.75rem 1rem;
          }

          .header-contenido {
            flex-wrap: nowrap;
            gap: 0.5rem;
          }

          /* Mostrar hamburguesa, ocultar nav horizontal */
          .btn-hamburguesa {
            display: flex;
          }

          .nav-regiones {
            display: none;
            position: absolute;
            top: 100%;
            left: 0;
            right: 0;
            flex-direction: column;
            background: linear-gradient(
              135deg,
              var(--color-primario-oscuro, #085041) 0%,
              var(--color-primario, #0F6E56) 100%
            );
            padding: 1rem;
            gap: 0.5rem;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
            z-index: 99;
          }

          .nav-regiones.abierta {
            display: flex;
          }

          .tab-region {
            text-align: left;
            padding: 0.75rem 1rem;
            border-radius: 8px;
            font-size: 1rem;
            justify-content: flex-start;
          }

          /* El header necesita position relative para que el menú se ancle */
          .header {
            position: sticky;
            top: 0;
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

          <button class="logo" id="btn-logo" aria-label="Volver al mapa">
            <img class="logo-icono" src="assets/img/Logo.png" alt="">
            <span>Guía Turística CR</span>
          </button>

          <!-- Botón hamburguesa (solo visible en móvil) -->
          <button class="btn-hamburguesa" id="btn-menu" aria-label="Abrir menú" aria-expanded="false">
            <span></span>
            <span></span>
            <span></span>
          </button>

          <nav class="nav-regiones" id="nav-regiones" role="navigation" aria-label="Regiones turísticas">
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

  agregarEventos() {
    // Botones de región
    const botones = this.shadowRoot.querySelectorAll(".tab-region");
    botones.forEach(boton => {
      boton.addEventListener("click", (ev) => {
        const region = ev.currentTarget.dataset.region;
        this.cerrarMenu(); // cierra el menú al seleccionar
        this.seleccionarRegion(region);
      });
    });

    // Logo: clic emite "volver-mapa"
    const btnLogo = this.shadowRoot.getElementById("btn-logo");
    if (btnLogo) {
      btnLogo.addEventListener("click", () => {
        this.cerrarMenu();
        this.dispatchEvent(new CustomEvent("volver-mapa", {
          bubbles: true,
          composed: true
        }));
      });
    }

    // Hamburguesa: toggle del menú
    const btnMenu = this.shadowRoot.getElementById("btn-menu");
    const nav     = this.shadowRoot.getElementById("nav-regiones");
    if (btnMenu && nav) {
      btnMenu.addEventListener("click", () => {
        const estaAbierto = nav.classList.toggle("abierta");
        btnMenu.classList.toggle("abierto", estaAbierto);
        btnMenu.setAttribute("aria-expanded", estaAbierto);
      });
    }
  }

  cerrarMenu() {
    const btnMenu = this.shadowRoot.getElementById("btn-menu");
    const nav     = this.shadowRoot.getElementById("nav-regiones");
    if (nav)     nav.classList.remove("abierta");
    if (btnMenu) {
      btnMenu.classList.remove("abierto");
      btnMenu.setAttribute("aria-expanded", "false");
    }
  }

  seleccionarRegion(region) {
    this.setAttribute("active-region", region);

    this.dispatchEvent(new CustomEvent("region-selected", {
      bubbles: true,
      composed: true,
      detail: { region: region }
    }));
  }

  actualizarRegionActiva() {
    const botones = this.shadowRoot.querySelectorAll(".tab-region");
    const activa  = this.activeRegion;
    botones.forEach(boton => {
      const esActiva = activa !== null && boton.dataset.region === activa;
      boton.classList.toggle("activa", esActiva);
      boton.setAttribute("aria-current", esActiva ? "page" : "false");
    });
  }
}

customElements.define("app-header", AppHeader);