import { PlanningView } from '@/sections/PlanningView';
import { featureFlags } from '@/lib/featureFlags';
import { redirect } from 'next/navigation';

export default function PlanningPage() {
  if (!featureFlags.planningHub) {
    redirect('/');
  }

  return <PlanningView />;
}
