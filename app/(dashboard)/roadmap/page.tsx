import { redirect } from 'next/navigation';
import { featureFlags } from '@/lib/featureFlags';
import { RoadmapView } from '@/sections/RoadmapView';

export default function RoadmapPage() {
  if (!featureFlags.planningHub) {
    redirect('/');
  }

  return <RoadmapView />;
}
