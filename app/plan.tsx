import { AppScreen } from '../supabase/src/components/ui/AppScreen';
import { Card } from '../supabase/src/components/ui/Card';
import { SectionHeader } from '../supabase/src/components/ui/SectionHeader';

export default function PlanScreen() {
  return (
    <AppScreen>
      <SectionHeader
        title="Plan"
        subtitle="Meal planning support will come in a later chunk."
      />

      <Card>
        <SectionHeader title="Coming soon" subtitle="This screen is intentionally light for now." />
      </Card>
    </AppScreen>
  );
}
