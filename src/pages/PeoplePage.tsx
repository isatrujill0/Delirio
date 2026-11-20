import { useState } from 'react';
import { ArrowLeft, ArrowRight, ChevronLeft, ChevronRight, Images, Mail, MessageCircle, Mic, MoreHorizontal, Pencil, Phone, Plus, Trash2, Users, Video, Type } from 'lucide-react';
import type { Contact, FamilyMessage } from '../types';
import { useAppData } from '../hooks/useAppData';
import { useUI } from '../hooks/useUI';
import { useCaregiver } from '../hooks/useCaregiver';
import { Avatar, DemoTag } from '../components/Media';
import { PlayButton, Waveform } from '../components/PlayerControls';
import { MessageViewer, kindLabel, messageDuration, useMessageControl } from '../components/MessageViewer';
import { Confirm, Sheet } from '../components/Sheet';
import { ContactForm, type ContactDraft } from './people/ContactForm';
import { MessageComposer } from './people/MessageComposer';
import { PhotoAlbum } from './people/PhotoAlbum';
import { deleteMedia } from '../services/mediaStore';
import { mmss, timeAgo } from '../services/time';
import { uid } from '../services/id';

function MessageRow({ m, contact, showName = false, onOpen }: { m: FamilyMessage; contact?: Contact; showName?: boolean; onOpen: () => void }) {
  const { toast } = useUI();
  const from = contact?.name ?? 'Tu familia';
  const { player, isThis, playing, toggle } = useMessageControl(m, from, (e) => toast(e, 'error'));
  const Icon = m.kind === 'video' ? Video : m.kind === 'texto' ? Type : Mic;
  return (
    <div className={`msg-row ${m.read ? '' : 'is-new'}`}>
      {m.kind === 'video' ? (
        <button className="play-btn play-md" onClick={onOpen} aria-label={`Ver video de ${from}`}>
          <Video />
        </button>
      ) : (
        <PlayButton playing={playing} loading={isThis && player.status === 'loading'} onClick={toggle} label={`mensaje de ${from}, ${timeAgo(m.createdAt, Date.now()).toLowerCase()}`} />
      )}
      <button className="msg-row-main" onClick={onOpen}>
        {m.kind === 'video' ? <span className="msg-row-kind"><Icon size={18} /> {kindLabel(m)}</span> : <Waveform active={playing} bars={12} />}
        <span className="num msg-row-dur">{isThis && player.status !== 'idle' ? mmss(player.position) : m.kind === 'video' && m.duration === undefined ? '' : mmss(messageDuration(m))}</span>
        <span className="msg-row-when">
          {showName && <strong>{from} · </strong>}
          {timeAgo(m.createdAt, Date.now())}
        </span>
        {!m.read && <span className="new-dot" aria-label="Nuevo" />}
      </button>
    </div>
  );
}

function Carousel({ contacts, index, setIndex, onAdd }: { contacts: Contact[]; index: number; setIndex: (i: number) => void; onAdd: () => void }) {
  const n = contacts.length;
  const at = (o: number) => contacts[(index + o + n) % n];
  const slots = n >= 3 ? [-1, 0, 1] : n === 2 ? [0, 1] : [0];
  return (
    <div className="carousel" aria-roledescription="carrusel" aria-label="Tus personas">
      <div className="carousel-track">
        {slots.map((o) => {
          const c = at(o);
          return (
            <button key={`${c.id}${o}`} className={`person ${o === 0 ? 'is-center' : ''}`} onClick={() => setIndex((index + o + n) % n)} aria-label={o === 0 ? `${c.name}, seleccionado` : `Ver a ${c.name}`} aria-current={o === 0}>
              <Avatar contact={c} />
              <span className="person-name">{c.name}</span>
            </button>
          );
        })}
      </div>
      <div className="carousel-nav">
        <button className="round-btn" onClick={() => setIndex((index - 1 + n) % n)} aria-label="Persona anterior" disabled={n < 2}>
          <ChevronLeft />
        </button>
        {/* Position indicator only: the arrows and the portraits themselves are the (large) touch targets. */}
        <span className="dots" role="img" aria-label={`Persona ${index + 1} de ${n}`}>
          {contacts.map((c, i) => (
            <i key={c.id} className={i === index ? 'on' : ''} />
          ))}
        </span>
        <button className="round-btn" onClick={() => setIndex((index + 1) % n)} aria-label="Persona siguiente" disabled={n < 2}>
          <ChevronRight />
        </button>
        <button className="pill-btn" onClick={onAdd}>
          <Plus size={20} /> Agregar
        </button>
      </div>
    </div>
  );
}

