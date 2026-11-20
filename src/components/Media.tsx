import { useMediaUrl } from '../hooks/useMediaUrl';
import type { Contact } from '../types';

/** Image from a MediaRef with a soft placeholder while it loads or if it is missing. */
export function MediaImage({ src, alt, className = '' }: { src?: string; alt: string; className?: string }) {
  const { url, failed } = useMediaUrl(src);
  if (!url) return <div className={`media-ph ${failed ? 'media-ph-failed' : ''} ${className}`} role="img" aria-label={failed ? `${alt} (no disponible)` : alt} />;
  return <img className={className} src={url} alt={alt} draggable={false} decoding="async" />;
}

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');

/** Round portrait; falls back to initials on a lilac disc when there is no photo. */
export function Avatar({ contact, className = '' }: { contact: Pick<Contact, 'name' | 'photo'>; className?: string }) {
  const { url } = useMediaUrl(contact.photo);
  return (
    <span className={`avatar ${className}`}>
      {url ? <img src={url} alt="" draggable={false} decoding="async" /> : <span className="avatar-initials" aria-hidden="true">{initials(contact.name)}</span>}
    </span>
  );
}

export function DemoTag({ label = 'Demostración' }: { label?: string }) {
  return <span className="demo-tag">{label}</span>;
}
