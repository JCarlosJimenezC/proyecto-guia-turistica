class AudioGuia extends HTMLElement {

  static get observedAttributes() {
    return ["src", "label"];
  }

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._audio = null;
    this._rafId = null;
    this._blobUrl = null;
  }

  connectedCallback() {
    this._render();
    this._inicializarAudio();
    this._agregarEventos();
  }

  attributeChangedCallback(name, oldVal, newVal) {
    if (!this.isConnected) return;

    if (name === "src" && oldVal !== newVal) {
      this._inicializarAudio();
    }
    if (name === "label" && oldVal !== newVal) {
      const labelEl = this.shadowRoot.getElementById("audio-label");
      if (labelEl) labelEl.textContent = newVal || "";
    }
  }

  get label() {
    return this.getAttribute("label") || "";
  }

  get src() {
    return this.getAttribute("src") || "";
  }

  _render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          width: 100%;
        }

        .reproductor {
          background-color: var(--color-fondo-card, #FFFFFF);
          border: 1px solid var(--color-borde-claro, #E8E6DD);
          border-radius: var(--radio-lg, 12px);
          padding: 1.25rem;
          font-family: var(--font-principal, sans-serif);
        }

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

        .controles {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

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

        .btn-play:focus-visible {
          outline: 2px solid var(--color-primario, #0F6E56);
          outline-offset: 3px;
        }

        .btn-play:disabled {
          opacity: 0.4;
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
        }

        .btn-play.cargando {
          animation: pulse 1.2s ease infinite;
        }

        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.08); }
        }

        .progreso-wrapper {
          flex-grow: 1;
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
          min-width: 0;
        }

        .barra-fondo {
          width: 100%;
          height: 8px;
          background-color: var(--color-fondo-suave, #F1EFE8);
          border-radius: 4px;
          cursor: pointer;
          position: relative;
          overflow: hidden;
        }

        .barra-progreso {
          height: 100%;
          background: linear-gradient(90deg, var(--color-primario-claro, #1D9E75) 0%, var(--color-primario, #0F6E56) 100%);
          border-radius: 4px;
          width: 0%;
          transition: width 0.1s linear;
          pointer-events: none;
        }

        .tiempos {
          display: flex;
          justify-content: space-between;
          font-size: 0.78rem;
          color: var(--color-texto-tenue, #888780);
        }

        .no-audio {
          text-align: center;
          color: var(--color-texto-tenue, #888780);
          padding: 1rem;
          font-style: italic;
          font-size: 0.9rem;
        }

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
        <div id="audio-label" class="label">
          <span class="label-icono" aria-hidden="true">&#x1F3A7;</span>
          ${this.label || 'Audio guía'}
        </div>

        ${this.src
          ? `
            <div class="controles">
              <button id="btn-play" class="btn-play" disabled aria-label="Reproducir">
                &#9654;
              </button>
              <div class="progreso-wrapper">
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
            <div class="no-audio">Audio no disponible</div>
          `
        }
      </div>
    `;
  }

  _inicializarAudio() {
    if (this._blobUrl) {
      URL.revokeObjectURL(this._blobUrl);
      this._blobUrl = null;
    }
    if (this._audio) {
      this._audio.pause();
      this._audio.removeAttribute("src");
      this._audio = null;
    }

    const src = this.src;
    if (!src) return;

    this._audio = new Audio();
    this._audio.preload = "auto";

    const btnPlay = this.shadowRoot.getElementById("btn-play");
    if (btnPlay) {
      btnPlay.disabled = true;
      btnPlay.classList.add("cargando");
    }

    fetch(src)
      .then(r => r.blob())
      .then(blob => {
        this._blobUrl = URL.createObjectURL(blob);
        this._audio.src = this._blobUrl;
      })
      .catch(() => {
        this._audio.src = src;
      });

    const onDurationReady = () => {
      if (btnPlay) btnPlay.classList.remove("cargando");
      this._actualizarTiempoTotal();
      this._actualizarBarra();
    };

    this._audio.addEventListener("loadedmetadata", onDurationReady);
    this._audio.addEventListener("durationchange", onDurationReady);
    this._audio.addEventListener("loadeddata", onDurationReady);
    this._audio.addEventListener("canplaythrough", onDurationReady);

    this._audio.addEventListener("timeupdate", () => {
      this._actualizarBarra();
      this._actualizarTiempoActual();
    });

    this._audio.addEventListener("play", () => {
      this._rafId = requestAnimationFrame(this._loop.bind(this));
      this._actualizarIconoPlay(true);
    });

    this._audio.addEventListener("pause", () => {
      cancelAnimationFrame(this._rafId);
      this._actualizarIconoPlay(false);
    });

    this._audio.addEventListener("ended", () => {
      cancelAnimationFrame(this._rafId);
      this._actualizarIconoPlay(false);
      this._actualizarBarra();
    });

    this._audio.addEventListener("error", (e) => {
      console.error("[audio-guia] Error cargando audio:", src, e);
      if (btnPlay) {
        btnPlay.classList.remove("cargando");
        btnPlay.disabled = true;
      }
    });

    this._audio.addEventListener("canplay", () => {
      if (btnPlay) {
        btnPlay.classList.remove("cargando");
        btnPlay.disabled = false;
      }
    });

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

  _loop() {
    this._actualizarBarra();
    this._rafId = requestAnimationFrame(this._loop.bind(this));
  }

  _togglePlay() {
    if (!this._audio) return;
    if (this._audio.paused) {
      this._audio.play().catch(() => {});
    } else {
      this._audio.pause();
    }
  }

  _actualizarIconoPlay(playing) {
    const btn = this.shadowRoot.getElementById("btn-play");
    if (!btn) return;
    btn.innerHTML = playing ? "&#10074;&#10074;" : "&#9654;";
    btn.setAttribute("aria-label", playing ? "Pausar" : "Reproducir");
  }

  _actualizarBarra() {
    if (!this._audio) return;
    const dur = this._audio.duration;
    let pct = 0;
    if (isFinite(dur) && dur > 0) {
      pct = (this._audio.currentTime / dur) * 100;
    }
    const barra = this.shadowRoot.getElementById("barra-progreso");
    const fondo = this.shadowRoot.getElementById("barra-fondo");
    if (barra) barra.style.width = pct + "%";
    if (fondo) fondo.setAttribute("aria-valuenow", Math.round(pct));
  }

  _actualizarTiempoActual() {
    const el = this.shadowRoot.getElementById("tiempo-actual");
    if (!el || !this._audio) return;
    el.textContent = this._formatoTiempo(this._audio.currentTime);
  }

  _actualizarTiempoTotal() {
    const el = this.shadowRoot.getElementById("tiempo-total");
    if (!el || !this._audio) return;
    el.textContent = this._formatoTiempo(this._audio.duration || 0);
  }

  _formatoTiempo(seg) {
    if (!isFinite(seg) || seg < 0) return "00:00";
    const m = Math.floor(seg / 60);
    const s = Math.floor(seg % 60);
    return String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0");
  }

  _buscarPorClick(e) {
    if (!this._audio || !isFinite(this._audio.duration)) return;
    const barra = this.shadowRoot.getElementById("barra-fondo");
    if (!barra) return;
    const rect = barra.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    this._audio.currentTime = pct * this._audio.duration;
  }

  _agregarEventos() {
    const btnPlay = this.shadowRoot.getElementById("btn-play");
    const barraFondo = this.shadowRoot.getElementById("barra-fondo");

    if (btnPlay) {
      btnPlay.addEventListener("click", () => this._togglePlay());
    }

    if (barraFondo) {
      barraFondo.addEventListener("click", (e) => this._buscarPorClick(e));

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

  disconnectedCallback() {
    cancelAnimationFrame(this._rafId);
    if (this._audio) {
      this._audio.pause();
      this._audio.removeAttribute("src");
      this._audio = null;
    }
    if (this._blobUrl) {
      URL.revokeObjectURL(this._blobUrl);
      this._blobUrl = null;
    }
  }
}

customElements.define("audio-guia", AudioGuia);
