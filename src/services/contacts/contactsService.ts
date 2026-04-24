import api from '@/services/core/api';
import { extractData, extractResponse } from '@/utils/apiHelpers';
import type {
  Contact,
  ContactsResponse,
  ContactNotesResponse,
  ContactConversationsResponse,
  ContactsListParams,
  ContactsSearchParams,
  ContactsFilterParams,
  ContactUpdateData,
  ContactFormData,
  ContactMergeParams,
  ContactExportParams,
  ContactImportResponse,
  ContactExportResponse,
  ContactNote,
  ContactConversation,
  ContactableInboxes,
} from '@/types/contacts';

// Serialises a contact payload (minus any File fields) into FormData using
// Rails-style brackets for nested objects/arrays. Shared between
// createContact and updateContact so multipart uploads stay consistent.
function buildContactFormData(data: Record<string, unknown>): FormData {
  const formData = new FormData();

  const appendValue = (path: string, value: unknown): void => {
    if (value === undefined || value === null) return;

    if (value instanceof Blob) {
      formData.append(path, value);
      return;
    }

    if (Array.isArray(value)) {
      value.forEach(item => appendValue(`${path}[]`, item));
      return;
    }

    if (typeof value === 'object') {
      Object.entries(value as Record<string, unknown>).forEach(([key, nested]) => {
        appendValue(`${path}[${key}]`, nested);
      });
      return;
    }

    formData.append(path, String(value));
  };

  Object.entries(data).forEach(([key, value]) => appendValue(key, value));
  return formData;
}

class ContactsService {
  // List contacts with pagination and filters
  async getContacts(params?: ContactsListParams): Promise<ContactsResponse> {
    const response = await api.get(`/contacts`, {
      params,
    });
    return extractResponse<Contact>(response) as ContactsResponse;
  }

  async getAllContacts(): Promise<ContactsResponse> {
    const response = await api.get(`/contacts/all`);
    return extractResponse<Contact>(response) as ContactsResponse;
  }

  // Search contacts
  async searchContacts(params: ContactsSearchParams): Promise<ContactsResponse> {
    const response = await api.get(`/contacts/search`, {
      params,
    });
    return extractResponse<Contact>(response) as ContactsResponse;
  }

  // Get active contacts
  async getActiveContacts(params?: { page?: number; sort?: string }): Promise<ContactsResponse> {
    const response = await api.get(`/contacts/active`, {
      params,
    });
    return extractResponse<Contact>(response) as ContactsResponse;
  }

  // Get companies list
  async getCompaniesList(): Promise<Array<{ id: string; name: string }>> {
    const response = await api.get(`/contacts/companies_list`);
    return extractData<Array<{ id: string; name: string }>>(response);
  }

  // Filter contacts with advanced queries
  async filterContacts(params: ContactsFilterParams): Promise<ContactsResponse> {
    const response = await api.post(`/contacts/filter`, params);
    return extractResponse<Contact>(response) as ContactsResponse;
  }

  // Get single contact
  async getContact(contactId: string, includeContactInboxes = true): Promise<Contact> {
    const response = await api.get(`/contacts/${contactId}`, {
      params: {
        include_contact_inboxes: includeContactInboxes,
      },
    });
    return extractData<Contact>(response);
  }

