import api from '../services/api';
import usePolling from '../hooks/usePolling';

export default function NotificationsCard() {
  const { data, reload } = usePolling(() => api.get('/notifications').then((res) => res.data.notifications));
  const notifications = data || [];
  const unread = notifications.filter((n) => !n.is_read).length;

  async function markAllRead() {
    await api.post('/notifications/read-all');
    reload();
  }

  return (
    <div className="rounded-lg border bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800">
          Updates {unread > 0 && <span className="ml-1 rounded-full bg-emerald-600 px-2 text-xs text-white">{unread}</span>}
        </h2>
        {unread > 0 && (
          <button onClick={markAllRead} className="text-sm font-medium text-emerald-700 hover:underline">
            Mark all read
          </button>
        )}
      </div>
      {notifications.length === 0 ? (
        <p className="mt-3 text-sm text-gray-500">Nothing yet.</p>
      ) : (
        <ul className="mt-3 space-y-2 text-sm">
          {notifications.slice(0, 8).map((n) => (
            <li key={n.notification_id} className={n.is_read ? 'text-gray-500' : 'text-gray-800'}>
              {!n.is_read && <span className="mr-2 inline-block h-2 w-2 rounded-full bg-emerald-600" />}
              {n.message}
              <span className="ml-2 text-xs text-gray-400">{new Date(n.sent_at).toLocaleString()}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
