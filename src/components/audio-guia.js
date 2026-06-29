/**
 * <audio-guia>
 * Custom Element: reproductor de audio personalizado para la guia narrada de cada destino.
 *
 * Funcionalidad:
 * - Usa el elemento <audio> NATIVO del navegador (creado por codigo con new Audio()).
 * - Dibuja controles propios (boton play/pausa, barra de progreso y tiempos) dentro del Shadow DOM.
 * - Carga el audio dinamicamente con fetch() y libera memoria cuando se destruye.
 *
 * Atributos observados:
 *   - src:   ruta del archivo de audio (ej: assets/audio/cahuita.mp3)
 *   - label: texto descriptivo que se muestra arriba del reproductor
 *
 * @author Grupo 1 - IF7102
 */
class AudioGuia extends HTMLElement {

  // ===== ATRIBUTOS OBSERVADOS =====
  // Solo estos dos atributos disparan attributeChangedCallback cuando cambian.
  static get observedAttributes() {
    return ["src", "label"];
  }

  // ===== CONSTRUCTOR =====
  constructor() {
    super();                                // Llama al constructor de HTMLElement (obligatorio).
    this.attachShadow({ mode: "open" });    // Crea el Shadow DOM: encapsula estilos y marcado.
    this._audio = null;                     // Referencia al elemento <audio> nativo (aun no existe).
    this._rafId = null;                     // Id de la animacion (requestAnimationFrame) de la barra.
    this._blobUrl = null;                   // URL temporal (blob:) del audio descargado, para liberarla luego.
  }

  // ===== CICLO DE VIDA =====
  // Se ejecuta cuando el componente se inserta en la pagina.
  connectedCallback() {
    this._render();             // 1) Pinta el HTML del reproductor.
    this._inicializarAudio();   // 2) Crea el objeto Audio y lo carga.
    this._agregarEventos();     // 3) Engancha los clics del boton y la barra.
  }

  // Se ejecuta cada vez que cambia un atributo observado (src o label).
  attributeChangedCallback(name, oldVal, newVal) {
    if (!this.isConnected) return;          // Si todavia no esta en el DOM, no hace nada.

    if (name === "src" && oldVal !== newVal) {
      this._inicializarAudio();             // Si cambio la ruta, vuelve a cargar el audio.
    }
    if (name === "label" && oldVal !== newVal) {
      // Si cambio el texto, actualiza solo la etiqueta (sin re-renderizar todo).
      const labelEl = this.shadowRoot.getElementById("audio-label");
      if (labelEl) labelEl.textContent = newVal || "";
    }
  }

  // ===== GETTERS DE ATRIBUTOS =====
  // Atajos para leer los atributos como propiedades. Los atributos HTML siempre son texto.
  get label() {
    return this.getAttribute("label") || "";   // "" si viene vacio.
  }

  get src() {
    return this.getAttribute("src") || "";      // "" si no hay audio.
  }

