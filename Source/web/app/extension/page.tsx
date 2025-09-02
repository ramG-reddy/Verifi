'use client';
import { useState, useEffect } from 'react';

export default function ExtensionPopup() {
  const [form, setForm] = useState<any>({
    advisor_name:'', advisor_email:'', claimed_sebi_reg_no:'',
    claimed_return_percent:'', claimed_timeframe:'', pitch_text:''
  });
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const api = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

  const handleGetSelection = () => {
    // This will be handled by the extension's content script
    if (window.parent !== window) {
      window.parent.postMessage({ action: 'getSelection' }, '*');
    }
  };

  const handleClear = () => {
    setForm({
      advisor_name:'', advisor_email:'', claimed_sebi_reg_no:'',
      claimed_return_percent:'', claimed_timeframe:'', pitch_text:''
    });
    setResult(null);
  };

  const handleAnalyze = async () => {
    if (!form.pitch_text.trim()) {
      alert('Please enter some text to analyze');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        advisor_name: form.advisor_name || undefined,
        advisor_email: form.advisor_email || undefined,
        claimed_sebi_reg_no: form.claimed_sebi_reg_no || undefined,
        claimed_return_percent: form.claimed_return_percent ? Number(form.claimed_return_percent) : undefined,
        claimed_timeframe: form.claimed_timeframe || undefined,
        pitch_text: form.pitch_text,
        urls: []
      };
      
      const r = await fetch(`${api}/api/check`, { 
        method:'POST', 
        headers:{'Content-Type':'application/json'}, 
        body: JSON.stringify(payload) 
      });
      const data = await r.json();
      setResult(data);
    } catch (e: any) {
      setResult({ error: e?.message || 'Analysis failed' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.action === 'setSelection') {
        setForm(prev => ({ ...prev, pitch_text: event.data.text || '' }));
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const renderResult = (data: any) => {
    if (data.error) {
      return (
        <div style={{background:'#ffe5e5', padding:12, borderRadius:8, marginTop:12}}>
          <strong>Error:</strong> {JSON.stringify(data.error)}
        </div>
      );
    }

    const risk = data.risk_score ?? 0;
    const verdict = data.verdict ?? "unknown";
    const badgeStyle = {
      padding: '6px 12px',
      borderRadius: 8,
      display: 'inline-block',
      fontWeight: 600,
      background: risk < 30 ? '#e5ffe5' : '#ffe5e5',
      color: risk < 30 ? '#006600' : '#cc0000'
    };
    
    const registryStatus = data.registry?.found 
      ? `✅ ${data.registry.entity_name} (${data.registry.reg_no || "?"})`
      : "⚠️ No registry match";

    return (
      <div style={{marginTop:12}}>
        <div style={badgeStyle}>
          Risk: {risk} | Verdict: {verdict}
        </div>
        <div style={{marginTop:8, fontSize:14}}>
          <strong>Registry:</strong> {registryStatus}
        </div>
        <div style={{marginTop:8, fontSize:12}}>
          <strong>Explanations:</strong>
          <div style={{background:'#f8f8f8', padding:8, borderRadius:4, marginTop:4, maxHeight:100, overflow:'auto'}}>
            {data.explanations?.map((exp: any, i: number) => (
              <div key={i} style={{marginBottom:4}}>
                • {exp.id}: {exp.weight > 0 ? '+' : ''}{exp.weight} 
                {exp.snippet && <span style={{color:'#666'}}> ("{exp.snippet}")</span>}
                {exp.note && <span style={{color:'#666'}}> - {exp.note}</span>}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{fontFamily:'system-ui, Arial, sans-serif', margin:12, width:360, fontSize:14}}>
      <h3 style={{margin:'0 0 16px 0', color:'#333'}}>🛡️ Financial Fraud Checker</h3>
      
      <div style={{display:'flex', gap:6, marginBottom:12}}>
        <button 
          onClick={handleGetSelection}
          style={{flex:1, padding:'8px 12px', background:'#f0f8ff', border:'1px solid #ddd', borderRadius:4, cursor:'pointer'}}
        >
          Use Selected Text
        </button>
        <button 
          onClick={handleClear}
          style={{flex:1, padding:'8px 12px', background:'#fff', border:'1px solid #ddd', borderRadius:4, cursor:'pointer'}}
        >
          Clear
        </button>
      </div>

      <input 
        placeholder="Advisor name"
        value={form.advisor_name}
        onChange={e => setForm({...form, advisor_name: e.target.value})}
        style={{width:'100%', margin:'6px 0', padding:8, border:'1px solid #ddd', borderRadius:4}}
      />
      
      <input 
        placeholder="Advisor email (optional)"
        value={form.advisor_email}
        onChange={e => setForm({...form, advisor_email: e.target.value})}
        style={{width:'100%', margin:'6px 0', padding:8, border:'1px solid #ddd', borderRadius:4}}
      />
      
      <input 
        placeholder="Claimed SEBI reg no (optional)"
        value={form.claimed_sebi_reg_no}
        onChange={e => setForm({...form, claimed_sebi_reg_no: e.target.value})}
        style={{width:'100%', margin:'6px 0', padding:8, border:'1px solid #ddd', borderRadius:4}}
      />
      
      <div style={{display:'flex', gap:6, margin:'6px 0'}}>
        <input 
          placeholder="Return % (e.g., 25)"
          value={form.claimed_return_percent}
          onChange={e => setForm({...form, claimed_return_percent: e.target.value})}
          style={{flex:1, padding:8, border:'1px solid #ddd', borderRadius:4}}
        />
        <input 
          placeholder="Timeframe (e.g., 2 weeks)"
          value={form.claimed_timeframe}
          onChange={e => setForm({...form, claimed_timeframe: e.target.value})}
          style={{flex:1, padding:8, border:'1px solid #ddd', borderRadius:4}}
        />
      </div>
      
      <textarea 
        placeholder="Paste pitch text..."
        rows={6}
        value={form.pitch_text}
        onChange={e => setForm({...form, pitch_text: e.target.value})}
        style={{width:'100%', margin:'6px 0', padding:8, border:'1px solid #ddd', borderRadius:4, resize:'vertical'}}
      />
      
      <button 
        onClick={handleAnalyze}
        disabled={loading}
        style={{
          width:'100%', 
          margin:'6px 0', 
          padding:'12px', 
          background:loading ? '#ccc' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
          color:'white', 
          border:'none', 
          borderRadius:4, 
          cursor:loading ? 'not-allowed' : 'pointer',
          fontWeight:600
        }}
      >
        {loading ? 'Analyzing...' : '🛡️ Analyze'}
      </button>

      {result && renderResult(result)}
    </div>
  );
}
