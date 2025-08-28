"use client";
import { useState } from "react";

interface Lead {
  id: number;
  name: string;
  phone: string;
}

const leads: Lead[] = [
  { id: 1, name: "John Doe", phone: "+919915264107" },
  { id: 2, name: "Jane Smith", phone: "+1987654321" },
];

export default function CallsPage() {
  const [callingLead, setCallingLead] = useState<number | null>(null);

  const handleCall = async (lead: Lead) => {
    setCallingLead(lead.id);
    const res = await fetch("/api/calls/start", {
      method: "POST",
      body: JSON.stringify({ leadId: lead.id, phone: lead.phone }),
    });
    const data = await res.json();
    console.log("Call initiated:", data);
    setCallingLead(null);
  };

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">Lead Calls Dashboard</h1>
      {leads.map((lead) => (
        <div key={lead.id} className="p-4 border rounded flex justify-between items-center">
          <div>
            <p className="font-medium">{lead.name}</p>
            <p className="text-sm text-gray-500">{lead.phone}</p>
          </div>
          <button
            disabled={callingLead === lead.id}
            onClick={() => handleCall(lead)}
            className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
          >
            {callingLead === lead.id ? "Calling..." : "Call"}
          </button>
        </div>
      ))}
    </div>
  );
}