  // ===== RENDERIZADO =====
  // Construye el contenido del Shadow DOM (estilos + marcado) usando un template string.
  _render() {
    this.shadowRoot.innerHTML = `
      <style>
        /* :host = el propio <audio-guia>; ocupa todo el ancho disponible */
        :host {
          display: block;
          width: 100%;
        }

        /* Caja exterior del reproductor */
        .reproductor {
          background-color: var(--color-fondo-card, #FFFFFF);
          border: 1px solid var(--color-borde-claro, #E8E6DD);
          border-radius: var(--radio-lg, 12px);
          padding: 1.25rem;
          font-family: var(--font-principal, sans-serif);
        }

        /* Etiqueta superior (icono + texto del label) */
        .label {
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--color-primario, #0F6E56);
          margin-bottom: 0.75rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .label-icono {
          font-size: 1.1rem;
        }

        /* Fila de controles: boton + barra de progreso */
        .controles {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        /* Boton circular de play/pausa */
        .btn-play {
          flex-shrink: 0;
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--color-primario, #0F6E56) 0%, var(--color-primario-oscuro, #085041) 100%);
          color: #FFFFFF;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.3rem;
          transition: transform 0.15s ease, box-shadow 0.15s ease;
          box-shadow: 0 2px 8px rgba(15, 110, 86, 0.3);
          font-family: inherit;
        }

        .btn-play:hover {
          transform: scale(1.05);
          box-shadow: 0 4px 14px rgba(15, 110, 86, 0.45);
        }

        /* Borde visible al enfocar con teclado (accesibilidad) */
        .btn-play:focus-visible {
          outline: 2px solid var(--color-primario, #0F6E56);
          outline-offset: 3px;
        }

        /* Estado deshabilitado (mientras el audio no ha cargado) */
        .btn-play:disabled {
          opacity: 0.4;
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
        }

        /* Animacion de "cargando" en el boton */
        .btn-play.cargando {
          animation: pulse 1.2s ease infinite;
        }

        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.08); }
        }

        /* Columna con la barra y los tiempos */
        .progreso-wrapper {
          flex-grow: 1;
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
          min-width: 0;
        }

        /* Riel gris de fondo de la barra (clickeable) */
        .barra-fondo {
          width: 100%;
          height: 8px;
          background-color: var(--color-fondo-suave, #F1EFE8);
          border-radius: 4px;
          cursor: pointer;
          position: relative;
          overflow: hidden;
        }

        /* Relleno verde que crece segun el avance del audio */
        .barra-progreso {
          height: 100%;
          background: linear-gradient(90deg, var(--color-primario-claro, #1D9E75) 0%, var(--color-primario, #0F6E56) 100%);
          border-radius: 4px;
          width: 0%;
          transition: width 0.1s linear;
          pointer-events: none;
        }

        /* Tiempos: actual a la izquierda, total a la derecha */
        .tiempos {
          display: flex;
          justify-content: space-between;
          font-size: 0.78rem;
          color: var(--color-texto-tenue, #888780);
        }

        /* Mensaje cuando el destino no tiene audio */
        .no-audio {
          text-align: center;
          color: var(--color-texto-tenue, #888780);
          padding: 1rem;
          font-style: italic;
          font-size: 0.9rem;
        }

        /* Ajustes para pantallas pequenas (responsivo) */
        @media (max-width: 480px) {
          .controles {
            gap: 0.75rem;
          }
          .btn-play {
            width: 42px;
            height: 42px;
            font-size: 1.1rem;
          }
        }
      </style>

      <div class="reproductor">
        <!-- Etiqueta: icono de audifonos + el texto del label (o "Audio guia" por defecto) -->
        <div id="audio-label" class="label">
          <span class="label-icono" aria-hidden="true">&#x1F3A7;</span>
          ${this.label || 'Audio guía'}
        </div>

        ${this.src
          ? `
            <!-- HAY audio: se muestran los controles completos -->
            <div class="controles">
              <!-- Boton play (nace deshabilitado hasta que el audio cargue) -->
              <button id="btn-play" class="btn-play" disabled aria-label="Reproducir">
                &#9654;
              </button>
              <div class="progreso-wrapper">
                <!-- Barra como "slider" accesible: enfocable y con valores ARIA -->
                <div id="barra-fondo" class="barra-fondo" role="slider" aria-label="Progreso del audio" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" tabindex="0">
                  <div id="barra-progreso" class="barra-progreso"></div>
                </div>
                <div class="tiempos">
                  <span id="tiempo-actual">00:00</span>
                  <span id="tiempo-total">00:00</span>
                </div>
              </div>
            </div>
          `
          : `
            <!-- NO hay audio: mensaje alternativo -->
            <div class="no-audio">Audio no disponible</div>
          `
        }
      </div>
    `;
  }

