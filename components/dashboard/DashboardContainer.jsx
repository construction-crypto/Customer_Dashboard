'use client';

import React, { useEffect, useState } from 'react';
import { ClientDashboard } from './ClientDashboard';

export function DashboardContainer({ token }) {
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchProjectData() {
      try {
        const res = await fetch(\/api/dashboard/session?token=\\);
        if (!res.ok) {
          throw new Error('Failed to authorize or retrieve project data.');
        }
        const data = await res.json();
        setProject(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    if (token) {
      fetchProjectData();
    } else {
      setError('No access token provided.');
      setLoading(false);
    }
  }, [token]);

  if (loading) return <div className="p-6 text-white bg-slate-900">Loading verified project data...</div>;
  if (error) return <div className="p-6 text-red-400 bg-slate-900">Error: {error}</div>;

  return <ClientDashboard project={project} />;
}
