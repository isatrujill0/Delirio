import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';

interface Props {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'md' | 'lg' | 'full';
  /** Visually hide the header title (still announced). */
  bare?: boolean;
}

/** Modal sheet that keeps focus inside while open and closes on Escape or backdrop tap. */
export function Sheet({ title, onClose, children, footer, size = 'md', bare }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    const node = ref.current;
    node?.querySelector<HTMLElement>('[data-autofocus], .sheet-head button')?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeRef.current();
      if (e.key !== 'Tab' || !node) return;
      const items = node.querySelectorAll<HTMLElement>('button:not(:disabled), input, textarea, select, [tabindex="0"], video[controls]');
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      prev?.focus?.({ preventScroll: true });
    };
  }, []);

  return (
    <div className="sheet-backdrop" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={ref} className={`sheet sheet-${size}`} role="dialog" aria-modal="true" aria-label={title}>
        <header className={`sheet-head ${bare ? 'sheet-head-bare' : ''}`}>
          {!bare && <h2>{title}</h2>}
          <button className="icon-btn" onClick={onClose} aria-label="Cerrar">
            <X size={26} strokeWidth={1.75} />
          </button>
        </header>
        <div className="sheet-body scroll">{children}</div>
        {footer && <footer className="sheet-foot">{footer}</footer>}
      </div>
    </div>
  );
}

interface ConfirmProps {
  title: string;
  message: string;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Two large, well-separated choices to avoid accidental destructive taps. */
export function Confirm({ title, message, confirmLabel, danger, onConfirm, onCancel }: ConfirmProps) {
  return (
    <Sheet
      title={title}
      onClose={onCancel}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onCancel} data-autofocus>
            Cancelar
          </button>
          <button className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </>
      }
    >
      <p className="confirm-text">{message}</p>
    </Sheet>
  );
}
