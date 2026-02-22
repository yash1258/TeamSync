import { redirect } from 'next/navigation';
import { featureFlags } from '@/lib/featureFlags';
import { ProjectsView } from '@/sections/ProjectsView';

export default function ProjectsPage() {
  if (!featureFlags.planningHub) {
    redirect('/');
  }

  return <ProjectsView />;
}