  // ===== CARGA / PREPARACION DEL AUDIO =====
  _inicializarAudio() {
    // 1) Limpieza: libera la URL temporal anterior (evita fugas de memoria).
    if (this._blobUrl) {
      URL.revokeObjectURL(this._blobUrl);
      this._blobUrl = null;
    }
    // 2) Descarta cualquier audio previo (al cambiar de destino).
    if (this._audio) {
      this._audio.pause();
      this._audio.removeAttribute("src");
      this._audio = null;
    }

    const src = this.src;
    if (!src) return;                       // Sin ruta no hay nada que cargar.

    this._audio = new Audio();              // Crea el elemento <audio> NATIVO por codigo.
    this._audio.preload = "auto";           // Pide al navegador precargar el audio.

    // El boton empieza deshabilitado y "cargando" hasta que el audio este listo.
    const btnPlay = this.shadowRoot.getElementById("btn-play");
    if (btnPlay) {
      btnPlay.disabled = true;
      btnPlay.classList.add("cargando");
    }

    // 3) Descarga el archivo con fetch -> lo convierte en blob -> genera URL local.
    fetch(src)
      .then(r => r.blob())                          // Respuesta a datos binarios (blob).
      .then(blob => {
        this._blobUrl = URL.createObjectURL(blob);  // URL temporal en memoria (blob:...).
        this._audio.src = this._blobUrl;            // Se la pasamos al reproductor.
      })
      .catch(() => {
        this._audio.src = src;                      // Respaldo: si falla el fetch, ruta directa.
      });

    // Cuando el navegador ya conoce la duracion: quita "cargando" y actualiza tiempos/barra.
    const onDurationReady = () => {
      if (btnPlay) btnPlay.classList.remove("cargando");
      this._actualizarTiempoTotal();
      this._actualizarBarra();
    };

    // Varios eventos sirven para detectar que la duracion ya esta disponible (depende del navegador).
    this._audio.addEventListener("loadedmetadata", onDurationReady);
    this._audio.addEventListener("durationchange", onDurationReady);
    this._audio.addEventListener("loadeddata", onDurationReady);
    this._audio.addEventListener("canplaythrough", onDurationReady);

    // Mientras suena: el navegador dispara "timeupdate" muchas veces por segundo.
    this._audio.addEventListener("timeupdate", () => {
      this._actualizarBarra();
      this._actualizarTiempoActual();
    });

    // Al reproducir: arranca el loop que mueve la barra y cambia el icono a "pausa".
    this._audio.addEventListener("play", () => {
      this._rafId = requestAnimationFrame(this._loop.bind(this));
      this._actualizarIconoPlay(true);
    });

    // Al pausar: detiene el loop y vuelve el icono a "play".
    this._audio.addEventListener("pause", () => {
      cancelAnimationFrame(this._rafId);
      this._actualizarIconoPlay(false);
    });

    // Al terminar: detiene el loop, icono "play" y refresca la barra al 100%.
    this._audio.addEventListener("ended", () => {
      cancelAnimationFrame(this._rafId);
      this._actualizarIconoPlay(false);
      this._actualizarBarra();
    });

    // Si hay error cargando el audio: lo registra y deja el boton deshabilitado.
    this._audio.addEventListener("error", (e) => {
      console.error("[audio-guia] Error cargando audio:", src, e);
      if (btnPlay) {
        btnPlay.classList.remove("cargando");
        btnPlay.disabled = true;
      }
    });

    // Cuando ya se puede reproducir: habilita el boton.
    this._audio.addEventListener("canplay", () => {
      if (btnPlay) {
        btnPlay.classList.remove("cargando");
        btnPlay.disabled = false;
      }
    });

    // Respaldo: algunos navegadores tardan en dar la duracion. Se revisa cada 200 ms,
    // hasta 15 intentos. Apenas hay duracion valida, habilita el boton y actualiza tiempos.
    let intentos = 0;
    const poll = setInterval(() => {
      intentos++;
      if (!this._audio) { clearInterval(poll); return; }
      if (isFinite(this._audio.duration) && this._audio.duration > 0) {
        clearInterval(poll);
        this._actualizarTiempoTotal();
        this._actualizarBarra();
        if (btnPlay) {
          btnPlay.classList.remove("cargando");
          btnPlay.disabled = false;
        }
      } else if (intentos >= 15) {
        clearInterval(poll);
        console.warn("[audio-guia] No se pudo obtener la duración del audio:", src);
      }
    }, 200);
  }

  // Bucle de animacion: refresca la barra suavemente mientras el audio reproduce.
  _loop() {
    this._actualizarBarra();
    this._rafId = requestAnimationFrame(this._loop.bind(this));
  }

  // ===== CONTROLES =====
  // Alterna entre reproducir y pausar.
  _togglePlay() {
    if (!this._audio) return;
    if (this._audio.paused) {
      this._audio.play().catch(() => {});   // play() puede fallar si no hubo interaccion; se ignora.
    } else {
      this._audio.pause();
    }
  }

  // Cambia el icono del boton: ❚❚ (pausa) si esta sonando, ▶ (play) si no. Tambien el aria-label.
  _actualizarIconoPlay(playing) {
    const btn = this.shadowRoot.getElementById("btn-play");
    if (!btn) return;
    btn.innerHTML = playing ? "&#10074;&#10074;" : "&#9654;";
    btn.setAttribute("aria-label", playing ? "Pausar" : "Reproducir");
  }

