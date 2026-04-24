import api from '@/services/core/api';
import { extractData } from '@/utils/apiHelpers';
import type {
  UazapiConnectionParams,
  UazapiAuthorizationResponse,
} from '@/types/channels/inbox';

// Cliente para os endpoints de provisionamento UAZAPI no backend (/api/v1/uazapi/*).
// Internamente usamos "uazapi" como identificador do provider; na UI mostramos
// apenas "WhatsApp".
const UazapiService = {
  async healthCheck(apiUrl: string): Promise<boolean> {
    try {
      const baseUrl = apiUrl.replace(/\/$/, '');
      const res = await fetch(`${baseUrl}/`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });
      return res.ok;
    } catch (err) {
      console.error('Uazapi health check failed:', err);
      return false;
    }
  },

  async verifyConnection(
    params: UazapiConnectionParams,
  ): Promise<UazapiAuthorizationResponse> {
    const requestData = {
      authorization: {
        api_url: params.apiUrl,
        admin_token: params.adminToken,
        instance_name: params.instanceName,
        phone_number: params.phoneNumber,
      },
    };
    const response = await api.post('/uazapi/authorization', requestData);
    return extractData<UazapiAuthorizationResponse>(response);
  },

  async refreshQrCode(params: {
    apiUrl: string;
    instanceToken: string;
    phoneNumber?: string;
  }) {
    const requestData = {
      api_url: params.apiUrl,
      instance_token: params.instanceToken,
      phone_number: params.phoneNumber,
    };
    const response = await api.post('/uazapi/qrcodes', requestData);
    return extractData<any>(response);
  },

  async getQRCode(instanceRef: string) {
    const response = await api.get(`/uazapi/qrcodes/${instanceRef}`);
    return extractData<any>(response);
  },

  async fetchInstances(instanceName?: string) {
    const params = instanceName ? { instanceName } : {};
    const response = await api.get('/uazapi/instances', { params });
    return extractData<any>(response);
  },

  async logout(instanceRef: string) {
    const response = await api.delete(`/uazapi/instances/${instanceRef}/logout`);
    return extractData<any>(response);
  },
};

export default UazapiService;