export function PeoplePage() {
  const { guard } = useCaregiver();
  const { data, update } = useAppData();
  const { sub, go, toast } = useUI();
  const [index, setIndex] = useState(() => {
    const id = sub?.split(':')[1];
    return Math.max(0, data.contacts.findIndex((c) => c.id === id));
  });
  const [form, setForm] = useState<Contact | 'new' | null>(null);
  const [profile, setProfile] = useState(false);
  const [confirmDel, setConfirmDel] = useState<Contact | null>(null);
  const [composer, setComposer] = useState(false);
  const [viewing, setViewing] = useState<FamilyMessage | null>(null);
  const [delMsg, setDelMsg] = useState<FamilyMessage | null>(null);

  const contacts = data.contacts;
  const selected = contacts[Math.min(index, contacts.length - 1)];
  const byId = (id: string) => contacts.find((c) => c.id === id);
  const [view, viewArg] = (sub ?? '').split(':');

  const saveContact = (d: ContactDraft) => {
    if (form === 'new') {
      const c: Contact = { id: uid('c'), ...d, demo: false };
      update((x) => ({ ...x, contacts: [...x.contacts, c] }));
      setIndex(contacts.length);
      toast(`${c.name} se agregó a Mi gente`, 'ok');
    } else if (form) {
      if (form.photo !== d.photo) void deleteMedia(form.photo);
      update((x) => ({ ...x, contacts: x.contacts.map((c) => (c.id === form.id ? { ...c, ...d } : c)) }));
      toast('Cambios guardados', 'ok');
    }
    setForm(null);
  };

  const deleteContact = async (c: Contact) => {
    const msgs = data.messages.filter((m) => m.contactId === c.id);
    const photos = data.photos.filter((p) => p.contactId === c.id);
    update((x) => ({
      ...x,
      contacts: x.contacts.filter((k) => k.id !== c.id),
      messages: x.messages.filter((m) => m.contactId !== c.id),
      photos: x.photos.filter((p) => p.contactId !== c.id),
    }));
    await Promise.all([deleteMedia(c.photo), ...msgs.map((m) => deleteMedia(m.media)), ...photos.map((p) => deleteMedia(p.src))]);
    setIndex(0);
    setConfirmDel(null);
    setProfile(false);
    toast(`${c.name} se eliminó de Mi gente`, 'ok');
  };

  const removeMessage = async (m: FamilyMessage) => {
    update((x) => ({ ...x, messages: x.messages.filter((k) => k.id !== m.id) }));
    await deleteMedia(m.media);
    setDelMsg(null);
    setViewing(null);
    toast('Mensaje eliminado', 'ok');
  };

  const sheets = (
    <>
      {form && <ContactForm initial={form === 'new' ? undefined : form} onSave={saveContact} onClose={() => setForm(null)} />}
      {confirmDel && (
        <Confirm title={`¿Eliminar a ${confirmDel.name}?`} message="También se borrarán sus mensajes y fotos de este dispositivo. Esta acción no se puede deshacer." confirmLabel="Eliminar" danger onConfirm={() => deleteContact(confirmDel)} onCancel={() => setConfirmDel(null)} />
      )}
      {composer && selected && (
        <MessageComposer
          contactId={selected.id}
          contactName={selected.name}
          onClose={() => setComposer(false)}
          onSave={(m) => {
            update((x) => ({ ...x, messages: [...x.messages, m] }));
            setComposer(false);
            toast('Mensaje guardado', 'ok');
          }}
        />
      )}
      {viewing && <MessageViewer message={viewing} contact={byId(viewing.contactId)} onClose={() => setViewing(null)} onDelete={() => guard(() => setDelMsg(viewing))} onError={(e) => toast(e, 'error')} />}
      {delMsg && <Confirm title="¿Eliminar este mensaje?" message="Se borrará de este dispositivo." confirmLabel="Eliminar" danger onConfirm={() => removeMessage(delMsg)} onCancel={() => setDelMsg(null)} />}
    </>
  );

  // Sub-views: inbox, one person's messages, photo album
  if (view === 'mensajes' || view === 'fotos') {
    const person = viewArg ? byId(viewArg) : undefined;
    const msgs = data.messages.filter((m) => !person || m.contactId === person.id).sort((a, b) => b.createdAt - a.createdAt);
    return (
      <div className="page subpage">
        <header className="sub-head">
          <button className="pill-btn" onClick={() => go('gente', person ? `persona:${person.id}` : null)}>
            <ArrowLeft size={20} /> Mi gente
          </button>
          <h1>{view === 'fotos' ? (person ? `Fotos de ${person.name}` : 'Fotos de tu familia') : person ? `Mensajes de ${person.name}` : 'Todos los mensajes'}</h1>
          {view === 'mensajes' && person && (
            <button className="pill-btn" onClick={() => setComposer(true)}>
              <Plus size={20} /> Nuevo mensaje
            </button>
          )}
        </header>
        <div className="sub-body scroll">
          {view === 'fotos' ? (
            <PhotoAlbum contactId={person?.id} />
          ) : msgs.length === 0 ? (
            <div className="empty">
              <MessageCircle size={40} strokeWidth={1.5} />
              <p>Todavía no hay mensajes{person ? ` de ${person.name}` : ''}.</p>
              {person && (
                <button className="btn btn-primary" onClick={() => setComposer(true)}>
                  Grabar el primero
                </button>
              )}
            </div>
          ) : (
            <ul className="msg-list">
              {msgs.map((m) => (
                <li key={m.id}>
                  <MessageRow m={m} contact={byId(m.contactId)} showName={!person} onOpen={() => setViewing(m)} />
                  {m.text && <p className="msg-list-text">{m.text}</p>}
                  {m.demo && <DemoTag />}
                </li>
              ))}
            </ul>
          )}
        </div>
        {sheets}
      </div>
    );
  }

  const newCount = selected ? data.messages.filter((m) => m.contactId === selected.id && !m.read).length : 0;
  const last = selected ? data.messages.filter((m) => m.contactId === selected.id).sort((a, b) => b.createdAt - a.createdAt)[0] : undefined;

  return (
    <div className="page people">
      <header className="section-head">
        <Users className="section-icon" strokeWidth={1.4} />
        <div>
          <h1>Mi gente</h1>
          <p className="section-sub">Conecta, escucha y comparte con las personas que te acompañan.</p>
        </div>
      </header>

      {contacts.length === 0 ? (
        <div className="empty people-empty">
          <Users size={48} strokeWidth={1.4} />
          <p>Aún no hay personas en Mi gente.</p>
          <button className="btn btn-primary" onClick={() => guard(() => setForm('new'))}>
            <Plus size={20} /> Agregar a alguien
          </button>
        </div>
      ) : (
        <>
          <Carousel contacts={contacts} index={Math.min(index, contacts.length - 1)} setIndex={setIndex} onAdd={() => guard(() => setForm('new'))} />
          {selected && (
            <aside className="person-panel" aria-label={`Panel de ${selected.name}`}>
              <div className="person-panel-head">
                <Avatar contact={selected} className="avatar-md" />
                <div>
                  <h2>{selected.name}</h2>
                  <p className="muted">{selected.relation}</p>
                </div>
                <button className="icon-btn icon-btn-soft" onClick={() => setProfile(true)} aria-label={`Perfil de ${selected.name}`}>
                  <MoreHorizontal />
                </button>
              </div>
              <div className="action-grid">
                <button className="action" onClick={() => go('gente', `mensajes:${selected.id}`)}>
                  <MessageCircle strokeWidth={1.6} />
                  <span>Mensajes</span>
                </button>
                <button className="action" onClick={() => go('gente', `fotos:${selected.id}`)}>
                  <Images strokeWidth={1.6} />
                  <span>Fotos</span>
                </button>
                <button className="action" onClick={() => setComposer(true)}>
                  <Mic strokeWidth={1.6} />
                  <span>Grabar mensaje</span>
                </button>
              </div>
              <button className="row-btn" onClick={() => go('gente', `mensajes:${selected.id}`)}>
                <span className="row-btn-icon">
                  <Mail strokeWidth={1.6} />
                  {newCount > 0 && <span className="badge num">{newCount}</span>}
                </span>
                <span>{newCount > 0 ? (newCount === 1 ? 'Mensaje nuevo' : 'Mensajes nuevos') : 'Ver mensajes'}</span>
                <ArrowRight />
              </button>
              <p className="panel-label">Último mensaje</p>
              {last ? <MessageRow m={last} contact={selected} onOpen={() => setViewing(last)} /> : <p className="muted">{selected.name} aún no ha dejado mensajes.</p>}
              {selected.about && <p className="panel-about">{selected.about}</p>}
            </aside>
          )}
        </>
      )}

      {profile && selected && (
        <Sheet
          title={selected.name}
          onClose={() => setProfile(false)}
          footer={
            <>
              <button className="btn btn-ghost btn-danger-text" onClick={() => guard(() => setConfirmDel(selected))}>
                <Trash2 size={20} /> Eliminar
              </button>
              <button className="btn btn-primary" onClick={() => guard(() => { setProfile(false); setForm(selected); })}>
                <Pencil size={20} /> Editar perfil
              </button>
            </>
          }
        >
          <div className="profile">
            <Avatar contact={selected} className="avatar-lg" />
            <div>
              <h3>{selected.name}</h3>
              <p className="muted">{selected.relation}</p>
              {selected.demo && <DemoTag label="Perfil de ejemplo" />}
            </div>
            {selected.phone && (
              <p className="profile-line">
                <Phone size={20} /> <span className="num">{selected.phone}</span>
              </p>
            )}
            {selected.about && <p className="profile-about">{selected.about}</p>}
            <p className="profile-line muted">
              {data.messages.filter((m) => m.contactId === selected.id).length} mensajes · {data.photos.filter((p) => p.contactId === selected.id).length} fotos
            </p>
          </div>
        </Sheet>
      )}
      {sheets}
    </div>
  );
}
