'use client';
import { useState } from 'react';

export default function LeadUploadPage() {
    const [file, setFile] = useState<File | null>(null);
    const [message, setMessage] = useState('');

    const handleUpload = async () => {
        if (!file) return setMessage('Select a CSV first');

        const formData = new FormData();
        formData.append('csvFile', file);

        const res = await fetch('/api/leads/upload', { method: 'POST', body: formData });
        const data = await res.json();
        if (data.success) setMessage(`Inserted ${data.count} leads!`);
        else setMessage('Upload failed');
    };

    return (
        <div className="p-4">
            <input type="file" accept=".csv" onChange={(e) => setFile(e.target.files?.[0] || null)} />
            <button onClick={handleUpload} className="ml-2 px-4 py-2 bg-blue-500 text-white rounded">Upload</button>
            <p className="mt-2">{message}</p>
        </div>
    );
}
