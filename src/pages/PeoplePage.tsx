import { useState } from 'react';
import { ArrowLeft, ChevronLeft, ChevronRight, Images, MessageCircle, MoreHorizontal, Pencil, Phone, Plus, Trash2, Users, Video } from 'lucide-react';
import type { Contact, FamilyMessage } from '../types';
import { useAppData } from '../hooks/useAppData';
import { lastMessage, unreadFromFamily } from '../services/messages';
import { useUI } from '../hooks/useUI';
import { useCaregiver } from '../hooks/useCaregiver';
import { Avatar, DemoTag } from '../components/Media';
import { MessageViewer } from '../components/MessageViewer';
import { Confirm, Sheet } from '../components/Sheet';
import { ContactForm, type ContactDraft } from './people/ContactForm';
import { Chat } from './people/Chat';
import { VideoCall } from './people/VideoCall';
import { PhotoAlbum } from './people/PhotoAlbum';
import { deleteMedia } from '../services/mediaStore';
import { timeAgo } from '../services/time';
import { uid } from '../services/id';

/** One-line summary of a message for lists. */
const preview = (m: FamilyMessage) => (m.kind === 'imagen' ? `📷 Foto${m.text ? `: ${m.text}` : ''}` : m.kind === 'video' ? '🎬 Video' : m.kind === 'audio' ? '🎤 Audio' : m.text);

function Carousel({ contacts, index, setIndex, onAdd, onOpen }: { contacts: Contact[]; index: number; setIndex: (i: number) => void; onAdd: () => void; onOpen: (c: Contact) => void }) {
  const n = contacts.length;
  const at = (o: number) => contacts[(index + o + n) % n];
  const slots = n >= 3 ? [-1, 0, 1] : n === 2 ? [0, 1] : [0];
  return (
    <div className="carousel" aria-roledescription="carrusel" aria-label="Tus personas">
      <div className="carousel-track">
        {slots.map((o) => {
          const c = at(o);
          return (
            <button key={`${c.id}${o}`} className={`person ${o === 0 ? 'is-center' : ''}`} onClick={() => (o === 0 ? onOpen(c) : setIndex((index + o + n) % n))} aria-label={o === 0 ? `${c.name}, seleccionado. Abrir mensajes, videollamada y audios` : `Ver a ${c.name}`} aria-current={o === 0}>
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
  const [call, setCall] = useState<Contact | null>(null);
  const [quick, setQuick] = useState<Contact | null>(null);
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
      {call && <VideoCall contact={call} onClose={() => setCall(null)} />}
      {quick && (
        <Sheet title={quick.name} onClose={() => setQuick(null)}>
          <div className="quick-actions">
            <button className="action" onClick={() => { setQuick(null); go('gente', `mensajes:${quick.id}`); }}>
              <MessageCircle strokeWidth={1.6} />
              <span>Mensajes</span>
            </button>
            <button className="action" onClick={() => { setQuick(null); setCall(quick); }}>
              <Video strokeWidth={1.6} />
              <span>Videollamada</span>
            </button>
          </div>
        </Sheet>
      )}
      {viewing && <MessageViewer message={viewing} contact={byId(viewing.contactId)} onClose={() => setViewing(null)} onDelete={() => guard(() => setDelMsg(viewing))} onError={(e) => toast(e, 'error')} />}
      {delMsg && <Confirm title="¿Eliminar este mensaje?" message="Se borrará de este dispositivo." confirmLabel="Eliminar" danger onConfirm={() => removeMessage(delMsg)} onCancel={() => setDelMsg(null)} />}
    </>
  );

  // Sub-views: chat with one person, list of chats, a person's voice notes, photo album
  if (view === 'mensajes' || view === 'fotos') {
    const person = viewArg ? byId(viewArg) : undefined;
    const title =
      view === 'fotos' ? (person ? `Fotos de ${person.name}` : 'Fotos de tu familia') : person ? person.name : 'Mensajes';
    return (
      <div className="page subpage">
        <header className="sub-head">
          <button className="pill-btn" onClick={() => go('gente', person ? `persona:${person.id}` : null)}>
            <ArrowLeft size={20} /> Mi gente
          </button>
          {view === 'mensajes' && person && <Avatar contact={person} className="avatar-sm" />}
          <h1>{title}</h1>
          {person && view === 'mensajes' && (
            <button className="pill-btn" onClick={() => setCall(person)}>
              <Video size={20} /> Videollamada
            </button>
          )}
        </header>
        {view === 'mensajes' && person ? (
          <Chat contact={person} onOpen={setViewing} />
        ) : (
          <div className="sub-body scroll">
            {view === 'fotos' ? (
              <PhotoAlbum contactId={person?.id} />
            ) : (
              <ul className="chat-index">
                {contacts.map((c) => {
                  const thread = data.messages.filter((m) => m.contactId === c.id).sort((a, b) => b.createdAt - a.createdAt);
                  const lastMsg = thread[0];
                  const unread = unreadFromFamily(thread).length;
                  const text = lastMsg ? `${lastMsg.from === 'paciente' ? 'Tú: ' : ''}${preview(lastMsg)}` : 'Sin mensajes todavía';
                  return (
                    <li key={c.id}>
                      <button className="chat-index-row" onClick={() => go('gente', `mensajes:${c.id}`)}>
                        <Avatar contact={c} className="avatar-sm" />
                        <span className="chat-index-text">
                          <strong>{c.name}</strong>
                          <small>{text}</small>
                        </span>
                        {lastMsg && <span className="muted num chat-index-when">{timeAgo(lastMsg.createdAt, Date.now())}</span>}
                        {unread > 0 && <span className="badge num">{unread}</span>}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
        {sheets}
      </div>
    );
  }

  const newCount = selected ? unreadFromFamily(data.messages, selected.id).length : 0;
  const last = selected ? lastMessage(data.messages, selected.id) : undefined;

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
          <Carousel contacts={contacts} index={Math.min(index, contacts.length - 1)} setIndex={setIndex} onAdd={() => guard(() => setForm('new'))} onOpen={setQuick} />
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
                <button
                  className="action"
                  onClick={() => go('gente', `mensajes:${selected.id}`)}
                  aria-label={newCount > 0 ? `Mensajes: ${newCount} ${newCount === 1 ? 'nuevo' : 'nuevos'}` : 'Mensajes'}
                >
                  <span className="action-icon">
                    <MessageCircle strokeWidth={1.6} />
                    {newCount > 0 && <span className="badge num" aria-hidden="true">{newCount}</span>}
                  </span>
                  <span>Mensajes</span>
                </button>
                <button className="action" onClick={() => setCall(selected)}>
                  <Video strokeWidth={1.6} />
                  <span>Videollamada</span>
                </button>
              </div>
              <p className="panel-label">Último mensaje</p>
              {last ? (
                <button className="chat-index-row last-msg" onClick={() => go('gente', `mensajes:${selected.id}`)}>
                  <span className="chat-index-text">
                    <strong>{last.from === 'paciente' ? 'Tú' : selected.name}</strong>
                    <small>{preview(last)}</small>
                  </span>
                  <span className="muted num chat-index-when">{timeAgo(last.createdAt, Date.now())}</span>
                </button>
              ) : (
                <p className="muted">Todavía no hay mensajes con {selected.name}.</p>
              )}
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
            <button className="pill-btn" onClick={() => { setProfile(false); go('gente', `fotos:${selected.id}`); }}>
              <Images size={20} /> Ver fotos de {selected.name}
            </button>
          </div>
        </Sheet>
      )}
      {sheets}
    </div>
  );
}
