import SummaryCard from '../../components/SummaryCard.jsx';

export default function NgoSummary({ profile }) {
  if (!profile) return null;

  return (
    <SummaryCard
      title="NGO profile"
      rows={[
        { label: 'NGO name', value: profile.ngo_name },
        { label: 'Registration number', value: profile.registration_number },
        { label: 'Address', value: profile.address },
        { label: 'Daily capacity', value: profile.daily_capacity },
        { label: 'Current demand level', value: profile.current_demand_level },
        { label: 'Accepted diets', value: (profile.accepted_diets || '').replaceAll('_', '-').replaceAll(',', ', ') || 'None' },
      ]}
    />
  );
}
