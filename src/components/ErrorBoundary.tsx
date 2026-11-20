import { Component, type ReactNode } from 'react';
import { backupRaw, clearData } from '../services/storage';
import { clearMedia } from '../services/mediaStore';

interface State {
  failed: boolean;
  confirming: boolean;
}

/**
 * Last line of defence: if a screen throws while rendering, show a calm message with a way out
 * instead of a blank device. Stored data is copied to a backup key before it is cleared.
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { failed: false, confirming: false };

  static getDerivedStateFromError(): Partial<State> {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.error('NEXO se detuvo por un error inesperado', error);
  }

  private reset = async () => {
    backupRaw();
    clearData();
    await clearMedia().catch(() => undefined);
    location.reload();
  };

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="crash" role="alert">
        <h1>Algo no salió bien</h1>
        <p>NEXO tuvo un problema al mostrar esta pantalla. Pide ayuda a tu familia o a tu enfermera.</p>
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
        {this.state.confirming && <p className="fine-print">Se guarda una copia de los datos actuales en este dispositivo y se cargan los de demostración.</p>}
      </div>
    );
  }
}
