import SummaryCard from '../../components/SummaryCard.jsx';

export default function DonorSummary({ profile }) {
  if (!profile) return null;

  return (
    <SummaryCard
      title="Business profile"
      rows={[
        { label: 'Business name', value: profile.business_name },
        { label: 'Business type', value: profile.business_type.replace('_', ' ') },
        { label: 'Address', value: profile.address },
      ]}
    />
  );
}
