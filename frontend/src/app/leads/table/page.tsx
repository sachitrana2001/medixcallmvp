"use client";
import { useEffect, useState } from 'react';

interface Lead {
  id: number;
  name: string;
  preferred_language: string;
  doc_id: number;
  script?: string;
  phone: string;
}

export default function LeadsTable() {
  const [loading, setLoading] = useState<number | null>(null);
  const [leadScripts, setLeadScripts] = useState<Record<number, string>>({});
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loadingCall, setLoadingCall] = useState<number | null>(null);

  const generateScript = async (leadId: number) => {
    setLoading(leadId);
    try {
      const res = await fetch('/api/lead-scripts/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ leadId, topK: 3 }),
      });
      const data = await res.json();
      if (data.success) {
        setLeadScripts(prev => ({ ...prev, [leadId]: data.scriptId }));
      } else {
        alert(data.error || 'Failed to generate script');
      }
    } catch {
      alert('Error generating script');
    } finally {
      setLoading(null);
    }
  };

  const fetchLeads = async () => {
    const res = await fetch(`/api/leads/list`);
    const json = await res.json();

    setLeads(json.data || []);
  };

  const startCall = async (leadId: number) => {
    setLoadingCall(leadId);
    try {
      const res = await fetch('/api/calls/start', {
        method: 'POST',
        body: JSON.stringify({ leadId }),
      });
      const data = await res.json();
      if (!data.success) alert(data.error || 'Call failed');
    } catch {
      alert('Error starting call');
    } finally {
      setLoadingCall(null);
    }
  };
  useEffect(() => {
    fetchLeads();
  }, []);

  return (
    <table className="table-auto w-full border">
      <thead>
        <tr className="bg-gray-200">
          <th>Name</th>
          <th>Language</th>
          <th>Document</th>
          <th>Script</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {leads?.map(lead => (
          <tr key={lead.id} className="border-t">
            <td>{lead.name}</td>
            <td>{lead.preferred_language}</td>
            <td>{lead.doc_id}</td>
            <td>{leadScripts[lead.id] || 'Not generated'}</td>
            <td>
              <button
                className="px-2 py-1 bg-blue-500 text-white rounded"
                onClick={() => generateScript(lead.id)}
                disabled={loading === lead.id}
              >
                {loading === lead.id ? 'Generating...' : 'Generate Script'}
              </button>
            </td>
            <td>
              <button
                className="px-2 py-1 bg-green-500 text-white rounded"
                onClick={() => startCall(lead.id)}
                disabled={loadingCall === lead.id}
              >
                {loadingCall === lead.id ? 'Calling...' : 'Start Call'}
              </button>
            </td>

          </tr>
        ))}
      </tbody>
    </table>
  );
}
