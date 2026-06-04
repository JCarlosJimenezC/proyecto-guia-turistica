/**
 * <video-destino>
 * Custom Element: Reproductor de video con miniatura (poster) y controles personalizados.
 *
 * Atributos observados:
 *   - src    : ruta del archivo de video (.mp4)
 *   - poster : ruta de la imagen miniatura (thumbnail)
 *   - label  : texto descriptivo que aparece sobre el reproductor
 */
class VideoDestino extends HTMLElement {

    static get observedAttributes() {
        return ['src', 'poster', 'label'];
    }

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this._video = null;
        this._rafId = null;
        this._ocultarCtrl = null;
    }

    connectedCallback() {
        this._render();
        this._inicializarVideo();
        this._agregarEventos();
    }

    attributeChangedCallback(name, oldVal, newVal) {
        if (!this.isConnected || oldVal === newVal) return;
        if (name === 'src') { this._inicializarVideo(); }
        if (name === 'poster' && this._video) { this._video.poster = newVal || ''; }
        if (name === 'label') {
            const el = this.shadowRoot.getElementById('video-label');
            if (el) el.textContent = newVal || '';
        }
    }

    disconnectedCallback() { this._limpiar(); }

    get src() { return this.getAttribute('src') || ''; }
    get poster() { return this.getAttribute('poster') || ''; }
    get label() { return this.getAttribute('label') || 'Video'; }

    _render() {
        this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; width: 100%; }

        .reproductor {
          background: #000;
          border-radius: var(--radio-lg, 12px);
          overflow: hidden;
          position: relative;
          font-family: var(--font-principal, sans-serif);
          box-shadow: 0 4px 24px rgba(0,0,0,0.18);
        }

        .label {
          position: absolute;
          top: 0; left: 0; right: 0;
          padding: 0.75rem 1rem;
          background: linear-gradient(to bottom, rgba(0,0,0,0.65), transparent);
          color: #fff;
          font-size: 0.85rem;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          z-index: 10;
          pointer-events: none;
        }

        .video {
          width: 100%;
          display: block;
          aspect-ratio: 16 / 9;
          background: #000;
          object-fit: contain;
          cursor: pointer;
        }

        .sin-video {
          aspect-ratio: 16 / 9;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          color: var(--color-texto-tenue, #888780);
          background: var(--color-fondo-suave, #F1EFE8);
        }
        .sin-video-icono { font-size: 3rem; opacity: 0.45; }
        .sin-video-texto { font-size: 0.9rem; font-style: italic; }

        .controles {
          position: absolute;
          bottom: 0; left: 0; right: 0;
          background: linear-gradient(to top, rgba(0,0,0,0.75) 0%, transparent 100%);
          padding: 1.5rem 0.85rem 0.75rem;
          display: flex;
          flex-direction: column;
          gap: 0.45rem;
          z-index: 10;
          opacity: 1;
          transition: opacity 0.3s ease;
        }
        .controles.ocultos { opacity: 0; pointer-events: none; }

        .barra-fondo {
          width: 100%;
          height: 5px;
          background: rgba(255,255,255,0.25);
          border-radius: 3px;
          cursor: pointer;
          position: relative;
          overflow: visible;
          touch-action: none;
        }
        .barra-fondo:hover { height: 7px; }

        .barra-progreso {
          height: 100%;
          background: linear-gradient(90deg,
            var(--color-primario-claro, #1D9E75) 0%,
            var(--color-primario, #0F6E56) 100%);
          border-radius: 3px;
          width: 0%;
          pointer-events: none;
          transition: width 0.1s linear;
        }

        .barra-buffer {
          position: absolute;
          top: 0; left: 0;
          height: 100%;
          background: rgba(255,255,255,0.2);
          border-radius: 3px;
          width: 0%;
          pointer-events: none;
        }

        .fila-controles {
          display: flex;
          align-items: center;
          gap: 0.6rem;
        }

        .btn-ctrl {
          background: transparent;
          border: none;
          color: #fff;
          cursor: pointer;
          padding: 0.3rem;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 4px;
          font-size: 1.1rem;
          line-height: 1;
          transition: background 0.15s, transform 0.1s;
          font-family: inherit;
          flex-shrink: 0;
        }
        .btn-ctrl:hover { background: rgba(255,255,255,0.15); transform: scale(1.1); }
        .btn-ctrl:focus-visible {
          outline: 2px solid var(--color-primario-claro, #1D9E75);
          outline-offset: 2px;
        }

        .tiempos {
          font-size: 0.78rem;
          color: rgba(255,255,255,0.9);
          white-space: nowrap;
          font-variant-numeric: tabular-nums;
          flex-shrink: 0;
        }

        .volumen-wrapper {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          flex-shrink: 0;
        }

        .slider-volumen {
          -webkit-appearance: none;
          appearance: none;
          width: 72px;
          height: 4px;
          border-radius: 2px;
          background: rgba(255,255,255,0.3);
          outline: none;
          cursor: pointer;
        }
        .slider-volumen::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 14px; height: 14px;
          border-radius: 50%;
          background: #fff;
          cursor: pointer;
        }
        .slider-volumen::-moz-range-thumb {
          width: 14px; height: 14px;
          border-radius: 50%;
          background: #fff;
          cursor: pointer;
          border: none;
        }

        .spacer { flex-grow: 1; }

        .play-center {
          position: absolute;
          top: 50%; left: 50%;
          transform: translate(-50%, -50%);
          width: 64px; height: 64px;
          border-radius: 50%;
          background: rgba(0,0,0,0.55);
          border: 3px solid rgba(255,255,255,0.85);
          color: #fff;
          font-size: 1.8rem;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          z-index: 11;
          transition: background 0.2s, transform 0.15s;
          font-family: inherit;
          backdrop-filter: blur(4px);
        }
        .play-center:hover {
          background: rgba(15,110,86,0.75);
          transform: translate(-50%, -50%) scale(1.08);
        }
        .play-center.oculto { display: none; }

        .spinner {
          position: absolute;
          top: 50%; left: 50%;
          transform: translate(-50%, -50%);
          width: 40px; height: 40px;
          border: 3px solid rgba(255,255,255,0.25);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          z-index: 12;
          display: none;
        }
        .spinner.visible { display: block; }

        @keyframes spin { to { transform: translate(-50%, -50%) rotate(360deg); } }

        @media (max-width: 480px) {
          .slider-volumen { width: 52px; }
          .btn-ctrl { font-size: 0.95rem; }
          .play-center { width: 52px; height: 52px; font-size: 1.5rem; }
        }
      </style>

      ${this.src ? `
        <div class="reproductor" id="reproductor">
          <div class="label">
            <span aria-hidden="true">&#127909;</span>
            <span id="video-label">${this.label}</span>
          </div>

          <video
            id="video"
            class="video"
            preload="metadata"
            ${this.poster ? `poster="${this.poster}"` : ''}
            playsinline
            aria-label="${this.label}">
          </video>

          <div class="spinner" id="spinner" aria-hidden="true"></div>

          <button class="play-center" id="play-center" aria-label="Reproducir video">
            &#9654;
          </button>

          <div class="controles" id="controles">
            <div
              class="barra-fondo"
              id="barra-fondo"
              role="slider"
              aria-label="Progreso del video"
              aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"
              tabindex="0">
              <div class="barra-buffer"   id="barra-buffer"></div>
              <div class="barra-progreso" id="barra-progreso"></div>
            </div>

            <div class="fila-controles">
              <button class="btn-ctrl" id="btn-play" aria-label="Reproducir">&#9654;</button>

              <span class="tiempos">
                <span id="t-actual">0:00</span>
                <span> / </span>
                <span id="t-total">0:00</span>
              </span>

              <div class="spacer"></div>

              <div class="volumen-wrapper">
                <button class="btn-ctrl" id="btn-mute" aria-label="Silenciar">&#128266;</button>
                <input type="range" class="slider-volumen" id="slider-vol"
                  min="0" max="1" step="0.05" value="1" aria-label="Volumen">
              </div>

              <button class="btn-ctrl" id="btn-fs" aria-label="Pantalla completa">&#9974;&#65038;</button>
            </div>
          </div>
        </div>
      ` : `
        <div class="sin-video" role="img" aria-label="Video no disponible">
          <span class="sin-video-icono" aria-hidden="true">&#127909;</span>
          <span class="sin-video-texto">Video no disponible</span>
        </div>
      `}
    `;
    }

    _inicializarVideo() {
        this._limpiar();
        if (!this.src) return;
        this._video = this.shadowRoot.getElementById('video');
        if (!this._video) return;
        this._video.src = this.src;
    }

    _agregarEventos() {
        const sr = this.shadowRoot;
        const video = sr.getElementById('video');
        const btnPlay = sr.getElementById('btn-play');
        const btnMute = sr.getElementById('btn-mute');
        const btnFs = sr.getElementById('btn-fs');
        const sliderVol = sr.getElementById('slider-vol');
        const barraFondo = sr.getElementById('barra-fondo');
        const playCtr = sr.getElementById('play-center');
        const controles = sr.getElementById('controles');
        const spinner = sr.getElementById('spinner');
        const reproductor = sr.getElementById('reproductor');

        if (!video) return;
        this._video = video;

        video.addEventListener('loadedmetadata', () => this._actualizarTiempoTotal());
        video.addEventListener('timeupdate', () => this._actualizarProgreso());
        video.addEventListener('progress', () => this._actualizarBuffer());
        video.addEventListener('waiting', () => { if (spinner) spinner.classList.add('visible'); });
        video.addEventListener('canplay', () => { if (spinner) spinner.classList.remove('visible'); });

        video.addEventListener('play', () => {
            this._actualizarIconoPlay(true);
            if (playCtr) playCtr.classList.add('oculto');
            this._rafId = requestAnimationFrame(this._loop.bind(this));
        });

        video.addEventListener('pause', () => {
            cancelAnimationFrame(this._rafId);
            this._actualizarIconoPlay(false);
            if (playCtr) playCtr.classList.remove('oculto');
        });

        video.addEventListener('ended', () => {
            cancelAnimationFrame(this._rafId);
            this._actualizarIconoPlay(false);
            if (playCtr) playCtr.classList.remove('oculto');
        });

        video.addEventListener('volumechange', () => {
            this._actualizarIconoMute();
            if (sliderVol) sliderVol.value = video.muted ? 0 : video.volume;
        });

        const mostrarControles = () => {
            if (controles) controles.classList.remove('ocultos');
            clearTimeout(this._ocultarCtrl);
            if (!video.paused) {
                this._ocultarCtrl = setTimeout(() => {
                    if (controles) controles.classList.add('ocultos');
                }, 2800);
            }
        };

        if (reproductor) {
            reproductor.addEventListener('mousemove', mostrarControles);
            reproductor.addEventListener('mouseenter', mostrarControles);
            reproductor.addEventListener('touchstart', mostrarControles, { passive: true });
        }

        if (btnPlay) btnPlay.addEventListener('click', (e) => { e.stopPropagation(); this._togglePlay(); });
        if (playCtr) playCtr.addEventListener('click', (e) => { e.stopPropagation(); this._togglePlay(); });
        if (btnMute) btnMute.addEventListener('click', (e) => { e.stopPropagation(); video.muted = !video.muted; });
        if (btnFs) btnFs.addEventListener('click', (e) => { e.stopPropagation(); this._toggleFullscreen(); });

        video.addEventListener('click', () => this._togglePlay());

        if (sliderVol) {
            sliderVol.addEventListener('input', (e) => {
                e.stopPropagation();
                video.volume = parseFloat(sliderVol.value);
                video.muted = video.volume === 0;
            });
        }

        if (barraFondo) {
            barraFondo.addEventListener('click', (e) => this._buscarPorClick(e));

            let arrastre = false;
            barraFondo.addEventListener('mousedown', (e) => { arrastre = true; this._buscarPorClick(e); });
            window.addEventListener('mousemove', (e) => { if (arrastre) this._buscarPorClick(e); });
            window.addEventListener('mouseup', () => { arrastre = false; });

            barraFondo.addEventListener('keydown', (e) => {
                if (!video || !isFinite(video.duration)) return;
                if (e.key === 'ArrowRight') { e.preventDefault(); video.currentTime = Math.min(video.duration, video.currentTime + 5); }
                if (e.key === 'ArrowLeft') { e.preventDefault(); video.currentTime = Math.max(0, video.currentTime - 5); }
            });
        }

        document.addEventListener('fullscreenchange', () => this._actualizarIconoFs());
    }

    _loop() {
        this._actualizarProgreso();
        this._rafId = requestAnimationFrame(this._loop.bind(this));
    }

    _togglePlay() {
        if (!this._video) return;
        if (this._video.paused || this._video.ended) {
            this._video.play().catch(() => { });
        } else {
            this._video.pause();
        }
    }

    _toggleFullscreen() {
        const c = this.shadowRoot.getElementById('reproductor');
        if (!c) return;
        if (!document.fullscreenElement) {
            (c.requestFullscreen || c.webkitRequestFullscreen || (() => { })).call(c);
        } else {
            (document.exitFullscreen || document.webkitExitFullscreen || (() => { })).call(document);
        }
    }

    _actualizarIconoPlay(playing) {
        const btn = this.shadowRoot.getElementById('btn-play');
        const ctr = this.shadowRoot.getElementById('play-center');
        if (btn) { btn.innerHTML = playing ? '&#10074;&#10074;' : '&#9654;'; btn.setAttribute('aria-label', playing ? 'Pausar' : 'Reproducir'); }
        if (ctr) ctr.innerHTML = playing ? '&#10074;&#10074;' : '&#9654;';
    }

    _actualizarIconoMute() {
        const btn = this.shadowRoot.getElementById('btn-mute');
        if (!btn || !this._video) return;
        const s = this._video.muted || this._video.volume === 0;
        btn.innerHTML = s ? '&#128263;' : '&#128266;';
        btn.setAttribute('aria-label', s ? 'Activar sonido' : 'Silenciar');
    }

    _actualizarIconoFs() {
        const btn = this.shadowRoot.getElementById('btn-fs');
        if (!btn) return;
        const en = !!document.fullscreenElement;
        btn.innerHTML = en ? '&#10006;' : '&#9974;&#65038;';
        btn.setAttribute('aria-label', en ? 'Salir de pantalla completa' : 'Pantalla completa');
    }

    _actualizarProgreso() {
        if (!this._video) return;
        const dur = this._video.duration;
        const pct = isFinite(dur) && dur > 0 ? (this._video.currentTime / dur) * 100 : 0;
        const barra = this.shadowRoot.getElementById('barra-progreso');
        const fondo = this.shadowRoot.getElementById('barra-fondo');
        const tAct = this.shadowRoot.getElementById('t-actual');
        if (barra) barra.style.width = pct + '%';
        if (fondo) fondo.setAttribute('aria-valuenow', Math.round(pct));
        if (tAct) tAct.textContent = this._fmt(this._video.currentTime);
    }

    _actualizarTiempoTotal() {
        const el = this.shadowRoot.getElementById('t-total');
        if (!el || !this._video) return;
        el.textContent = this._fmt(this._video.duration || 0);
    }

    _actualizarBuffer() {
        if (!this._video) return;
        const dur = this._video.duration;
        if (!isFinite(dur) || dur === 0) return;
        const buf = this.shadowRoot.getElementById('barra-buffer');
        if (!buf || !this._video.buffered.length) return;
        buf.style.width = (this._video.buffered.end(this._video.buffered.length - 1) / dur * 100) + '%';
    }

    _buscarPorClick(e) {
        if (!this._video || !isFinite(this._video.duration)) return;
        const barra = this.shadowRoot.getElementById('barra-fondo');
        if (!barra) return;
        const rect = barra.getBoundingClientRect();
        const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        this._video.currentTime = pct * this._video.duration;
    }

    _fmt(seg) {
        if (!isFinite(seg) || seg < 0) return '0:00';
        const h = Math.floor(seg / 3600);
        const m = Math.floor((seg % 3600) / 60);
        const s = Math.floor(seg % 60);
        return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`;
    }

    _limpiar() {
        cancelAnimationFrame(this._rafId);
        clearTimeout(this._ocultarCtrl);
        if (this._video) {
            this._video.pause();
            this._video.removeAttribute('src');
            this._video.load();
            this._video = null;
        }
    }
}

customElements.define('video-destino', VideoDestino);