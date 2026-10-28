import type { Meta, Offer, Prediction, Urgency, Value } from './types'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
  if (!res.ok) {
    let detail = `De server gaf een fout (${res.status}).`
    try {
      const body = await res.json()
      if (typeof body.detail === 'string') detail = body.detail
    } catch {
      /* geen JSON */
    }
    throw new Error(detail)
  }
  return res.json() as Promise<T>
}

export const api = {
  meta: (app: 'schuldwijzer' | 'snelgeld') => request<Meta>(`/api/meta/${app}`),
  predict: (values: Record<string, Value>) =>
    request<Prediction>('/api/schuldwijzer/predict', {
      method: 'POST',
      body: JSON.stringify({ values }),
    }),
  feedback: (agree: boolean, band: string, reason?: string) =>
    request<{ total: number; disagree: number }>('/api/schuldwijzer/feedback', {
      method: 'POST',
      body: JSON.stringify({ agree, band, reason }),
    }),
  offer: (values: Record<string, Value>, urgency: Urgency) =>
    request<Offer>('/api/snelgeld/predict', {
      method: 'POST',
      body: JSON.stringify({ values, urgency }),
    }),
}
