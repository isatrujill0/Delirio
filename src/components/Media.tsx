import { useEffect, useRef, type VideoHTMLAttributes } from 'react';
import { useMediaUrl } from '../hooks/useMediaUrl';
import { useAppData } from '../hooks/useAppData';
import { audioEngine, volumeToGain } from '../services/audioEngine';
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

/**
 * <video> that follows NEXO's sound settings: muted when the device is muted, at the app volume
 * otherwise (iPadOS ignores element volume, but honours `muted`). Starting it stops other audio.
 */
export function Video(props: VideoHTMLAttributes<HTMLVideoElement>) {
  const { prefs } = useAppData().data;
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.volume = Math.min(1, volumeToGain(prefs.volume, false));
  }, [prefs.volume]);
  const { onPlay, ...rest } = props;
  return (
    <video
      ref={ref}
      {...rest}
      muted={prefs.muted}
      onPlay={(e) => {
        audioEngine.stop();
        onPlay?.(e);
      }}
    />
  );
}

export function DemoTag({ label = 'Demostración' }: { label?: string }) {
  return <span className="demo-tag">{label}</span>;
}
