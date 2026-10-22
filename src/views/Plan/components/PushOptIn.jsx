import { useState } from 'react';
import { Bell } from 'lucide-react';
import { isLocalMode } from '@db';
import { usePushNotifications } from '../../../hooks/usePushNotifications.js';

// Push für neue Trainingspläne. Blendet sich lokal, ohne Browser-Support, nach
// Ablehnung und sobald Push aktiv ist aus.
export default function PushOptIn({ user }) {
  const { settings, permission, busy, enable } = usePushNotifications(user);
  const [error, setError] = useState('');
  if (isLocalMode() || !user || permission === 'unsupported' || permission === 'denied') return null;
  if (permission === 'granted' && settings?.enabled && settings?.tokens?.length) return null;
  if (!settings) return null;
  return (
    <div className="mb-4 flex items-center gap-3 rounded-2xl border border-fit-line bg-fit-card p-3">
      <Bell size={18} className="shrink-0 text-fit-accent" />
      <p className="min-w-0 flex-1 text-sm">Benachrichtigung, sobald dein Coach einen neuen Plan bereitstellt.{error && <span role="alert" className="block text-xs text-fit-red">{error}</span>}</p>
      <button disabled={busy} onClick={() => { setError(''); enable().catch((e) => setError(e.message || 'Aktivierung fehlgeschlagen.')); }} className="shrink-0 rounded-xl bg-fit-accent px-3 py-2 text-xs font-semibold text-fit-bg disabled:opacity-50">{busy ? '…' : 'Aktivieren'}</button>
    </div>
  );
}