  // Calcula el porcentaje avanzado y lo refleja en el ancho de la barra y en el valor ARIA.
  _actualizarBarra() {
    if (!this._audio) return;
    const dur = this._audio.duration;
    let pct = 0;
    if (isFinite(dur) && dur > 0) {
      pct = (this._audio.currentTime / dur) * 100;   // % = tiempo actual / duracion total.
    }
    const barra = this.shadowRoot.getElementById("barra-progreso");
    const fondo = this.shadowRoot.getElementById("barra-fondo");
    if (barra) barra.style.width = pct + "%";                       // mueve el relleno verde.
    if (fondo) fondo.setAttribute("aria-valuenow", Math.round(pct)); // informa el avance al lector.
  }

  // Muestra el tiempo transcurrido (mm:ss).
  _actualizarTiempoActual() {
    const el = this.shadowRoot.getElementById("tiempo-actual");
    if (!el || !this._audio) return;
    el.textContent = this._formatoTiempo(this._audio.currentTime);
  }

  // Muestra la duracion total (mm:ss).
  _actualizarTiempoTotal() {
    const el = this.shadowRoot.getElementById("tiempo-total");
    if (!el || !this._audio) return;
    el.textContent = this._formatoTiempo(this._audio.duration || 0);
  }

  // Convierte segundos a formato mm:ss con ceros a la izquierda (ej: 75 -> "01:15").
  _formatoTiempo(seg) {
    if (!isFinite(seg) || seg < 0) return "00:00";
    const m = Math.floor(seg / 60);                 // minutos enteros.
    const s = Math.floor(seg % 60);                 // segundos restantes.
    return String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0");
  }

  // Permite "saltar" en el audio haciendo clic en la barra (busqueda por posicion).
  _buscarPorClick(e) {
    if (!this._audio || !isFinite(this._audio.duration)) return;
    const barra = this.shadowRoot.getElementById("barra-fondo");
    if (!barra) return;
    const rect = barra.getBoundingClientRect();                          // medidas de la barra en pantalla.
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)); // posicion del clic (0 a 1).
    this._audio.currentTime = pct * this._audio.duration;               // mueve el audio a esa posicion.
  }

  // ===== ENGANCHE DE EVENTOS DE LA INTERFAZ =====
  // Conecta los controles propios (boton y barra) con sus acciones.
  _agregarEventos() {
    const btnPlay = this.shadowRoot.getElementById("btn-play");
    const barraFondo = this.shadowRoot.getElementById("barra-fondo");

    // Clic en el boton -> reproducir/pausar.
    if (btnPlay) {
      btnPlay.addEventListener("click", () => this._togglePlay());
    }

    if (barraFondo) {
      // Clic en la barra -> saltar a esa posicion.
      barraFondo.addEventListener("click", (e) => this._buscarPorClick(e));

      // Teclado en la barra: flechas para avanzar/retroceder 5 segundos (accesibilidad).
      barraFondo.addEventListener("keydown", (e) => {
        if (!this._audio || !isFinite(this._audio.duration)) return;
        if (e.key === "ArrowRight") {
          e.preventDefault();
          this._audio.currentTime = Math.min(this._audio.duration, this._audio.currentTime + 5);
        } else if (e.key === "ArrowLeft") {
          e.preventDefault();
          this._audio.currentTime = Math.max(0, this._audio.currentTime - 5);
        }
      });
    }
  }

  // ===== LIMPIEZA =====
  // Se ejecuta cuando el componente SALE del DOM. Libera recursos para no dejar memoria colgando
  // (importante porque al cambiar de destino se crean y destruyen reproductores).
  disconnectedCallback() {
    cancelAnimationFrame(this._rafId);      // Detiene la animacion de la barra.
    if (this._audio) {
      this._audio.pause();                  // Para el audio.
      this._audio.removeAttribute("src");   // Suelta el recurso.
      this._audio = null;
    }
    if (this._blobUrl) {
      URL.revokeObjectURL(this._blobUrl);   // Libera la URL temporal de memoria.
      this._blobUrl = null;
    }
  }
}

// Registra el Custom Element: a partir de aqui el navegador entiende la etiqueta <audio-guia>.
customElements.define("audio-guia", AudioGuia);
