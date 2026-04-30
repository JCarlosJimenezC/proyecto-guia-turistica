/**
 * <destino-card>
 * Custom Element: Tarjeta resumen de un destino turístico.
 *
 * Funcionalidad:
 * - Muestra una tarjeta con imagen de portada, nombre y región del destino.
 * - Estilos completamente encapsulados con Shadow DOM.
 * - Al hacer clic emite un CustomEvent('destino-selected') con el ID del destino.
 *
 * Atributos observados:
 *   - destino-id: identificador único del destino
 *   - nombre: nombre del destino
 *   - imagen: ruta de la imagen de portada
 *   - region: nombre de la región turística
 *
 * Eventos emitidos:
 *   - 'destino-selected' → detail: { id: string }
 *
 * Uso:
 *   <destino-card
 *     destino-id="chorotega-001"
 *     nombre="Tamarindo"
 *     imagen="assets/img/tamarindo.jpg"
 *     region="Pacífico Norte">
 *   </destino-card>
 *
 * @author Grupo 1 - IF7102
 */

class DestinoCard extends HTMLElement {

  // ===== ATRIBUTOS OBSERVADOS =====
  static get observedAttributes() {
    return ["destino-id", "nombre", "imagen", "region"];
  }

  // ===== CONSTRUCTOR =====
  constructor() {
    super();
    // Shadow DOM en modo "open" para encapsular estilos
    this.attachShadow({ mode: "open" });
  }

  // ===== CICLO DE VIDA =====

  // Se ejecuta cuando el componente se inserta en el DOM
  connectedCallback() {
    this.render();
    this.agregarEventos();
  }

  // Se ejecuta cuando cambia un atributo observado
  attributeChangedCallback(nombre, valorAnterior, valorNuevo) {
    // Solo re-renderiza si ya estaba conectado y el valor cambió
    if (valorAnterior !== valorNuevo && this.isConnected) {
      this.render();
      this.agregarEventos();
    }
  }

  // ===== GETTERS DE ATRIBUTOS =====
  get destinoId() {
    return this.getAttribute("destino-id") || "";
  }

  get nombre() {
    return this.getAttribute("nombre") || "Destino sin nombre";
  }

  get imagen() {
    return this.getAttribute("imagen") || "";
  }

  get region() {
    return this.getAttribute("region") || "";
  }

  // ===== RENDERIZADO =====

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        /* === HOST === */
        :host {
          display: block;
          width: 100%;
          height: 100%;
        }

        /* === TARJETA === */
        .card {
          background-color: var(--color-fondo-card, #FFFFFF);
          border: 1px solid var(--color-borde-claro, #E8E6DD);
          border-radius: var(--radio-lg, 12px);
          overflow: hidden;
          cursor: pointer;
          transition: transform 0.25s ease, box-shadow 0.25s ease;
          height: 100%;
          display: flex;
          flex-direction: column;
          font-family: var(--font-principal, sans-serif);
        }

        .card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
          border-color: var(--color-primario, #0F6E56);
        }

        .card:focus-visible {
          outline: 3px solid var(--color-primario, #0F6E56);
          outline-offset: 2px;
        }

        /* === IMAGEN === */
        .imagen-contenedor {
          width: 100%;
          height: 200px;
          background-color: var(--color-fondo-suave, #F1EFE8);
          overflow: hidden;
          position: relative;
        }

        .imagen {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.4s ease;
        }

        .card:hover .imagen {
          transform: scale(1.05);
        }

        /* Placeholder cuando no hay imagen */
        .imagen-placeholder {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--color-texto-tenue, #888780);
          font-size: 3rem;
          background: linear-gradient(
            135deg,
            var(--color-fondo-suave, #F1EFE8) 0%,
            var(--color-borde-claro, #E8E6DD) 100%
          );
        }

        /* === BADGE DE REGIÓN === */
        .badge-region {
          position: absolute;
          top: 1rem;
          right: 1rem;
          background-color: rgba(15, 110, 86, 0.9);
          color: #FFFFFF;
          padding: 0.25rem 0.75rem;
          border-radius: 999px;
          font-size: 0.75rem;
          font-weight: 600;
          backdrop-filter: blur(4px);
          letter-spacing: 0.02em;
        }

        /* === CONTENIDO === */
        .contenido {
          padding: 1.25rem;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          flex-grow: 1;
        }

        .nombre {
          font-size: 1.25rem;
          font-weight: 600;
          color: var(--color-texto, #2C2C2A);
          margin: 0;
          line-height: 1.3;
        }

        .info {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: var(--color-texto-suave, #5F5E5A);
          font-size: 0.875rem;
        }

        .icono-ubicacion {
          font-size: 1rem;
        }

        .ver-mas {
          margin-top: auto;
          padding-top: 0.75rem;
          color: var(--color-primario, #0F6E56);
          font-size: 0.875rem;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 0.25rem;
          transition: gap 0.2s ease;
        }

        .card:hover .ver-mas {
          gap: 0.5rem;
        }

        /* === RESPONSIVE === */
        @media (max-width: 480px) {
          .imagen-contenedor {
            height: 180px;
          }

          .contenido {
            padding: 1rem;
          }

          .nombre {
            font-size: 1.1rem;
          }
        }
      </style>

      <article
        class="card"
        role="button"
        tabindex="0"
        aria-label="Ver detalles de ${this.nombre}">

        <!-- Contenedor de imagen con badge de región -->
        <div class="imagen-contenedor">
          ${this.imagen ? `
            <img
              class="imagen"
              src="${this.imagen}"
              alt="Vista panorámica de ${this.nombre}"
              loading="lazy"
              onerror="this.style.display='none'; this.parentElement.innerHTML='<div class=&quot;imagen-placeholder&quot;>📍</div>'">
          ` : `
            <div class="imagen-placeholder" aria-hidden="true">📍</div>
          `}

          ${this.region ? `
            <span class="badge-region">${this.region}</span>
          ` : ""}
        </div>

        <!-- Contenido textual -->
        <div class="contenido">
          <h3 class="nombre">${this.nombre}</h3>

          <div class="info">
            <span class="icono-ubicacion" aria-hidden="true">🌎</span>
            <span>Costa Rica</span>
          </div>

          <span class="ver-mas">
            Explorar destino →
          </span>
        </div>

      </article>
    `;
  }

  // ===== MANEJO DE EVENTOS =====

  agregarEventos() {
    const card = this.shadowRoot.querySelector(".card");
    if (!card) return;

    // Click con mouse
    card.addEventListener("click", () => this.emitirSeleccion());

    // Soporte de teclado (Enter o Espacio)
    card.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter" || ev.key === " ") {
        ev.preventDefault();
        this.emitirSeleccion();
      }
    });
  }

  emitirSeleccion() {
    const evento = new CustomEvent("destino-selected", {
      bubbles: true,    // Sube por el árbol del DOM
      composed: true,   // Atraviesa el Shadow DOM
      detail: { id: this.destinoId }
    });
    this.dispatchEvent(evento);
  }
}

// Registra el Custom Element con el navegador
customElements.define("destino-card", DestinoCard);