  // Create contact. Same shape as updateContact: multipart when an avatar
  // file is attached, plain JSON otherwise.
  async createContact(contactData: ContactFormData): Promise<Contact> {
    if (!contactData.avatar) {
      const response = await api.post(`/contacts`, contactData);
      return extractData<Contact>(response);
    }

    const { avatar, ...data } = contactData;
    const formData = buildContactFormData(data);
    formData.append('avatar', avatar);

    const response = await api.post(`/contacts`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return extractData<Contact>(response);
  }

  // Update contact. When `avatar` is present the payload is sent as
  // multipart/form-data (for the file); otherwise a plain JSON PATCH is
  // sent. This is the only entry point — previous helpers for avatar-only
  // updates were just thin wrappers around the same PATCH.
  async updateContact(contactId: string, contactData: ContactUpdateData): Promise<Contact> {
    if (!contactData.avatar) {
      const response = await api.patch(`/contacts/${contactId}`, contactData);
      return extractData<Contact>(response);
    }

    const { avatar, ...data } = contactData;
    const formData = buildContactFormData(data);
    formData.append('avatar', avatar);

    const response = await api.patch(`/contacts/${contactId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return extractData<Contact>(response);
  }

  // Delete contact
  async deleteContact(contactId: string): Promise<{ message: string }> {
    const response = await api.delete(`/contacts/${contactId}`);
    return extractData<{ message: string }>(response);
  }

  // Remove contact avatar
  async removeContactAvatar(contactId: string): Promise<Contact> {
    const response = await api.delete(`/contacts/${contactId}/avatar`);
    return extractData<Contact>(response);
  }

  // Get contactable inboxes for a contact
  async getContactableInboxes(contactId: string): Promise<ContactableInboxes[]> {
    const response = await api.get(`/contacts/${contactId}/contactable_inboxes`);
    return extractData<ContactableInboxes[]>(response);
  }

  // Contact Labels
  async getContactLabels(contactId: string): Promise<{ data: string[] }> {
    const response = await api.get(`/contacts/${contactId}/labels`);
    return extractData<{ data: string[] }>(response);
  }

  async updateContactLabels(contactId: string, labels: string[]): Promise<Contact> {
    const response = await api.post(`/contacts/${contactId}/labels`, {
      labels,
    });
    return extractData<Contact>(response);
  }

  // Contact Notes
  async getContactNotes(contactId: string): Promise<ContactNotesResponse> {
    const response = await api.get(`/contacts/${contactId}/notes`);
    return extractResponse<ContactNote>(response) as ContactNotesResponse;
  }

  async createContactNote(contactId: string, content: string): Promise<ContactNote> {
    const response = await api.post(`/contacts/${contactId}/notes`, {
      content,
    });
    return extractData<ContactNote>(response);
  }

  async updateContactNote(
    contactId: string,
    noteId: string,
    content: string,
  ): Promise<ContactNote> {
    const response = await api.patch(`/contacts/${contactId}/notes/${noteId}`, {
      content,
    });
    return extractData<ContactNote>(response);
  }

  async deleteContactNote(contactId: string, noteId: string): Promise<{ message: string }> {
    const response = await api.delete(`/contacts/${contactId}/notes/${noteId}`);
    return extractData<{ message: string }>(response);
  }

  // Contact Conversations
  async getContactConversations(
    contactId: string,
    params?: { page?: number; status?: string; inbox_id?: string },
  ): Promise<ContactConversationsResponse> {
    const response = await api.get(`/contacts/${contactId}/conversations`, {
      params,
    });
    return extractResponse<ContactConversation>(response) as ContactConversationsResponse;
  }

  // Contact Pipelines
  async getContactPipelines(contactId: string): Promise<Array<{
      pipeline: {
        id: string;
        name: string;
        pipeline_type: string;
      };
      stage: {
        id: string;
        name: string;
        color: string;
        position: number;
        stage_type: number;
      };
      item: {
        id: string;
        item_id: string;
        type: string;
        entered_at: number;
        notes: string | null;
      };
    }>> {
    const response = await api.get(`/contacts/${contactId}/pipelines`);
    return extractData<Array<{
        pipeline: {
          id: string;
          name: string;
          pipeline_type: string;
        };
        stage: {
          id: string;
          name: string;
          color: string;
          position: number;
          stage_type: number;
        };
        item: {
          id: string;
          item_id: string;
          type: string;
          entered_at: number;
          notes: string | null;
        };
    }>>(response);
  }

  // Custom Attributes
  async destroyCustomAttributes(contactId: string, customAttributes: string[]): Promise<Contact> {
    const response = await api.post(`/contacts/${contactId}/destroy_custom_attributes`, {
      custom_attributes: customAttributes,
    });
    return extractData<Contact>(response);
  }

  // Bulk Actions
  async bulkDelete(contactIds: string[]): Promise<{ message: string; affected_count?: number }> {
    const response = await api.post(`/bulk_actions`, {
      type: 'Contact',
      ids: contactIds,
      fields: {
        action: 'delete',
      },
    });
    return extractData<{ message: string; affected_count?: number }>(response);
  }

  async bulkUpdateLabels(
    contactIds: string[],
    labels: string[],
    action: 'add_labels' | 'remove_labels',
  ): Promise<{ message: string; affected_count?: number }> {
    const response = await api.post(`/bulk_actions`, {
      type: 'Contact',
      ids: contactIds,
      fields: {
        action,
        labels,
      },
    });
    return extractData<{ message: string; affected_count?: number }>(response);
  }

  async bulkUpdateCustomAttributes(
    contactIds: string[],
    customAttributes: Record<string, unknown>,
  ): Promise<{ message: string; affected_count?: number }> {
    const response = await api.post(`/bulk_actions`, {
      type: 'Contact',
      ids: contactIds,
      fields: {
        action: 'update_custom_attributes',
        custom_attributes: customAttributes,
      },
    });
    return extractData<{ message: string; affected_count?: number }>(response);
  }

  // Import/Export
  async importContacts(file: File): Promise<ContactImportResponse> {
    const formData = new FormData();
    formData.append('import_file', file);

    const response = await api.post(`/contacts/import`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return extractData<ContactImportResponse>(response);
  }

  async exportContacts(params: ContactExportParams): Promise<ContactExportResponse> {
    const response = await api.post(`/contacts/export`, params);
    return extractData<ContactExportResponse>(response);
  }

  // Merge Contacts
  async mergeContacts(params: ContactMergeParams): Promise<Contact> {
    const response = await api.post(`/actions/contact_merge`, params);
    return extractData<Contact>(response);
  }

  // Search for duplicates
  async searchDuplicates(query: string): Promise<ContactsResponse> {
    const response = await api.get(`/contacts/search`, {
      params: {
        q: query,
        duplicate_check: true,
      },
    });
    return extractResponse<Contact>(response) as ContactsResponse;
  }
}

export const contactsService = new ContactsService();
