'use client';
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';

interface Lead {
  id: number;
  name: string;
  phone: string;
  preferred_language: string;
  doc_id: number;
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [filterLang, setFilterLang] = useState('');

  const fetchLeads = useCallback(async () => {
    let query = supabase.from('leads').select('*');
    if (filterLang) query = query.eq('preferred_language', filterLang);

    const { data, error } = await query;
    if (error) console.error(error);
    else setLeads(data || []);
  }, [filterLang]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  return (
    <div className="p-4">
      <select value={filterLang} onChange={(e) => setFilterLang(e.target.value)} className="mb-2">
        <option value="">All Languages</option>
        <option value="en">English</option>
        <option value="hi">Hindi</option>
        <option value="pa">Punjabi</option>
        <option value="mr">Marathi</option>
        <option value="te">Telugu</option>
      </select>

      <table className="min-w-full border">
        <thead>
          <tr>
            <th className="border px-2 py-1">Name</th>
            <th className="border px-2 py-1">Phone</th>
            <th className="border px-2 py-1">Language</th>
            <th className="border px-2 py-1">Doc ID</th>
          </tr>
        </thead>
        <tbody>
          {leads.map((lead) => (
            <tr key={lead.id}>
              <td className="border px-2 py-1">{lead.name}</td>
              <td className="border px-2 py-1">{lead.phone}</td>
              <td className="border px-2 py-1">{lead.preferred_language}</td>
              <td className="border px-2 py-1">{lead.doc_id}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
