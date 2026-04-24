import { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { trackingService, type MetaAdAccount } from '@/services/reports/trackingService';

const CRITICAL_DAYS = 3;

const MetaTokenExpiryBanner = () => {
  const [accounts, setAccounts] = useState<MetaAdAccount[]>([]);

  useEffect(() => {
    trackingService
      .listMetaAccounts()
      .then(setAccounts)
      .catch(() => setAccounts([]));
  }, []);

  const critical = accounts.filter(a => {
    if (a.token_expired) return true;
    return typeof a.token_days_until_expiry === 'number' && a.token_days_until_expiry <= CRITICAL_DAYS;
  });

  if (critical.length === 0) return null;

  const hasExpired = critical.some(a => a.token_expired);
  const tone = hasExpired
    ? 'border-red-300 bg-red-50 text-red-800'
    : 'border-amber-300 bg-amber-50 text-amber-900';

  return (
    <div className={`rounded-md border p-3 flex items-start gap-2 ${tone}`}>
      <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
      <div className="text-sm space-y-1">
        <p className="font-medium">
          {hasExpired
            ? 'Token do Meta Ads expirado'
            : 'Token do Meta Ads expira em breve'}
        </p>
        <ul className="text-xs space-y-0.5">
          {critical.map(a => {
            const label = a.ad_account_name || a.ad_account_id;
            if (a.token_expired) {
              return (
                <li key={a.id}>
                  <strong>{label}</strong> — expirou. Gere um novo token para retomar a sincronização.
                </li>
              );
            }
            const days = a.token_days_until_expiry ?? 0;
            return (
              <li key={a.id}>
                <strong>{label}</strong> — expira em {days === 0 ? 'menos de 1 dia' : `${days} dia${days === 1 ? '' : 's'}`}.
                Gere um novo token antes disso para evitar interrupção.
              </li>
            );
          })}
        </ul>
        <p className="text-xs">
          Vá em <strong>Rastreamento de dados</strong> → <strong>Integração Meta Ads</strong> para atualizar.
        </p>
      </div>
    </div>
  );
};

export default MetaTokenExpiryBanner;
