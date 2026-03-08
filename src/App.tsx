import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Zap, Copy, Download, CheckCircle2,
  Loader2, ChevronRight, ExternalLink, Hash, Code2, LayoutGrid,
  BookOpen, ArrowUpRight, Sparkles, Terminal, Repeat2
} from 'lucide-react';

const API = import.meta.env.VITE_API_URL || 'https://scrapyr-api.kryv.workers.dev';

interface Job {
  id: string; url: string; target: string;
  status: 'idle' | 'running' | 'done' | 'error';
  result?: any; format: 'json' | 'csv';
  schedule?: string; created_at: string; rows?: number;
}

// ── Motion presets
const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] } },
};
const stagger = { show: { transition: { staggerChildren: 0.07 } } };
const scaleIn = {
  hidden: { opacity: 0, scale: 0.96 },
  show:   { opacity: 1, scale: 1, transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] } },
};
const tabContent = {
  hidden: { opacity: 0, x: 12 },
  show:   { opacity: 1, x: 0, transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] } },
  exit:   { opacity: 0, x: -8, transition: { duration: 0.18 } },
};

// ── Components
const StatusDot = ({ s }: { s: string }) => {
  const cls: Record<string, string> = {
    idle: 'dot dot-idle', running: 'dot dot-running', done: 'dot dot-done', error: 'dot dot-error',
  };
  return <span className={cls[s] || 'dot dot-idle'} />;
};

const Badge = ({ label, variant = 'ghost' }: { label: string; variant?: string }) => (
  <span className={`badge badge-${variant}`}>{label}</span>
);

const Spinner = () => <span className="spinner" />;

// ── Data
const EXAMPLES = [
  { label: 'Product Hunt',    url: 'https://producthunt.com',           target: 'product names, descriptions, upvotes, and makers from today\'s top products' },
  { label: 'YC Companies',   url: 'https://ycombinator.com/companies', target: 'company names, descriptions, batch year, and website URLs' },
  { label: 'GitHub Trending', url: 'https://github.com/trending',      target: 'repository names, descriptions, star counts, and programming languages' },
  { label: 'Hacker News',    url: 'https://news.ycombinator.com',      target: 'article titles, source URLs, points, and comment counts' },
];

const ENDPOINTS = [
  {
    method: 'POST', path: '/extract',
    desc: 'Extract structured data from any URL. AI detects the schema and returns clean JSON or CSV.',
    body: `{
  "url":           "https://example.com",
  "target":        "product names and prices",
  "format":        "json",
  "schedule":      "daily",
  "alert_channel": "https://ntfy.sh/my-topic"
}`,
    resp: `{
  "job_id": "scr_abc123",
  "status": "done",
  "rows":   48,
  "data":   [...],
  "download_url": "..."
}`,
  },
  {
    method: 'GET', path: '/jobs/:id',
    desc: 'Check status and retrieve results of any extraction job.',
    body: null,
    resp: `{
  "job_id":   "scr_abc123",
  "status":   "running",
  "progress": 60,
  "rows":     null
}`,
  },
  {
    method: 'GET', path: '/download/:id.:ext',
    desc: 'Download finished results as JSON or CSV.',
    body: null,
    resp: '/* Binary file stream */',
  },
  {
    method: 'GET', path: '/scheduled',
    desc: 'List all active scheduled jobs.',
    body: null,
    resp: `{ "jobs": [{ "id": "scr_xxx", "url": "...", "schedule": "daily" }] }`,
  },
];

