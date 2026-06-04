class DestinoDetalle extends HTMLElement {

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._data = null;
  }

  connectedCallback() {
    if (this._data) this._render();
  }

  set destino(data) {
    this._data = data;
    if (this.isConnected) this._render();
  }

  get destino() {
    return this._data;
  }

  _render() {
    const d = this._data;
    if (!d) {
      this.shadowRoot.innerHTML = `<p class="error">Destino no encontrado</p>`;
      return;
    }

    const galeriaImgs = JSON.stringify(d.galeria || []);

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          width: 100%;
          font-family: var(--font-principal, sans-serif);
        }

        .detalle {
          display: flex;
          flex-direction: column;
          gap: 2rem;
          padding-bottom: 2rem;
        }

        /* === PORTADA === */
        .portada {
          width: 100%;
          max-height: 420px;
          border-radius: var(--radio-lg, 12px);
          overflow: hidden;
          position: relative;
          background-color: var(--color-fondo-suave, #F1EFE8);
        }

        .portada-img {
          width: 100%;
          height: 100%;
          max-height: 420px;
          object-fit: cover;
          display: block;
        }

        .portada-placeholder {
          width: 100%;
          height: 280px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--color-texto-tenue, #888780);
          font-size: 4rem;
          background: linear-gradient(135deg, var(--color-fondo-suave, #F1EFE8), var(--color-borde-claro, #E8E6DD));
        }

        .portada-overlay {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          background: linear-gradient(to top, rgba(0, 0, 0, 0.7), transparent);
          padding: 2.5rem 1.5rem 1.5rem;
        }

        .portada-titulo {
          color: #FFFFFF;
          font-size: 2.2rem;
          font-weight: 700;
          margin: 0 0 0.25rem;
          letter-spacing: -0.02em;
        }

        .portada-subtitulo {
          color: rgba(255, 255, 255, 0.85);
          font-size: 1rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        .portada-badge {
          background: rgba(15, 110, 86, 0.85);
          backdrop-filter: blur(4px);
          padding: 0.2rem 0.75rem;
          border-radius: 999px;
          font-size: 0.8rem;
          font-weight: 600;
        }

        /* === CONTENIDO EN REJILLA (2 columnas en desktop) === */
        .contenido-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 2rem;
        }

        @media (max-width: 768px) {
          .contenido-grid {
            grid-template-columns: 1fr;
          }
          .portada-titulo {
            font-size: 1.6rem;
          }
        }

        /* === SECCIONES === */
        .seccion {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .seccion-titulo {
          font-size: 1.1rem;
          font-weight: 700;
          color: var(--color-primario, #0F6E56);
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding-bottom: 0.5rem;
          border-bottom: 2px solid var(--color-borde-claro, #E8E6DD);
        }

        .seccion-titulo .icono {
          font-size: 1.2rem;
        }

        .descripcion {
          color: var(--color-texto, #2C2C2A);
          line-height: 1.75;
          font-size: 0.95rem;
        }

        .actividades {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          list-style: none;
          padding: 0;
        }

        .actividad-badge {
          background-color: var(--color-fondo-suave, #F1EFE8);
          color: var(--color-texto, #2C2C2A);
          padding: 0.4rem 0.9rem;
          border-radius: 999px;
          font-size: 0.85rem;
          font-weight: 500;
          border: 1px solid var(--color-borde-claro, #E8E6DD);
          transition: all 0.2s ease;
        }

        .actividad-badge:hover {
          border-color: var(--color-primario, #0F6E56);
          color: var(--color-primario, #0F6E56);
        }

        .info-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
          gap: 1rem;
        }

        .info-item {
          background: var(--color-fondo-suave, #F1EFE8);
          border-radius: var(--radio-md, 8px);
          padding: 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .info-label {
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          color: var(--color-texto-tenue, #888780);
          font-weight: 600;
        }

        .info-valor {
          font-size: 0.95rem;
          font-weight: 600;
          color: var(--color-texto, #2C2C2A);
        }

        .error {
          text-align: center;
          padding: 2rem;
          color: var(--color-acento, #D85A30);
          font-weight: 500;
        }
      </style>

      <article class="detalle">

        <!-- PORTADA -->
        <div class="portada">
          ${d.imagen_portada
            ? `<img class="portada-img" src="${d.imagen_portada}" alt="${d.nombre}" loading="eager" onerror="this.style.display='none'; const ph=document.createElement('div'); ph.className='portada-placeholder'; ph.innerHTML='&#127965;'; this.parentElement.insertBefore(ph, this)">`
            : `<div class="portada-placeholder" aria-hidden="true">&#127965;</div>`
          }
          <div class="portada-overlay">
            <h1 class="portada-titulo">${d.nombre}</h1>
            <div class="portada-subtitulo">
              <span>${d.region || ''}</span>
              ${d.zona_turistica ? `<span class="portada-badge">${d.zona_turistica}</span>` : ''}
              <span>·</span>
              <span>${d.provincia || ''}</span>
              <span>·</span>
              <span>${d.canton || ''}</span>
            </div>
          </div>
        </div>

        <!-- CONTENIDO PRINCIPAL (2 columnas) -->
        <div class="contenido-grid">

          <!-- íconos decorativos eliminados de los títulos de sección -->
          <!-- COLUMNA IZQUIERDA -->
          <div class="seccion">
            <div class="seccion-titulo">
              Acerca de
            </div>
            <p class="descripcion">${d.descripcion || 'Sin descripción disponible.'}</p>

            <div class="seccion-titulo" style="margin-top: 1rem;">
              Actividades
            </div>
            <ul class="actividades">
              ${(d.actividades || []).map(a => `<li class="actividad-badge">${a}</li>`).join("")}
            </ul>

            <div class="seccion-titulo" style="margin-top: 1rem;">
              Ubicación
            </div>
            <div class="info-grid">
              <div class="info-item">
                <span class="info-label">Provincia</span>
                <span class="info-valor">${d.provincia || '—'}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Cantón</span>
                <span class="info-valor">${d.canton || '—'}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Zona Turística</span>
                <span class="info-valor">${d.zona_turistica || '—'}</span>
              </div>
            </div>
          </div>

          <!-- COLUMNA DERECHA -->
          <div class="seccion">
            <div class="seccion-titulo">
              Galería de imágenes
            </div>
            <galeria-imagenes imagenes='${galeriaImgs}'></galeria-imagenes>

            <div class="seccion-titulo" style="margin-top: 1.5rem;">
              Audio guía
            </div>
           <audio-guia
              src="${d.audio || ''}"
              label="${d.nombre ? 'Guía narrada de ' + d.nombre : ''}">
            </audio-guia>

            ${d.video ? `
            <div class="seccion-titulo" style="margin-top: 1.5rem;">
              Video del destino
            </div>
            <video-destino
              src="${d.video}"
              poster="${d.imagen_portada || ''}"
              label="${d.nombre ? 'Video de ' + d.nombre : 'Video del destino'}">
            </video-destino>
            ` : ''}
          </div>

        </div>

      </article>
    `;
  }
}

customElements.define("destino-detalle", DestinoDetalle);
