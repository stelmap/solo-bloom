const KEY = 'solo-bizz-campaign-attribution';
const FIELDS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'] as const;
export type CampaignAttribution = Partial<Record<typeof FIELDS[number], string>>;

export function parseCampaign(search: string): CampaignAttribution {
  const params = new URLSearchParams(search);
  return Object.fromEntries(FIELDS.flatMap(k => {
    const value = params.get(k)?.trim().slice(0, 120);
    return value ? [[k, value]] : [];
  }));
}

/** Only persist campaign labels after analytics consent; never retain URLs or form inputs. */
export function campaignAttribution(search: string, consent: boolean, storage?: Storage): CampaignAttribution {
  const current = parseCampaign(search);
  if (!consent || !storage) return current;
  try {
    if (Object.keys(current).length) storage.setItem(KEY, JSON.stringify(current));
    const saved = JSON.parse(storage.getItem(KEY) ?? '{}');
    return Object.fromEntries(FIELDS.flatMap(k => typeof saved[k] === 'string' ? [[k, saved[k].slice(0, 120)]] : []));
  } catch { return current; }
}

export function clearCampaignAttribution(storage?: Storage) {
  try { storage?.removeItem(KEY); } catch { /* Storage is optional. */ }
}