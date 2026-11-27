import { Component, type ReactNode } from 'react';
import { backupRaw, clearData } from '../services/storage';

interface State {
  failed: boolean;
  confirming: boolean;
}

/**
 * Last line of defence: if a screen throws while rendering, show a calm message with a way out
 * instead of a blank device. Resetting copies the stored data to a backup key and never deletes
 * photos, recordings or videos (they stay in IndexedDB and can be recovered with that backup).
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { failed: false, confirming: false };

  static getDerivedStateFromError(): Partial<State> {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.error('SYNK se detuvo por un error inesperado', error);
  }

  private reset = () => {
    backupRaw();
    clearData();
    location.reload();
  };

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="crash" role="alert">
        <h1>Algo no salió bien</h1>
        <p>SYNK tuvo un problema al mostrar esta pantalla. Pide ayuda a tu familia o a tu enfermera. Si al volver a intentar aparece otra vez este aviso, la persona que te cuida puede restablecer los datos.</p>
        <div className="crash-actions">
          <button className="btn btn-primary" onClick={() => location.reload()}>
            Volver a intentar
          </button>
          {this.state.confirming ? (
            <>
              <button className="btn btn-ghost" onClick={() => this.setState({ confirming: false })}>
                Cancelar
              </button>
              <button className="btn btn-danger" onClick={this.reset}>
                Sí, restablecer
              </button>
            </>
          ) : (
            <button className="btn btn-ghost" onClick={() => this.setState({ confirming: true })}>
              Restablecer datos de demostración
            </button>
          )}
        </div>
        {this.state.confirming && <p className="fine-print">Se guarda una copia de los textos y ajustes actuales en este dispositivo y se cargan los de demostración. Las fotos, audios y videos no se borran.</p>}
      </div>
    );
  }
}
