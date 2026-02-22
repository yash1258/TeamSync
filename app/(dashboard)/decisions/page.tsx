import { redirect } from 'next/navigation';
import { featureFlags } from '@/lib/featureFlags';
import { DecisionsView } from '@/sections/DecisionsView';

export default function DecisionsPage() {
  if (!featureFlags.planningHub) {
    redirect('/');
  }

  return <DecisionsView />;
}
