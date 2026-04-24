import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@evoapi/design-system';
import { MapPin } from 'lucide-react';
import api from '@/services/core/api';

interface StateBucket {
  state: string;
  total: number;
}

interface Response {
  success?: boolean;
  data?: StateBucket[];
}

// Simple heatmap shade per state so busy regions stand out without
// pulling in a full topojson map library. Good-enough for a community
// build; a proper cartographic map can replace this later.
function shadeFor(total: number, max: number): string {
  if (total <= 0 || max <= 0) return 'bg-muted/30 text-foreground/60';
  const intensity = Math.min(1, total / max);
  if (intensity >= 0.75) return 'bg-primary text-primary-foreground';
  if (intensity >= 0.5) return 'bg-primary/70 text-primary-foreground';
  if (intensity >= 0.25) return 'bg-primary/40 text-foreground';
  return 'bg-primary/20 text-foreground';
}

export function DashboardContactsByLocationCard() {
  const [buckets, setBuckets] = useState<StateBucket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await api.get<Response>('/dashboard/contacts_by_location');
        const data = response.data?.data ?? [];
        if (!cancelled) setBuckets(data);
      } catch (err) {
        console.error('contacts_by_location failed', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const max = buckets.reduce((acc, b) => Math.max(acc, b.total), 0);
  const total = buckets.reduce((acc, b) => acc + b.total, 0);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <MapPin className="h-4 w-4" />
          Contatos por estado (Brasil)
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading && <p className="text-sm text-muted-foreground">Carregando…</p>}
        {!loading && buckets.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Nenhum contato com estado identificado ainda.
          </p>
        )}
        {!loading && buckets.length > 0 && (
          <>
            <p className="text-xs text-muted-foreground mb-3">
              {total} contatos em {buckets.length} regiões
            </p>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
              {buckets.map(bucket => (
                <div
                  key={bucket.state}
                  className={`rounded-md p-2 text-center ${shadeFor(bucket.total, max)}`}
                >
                  <div className="text-xs font-mono uppercase">{bucket.state}</div>
                  <div className="text-lg font-semibold leading-tight">{bucket.total}</div>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default DashboardContactsByLocationCard;
