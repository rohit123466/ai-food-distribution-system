import SummaryCard from '../../components/SummaryCard.jsx';

export default function VolunteerSummary({ profile }) {
  if (!profile) return null;

  return (
    <SummaryCard
      title="Volunteer profile"
      rows={[
        { label: 'Vehicle type', value: profile.vehicle_type.replace('_', ' ') },
        { label: 'Available', value: profile.is_available ? 'Yes' : 'No' },
      ]}
    />
  );
}
