import { useCallback, useEffect, useRef, useState } from 'react';

// Loads data on mount and every intervalMs after, so a donor sees "accepted"
// appear when an NGO accepts elsewhere without refreshing the page.
export default function usePolling(fetcher, intervalMs = 15000) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const reload = useCallback(async () => {
    try {
      setData(await fetcherRef.current());
      setError('');
    } catch (err) {
      setError(err.response?.data?.error || 'Could not load data.');
    }
  }, []);

  useEffect(() => {
    reload();
    const id = setInterval(reload, intervalMs);
    return () => clearInterval(id);
  }, [reload, intervalMs]);

  return { data, error, reload };
}
