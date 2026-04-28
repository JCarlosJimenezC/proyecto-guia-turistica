/**
 * <destino-detalle>
 * Stub temporal — pendiente de implementación
 */
class DestinoDetalle extends HTMLElement {
  set destino(data) {
    this._data = data;
    this.innerHTML = `<p>Detalle de ${data?.nombre || 'destino'} — en construcción</p>`;
  }
}
customElements.define("destino-detalle", DestinoDetalle);
