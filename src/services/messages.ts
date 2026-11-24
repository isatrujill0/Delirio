import type { FamilyMessage } from '../types';

/**
 * Messages a family member sent that the patient has not seen yet. Anything older than the patient's
 * latest reply in that conversation counts as seen: if she answered, she read it.
 */
export function unreadFromFamily(messages: FamilyMessage[], contactId?: string): FamilyMessage[] {
  const lastReply = new Map<string, number>();
  for (const m of messages) {
    if (m.from === 'paciente' && m.createdAt > (lastReply.get(m.contactId) ?? -Infinity)) lastReply.set(m.contactId, m.createdAt);
  }
  return messages.filter(
    (m) => m.from !== 'paciente' && !m.read && (contactId === undefined || m.contactId === contactId) && m.createdAt > (lastReply.get(m.contactId) ?? -Infinity),
  );
}

/** Latest message of a conversation, whoever wrote it. */
export function lastMessage(messages: FamilyMessage[], contactId: string): FamilyMessage | undefined {
  let last: FamilyMessage | undefined;
  for (const m of messages) if (m.contactId === contactId && (!last || m.createdAt > last.createdAt)) last = m;
  return last;
}
