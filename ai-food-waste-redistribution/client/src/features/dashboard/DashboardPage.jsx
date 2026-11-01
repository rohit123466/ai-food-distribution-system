import { useAuth } from '../../context/AuthContext';
import DonorSummary from '../donor/DonorSummary.jsx';
import NgoSummary from '../ngo/NgoSummary.jsx';
import VolunteerSummary from '../volunteer/VolunteerSummary.jsx';
import AdminSummary from '../admin/AdminSummary.jsx';
import DonorWorkspace from '../donor/DonorWorkspace.jsx';
import NgoWorkspace from '../ngo/NgoWorkspace.jsx';
import VolunteerWorkspace from '../volunteer/VolunteerWorkspace.jsx';
import NotificationsCard from '../../components/NotificationsCard.jsx';

const ROLE_SUMMARY = {
  donor: DonorSummary,
  ngo: NgoSummary,
  volunteer: VolunteerSummary,
  admin: AdminSummary,
};

// The day-to-day part of the dashboard: each role's step in the donation flow.
const ROLE_WORKSPACE = {
  donor: DonorWorkspace,
  ngo: NgoWorkspace,
  volunteer: VolunteerWorkspace,
};

export default function DashboardPage() {
  const { user, profile } = useAuth();
  const RoleSummary = ROLE_SUMMARY[user.role];
  const RoleWorkspace = ROLE_WORKSPACE[user.role];

  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-gray-800">Welcome, {user.name}</h1>
        <dl className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-gray-500">Email</dt>
            <dd className="text-gray-800">{user.email}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Role</dt>
            <dd className="capitalize text-gray-800">{user.role}</dd>
          </div>
          {user.phone && (
            <div>
              <dt className="text-gray-500">Phone</dt>
              <dd className="text-gray-800">{user.phone}</dd>
            </div>
          )}
          <div>
            <dt className="text-gray-500">Member since</dt>
            <dd className="text-gray-800">{new Date(user.created_at).toLocaleDateString()}</dd>
          </div>
        </dl>
      </div>

      {RoleWorkspace && profile && (
        <>
          <NotificationsCard />
          <RoleWorkspace />
        </>
      )}

      {RoleSummary && <RoleSummary profile={profile} />}
    </div>
  );
}