// ── Main
const App: React.FC = () => {
  const [tab, setTab]         = useState<'extract' | 'jobs' | 'docs'>('extract');
  const [url, setUrl]         = useState('');
  const [target, setTarget]   = useState('');
  const [format, setFormat]   = useState<'json' | 'csv'>('json');
  const [schedule, setSchedule] = useState('');
  const [alertCh, setAlertCh]   = useState('');
  const [loading, setLoading]   = useState(false);
  const [result, setResult]     = useState<any>(null);
  const [jobs, setJobs]         = useState<Job[]>([]);
  const [log, setLog]           = useState('READY');
  const [copied, setCopied]     = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);

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
      setLog(`DONE · ${data.rows ?? (Array.isArray(data.data) ? data.data.length : '?')} ROWS`);
      if (data.job_id) {
        setJobs(prev => [{ id: data.job_id, url, target, status: data.status || 'done', result: data, format, schedule, rows: data.rows, created_at: new Date().toISOString() }, ...prev]);
      }
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 100);
    } catch (e: any) { setLog(`ERROR: ${e.message}`); }
    finally { setLoading(false); }
  };

  const copy = () => { navigator.clipboard.writeText(JSON.stringify(result, null, 2)); setCopied(true); setTimeout(() => setCopied(false), 2200); };

  const TABS = [
    { id: 'extract', label: 'Extract',  icon: Zap },
    { id: 'jobs',    label: 'Jobs',     icon: Repeat2 },
    { id: 'docs',    label: 'API Docs', icon: BookOpen },
  ] as const;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', fontFamily: "'Syne', sans-serif", position: 'relative' }}>
      <div className="top-glow" />

      {/* Navbar */}
      <motion.nav initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        style={{ position: 'sticky', top: 0, zIndex: 100, background: 'rgba(4,4,10,0.82)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', borderBottom: '1px solid rgba(255,255,255,0.055)', padding: '0 28px', height: 58, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
          <motion.div whileHover={{ scale: 1.06 }}
            style={{ width: 32, height: 32, borderRadius: 9, background: 'linear-gradient(135deg, #00d4ff 0%, #0066ff 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 20px rgba(0,212,255,0.28)' }}>
            <Terminal size={14} color="#04040a" strokeWidth={2.5} />
          </motion.div>
          <span style={{ fontSize: 15, fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--text)' }}>SCRAPYR</span>
          <Badge label="Public Beta" variant="cyan" />
        </div>

        {/* Status */}
        <motion.div animate={{ opacity: [0.7, 1, 0.7] }} transition={{ duration: 2.5, repeat: Infinity }}
          style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '5px 13px', background: loading ? 'rgba(0,212,255,0.06)' : 'rgba(16,240,128,0.05)', border: `1px solid ${loading ? 'rgba(0,212,255,0.18)' : 'rgba(16,240,128,0.15)'}`, borderRadius: 100 }}>
          {loading
            ? <Spinner />
            : <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)', boxShadow: '0 0 6px var(--green)', display: 'inline-block' }} />
          }
          <span style={{ fontSize: 9.5, fontFamily: "'DM Mono', monospace", letterSpacing: '0.14em', color: loading ? 'var(--cyan)' : 'var(--green)', textTransform: 'uppercase' }}>{log}</span>
        </motion.div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 3 }}>
          {TABS.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setTab(id)} className={`tab-btn${tab === id ? ' active' : ''}`} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Icon size={12} strokeWidth={2} /> {label}
            </button>
          ))}
        </div>
      </motion.nav>

      <div style={{ maxWidth: 1120, margin: '0 auto', padding: '40px 28px 80px', position: 'relative', zIndex: 1 }}>
        <AnimatePresence mode="wait">

          {/* ═══ EXTRACT ═══ */}
          {tab === 'extract' && (
            <motion.div key="extract" variants={tabContent} initial="hidden" animate="show" exit="exit">
              {/* Hero */}
              <motion.div variants={stagger} initial="hidden" animate="show" style={{ marginBottom: 36 }}>
                <motion.div variants={fadeUp} style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 14 }}>
                  <span style={{ width: 28, height: 1, background: 'linear-gradient(90deg, var(--cyan), transparent)' }} />
                  <span style={{ fontSize: 10, fontFamily: "'DM Mono', monospace", letterSpacing: '0.2em', color: 'var(--cyan)', textTransform: 'uppercase' }}>AI Data Extraction Engine</span>
                </motion.div>
                <motion.h1 variants={fadeUp} style={{ fontSize: 'clamp(2rem,4vw,3rem)', fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1.1, color: 'var(--text)', marginBottom: 14 }}>
                  Extract anything.<br />
                  <span style={{ background: 'linear-gradient(90deg, var(--cyan), #6366f1)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>From any site.</span>
                </motion.h1>
                <motion.p variants={fadeUp} style={{ fontSize: 14, color: 'var(--text-2)', maxWidth: 520, lineHeight: 1.7 }}>
                  Describe what you need in plain English. SCRAPYR fetches the page, sends it to Groq Llama-3.3-70b, and returns clean structured data in seconds.
                </motion.p>
              </motion.div>

              {/* Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, alignItems: 'start' }}>
                {/* Form */}
                <motion.div variants={stagger} initial="hidden" animate="show" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <motion.div variants={fadeUp} className="glass" style={{ padding: '18px 20px', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg, transparent, var(--cyan), transparent)', opacity: 0.4 }} />
                    <label className="label label-cyan">Target URL</label>
                    <input className="input" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://example.com/page-to-scrape" />
                  </motion.div>

                  <motion.div variants={fadeUp} className="glass" style={{ padding: '18px 20px' }}>
                    <label className="label label-cyan">What to Extract &nbsp;<span style={{ color: 'var(--text-3)', textTransform: 'none', letterSpacing: 0 }}>— plain English</span></label>
                    <textarea className="input" rows={4} value={target} onChange={e => setTarget(e.target.value)} placeholder="e.g. product names, prices, ratings, and links from the listing page" />
                  </motion.div>

                  <motion.div variants={fadeUp} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div className="glass" style={{ padding: '16px 18px' }}>
                      <label className="label">Output Format</label>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {(['json', 'csv'] as const).map(f => (
                          <button key={f} onClick={() => setFormat(f)} className={`format-btn${format === f ? ' active' : ''}`}>{f}</button>
                        ))}
                      </div>
                    </div>
                    <div className="glass" style={{ padding: '16px 18px' }}>
                      <label className="label">Schedule</label>
                      <select className="input" value={schedule} onChange={e => setSchedule(e.target.value)}>
                        <option value="">One-time</option>
                        <option value="hourly">Every hour</option>
                        <option value="daily">Every day</option>
                        <option value="weekly">Every week</option>
                        <option value="on_change">On data change</option>
                      </select>
                    </div>
                  </motion.div>

                  <AnimatePresence>
                    {schedule && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.25 }}>
                        <div className="glass" style={{ padding: '16px 18px' }}>
                          <label className="label">Alert Channel</label>
                          <input className="input" value={alertCh} onChange={e => setAlertCh(e.target.value)} placeholder="https://discord.com/api/webhooks/... or ntfy.sh/topic" />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <motion.div variants={fadeUp}>
                    <motion.button className="btn-primary" onClick={run} disabled={loading || !url || !target}
                      style={{ width: '100%', padding: '14px 0', fontSize: 14, position: 'relative', overflow: 'hidden' }}
                      whileHover={{ scale: (!loading && url && target) ? 1.012 : 1 }} whileTap={{ scale: 0.985 }}>
                      {loading ? <><Spinner /> Extracting data...</> : <><Zap size={15} strokeWidth={2.5} /> Extract Data</>}
                    </motion.button>
                  </motion.div>

                  <motion.div variants={fadeUp}>
                    <div style={{ fontSize: 9.5, fontFamily: "'DM Mono', monospace", color: 'var(--text-3)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 10 }}>Quick Examples</div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {EXAMPLES.map(ex => (
                        <motion.button key={ex.label} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
                          onClick={() => { setUrl(ex.url); setTarget(ex.target); }}
                          style={{ padding: '5px 13px', border: '1px solid var(--border)', borderRadius: 100, background: 'transparent', color: 'var(--text-3)', fontSize: 11, cursor: 'pointer', fontFamily: "'Syne', sans-serif", fontWeight: 600, transition: 'all 0.15s' }}
                          onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = 'var(--border-a)'; el.style.color = 'var(--text-2)'; }}
                          onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = 'var(--border)'; el.style.color = 'var(--text-3)'; }}>
                          {ex.label}
                        </motion.button>
                      ))}
                    </div>
                  </motion.div>
                </motion.div>

                {/* Result panel */}
                <div ref={resultRef}>
                  <AnimatePresence mode="wait">
                    {!result && !loading && (
                      <motion.div key="empty" variants={scaleIn} initial="hidden" animate="show" exit="hidden"
                        style={{ minHeight: 420, border: '1px dashed rgba(255,255,255,0.06)', borderRadius: 'var(--r-lg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
                        <motion.div animate={{ rotate: [0, 5, -5, 0], scale: [1, 1.05, 1] }} transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }} style={{ fontSize: 46, lineHeight: 1 }}>🕷️</motion.div>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 12, fontFamily: "'DM Mono', monospace", color: 'var(--text-3)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>Awaiting extraction</div>
                          <div style={{ fontSize: 12, color: 'var(--text-3)', maxWidth: 200, lineHeight: 1.6 }}>Results appear here once you run an extraction</div>
                        </div>
                      </motion.div>
                    )}

                    {loading && (
                      <motion.div key="loading" variants={scaleIn} initial="hidden" animate="show" exit="hidden"
                        style={{ minHeight: 420, border: '1px solid var(--border-c)', borderRadius: 'var(--r-lg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, boxShadow: '0 0 40px rgba(0,212,255,0.04)' }}>
                        <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                          style={{ width: 44, height: 44, borderRadius: '50%', border: '2px solid rgba(0,212,255,0.12)', borderTopColor: 'var(--cyan)' }} />
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--cyan)', marginBottom: 8 }}>AI is reading the page</div>
                          <div style={{ fontSize: 11, color: 'var(--text-3)', lineHeight: 1.8 }}>Detecting schema structure<br />Extracting structured data<br />Formatting output</div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: 200 }}>
                          {['Fetching HTML', 'Stripping noise', 'AI schema detection', 'Formatting result'].map((step, i) => (
                            <motion.div key={step} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.5, duration: 0.3 }}
                              style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: 'var(--text-3)' }}>
                              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: i * 0.5 + 0.1 }}
                                style={{ width: 14, height: 14, borderRadius: '50%', background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--cyan)', display: 'inline-block' }} />
                              </motion.div>
                              {step}
                            </motion.div>
                          ))}
                        </div>
                      </motion.div>
                    )}

                    {result && !loading && (
                      <motion.div key="result" variants={scaleIn} initial="hidden" animate="show" className="glow-box" style={{ overflow: 'hidden' }}>
                        <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <StatusDot s="done" />
                            <span style={{ fontSize: 11, fontFamily: "'DM Mono', monospace", letterSpacing: '0.1em', color: 'var(--green)' }}>
                              {result.rows ?? (Array.isArray(result.data) ? result.data.length : '?')} ROWS · {format.toUpperCase()}
                            </span>
                          </div>
                          <div style={{ display: 'flex', gap: 7 }}>
                            {result.download_url && (
                              <motion.a href={result.download_url} download whileHover={{ scale: 1.04 }}
                                className="btn-ghost" style={{ padding: '5px 12px', fontSize: 11, textDecoration: 'none' }}>
                                <Download size={11} /> Download
                              </motion.a>
                            )}
                            <motion.button onClick={copy} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} className="btn-ghost" style={{ padding: '5px 12px', fontSize: 11 }}>
                              {copied ? <><CheckCircle2 size={11} style={{ color: 'var(--green)' }} /> Copied</> : <><Copy size={11} /> Copy</>}
                            </motion.button>
                          </div>
                        </div>
                        <pre className="code-block" style={{ margin: 0, borderRadius: 0, border: 'none', maxHeight: 420, background: 'rgba(0,0,0,0.45)' }}>
                          {JSON.stringify(result.data ?? result, null, 2)}
                        </pre>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* How it works */}
              <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.1 }}
                style={{ marginTop: 56, paddingTop: 40, borderTop: '1px solid var(--border)' }}>
                <div style={{ fontSize: 10, fontFamily: "'DM Mono', monospace", color: 'var(--text-3)', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 24 }}>How It Works</div>
                <motion.div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }} variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true }}>
                  {[
                    { icon: Hash,     step: '01', title: 'Fetch & Strip', desc: 'Raw HTML is fetched from the target, scripts are removed, and meaningful text is extracted cleanly.' },
                    { icon: Sparkles, step: '02', title: 'AI Detection',  desc: 'Llama-3.3-70b reads the stripped content and infers the exact schema you described in plain English.' },
                    { icon: Code2,    step: '03', title: 'Clean Output',  desc: 'Results are returned as structured JSON or CSV, ready for any downstream pipeline or agent.' },
                  ].map(({ icon: Icon, step, title, desc }) => (
                    <motion.div key={step} variants={fadeUp} className="glass" style={{ padding: '22px 22px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                        <div style={{ width: 32, height: 32, borderRadius: 9, background: 'var(--cyan-d)', border: '1px solid var(--border-c)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Icon size={15} color="var(--cyan)" strokeWidth={1.75} />
                        </div>
                        <span style={{ fontSize: 9, fontFamily: "'DM Mono', monospace", color: 'var(--text-3)', letterSpacing: '0.15em' }}>{step}</span>
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 8, letterSpacing: '-0.015em' }}>{title}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.7 }}>{desc}</div>
                    </motion.div>
                  ))}
                </motion.div>
              </motion.div>

              {/* KRYV integration callout */}
              <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.15 }}
                className="glass" style={{ marginTop: 20, padding: '20px 24px', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg, transparent, rgba(99,102,241,0.5), transparent)' }} />
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                  <LayoutGrid size={18} color="rgba(99,102,241,0.7)" style={{ flexShrink: 0, marginTop: 2 }} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>KRYV Network Integration</div>
                    <div style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.75 }}>
                      NodeMeld calls SCRAPYR to discover new SaaS from Product Hunt and Reddit hourly. VELQA uses it to audit competitor GEO files. KRYVLayer pulls competitor keyword clusters for programmatic page generation. Every KRYV OpenClaw agent has SCRAPYR as a built-in tool.
                    </div>
                    <div style={{ display: 'flex', gap: 7, marginTop: 12, flexWrap: 'wrap' }}>
                      {['NodeMeld', 'VELQA', 'KRYVLayer', 'VIGILIS', 'OpenClaw'].map(p => (
                        <span key={p} style={{ fontSize: 10, padding: '3px 10px', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 100, color: 'rgba(165,180,252,0.7)', fontFamily: "'DM Mono', monospace", background: 'rgba(99,102,241,0.06)' }}>{p}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}

          {/* ═══ JOBS ═══ */}
          {tab === 'jobs' && (
            <motion.div key="jobs" variants={tabContent} initial="hidden" animate="show" exit="exit">
              <div style={{ marginBottom: 28 }}>
                <h2 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--text)', marginBottom: 6 }}>Extraction Jobs</h2>
                <p style={{ fontSize: 13, color: 'var(--text-2)' }}>Scheduled jobs re-run automatically and fire alerts when data changes.</p>
              </div>
              {jobs.length === 0 ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  style={{ textAlign: 'center', padding: '80px 0', border: '1px dashed var(--border)', borderRadius: 'var(--r-lg)' }}>
                  <Repeat2 size={32} color="var(--text-3)" style={{ margin: '0 auto 16px' }} />
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)', marginBottom: 8 }}>No jobs yet</div>
                  <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 20 }}>Run an extraction with a schedule to see it here.</div>
                  <button className="btn-ghost" onClick={() => setTab('extract')} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    Start Extracting <ChevronRight size={13} />
                  </button>
                </motion.div>
              ) : (
                <motion.div variants={stagger} initial="hidden" animate="show" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {jobs.map(j => (
                    <motion.div key={j.id} variants={fadeUp} className="glass"
                      style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
                      <StatusDot s={j.status} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{j.url}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{j.target.substring(0, 90)}{j.target.length > 90 ? '…' : ''}</div>
                      </div>
                      <div style={{ display: 'flex', gap: 7, flexShrink: 0, alignItems: 'center' }}>
                        <Badge label={j.format} variant="ghost" />
                        {j.schedule && <Badge label={j.schedule} variant="cyan" />}
                        {j.rows !== undefined && <span style={{ fontSize: 10, fontFamily: "'DM Mono', monospace", color: 'var(--text-3)' }}>{j.rows} rows</span>}
                        <Badge label={j.status} variant={j.status === 'done' ? 'green' : j.status === 'error' ? 'red' : j.status === 'running' ? 'cyan' : 'ghost'} />
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </motion.div>
          )}

          {/* ═══ DOCS ═══ */}
          {tab === 'docs' && (
            <motion.div key="docs" variants={tabContent} initial="hidden" animate="show" exit="exit" style={{ maxWidth: 780 }}>
              <div style={{ marginBottom: 32 }}>
                <h2 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--text)', marginBottom: 6 }}>API Reference</h2>
                <p style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 14 }}>Use SCRAPYR programmatically from any KRYV agent or external service. All endpoints return JSON.</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', background: 'var(--cyan-d)', border: '1px solid var(--border-c)', borderRadius: 10 }}>
                  <span style={{ fontSize: 10, fontFamily: "'DM Mono', monospace", color: 'var(--text-3)', letterSpacing: '0.1em' }}>BASE URL</span>
                  <code style={{ fontSize: 12, fontFamily: "'DM Mono', monospace", color: 'var(--cyan)' }}>https://scrapyr-api.kryv.workers.dev</code>
                  <button className="btn-ghost" style={{ marginLeft: 'auto', padding: '4px 10px', fontSize: 10 }}
                    onClick={() => navigator.clipboard.writeText('https://scrapyr-api.kryv.workers.dev')}>
                    <Copy size={10} /> Copy
                  </button>
                </div>
              </div>

              <motion.div variants={stagger} initial="hidden" animate="show" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {ENDPOINTS.map((ep, i) => (
                  <motion.div key={i} variants={fadeUp} className="glass" style={{ overflow: 'hidden' }}>
                    <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', gap: 11 }}>
                      <Badge label={ep.method} variant={ep.method === 'POST' ? 'cyan' : 'ghost'} />
                      <code style={{ fontSize: 13, fontFamily: "'DM Mono', monospace", color: 'var(--text)' }}>{ep.path}</code>
                      <ExternalLink size={10} color="var(--text-3)" style={{ marginLeft: 'auto' }} />
                    </div>
                    <div style={{ padding: '16px 18px' }}>
                      <p style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 14, lineHeight: 1.7 }}>{ep.desc}</p>
                      {ep.body && (
                        <>
                          <div className="label" style={{ marginBottom: 8 }}>Request Body</div>
                          <pre className="code-block" style={{ marginBottom: 14 }}>{ep.body}</pre>
                        </>
                      )}
                      <div className="label" style={{ marginBottom: 8 }}>Response</div>
                      <pre className="code-block" style={{ color: 'rgba(16,240,128,0.8)' }}>{ep.resp}</pre>
                    </div>
                  </motion.div>
                ))}
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4 }}
                style={{ marginTop: 20, padding: '20px 22px', background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.15)', borderRadius: 'var(--r)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <Sparkles size={14} color="rgba(165,180,252,0.8)" />
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'rgba(165,180,252,0.9)' }}>OpenClaw Agent Integration</span>
                </div>
                <p style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.75, marginBottom: 12 }}>
                  Any OpenClaw agent in the KRYV network can call SCRAPYR as a tool. The agent describes what it needs in plain English — SCRAPYR returns structured JSON — and the agent acts on it. No per-project scraping boilerplate.
                </p>
                <a href="https://kryv.network" target="_blank" rel="noreferrer"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'rgba(165,180,252,0.7)', textDecoration: 'none', fontWeight: 600 }}>
                  kryv.network <ArrowUpRight size={12} />
                </a>
              </motion.div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
};

export default App;
