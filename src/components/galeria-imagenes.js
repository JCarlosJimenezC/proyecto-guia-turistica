/**
 * <galeria-imagenes>
 * Custom Element: Galería de imágenes con navegación anterior/siguiente.
 *
 * Atributos observados:
 *   - imagenes: array JSON serializado con las rutas de imágenes
 *
 * Uso:
 *   <galeria-imagenes
 *     imagenes='["assets/img/tamarindo-1.webp","assets/img/tamarindo-2.webp"]'>
 *   </galeria-imagenes>
 */
class GaleriaImagenes extends HTMLElement {

  static get observedAttributes() {
    return ["imagenes"];
  }

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._imagenes = [];
    this._indice = 0;
    this._teclaHandler = this._onTecla.bind(this);
  }

  connectedCallback() {
    this._parsearImagenes();
    this._render();
    this._agregarEventos();
  }

  attributeChangedCallback(name, oldVal, newVal) {
    if (name === "imagenes" && oldVal !== newVal && this.isConnected) {
      this._parsearImagenes();
      this._render();
      this._agregarEventos();
    }
  }

  _parsearImagenes() {
    try {
      const raw = this.getAttribute("imagenes") || "[]";
      this._imagenes = JSON.parse(raw);
      this._indice = 0;
    } catch (e) {
      this._imagenes = [];
    }
  }

  _navegar(direccion) {
    const total = this._imagenes.length;
    if (!total) return;
    this._indice = (this._indice + direccion + total) % total;
    this._actualizarImagen();
    this._actualizarIndicador();
  }

  _irA(indice) {
    if (indice >= 0 && indice < this._imagenes.length) {
      this._indice = indice;
      this._actualizarImagen();
      this._actualizarIndicador();
    }
  }

  _actualizarImagen() {
    const img = this.shadowRoot.getElementById("img-actual");
    const contador = this.shadowRoot.getElementById("contador");
    if (img) {
      img.style.opacity = "0";
      setTimeout(() => {
        img.src = this._imagenes[this._indice];
        img.alt = `Imagen ${this._indice + 1} de ${this._imagenes.length}`;
        img.style.opacity = "1";
      }, 150);
    }
    if (contador) {
      contador.textContent = `${this._indice + 1} / ${this._imagenes.length}`;
    }
  }

  _actualizarIndicador() {
    const dots = this.shadowRoot.querySelectorAll(".dot");
    dots.forEach((dot, i) => {
      dot.classList.toggle("activo", i === this._indice);
    });
  }

  _render() {
    const total = this._imagenes.length;
    const primera = total ? this._imagenes[0] : "";
    const dots = this._imagenes.map((_, i) =>
      `<button class="dot${i === 0 ? ' activo' : ''}" data-indice="${i}" aria-label="Ir a imagen ${i + 1}"></button>`
    ).join("");

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          width: 100%;
        }

        .galeria {
          position: relative;
          width: 100%;
          border-radius: var(--radio-lg, 12px);
          overflow: hidden;
          background-color: var(--color-fondo-suave, #F1EFE8);
          aspect-ratio: 16 / 10;
        }

        .galeria.single .flecha,
        .galeria.single .dots {
          display: none;
        }

        .imagen-contenedor {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }

        .imagen {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: opacity 0.3s ease;
        }

        .placeholder {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          width: 100%;
          height: 100%;
          color: var(--color-texto-tenue, #888780);
          gap: 0.75rem;
        }

        .placeholder-icono {
          font-size: 3.5rem;
          opacity: 0.5;
        }

        .placeholder-texto {
          font-size: 0.95rem;
          font-style: italic;
        }

        .flecha {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          background: rgba(0, 0, 0, 0.45);
          color: #FFFFFF;
          border: none;
          width: 44px;
          height: 44px;
          border-radius: 50%;
          font-size: 1.2rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          backdrop-filter: blur(4px);
          transition: background 0.2s ease, transform 0.15s ease;
          z-index: 10;
          font-family: inherit;
        }

        .flecha:hover {
          background: rgba(0, 0, 0, 0.7);
          transform: translateY(-50%) scale(1.08);
        }

        .flecha:focus-visible {
          outline: 2px solid #FFFFFF;
          outline-offset: 2px;
        }

        .flecha-izq {
          left: 12px;
        }

        .flecha-der {
          right: 12px;
        }

        .dots {
          position: absolute;
          bottom: 16px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          gap: 8px;
          z-index: 10;
        }

        .dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.5);
          border: none;
          cursor: pointer;
          transition: background 0.2s ease, transform 0.15s ease;
          padding: 0;
        }

        .dot:hover {
          background: rgba(255, 255, 255, 0.8);
          transform: scale(1.15);
        }

        .dot.activo {
          background: #FFFFFF;
          transform: scale(1.2);
          box-shadow: 0 0 6px rgba(255, 255, 255, 0.6);
        }

        .contador {
          position: absolute;
          top: 16px;
          right: 16px;
          background: rgba(0, 0, 0, 0.6);
          color: #FFFFFF;
          padding: 4px 10px;
          border-radius: 999px;
          font-size: 0.8rem;
          z-index: 10;
          backdrop-filter: blur(4px);
        }

        .visually-hidden {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          white-space: nowrap;
          border: 0;
        }

        @media (max-width: 600px) {
          .flecha {
            width: 36px;
            height: 36px;
            font-size: 1rem;
          }
          .contador {
            font-size: 0.7rem;
            padding: 3px 8px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .imagen {
            transition: none;
          }
        }
      </style>

      <div class="galeria${total <= 1 ? ' single' : ''}" role="region" aria-label="Galería de imágenes del destino" aria-roledescription="Carrusel de imágenes">

        ${total
          ? `
            <div class="imagen-contenedor">
              <img
                id="img-actual"
                class="imagen"
                src="${primera}"
                alt="Imagen 1 de ${total}"
                loading="lazy"
                onerror="this.style.display='none'; const ph=this.parentElement; if(!ph.querySelector('.placeholder')){ph.innerHTML='<div class=&quot;placeholder&quot;><span class=&quot;placeholder-icono&quot; aria-hidden=&quot;true&quot;>&amp;#128248;</span><span class=&quot;placeholder-texto&quot;>Imagen no disponible</span></div>'}">
            </div>

            <button class="flecha flecha-izq" aria-label="Imagen anterior">&#8249;</button>
            <button class="flecha flecha-der" aria-label="Imagen siguiente">&#8250;</button>
            <span id="contador" class="contador" aria-live="polite">1 / ${total}</span>
            <div class="dots" role="tablist" aria-label="Navegación de imágenes">${dots}</div>
          `
          : `
            <div class="placeholder" aria-label="Sin imágenes disponibles">
              <span class="placeholder-icono" aria-hidden="true">&#128248;</span>
              <span class="placeholder-texto">Sin imágenes</span>
            </div>
          `
        }

      </div>
    `;
  }

  _agregarEventos() {
    const total = this._imagenes.length;
    if (!total) return;

    const btnIzq = this.shadowRoot.querySelector(".flecha-izq");
    const btnDer = this.shadowRoot.querySelector(".flecha-der");
    const dots = this.shadowRoot.querySelectorAll(".dot");

    if (btnIzq) btnIzq.addEventListener("click", () => this._navegar(-1));
    if (btnDer) btnDer.addEventListener("click", () => this._navegar(1));

    dots.forEach(dot => {
      dot.addEventListener("click", () => {
        const idx = parseInt(dot.dataset.indice, 10);
        this._irA(idx);
      });
    });

    document.addEventListener("keydown", this._teclaHandler);
  }

  _onTecla(e) {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      this._navegar(-1);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      this._navegar(1);
    }
  }

  disconnectedCallback() {
    document.removeEventListener("keydown", this._teclaHandler);
  }
}

customElements.define("galeria-imagenes", GaleriaImagenes);
