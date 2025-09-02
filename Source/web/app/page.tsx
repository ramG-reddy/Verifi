'use client';
import { useState } from 'react';

export default function Home() {
  const [form, setForm] = useState<any>({
    advisor_name: '', advisor_email: '', claimed_sebi_reg_no: '',
    claimed_return_percent: '', claimed_timeframe: '', pitch_text: ''
  });
  const [result, setResult] = useState<any>(null);
  const api = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

  async function submit(e: any) {
    e.preventDefault();
    const payload = {
      advisor_name: form.advisor_name || undefined,
      advisor_email: form.advisor_email || undefined,
      claimed_sebi_reg_no: form.claimed_sebi_reg_no || undefined,
      claimed_return_percent: form.claimed_return_percent ? Number(form.claimed_return_percent) : undefined,
      claimed_timeframe: form.claimed_timeframe || undefined,
      pitch_text: form.pitch_text,
      urls: []
    };
    const r = await fetch(`${api}/api/check`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    setResult(await r.json());
  }

  return (
    <div style={{ padding: 24 }} className='container mx-auto border-2 border-black-700'>
      <div className='flex flex-col items-center'>
        <p className='text-3xl font-bold'>🛡️ Financial Fraud Checker</p>
        <p>Protect yourself from financial scams and fraudulent schemes</p>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <span style={{ background: '#f0f8ff', padding: '4px 8px', borderRadius: 4, fontSize: 12 }}>🔒 Secure & Private</span>
          <span style={{ background: '#f0fff0', padding: '4px 8px', borderRadius: 4, fontSize: 12 }}>✅ SEBI Verified Data</span>
        </div>
      </div>

      <form onSubmit={submit} style={{ display: 'grid', gap: 12 }}>
        <h3>🔍 Check for Financial Fraud</h3>

        <div>
          <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>📱 Text Message / SMS Content (Optional)</label>
          <textarea
            placeholder="Paste suspicious SMS, WhatsApp message, or any text offering investment opportunities..."
            rows={4}
            value={form.pitch_text}
            onChange={e => setForm({ ...form, pitch_text: e.target.value })}
            style={{ width: '100%', padding: 8, border: '1px solid #ddd', borderRadius: 4 }}
          />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>🏢 Company / IPO Name (Optional)</label>
          <input
            placeholder="Enter company name to verify NSE/BSE listing..."
            value={form.advisor_name}
            onChange={e => setForm({ ...form, advisor_name: e.target.value })}
            style={{ width: '100%', padding: 8, border: '1px solid #ddd', borderRadius: 4 }}
          />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>📋 SEBI Registration Number (Optional)</label>
          <input
            placeholder="Enter SEBI registration number (e.g., INH000000123)..."
            value={form.claimed_sebi_reg_no}
            onChange={e => setForm({ ...form, claimed_sebi_reg_no: e.target.value })}
            style={{ width: '100%', padding: 8, border: '1px solid #ddd', borderRadius: 4 }}
          />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>🌐 App / Website URL (Optional)</label>
          <input
            placeholder="Enter website or app download link to verify authenticity..."
            value={form.advisor_email}
            onChange={e => setForm({ ...form, advisor_email: e.target.value })}
            style={{ width: '100%', padding: 8, border: '1px solid #ddd', borderRadius: 4 }}
          />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>📞 Phone Number / Email ID (Optional)</label>
          <input
            placeholder="Enter phone number or email of suspected fraudster..."
            value={form.claimed_timeframe}
            onChange={e => setForm({ ...form, claimed_timeframe: e.target.value })}
            style={{ width: '100%', padding: 8, border: '1px solid #ddd', borderRadius: 4 }}
          />
        </div>

        <button
          type="submit"
          style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            padding: '12px 24px',
            border: 'none',
            borderRadius: 8,
            fontSize: 16,
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          🛡️ Check for Fraud
        </button>
      </form>

      {result && (
        <div style={{ marginTop: 24, background: '#fafafa', padding: 16, border: '1px solid #eee', borderRadius: 8, maxWidth: 700 }}>
          <h3>Analysis Result</h3>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12 }}>
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
