'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

const PAGE_SIZE = 5; // adjust per page

export default function LeadsPage() {
    const [leads, setLeads] = useState<any[]>([]);
    const [filterLang, setFilterLang] = useState('');
    const [filterDoc, setFilterDoc] = useState('');
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [totalLeads, setTotalLeads] = useState(0);

    const fetchLeads = async () => {
        const params = new URLSearchParams({
          language: filterLang,
          doc_id: filterDoc,
          search,
          page: page.toString(),
          pageSize: PAGE_SIZE.toString(),
        });
      
        const res = await fetch(`/api/leads/list?${params.toString()}`);
        const json = await res.json();
      
        setLeads(json.data || []);
        setTotalLeads(json.count || 0);
      };
      

    useEffect(() => {
        fetchLeads();
    }, [filterLang, filterDoc, search, page]);

    const totalPages = Math.ceil(totalLeads / PAGE_SIZE);

    return (
        <div className="p-4 space-y-4">
            <div className="flex space-x-2">
                <select value={filterLang} onChange={(e) => { setFilterLang(e.target.value); setPage(1); }} className="p-2 border rounded">
                    <option value="">All Languages</option>
                    <option value="en">English</option>
                    <option value="hi">Hindi</option>
                    <option value="pa">Punjabi</option>
                    <option value="mr">Marathi</option>
                    <option value="te">Telugu</option>
                </select>

                <select value={filterDoc} onChange={(e) => { setFilterDoc(e.target.value); setPage(1); }} className="p-2 border rounded">
                    <option value="">All Documents</option>
                    <option value="1">Sample Pharma PDF</option>
                    {/* Add more docs dynamically if needed */}
                </select>

                <input
                    type="text"
                    placeholder="Search by name/phone"
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                    className="p-2 border rounded flex-1"
                />
            </div>

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
                    {leads.length === 0 && (
                        <tr>
                            <td colSpan={4} className="text-center py-4">No leads found</td>
                        </tr>
                    )}
                </tbody>
            </table>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex space-x-2 mt-2">
                    <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="px-3 py-1 border rounded">Prev</button>
                    <span className="px-3 py-1">Page {page} of {totalPages}</span>
                    <button disabled={page >= totalPages} onClick={() => setPage(page + 1)} className="px-3 py-1 border rounded">Next</button>
                </div>
            )}
        </div>
    );
}
