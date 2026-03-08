import React, { useState } from 'react';

const API = import.meta.env.VITE_API_URL || 'https://scrapyr-api.kryv.workers.dev';

// ── Types ────────────────────────────────────────────────────────────
interface Job {
  id: string;
  url: string;
  target: string;
  status: 'idle' | 'running' | 'done' | 'error';
  result?: any;
  format: 'json' | 'csv';
  schedule?: string;
  created_at: string;
}

// ── Small helpers ────────────────────────────────────────────────────
const Chip = ({ label, color = '#00ff88' }: { label: string; color?: string }) => (
  <span style={{ fontSize: 9, padding: '2px 8px', borderRadius: 100, border: `1px solid ${color}30`, color, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.1em', textTransform: 'uppercase', background: `${color}08` }}>{label}</span>
);

const Spin = () => (
  <span style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid rgba(0,255,136,0.2)', borderTop: '2px solid #00ff88', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
);

const StatusDot = ({ status }: { status: string }) => {
  const colors: Record<string, string> = { idle: '#555', running: '#00ff88', done: '#22c55e', error: '#ef4444' };
  return <span style={{ width: 7, height: 7, borderRadius: '50%', background: colors[status] || '#555', display: 'inline-block', boxShadow: status === 'running' ? '0 0 6px #00ff88' : 'none' }} />;
};

// ── Main App ─────────────────────────────────────────────────────────
const App: React.FC = () => {
  const [tab, setTab] = useState<'extract' | 'jobs' | 'docs'>('extract');
  const [url, setUrl] = useState('');
  const [target, setTarget] = useState('');
  const [format, setFormat] = useState<'json' | 'csv'>('json');
  const [schedule, setSchedule] = useState('');
  const [alertCh, setAlertCh] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [log, setLog] = useState('SCRAPYR_READY');
  const [copied, setCopied] = useState(false);

  const run = async () => {
    if (!url || !target) return;
    setLoading(true); setResult(null); setLog('EXTRACTING...');
    try {
      const res = await fetch(`${API}/extract`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, target, format, schedule, alert_channel: alertCh }),
      });
      const data = await res.json();
      setResult(data);
      setLog(`DONE · ${data.rows ?? '?'} rows extracted`);
      if (data.job_id) {
        setJobs(prev => [{
          id: data.job_id, url, target, status: data.status || 'done',
          result: data, format, schedule, created_at: new Date().toISOString()
        }, ...prev]);
      }
    } catch (e: any) { setLog(`ERROR: ${e.message}`); }
    finally { setLoading(false); }
  };

  const copy = () => {
    navigator.clipboard.writeText(JSON.stringify(result, null, 2));
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  const examples = [
    { url: 'https://producthunt.com', target: 'product names, descriptions, upvotes, and makers from today\'s top products', label: 'Product Hunt' },
    { url: 'https://ycombinator.com/companies', target: 'company names, descriptions, batch year, and website URLs', label: 'YC Companies' },
    { url: 'https://github.com/trending', target: 'repository names, descriptions, stars, and programming languages', label: 'GitHub Trending' },
    { url: 'https://news.ycombinator.com', target: 'article titles, URLs, points, and comment counts', label: 'HN Top Stories' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#03080f', fontFamily: "'Space Grotesk', sans-serif" }}>
      {/* Nav */}
      <nav style={{ padding: '0 24px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(0,255,136,0.06)', background: 'rgba(3,8,15,0.9)', backdropFilter: 'blur(12px)', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg, #00ff88, #00cc6a)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 11, color: '#03080f' }}>SC</span>
          </div>
          <span style={{ fontWeight: 800, fontSize: 16, letterSpacing: '-0.02em', color: '#fff' }}>SCRAPYR</span>
          <Chip label="Beta" color="#00ff88" />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', background: 'rgba(0,255,136,0.05)', border: '1px solid rgba(0,255,136,0.12)', borderRadius: 8 }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#00ff88', display: 'inline-block', boxShadow: '0 0 6px #00ff88' }} />
          <span style={{ fontSize: 10, color: '#00ff88', fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.1em' }}>{log}</span>
        </div>
        <div style={{ display: 'flex', gap: 2 }}>
          {(['extract', 'jobs', 'docs'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              style={{ padding: '6px 14px', borderRadius: 8, border: `1px solid ${tab === t ? 'rgba(0,255,136,0.3)' : 'transparent'}`, background: tab === t ? 'rgba(0,255,136,0.08)' : 'transparent', color: tab === t ? '#00ff88' : 'rgba(255,255,255,0.35)', fontSize: 12, fontWeight: 700, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              {t}
            </button>
          ))}
        </div>
      </nav>

      <div style={{ maxWidth: 1080, margin: '0 auto', padding: '32px 24px' }}>
        {/* ── EXTRACT TAB ── */}
        {tab === 'extract' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            {/* Left: Form */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ marginBottom: 8 }}>
                <h1 style={{ fontSize: 22, fontWeight: 900, color: '#fff', letterSpacing: '-0.02em', marginBottom: 6 }}>Extract anything from any site</h1>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)' }}>Give it a URL and describe what you want — AI figures out the structure and returns clean data.</p>
              </div>

              {/* URL */}
              <div style={{ background: '#080f0a', border: '1px solid rgba(0,255,136,0.1)', borderRadius: 14, padding: 18 }}>
                <label style={{ fontSize: 10, color: 'rgba(0,255,136,0.6)', fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.15em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>Target URL</label>
                <input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://example.com/page-to-scrape"
                  style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '10px 14px', color: '#e0f0e0', fontSize: 13, outline: 'none', fontFamily: "'JetBrains Mono', monospace" }} />
              </div>

              {/* Target description */}
              <div style={{ background: '#080f0a', border: '1px solid rgba(0,255,136,0.1)', borderRadius: 14, padding: 18 }}>
                <label style={{ fontSize: 10, color: 'rgba(0,255,136,0.6)', fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.15em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>What to Extract <span style={{ color: 'rgba(255,255,255,0.2)' }}>— describe in plain English</span></label>
                <textarea value={target} onChange={e => setTarget(e.target.value)} placeholder="e.g. product names, prices, ratings, and URLs from the product listing page"
                  style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '10px 14px', color: '#e0f0e0', fontSize: 13, outline: 'none', resize: 'none', minHeight: 80, fontFamily: "'Space Grotesk', sans-serif", lineHeight: 1.6 }} />
              </div>

              {/* Options row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={{ background: '#080f0a', border: '1px solid rgba(0,255,136,0.08)', borderRadius: 12, padding: 14 }}>
                  <label style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.12em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>Output Format</label>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {(['json', 'csv'] as const).map(f => (
                      <button key={f} onClick={() => setFormat(f)}
                        style={{ flex: 1, padding: '7px 0', borderRadius: 8, border: `1px solid ${format === f ? 'rgba(0,255,136,0.4)' : 'rgba(255,255,255,0.06)'}`, background: format === f ? 'rgba(0,255,136,0.1)' : 'transparent', color: format === f ? '#00ff88' : 'rgba(255,255,255,0.3)', fontSize: 11, fontWeight: 700, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: "'JetBrains Mono', monospace" }}>
                        {f}
                      </button>
                    ))}
                  </div>
                </div>
                <div style={{ background: '#080f0a', border: '1px solid rgba(0,255,136,0.08)', borderRadius: 12, padding: 14 }}>
                  <label style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.12em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>Schedule (optional)</label>
                  <select value={schedule} onChange={e => setSchedule(e.target.value)}
                    style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: '7px 10px', color: schedule ? '#e0f0e0' : 'rgba(255,255,255,0.3)', fontSize: 12, outline: 'none', appearance: 'none', cursor: 'pointer' }}>
                    <option value="">One-time only</option>
                    <option value="hourly">Every hour</option>
                    <option value="daily">Every day</option>
                    <option value="weekly">Every week</option>
                    <option value="on_change">On data change</option>
                  </select>
                </div>
              </div>

              {/* Alert channel */}
              {schedule && (
                <div style={{ background: '#080f0a', border: '1px solid rgba(0,255,136,0.08)', borderRadius: 12, padding: 14 }}>
                  <label style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.12em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>Alert Channel (Discord/Slack webhook or ntfy.sh topic)</label>
                  <input value={alertCh} onChange={e => setAlertCh(e.target.value)} placeholder="https://discord.com/api/webhooks/... or ntfy.sh/my-topic"
                    style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: '9px 12px', color: '#e0f0e0', fontSize: 12, outline: 'none' }} />
                </div>
              )}

              {/* Run button */}
              <button onClick={run} disabled={loading || !url || !target}
                style={{ width: '100%', padding: 14, background: loading ? 'rgba(0,255,136,0.05)' : 'linear-gradient(135deg, #00ff88, #00cc6a)', border: loading ? '1px solid rgba(0,255,136,0.2)' : 'none', borderRadius: 12, color: loading ? '#00ff88' : '#03080f', fontSize: 14, fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, letterSpacing: '0.04em' }}>
                {loading ? <><Spin /> Extracting...</> : '⚡ Extract Data'}
              </button>

              {/* Examples */}
              <div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 10, fontFamily: "'JetBrains Mono', monospace" }}>Try an example</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {examples.map(ex => (
                    <button key={ex.label} onClick={() => { setUrl(ex.url); setTarget(ex.target); }}
                      style={{ padding: '5px 12px', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, background: 'transparent', color: 'rgba(255,255,255,0.4)', fontSize: 11, cursor: 'pointer', fontWeight: 600 }}>
                      {ex.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Right: Result */}
            <div>
              {!result && !loading && (
                <div style={{ height: '100%', minHeight: 400, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,255,255,0.04)', borderRadius: 16, color: 'rgba(255,255,255,0.12)', gap: 12 }}>
                  <div style={{ fontSize: 40 }}>🕷️</div>
                  <span style={{ fontSize: 11, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.1em', textTransform: 'uppercase' }}>Results will appear here</span>
                </div>
              )}
              {loading && (
                <div style={{ height: '100%', minHeight: 400, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(0,255,136,0.08)', borderRadius: 16, gap: 16 }}>
                  <Spin />
                  <div style={{ fontSize: 11, color: 'rgba(0,255,136,0.6)', fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.12em', textTransform: 'uppercase' }}>AI is reading the page...</div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', textAlign: 'center', maxWidth: 260 }}>Detecting schema structure, extracting data, formatting output</div>
                </div>
              )}
              {result && !loading && (
                <div style={{ background: '#080f0a', border: '1px solid rgba(0,255,136,0.12)', borderRadius: 16, overflow: 'hidden' }} className="fade-up">
                  <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(0,255,136,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <StatusDot status="done" />
                      <span style={{ fontSize: 11, color: '#00ff88', fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.1em' }}>
                        {result.rows ?? (Array.isArray(result.data) ? result.data.length : '?')} rows · {format.toUpperCase()}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {result.download_url && (
                        <a href={result.download_url} download style={{ padding: '5px 12px', border: '1px solid rgba(0,255,136,0.2)', borderRadius: 8, color: '#00ff88', fontSize: 11, fontWeight: 700, textDecoration: 'none', fontFamily: "'JetBrains Mono', monospace" }}>↓ Download</a>
                      )}
                      <button onClick={copy} style={{ padding: '5px 12px', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, color: copied ? '#00ff88' : 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 700, cursor: 'pointer', background: 'none', fontFamily: "'JetBrains Mono', monospace" }}>
                        {copied ? '✓ Copied' : 'Copy'}
                      </button>
                    </div>
                  </div>
                  <pre style={{ padding: '18px', fontSize: 11, color: '#00ff88', fontFamily: "'JetBrains Mono', monospace", overflow: 'auto', maxHeight: 480, lineHeight: 1.7, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                    {JSON.stringify(result.data ?? result, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── JOBS TAB ── */}
        {tab === 'jobs' && (
          <div>
            <div style={{ marginBottom: 24 }}>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', marginBottom: 6 }}>Extraction Jobs</h2>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)' }}>Scheduled jobs run automatically and alert you when data changes.</p>
            </div>
            {jobs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '80px 0', border: '1px solid rgba(255,255,255,0.04)', borderRadius: 16, color: 'rgba(255,255,255,0.2)', fontSize: 13 }}>
                No jobs yet. Run an extraction with a schedule to see it here.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {jobs.map(j => (
                  <div key={j.id} style={{ background: '#080f0a', border: '1px solid rgba(0,255,136,0.08)', borderRadius: 14, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
                    <StatusDot status={j.status} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#e0f0e0', marginBottom: 4 }}>{j.url}</div>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>{j.target.substring(0, 80)}{j.target.length > 80 ? '...' : ''}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                      <Chip label={j.format} />
                      {j.schedule && <Chip label={j.schedule} color="#7c3aed" />}
                      <Chip label={j.status} color={j.status === 'done' ? '#00ff88' : j.status === 'error' ? '#ef4444' : '#f59e0b'} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── DOCS TAB ── */}
        {tab === 'docs' && (
          <div style={{ maxWidth: 700 }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', marginBottom: 6 }}>API Reference</h2>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', marginBottom: 24 }}>Use SCRAPYR programmatically. All endpoints return JSON.</p>
            {[
              {
                method: 'POST', path: '/extract', desc: 'Extract data from a URL. AI detects schema and returns structured JSON or CSV.',
                body: `{\n  "url": "https://example.com",\n  "target": "product names and prices",\n  "format": "json",  // or "csv"\n  "schedule": "daily",  // optional\n  "alert_channel": "https://ntfy.sh/my-topic"  // optional\n}`,
                resp: `{\n  "job_id": "scr_abc123",\n  "status": "done",\n  "rows": 48,\n  "data": [...],\n  "download_url": "https://scrapyr-api.kryv.workers.dev/download/scr_abc123.csv"\n}`,
              },
              {
                method: 'GET', path: '/jobs/:id', desc: 'Check status and result of a job.',
                body: null,
                resp: `{\n  "job_id": "scr_abc123",\n  "status": "running",  // idle | running | done | error\n  "progress": 60,\n  "rows": null\n}`,
              },
              {
                method: 'GET', path: '/download/:id.:ext', desc: 'Download result as JSON or CSV.',
                body: null, resp: '/* Binary file download */',
              },
            ].map((ep, i) => (
              <div key={i} style={{ background: '#080f0a', border: '1px solid rgba(0,255,136,0.08)', borderRadius: 14, overflow: 'hidden', marginBottom: 14 }}>
                <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Chip label={ep.method} color={ep.method === 'POST' ? '#00ff88' : '#7c3aed'} />
                  <code style={{ fontSize: 13, color: '#e0f0e0', fontFamily: "'JetBrains Mono', monospace" }}>{ep.path}</code>
                </div>
                <div style={{ padding: '14px 18px' }}>
                  <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 12 }}>{ep.desc}</p>
                  {ep.body && (
                    <>
                      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>Request Body</div>
                      <pre style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: 8, padding: '12px 14px', fontSize: 11, color: '#00ff88', fontFamily: "'JetBrains Mono', monospace", overflow: 'auto', marginBottom: 12 }}>{ep.body}</pre>
                    </>
                  )}
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>Response</div>
                  <pre style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: 8, padding: '12px 14px', fontSize: 11, color: 'rgba(0,255,136,0.7)', fontFamily: "'JetBrains Mono', monospace", overflow: 'auto' }}>{ep.resp}</pre>
                </div>
              </div>
            ))}
            <div style={{ padding: '16px 20px', background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.15)', borderRadius: 12, fontSize: 12, color: 'rgba(255,255,255,0.4)', lineHeight: 1.7 }}>
              <strong style={{ color: '#a78bfa' }}>KRYV Integration:</strong> NodeMeld calls SCRAPYR to discover new indie SaaS. VELQA calls it to audit competitor sites. KRYVLayer calls it to pull competitor keywords for page generation. Base URL: <code style={{ color: '#00ff88', fontFamily: "'JetBrains Mono', monospace" }}>https://scrapyr-api.kryv.workers.dev</code>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
