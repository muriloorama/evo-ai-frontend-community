import { useCallback, useContext, useState } from 'react';
import { toast } from 'sonner';

import { contactsService } from '@/services/contacts/contactsService';
import { ConversationsContext } from '@/contexts/chat/ConversationsContextInstance';
import { useLanguage } from '@/hooks/useLanguage';

import type { Contact, ContactUpdateData } from '@/types/contacts';

type UpdateOptions = {
  /** Suppress the default toast so the caller can show its own. */
  silent?: boolean;
  /** Translation keys for success/error toasts. Falls back to chat namespace. */
  translationKeys?: {
    successKey?: string;
    errorKey?: string;
  };
};

/**
 * Unified contact update hook.
 *
 * Centralises the PATCH → conversation state dispatch → toast flow that was
 * previously duplicated across ContactForm, ContactDetails (sidebar), the
 * editable sidebar fields and the custom-attributes editor. Any component
 * that edits a Contact should go through this hook so new fields propagate
 * to every view for free.
 */
export function useContactUpdate() {
  // Read ConversationsContext directly instead of useConversations() so the
  // hook still works on pages that aren't inside the chat provider tree
  // (e.g. the global Contacts list page). In that case we just skip the
  // realtime propagation — the caller's state update + polling handle it.
  const conversationsContext = useContext(ConversationsContext);
  const { t } = useLanguage('chat');
  const [isSaving, setIsSaving] = useState(false);

  const updateContact = useCallback(
    async (
      contactId: string,
      data: ContactUpdateData,
      options: UpdateOptions = {},
    ): Promise<Contact | null> => {
      if (!contactId) return null;
      setIsSaving(true);
      try {
        const updated = await contactsService.updateContact(contactId, data);
        // Propagate through the conversations context when available so the
        // chat sidebar/header/list pick up the change without a refresh.
        // On pages outside the chat tree, context is undefined — fine.
        conversationsContext?.updateContactInConversations?.(
          updated as unknown as Contact,
        );
        if (!options.silent) {
          const successKey =
            options.translationKeys?.successKey ||
            'contactSidebar.contactDetails.actions.updateSuccess';
          toast.success(t(successKey));
        }
        return updated as unknown as Contact;
      } catch (error) {
        console.error('useContactUpdate: failed to update contact', error);
        if (!options.silent) {
          const errorKey =
            options.translationKeys?.errorKey ||
            'contactSidebar.contactDetails.actions.updateError';
          toast.error(t(errorKey));
        }
        throw error;
      } finally {
        setIsSaving(false);
      }
    },
    [t, conversationsContext],
  );

  return { updateContact, isSaving };
}
