import type { AppData } from '../types';

/** Shown in the PIN prompt while unchanged, so a demo can be explored; caregivers change it in Configuración. */
export const DEMO_PIN = '1234';

const pad = (n: number) => String(n).padStart(2, '0');
const isoDay = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const dayAt = (now: Date, offsetDays: number, hm: string) => {
  const d = new Date(now);
  d.setDate(d.getDate() + offsetDays);
  return `${isoDay(d)}T${hm}`;
};

/**
 * Demonstration content shown on first launch and after "Restablecer datos".
 * Every person, message and clinical item here is fictitious and flagged as demo in the UI.
 */
export function createDemoData(now = new Date()): AppData {
  const t = now.getTime();
  const H = 3_600_000;
  return {
    version: 1,
    userName: 'Leslie',
    location: 'Estás en la UCI de la Clínica de Occidente.',
    weather: { city: 'Cali', tempC: 26, condition: 'Parcialmente nublado' },
    prefs: {
      volume: 60,
      muted: false,
      textSize: 'normal',
      reduceMotion: false,
      notifications: { enabled: true, sound: true, treatments: true, procedures: true, messages: true },
    },
    contacts: [
      { id: 'c-mama', name: 'Mamá', relation: 'Tu mamá', phone: '300 000 0001', about: 'Viene a visitarte en el horario de visitas y te deja mensajes para cuando no puede estar.', photo: 'asset:mama', demo: true },
      { id: 'c-papa', name: 'Papá', relation: 'Tu papá', phone: '300 000 0002', about: 'Habla con tu equipo de salud y te cuenta las novedades de la casa.', photo: 'asset:papa', demo: true },
      { id: 'c-rafa', name: 'Rafa', relation: 'Tu hermano', phone: '300 000 0003', about: 'Te escribe para contarte cómo está todo y mandarte ánimo.', photo: 'asset:rafa', demo: true },
      { id: 'c-karen', name: 'Karen', relation: 'Tu hermana', phone: '300 000 0004', about: 'Te prepara videos y fotos de la familia para que los veas aquí.', photo: 'asset:karen', demo: true },
      { id: 'c-bryan', name: 'Bryan', relation: 'Tu novio', phone: '300 000 0005', about: 'Te deja mensajes para que sepas que está pensando en ti.', photo: 'asset:bryan', demo: true },
    ],
    messages: [
      { id: 'm-1', contactId: 'c-mama', kind: 'audio', from: 'contacto', text: 'Hola, mi amor. Pensamos mucho en ti. Esta tarde vamos a visitarte. Descansa, que aquí estamos contigo. Te queremos muchísimo.', createdAt: t - 2 * H, read: false, demo: true },
      { id: 'm-2', contactId: 'c-papa', kind: 'audio', from: 'contacto', text: 'Hija, esta mañana hablé con tu equipo de salud y están pendientes de ti. Tú tranquila, que nosotros estamos aquí para lo que necesites.', createdAt: t - 5 * H, read: false, demo: true },
      { id: 'm-3', contactId: 'c-karen', kind: 'video', from: 'contacto', text: 'Te hice este video con nuestra foto favorita. ¡Ánimo, hermanita!', media: 'asset:video-recuerdos', duration: 14, createdAt: t - 26 * H, read: true, demo: true },
      { id: 'm-4', contactId: 'c-rafa', kind: 'texto', from: 'contacto', text: 'Leslie, toda la familia te manda mucho cariño. Muy pronto paso a saludarte.', createdAt: t - 30 * H, read: true, demo: true },
      { id: 'm-5', contactId: 'c-bryan', kind: 'texto', from: 'contacto', text: 'Te extraño mucho. Cuando me dejen entrar, me quedo contigo un rato. Te quiero.', createdAt: t - 8 * H, read: true, demo: true },
      { id: 'm-6', contactId: 'c-mama', kind: 'imagen', from: 'contacto', text: 'Mira esta foto de nosotras 🥰', media: 'asset:mama-y-leslie', createdAt: t - 1.5 * H, read: false, demo: true },
      { id: 'm-7', contactId: 'c-mama', kind: 'texto', from: 'paciente', text: 'Mami, ¿vienes hoy a visitarme? 💜', createdAt: t - 3 * H, read: true, demo: true },
      { id: 'm-8', contactId: 'c-bryan', kind: 'texto', from: 'paciente', text: 'Yo también te extraño 🥹 Ven pronto.', createdAt: t - 7 * H, read: true, demo: true },
      { id: 'm-9', contactId: 'c-karen', kind: 'texto', from: 'paciente', text: '¡Me encantó el video! 😄', createdAt: t - 20 * H, read: true, demo: true },
      { id: 'm-10', contactId: 'c-rafa', kind: 'texto', from: 'paciente', text: '¡Gracias, Rafa! Te espero 🤗', createdAt: t - 29 * H, read: true, demo: true },
      { id: 'm-11', contactId: 'c-rafa', kind: 'texto', from: 'contacto', text: 'Les, hoy me acordé del viaje a Machu Picchu 😄 Ya quiero que vuelvas a casa. Te quiero mucho.', createdAt: t - 0.7 * H, read: false, demo: true },
      { id: 'm-12', contactId: 'c-papa', kind: 'texto', from: 'contacto', text: 'Mañana te llevo tu cobija favorita 💙', createdAt: t - 4 * H, read: false, demo: true },
    ],
    photos: [
      { id: 'p-1', src: 'asset:familia', caption: 'Toda la familia junta', demo: true },
      { id: 'p-2', src: 'asset:mama-y-leslie', caption: 'Con mamá', contactId: 'c-mama', demo: true },
      { id: 'p-3', src: 'asset:papa', caption: 'Papá, siempre sonriendo', contactId: 'c-papa', demo: true },
      { id: 'p-4', src: 'asset:rafa', caption: 'Rafa', contactId: 'c-rafa', demo: true },
      { id: 'p-5', src: 'asset:karen', caption: 'Karen', contactId: 'c-karen', demo: true },
      { id: 'p-6', src: 'asset:bryan', caption: 'Bryan', contactId: 'c-bryan', demo: true },
    ],
    treatments: [
      { id: 't-1', name: 'Analgésico', description: 'Ayuda a controlar el dolor y la fiebre.', startDate: isoDay(new Date(t - 72 * H)), frequency: 'Cada 8 horas', times: ['06:00', '14:00', '22:00'], observations: 'Lo administra tu enfermera. Cuéntale si sientes dolor.', demo: true },
      { id: 't-2', name: 'Antibiótico intravenoso', description: 'Ayuda a tu cuerpo a combatir la infección.', startDate: isoDay(new Date(t - 48 * H)), frequency: 'Cada 12 horas', times: ['08:00', '20:00'], observations: 'Se aplica por el catéter del brazo.', demo: true },
      { id: 't-3', name: 'Terapia respiratoria', description: 'Ejercicios para que tus pulmones trabajen mejor.', startDate: isoDay(new Date(t - 24 * H)), frequency: 'Dos veces al día', times: ['10:00', '16:00'], observations: 'Con tu terapeuta. Respira despacio y a tu ritmo.', demo: true },
    ],
    procedures: [
      { id: 'pr-0', name: 'Ecografía abdominal', date: dayAt(now, -1, '11:00'), description: 'Imagen con ultrasonido. No duele; se usa un gel frío sobre la piel.', status: 'realizado', demo: true },
      { id: 'pr-1', name: 'Radiografía de tórax', date: dayAt(now, 0, '16:00'), description: 'Una foto de tus pulmones. Se hace en la cama y toma pocos minutos.', status: 'confirmado', demo: true },
      { id: 'pr-2', name: 'Toma de muestras de sangre', date: dayAt(now, 1, '07:30'), description: 'Exámenes de control. Puede sentirse un pinchazo pequeño.', status: 'programado', demo: true },
      { id: 'pr-3', name: 'Valoración de fisioterapia', date: dayAt(now, 2, '10:00'), description: 'Tu fisioterapeuta revisará cómo mover brazos y piernas sin esfuerzo.', status: 'programado', demo: true },
    ],
    recommendations: [
      { id: 'r-1', category: 'Emociones', title: 'Respira despacio', summary: 'Un ejercicio corto para calmarte.', body: 'Toma aire por la nariz contando hasta cuatro, sostenlo un momento y suéltalo despacio por la boca contando hasta seis. Repítelo cinco veces, a tu ritmo.', demo: true },
      { id: 'r-2', category: 'Emociones', title: 'Está bien sentir miedo', summary: 'Habla de lo que sientes.', body: 'Estar en la UCI puede dar miedo o confusión. Es normal. Cuéntaselo a tu enfermera o a tu familia: ellos están para acompañarte.', demo: true },
      { id: 'r-3', category: 'Descanso', title: 'Duerme a tu ritmo', summary: 'Descansar ayuda a recuperarte.', body: 'Cierra los ojos cuando lo necesites. Puedes escuchar los sonidos de Mi mundo para relajarte; se apagan solos al terminar.', demo: true },
      { id: 'r-4', category: 'Descanso', title: 'Luz y ruido', summary: 'Pide ayuda para descansar mejor.', body: 'Si la luz o los sonidos te molestan, pídele a tu enfermera que ajuste la luz de la habitación.', demo: true },
      { id: 'r-5', category: 'Alimentación', title: 'Come y bebe según indicación', summary: 'Tu equipo decide qué puedes tomar.', body: 'No comas ni bebas nada que no te haya indicado tu equipo de salud. Si tienes sed o hambre, avísale a tu enfermera.', demo: true },
      { id: 'r-6', category: 'Movimiento', title: 'Mueve manos y pies', summary: 'Pequeños movimientos, sin esfuerzo.', body: 'Abre y cierra las manos y mueve los tobillos en círculos unas cuantas veces, solo si tu equipo te lo permite y sin hacer fuerza.', demo: true },
      { id: 'r-7', category: 'Visitas', title: 'Horario de visitas', summary: 'Tu familia puede acompañarte.', body: 'El horario de visitas lo define la clínica. Pregunta a tu enfermera los horarios de hoy.', demo: true },
    ],
    moods: ([3, 2, 3, 4, 3, 4] as const).map((value, i) => ({ date: isoDay(new Date(t - (6 - i) * 24 * H)), value, demo: true })),
    vitals: { heartRate: 72, respRate: 16, spo2: 97, systolic: 118, diastolic: 76, recordedAt: t - 2 * H, demo: true },
    careNote: { text: 'Tu equipo de salud está pendiente de ti. Si algo te molesta o tienes una pregunta, díselo a tu enfermera.', updatedAt: t - 3 * H, demo: true },
    favorites: ['amanecer-sereno', 'bosque'],
    scores: {},
    dismissedNotifications: [],
    caregiverPin: DEMO_PIN,
  };
}
