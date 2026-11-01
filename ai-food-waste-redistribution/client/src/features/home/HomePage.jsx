import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export default function HomePage() {
  const [apiStatus, setApiStatus] = useState('checking...');
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    api
      .get('/health')
      .then((res) => setApiStatus(res.data.status))
      .catch(() => setApiStatus('unreachable'));
  }, []);

  return (
    <div className="text-center">
      <h1 className="text-2xl font-semibold text-gray-800">AI Food Waste Redistribution</h1>
      <p className="mt-2 text-gray-500">API status: {apiStatus}</p>

      {!isAuthenticated && (
        <div className="mt-6 flex justify-center gap-3">
          <Link
            to="/login"
            className="rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
          >
            Login
          </Link>
          <Link
            to="/register"
            className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            Register
          </Link>
        </div>
      )}
    </div>
  );
}
