import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Zap, Copy, Download, CheckCircle2,
  ChevronRight, ExternalLink, Hash, Code2, LayoutGrid,
  BookOpen, ArrowUpRight, Sparkles, Terminal, Repeat2,
  Globe, Database, Clock, AlertTriangle, Play, Layers
} from 'lucide-react';

const API = import.meta.env.VITE_API_URL || 'https://scrapyr-api.rajatdatta90000.workers.dev';

interface Job {
  id: string; url: string; target: string;
  status: 'idle' | 'running' | 'done' | 'error';
  result?: any; format: 'json' | 'csv';
  schedule?: string; created_at: string; rows?: number;
}

// ── Motion config ──────────────────────────────────────────────
const ease = [0.16, 1, 0.3, 1];
const fadeUp  = { hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0, transition: { duration: 0.5, ease } } };
const fadeIn  = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { duration: 0.4, ease } } };
const scaleIn = { hidden: { opacity: 0, scale: 0.95 }, show: { opacity: 1, scale: 1, transition: { duration: 0.38, ease } } };
const stagger = { show: { transition: { staggerChildren: 0.07 } } };
const tabAnim = {
  hidden: { opacity: 0, x: 14 },
  show:   { opacity: 1, x: 0, transition: { duration: 0.32, ease } },
  exit:   { opacity: 0, x: -10, transition: { duration: 0.2 } },
};

// ── Components ─────────────────────────────────────────────────
const StatusDot = ({ s }: { s: string }) => (
  <span className={`dot dot-${s}`} style={{ flexShrink: 0 }} />
);
const Badge = ({ label, variant = 'ghost' }: { label: string; variant?: string }) => (
  <span className={`badge badge-${variant}`}>{label}</span>
);
const Spinner = () => <span className="spinner" />;

// ── Static data ────────────────────────────────────────────────
const EXAMPLES = [
  { label: 'Product Hunt', url: 'https://producthunt.com', target: 'product names, descriptions, upvotes, and makers from today\'s top products' },
  { label: 'YC Companies', url: 'https://ycombinator.com/companies', target: 'company names, descriptions, batch year, and website URLs' },
  { label: 'GitHub Trending', url: 'https://github.com/trending', target: 'repository names, descriptions, star counts, and programming languages' },
  { label: 'HN', url: 'https://news.ycombinator.com', target: 'article titles, source URLs, points, and comment counts' },
];

const ENDPOINTS = [
  {
    method: 'POST', path: '/extract',
    desc: 'Extract structured data from any URL using Groq AI.',
    body: `{\n  "url":    "https://example.com",\n  "target": "product names and prices",\n  "format": "json",\n  "schedule":      "daily",\n  "alert_channel": "https://ntfy.sh/topic"\n}`,
    resp: `{\n  "job_id": "scr_abc123",\n  "status": "done",\n  "rows":   48,\n  "data":   [...],\n  "download_url": "..."\n}`,
  },
  {
    method: 'GET', path: '/jobs/:id',
    desc: 'Check status and retrieve results of any extraction job.',
    body: null,
    resp: `{\n  "job_id": "scr_abc123",\n  "status": "running",\n  "progress": 60\n}`,
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

// ── Main ───────────────────────────────────────────────────────
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
  const [log, setLog]           = useState('IDLE');
  const [copied, setCopied]     = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  const run = async () => {
    if (!url || !target) return;
    setLoading(true); setResult(null); setError(null); setLog('EXTRACTING...');
    try {
      const res = await fetch(`${API}/extract`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, target, format, schedule, alert_channel: alertCh }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      const data = await res.json();
      setResult(data);
      const rowCount = data.rows ?? (Array.isArray(data.data) ? data.data.length : '?');
      setLog(`DONE · ${rowCount} ROWS`);
      if (data.job_id) {
        setJobs(prev => [{
          id: data.job_id, url, target,
          status: data.status || 'done',
          result: data, format, schedule,
          rows: data.rows, created_at: new Date().toISOString(),
        }, ...prev]);
      }
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 100);
    } catch (e: any) {
      const msg = e.message || 'Unknown error';
      setError(msg); setLog('ERROR');
    }
    setLoading(false);
  };

  const copy = () => {
    navigator.clipboard.writeText(JSON.stringify(result, null, 2));
    setCopied(true); setTimeout(() => setCopied(false), 2200);
  };

  const TABS = [
    { id: 'extract', label: 'Extract',  icon: Zap },
    { id: 'jobs',    label: 'Jobs',     icon: Repeat2 },
    { id: 'docs',    label: 'API',      icon: BookOpen },
  ] as const;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--void)', fontFamily: "'Space Grotesk',sans-serif", position: 'relative', overflow: 'hidden' }}>
      {/* Scan line */}
      <div className="scan-line" />

      {/* Atmospheric orbs */}
      <motion.div
        animate={{ x: [0, 30, -20, 0], y: [0, -25, 15, 0], scale: [1, 1.06, 0.97, 1] }}
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
        style={{ position: 'fixed', top: -200, left: '20%', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle, rgba(168,85,247,0.07) 0%, transparent 70%)', filter: 'blur(60px)', pointerEvents: 'none', zIndex: 0 }}
      />
      <motion.div
        animate={{ x: [0, -40, 20, 0], y: [0, 30, -15, 0], scale: [1, 0.94, 1.04, 1] }}
        transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut', delay: 3 }}
        style={{ position: 'fixed', top: '40%', right: '-10%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(80,140,255,0.06) 0%, transparent 70%)', filter: 'blur(60px)', pointerEvents: 'none', zIndex: 0 }}
      />
      <motion.div
        animate={{ x: [0, 20, -30, 0], y: [0, -20, 30, 0] }}
        transition={{ duration: 26, repeat: Infinity, ease: 'easeInOut', delay: 7 }}
        style={{ position: 'fixed', bottom: '-10%', left: '10%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,229,204,0.04) 0%, transparent 70%)', filter: 'blur(60px)', pointerEvents: 'none', zIndex: 0 }}
      />

      {/* ─── Navbar ─── */}
      <motion.nav
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease }}
        style={{
          position: 'sticky', top: 0, zIndex: 100,
          background: 'rgba(2,2,6,0.85)',
          backdropFilter: 'blur(32px)', WebkitBackdropFilter: 'blur(32px)',
          borderBottom: '1px solid rgba(255,255,255,0.048)',
          padding: '0 28px', height: 60,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <motion.div
            whileHover={{ scale: 1.08, rotate: 5 }}
            style={{
              width: 34, height: 34, borderRadius: 10,
              background: 'linear-gradient(135deg, #8b3cf7 0%, #508cff 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 24px rgba(139,60,247,0.35)',
            }}>
            <Terminal size={15} color="#fff" strokeWidth={2} />
          </motion.div>
          <div>
            <div style={{ fontFamily: "'Unbounded',sans-serif", fontSize: 13, fontWeight: 700, letterSpacing: '-0.01em', color: 'var(--text)', lineHeight: 1.1 }}>SCRAPYR</div>
            <div style={{ fontSize: 9, fontFamily: "'Space Mono',monospace", color: 'var(--text-3)', letterSpacing: '0.12em' }}>AI EXTRACTION ENGINE</div>
          </div>
          <Badge label="Public Beta" variant="violet" />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ padding: '3px 10px', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.22)', borderRadius: 100, fontSize: 9, fontFamily: "'Space Mono',monospace", letterSpacing: '0.1em', color: '#22c55e' }}>
            GROQ ACTIVE
          </div>
          <motion.div
            animate={{ opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 2.5, repeat: Infinity }}
            style={{
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '5px 13px',
              background: loading ? 'rgba(168,85,247,0.06)' : error ? 'rgba(244,63,94,0.06)' : 'rgba(34,217,138,0.05)',
              border: `1px solid ${loading ? 'rgba(168,85,247,0.2)' : error ? 'rgba(244,63,94,0.2)' : 'rgba(34,217,138,0.15)'}`,
              borderRadius: 100,
            }}>
            {loading ? <Spinner /> :
             error ? <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--red)', display: 'inline-block' }} /> :
             <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)', boxShadow: '0 0 7px rgba(34,217,138,0.6)', display: 'inline-block' }} />}
            <span style={{ fontSize: 9.5, fontFamily: "'Space Mono',monospace", letterSpacing: '0.14em', color: loading ? 'var(--violet)' : error ? 'var(--red)' : 'var(--green)', textTransform: 'uppercase' }}>{log}</span>
          </motion.div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 3 }}>
          {TABS.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setTab(id)} className={`tab-btn${tab === id ? ' active' : ''}`}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Icon size={12} strokeWidth={2} /> {label}
            </button>
          ))}
        </div>
      </motion.nav>

      <div style={{ maxWidth: 1140, margin: '0 auto', padding: '44px 28px 96px', position: 'relative', zIndex: 1 }}>
        <AnimatePresence mode="wait">

          {/* ═══════════════ EXTRACT ═══════════════ */}
          {tab === 'extract' && (
            <motion.div key="extract" variants={tabAnim} initial="hidden" animate="show" exit="exit">
              {/* Hero */}
              <motion.div variants={stagger} initial="hidden" animate="show" style={{ marginBottom: 44 }}>
                <motion.div variants={fadeUp} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
                  <span style={{ width: 32, height: 1, background: 'linear-gradient(90deg, var(--violet), transparent)' }} />
                  <span style={{ fontSize: 9.5, fontFamily: "'Space Mono',monospace", letterSpacing: '0.22em', color: 'rgba(168,85,247,0.7)', textTransform: 'uppercase' }}>Powered by Groq Llama-3.3-70b</span>
                </motion.div>
                <motion.h1 variants={fadeUp} style={{
                  fontFamily: "'Unbounded',sans-serif",
                  fontSize: 'clamp(2rem,4.5vw,3.4rem)',
                  fontWeight: 700, lineHeight: 1.08,
                  letterSpacing: '-0.04em', color: 'var(--text)',
                  marginBottom: 18,
                }}>
                  Extract anything.<br />
                  <span style={{ background: 'linear-gradient(120deg, var(--violet) 0%, var(--blue) 60%, var(--teal) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>From any site.</span>
                </motion.h1>
                <motion.p variants={fadeUp} style={{ fontSize: 14, color: 'var(--text-2)', maxWidth: 540, lineHeight: 1.75 }}>
                  Describe what you need in plain English. SCRAPYR fetches the page, runs Groq AI schema detection, and returns clean structured data in seconds.
                </motion.p>
              </motion.div>

              {/* Main grid */}
              <div className="grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 22, alignItems: 'start' }}>
                {/* Form */}
                <motion.div variants={stagger} initial="hidden" animate="show" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

                  <motion.div variants={fadeUp} className="glass-violet" style={{ padding: '20px 22px', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg, transparent, rgba(168,85,247,0.5), transparent)' }} />
                    <label className="label label-v"><Globe size={9} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 5 }} />Target URL</label>
                    <input className="input" value={url} onChange={e => setUrl(e.target.value)}
                      placeholder="https://example.com/page-to-scrape"
                      onKeyDown={e => e.key === 'Enter' && target && run()} />
                  </motion.div>

                  <motion.div variants={fadeUp} className="glass" style={{ padding: '20px 22px' }}>
                    <label className="label"><Sparkles size={9} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 5 }} />What to extract &nbsp;<span style={{ color: 'var(--text-3)', textTransform: 'none', letterSpacing: 0 }}>— plain English</span></label>
                    <textarea className="input" rows={4} value={target} onChange={e => setTarget(e.target.value)}
                      placeholder="e.g. product names, prices, ratings, and links from the listing page" />
                  </motion.div>

                  <motion.div variants={fadeUp} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div className="glass" style={{ padding: '16px 18px' }}>
                      <label className="label">Output</label>
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
                        <option value="hourly">Hourly</option>
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="on_change">On change</option>
                      </select>
                    </div>
                  </motion.div>

                  <AnimatePresence>
                    {schedule && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.25 }}>
                        <div className="glass" style={{ padding: '16px 18px' }}>
                          <label className="label">Alert Channel</label>
                          <input className="input" value={alertCh} onChange={e => setAlertCh(e.target.value)}
                            placeholder="https://discord.com/api/webhooks/... or ntfy.sh/topic" />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <motion.div variants={fadeUp}>
                    <motion.button className="btn-primary" onClick={run}
                      disabled={loading || !url || !target}
                      style={{ width: '100%', padding: '15px 0', fontSize: 13 }}
                      whileHover={{ scale: (!loading && url && target) ? 1.01 : 1 }}
                      whileTap={{ scale: 0.985 }}>
                      {loading
                        ? <><Spinner /> Extracting data...</>
                        : <><Zap size={15} strokeWidth={2.5} /> Extract Data</>
                      }
                    </motion.button>
                  </motion.div>

                  {/* Examples */}
                  <motion.div variants={fadeUp}>
                    <div className="label" style={{ marginBottom: 10 }}>Quick Examples</div>
                    <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                      {EXAMPLES.map(ex => (
                        <motion.button key={ex.label}
                          whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}
                          onClick={() => { setUrl(ex.url); setTarget(ex.target); }}
                          style={{
                            padding: '5px 13px',
                            border: '1px solid var(--border)', borderRadius: 100,
                            background: 'transparent', color: 'var(--text-3)',
                            fontSize: 11, cursor: 'pointer',
                            fontFamily: "'Space Grotesk',sans-serif", fontWeight: 600,
                            transition: 'all 0.15s',
                          }}
                          onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = 'rgba(168,85,247,0.3)'; el.style.color = 'var(--violet)'; }}
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
                    {/* Empty state */}
                    {!result && !loading && !error && (
                      <motion.div key="empty" variants={scaleIn} initial="hidden" animate="show" exit="hidden"
                        style={{
                          minHeight: 440, border: '1px dashed rgba(255,255,255,0.055)',
                          borderRadius: 'var(--r-lg)', display: 'flex', flexDirection: 'column',
                          alignItems: 'center', justifyContent: 'center', gap: 16, position: 'relative', overflow: 'hidden',
                        }}>
                        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 50% 50%, rgba(168,85,247,0.04) 0%, transparent 70%)' }} />
                        <motion.div
                          animate={{ rotate: [0, 8, -8, 0], scale: [1, 1.07, 1] }}
                          transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
                          style={{ fontSize: 52, lineHeight: 1, position: 'relative', zIndex: 1 }}>🕷️</motion.div>
                        <div style={{ textAlign: 'center', position: 'relative', zIndex: 1 }}>
                          <div style={{ fontSize: 11, fontFamily: "'Space Mono',monospace", color: 'var(--text-3)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 8 }}>Awaiting extraction</div>
                          <div style={{ fontSize: 12, color: 'var(--text-3)', maxWidth: 200, lineHeight: 1.7 }}>
                            Paste a URL and describe what to extract
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 10, position: 'relative', zIndex: 1, flexWrap: 'wrap', justifyContent: 'center' }}>
                          {['Fetch HTML', 'Strip noise', 'AI detection', 'Clean output'].map(s => (
                            <span key={s} style={{ fontSize: 10, padding: '3px 10px', border: '1px solid var(--border)', borderRadius: 100, color: 'var(--text-3)', fontFamily: "'Space Mono',monospace" }}>{s}</span>
                          ))}
                        </div>
                      </motion.div>
                    )}

                    {/* Error state */}
                    {error && !loading && (
                      <motion.div key="error" variants={scaleIn} initial="hidden" animate="show"
                        style={{ minHeight: 200, border: '1px solid rgba(244,63,94,0.25)', borderRadius: 'var(--r-lg)', padding: '28px 24px', background: 'rgba(244,63,94,0.05)' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                          <AlertTriangle size={18} color="var(--red)" style={{ flexShrink: 0, marginTop: 2 }} />
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--red)', marginBottom: 8 }}>Extraction Failed</div>
                            <div style={{ fontSize: 12, fontFamily: "'Space Mono',monospace", color: 'rgba(244,63,94,0.7)', lineHeight: 1.7, marginBottom: 12 }}>{error}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-3)', lineHeight: 1.7 }}>
                              If this is a connection error, the backend Worker may not be deployed yet. Run <code style={{ background: 'rgba(255,255,255,0.06)', padding: '1px 6px', borderRadius: 4, fontFamily: "'Space Mono',monospace", color: 'var(--text-2)' }}>wrangler deploy</code> from the scrapyr-backend directory.
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {/* Loading */}
                    {loading && (
                      <motion.div key="loading" variants={scaleIn} initial="hidden" animate="show" exit="hidden"
                        className="glass-violet"
                        style={{ minHeight: 440, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24 }}>
                        <div style={{ position: 'relative' }}>
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 2.4, repeat: Infinity, ease: 'linear' }}
                            style={{ width: 52, height: 52, borderRadius: '50%', border: '2px solid rgba(168,85,247,0.12)', borderTopColor: 'var(--violet)' }}
                          />
                          <motion.div
                            animate={{ rotate: -360 }}
                            transition={{ duration: 1.6, repeat: Infinity, ease: 'linear' }}
                            style={{ position: 'absolute', inset: 6, borderRadius: '50%', border: '1px solid rgba(80,140,255,0.15)', borderTopColor: 'var(--blue)' }}
                          />
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontFamily: "'Unbounded',sans-serif", fontSize: 13, fontWeight: 600, color: 'var(--violet)', letterSpacing: '-0.01em', marginBottom: 6 }}>
                            AI is reading the page
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: "'Space Mono',monospace", lineHeight: 1.9 }}>
                            Groq AI active<br />
                            Groq Llama-3.3-70b processing<br />
                            Schema detection running
                          </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 9, width: 210 }}>
                          {['Fetching HTML', 'Stripping noise', 'AI schema detection', 'Formatting output'].map((step, i) => (
                            <motion.div key={step}
                              initial={{ opacity: 0, x: -8 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: i * 0.55, duration: 0.3 }}
                              style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 11, color: 'var(--text-3)', fontFamily: "'Space Mono',monospace" }}>
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ delay: i * 0.55 + 0.1 }}
                                style={{ width: 14, height: 14, borderRadius: '50%', background: 'var(--violet-d)', border: '1px solid rgba(168,85,247,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--violet)', display: 'inline-block' }} />
                              </motion.div>
                              {step}
                            </motion.div>
                          ))}
                        </div>
                      </motion.div>
                    )}

                    {/* Result */}
                    {result && !loading && !error && (
                      <motion.div key="result" variants={scaleIn} initial="hidden" animate="show" className="result-panel">
                        <div style={{
                          padding: '14px 18px',
                          borderBottom: '1px solid rgba(168,85,247,0.12)',
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
                          background: 'rgba(168,85,247,0.04)',
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <StatusDot s="done" />
                            <span style={{ fontSize: 11, fontFamily: "'Space Mono',monospace", letterSpacing: '0.1em', color: 'var(--green)' }}>
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
                            <motion.button onClick={copy} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                              className="btn-ghost" style={{ padding: '5px 12px', fontSize: 11 }}>
                              {copied
                                ? <><CheckCircle2 size={11} style={{ color: 'var(--green)' }} /> Copied</>
                                : <><Copy size={11} /> Copy</>}
                            </motion.button>
                          </div>
                        </div>
                        <pre className="code-block" style={{ margin: 0, borderRadius: 0, border: 'none', maxHeight: 420, background: 'rgba(0,0,0,0.4)' }}>
                          {JSON.stringify(result.data ?? result, null, 2)}
                        </pre>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* How it works */}
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.1 }}
                style={{ marginTop: 60, paddingTop: 44, borderTop: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
                  <div style={{ fontSize: 10, fontFamily: "'Space Mono',monospace", color: 'var(--text-3)', letterSpacing: '0.2em', textTransform: 'uppercase' }}>Architecture</div>
                  <div style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"3px 12px", background:"rgba(34,197,94,0.1)", border:"1px solid rgba(34,197,94,0.22)", borderRadius:100, fontSize:9, fontFamily:"'Space Mono',monospace", letterSpacing:"0.1em", color:"#22c55e" }}><span style={{width:5,height:5,borderRadius:"50%",background:"#22c55e"}}/>GROQ ACTIVE</div>
                </div>

                <div className="grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
                  {[
                    { icon: Globe,    step: '01', title: 'Fetch Page', desc: 'Pages are fetched via Cloudflare Workers — strips noise, preserves semantic structure, handles most modern sites.' },
                    { icon: Sparkles, step: '02', title: 'Groq AI Schema', desc: 'Llama-3.3-70b reads stripped content and infers the exact schema you described in plain English with high accuracy.' },
                    { icon: Database, step: '03', title: 'Clean Output',   desc: 'Results are stored in Cloudflare D1 and returned as structured JSON or CSV, ready for any downstream pipeline.' },
                  ].map(({ icon: Icon, step, title, desc }) => (
                    <motion.div key={step}
                      initial={{ opacity: 0, y: 14 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.4, delay: parseInt(step) * 0.1 }}
                      className="glass"
                      style={{ padding: '24px 22px', position: 'relative', overflow: 'hidden' }}
                      whileHover={{ y: -3 }}>
                      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg, transparent, rgba(168,85,247,${0.1 + parseInt(step) * 0.07}), transparent)` }} />
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                        <div style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--violet-d)', border: '1px solid rgba(168,85,247,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Icon size={16} color="var(--violet)" strokeWidth={1.7} />
                        </div>
                        <span style={{ fontSize: 9, fontFamily: "'Space Mono',monospace", color: 'var(--text-3)', letterSpacing: '0.18em' }}>{step}</span>
                      </div>
                      <div style={{ fontFamily: "'Unbounded',sans-serif", fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 9, letterSpacing: '-0.01em' }}>{title}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.75 }}>{desc}</div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>

              {/* KRYV integration */}
              <motion.div
                initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.15 }}
                className="glass-blue"
                style={{ marginTop: 18, padding: '22px 26px', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg, transparent, rgba(80,140,255,0.4), transparent)' }} />
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                  <Layers size={18} color="rgba(80,140,255,0.7)" style={{ flexShrink: 0, marginTop: 2 }} />
                  <div>
                    <div style={{ fontFamily: "'Unbounded',sans-serif", fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 7, letterSpacing: '-0.01em' }}>KRYV Network Integration</div>
                    <div style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.8 }}>
                      NodeMeld uses SCRAPYR to discover new SaaS from Product Hunt and Reddit hourly. VELQA uses it to audit competitor GEO files. KRYVLayer pulls competitor keyword clusters for programmatic page generation. Every KRYV project can use SCRAPYR as a built-in data layer.
                    </div>
                    <div style={{ display: 'flex', gap: 7, marginTop: 14, flexWrap: 'wrap' }}>
                      {['NodeMeld', 'VELQA', 'KRYVLayer', 'VIGILIS', 'DevMasiha'].map(p => (
                        <Badge key={p} label={p} variant="blue" />
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}

          {/* ═══════════════ JOBS ═══════════════ */}
          {tab === 'jobs' && (
            <motion.div key="jobs" variants={tabAnim} initial="hidden" animate="show" exit="exit">
              <div style={{ marginBottom: 32 }}>
                <h2 style={{ fontFamily: "'Unbounded',sans-serif", fontSize: 20, fontWeight: 700, letterSpacing: '-0.025em', color: 'var(--text)', marginBottom: 6 }}>Extraction Jobs</h2>
                <p style={{ fontSize: 13, color: 'var(--text-2)' }}>Scheduled jobs re-run automatically and fire alerts when data changes.</p>
              </div>

              {jobs.length === 0 ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  style={{ textAlign: 'center', padding: '80px 0', border: '1px dashed var(--border)', borderRadius: 'var(--r-lg)', position: 'relative', overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 50% 30%, rgba(168,85,247,0.04) 0%, transparent 60%)' }} />
                  <Clock size={32} color="var(--text-3)" style={{ margin: '0 auto 16px' }} />
                  <div style={{ fontFamily: "'Unbounded',sans-serif", fontSize: 13, fontWeight: 600, color: 'var(--text-2)', marginBottom: 8 }}>No jobs yet</div>
                  <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 20 }}>Run an extraction with a schedule to see it here.</div>
                  <button className="btn-ghost" onClick={() => setTab('extract')} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <Play size={12} /> Start Extracting
                  </button>
                </motion.div>
              ) : (
                <motion.div variants={stagger} initial="hidden" animate="show" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {jobs.map(j => (
                    <motion.div key={j.id} variants={fadeUp} className="glass"
                      style={{ padding: '18px 22px', display: 'flex', alignItems: 'center', gap: 16 }}
                      whileHover={{ y: -2 }}>
                      <StatusDot s={j.status} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{j.url}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontFamily: "'Space Mono',monospace" }}>
                          {j.target.substring(0, 80)}{j.target.length > 80 ? '…' : ''}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 7, flexShrink: 0, alignItems: 'center' }}>
                        <Badge label={j.format} variant="ghost" />
                        {j.schedule && <Badge label={j.schedule} variant="violet" />}
                        {j.rows !== undefined && <span style={{ fontSize: 10, fontFamily: "'Space Mono',monospace", color: 'var(--text-3)' }}>{j.rows} rows</span>}
                        <Badge label={j.status} variant={j.status === 'done' ? 'green' : j.status === 'error' ? 'red' : j.status === 'running' ? 'teal' : 'ghost'} />
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </motion.div>
          )}

          {/* ═══════════════ DOCS ═══════════════ */}
          {tab === 'docs' && (
            <motion.div key="docs" variants={tabAnim} initial="hidden" animate="show" exit="exit" style={{ maxWidth: 800 }}>
              <div style={{ marginBottom: 36 }}>
                <h2 style={{ fontFamily: "'Unbounded',sans-serif", fontSize: 20, fontWeight: 700, letterSpacing: '-0.025em', color: 'var(--text)', marginBottom: 8 }}>API Reference</h2>
                <p style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 16 }}>
                  Use SCRAPYR programmatically from any KRYV project or external service via the REST API.
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: 'var(--blue-d)', border: '1px solid var(--border-b)', borderRadius: 10 }}>
                  <span style={{ fontSize: 10, fontFamily: "'Space Mono',monospace", color: 'var(--text-3)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Base URL</span>
                  <code style={{ fontSize: 12, fontFamily: "'Space Mono',monospace", color: 'var(--blue)' }}>https://scrapyr-api.kryv.workers.dev</code>
                  <button className="btn-ghost" style={{ marginLeft: 'auto', padding: '4px 10px', fontSize: 10 }}
                    onClick={() => navigator.clipboard.writeText('https://scrapyr-api.rajatdatta90000.workers.dev')}>
                    <Copy size={10} /> Copy
                  </button>
                </div>
              </div>

              <motion.div variants={stagger} initial="hidden" animate="show" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {ENDPOINTS.map((ep, i) => (
                  <motion.div key={i} variants={fadeUp} className="glass" style={{ overflow: 'hidden' }} whileHover={{ y: -2 }}>
                    <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', gap: 11 }}>
                      <Badge label={ep.method} variant={ep.method === 'POST' ? 'violet' : 'blue'} />
                      <code style={{ fontSize: 13, fontFamily: "'Space Mono',monospace", color: 'var(--text)' }}>{ep.path}</code>
                      <ExternalLink size={10} color="var(--text-3)" style={{ marginLeft: 'auto' }} />
                    </div>
                    <div style={{ padding: '18px 18px' }}>
                      <p style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 16, lineHeight: 1.75 }}>{ep.desc}</p>
                      {ep.body && (<>
                        <div className="label" style={{ marginBottom: 8 }}>Request Body</div>
                        <pre className="code-block" style={{ marginBottom: 16 }}>{ep.body}</pre>
                      </>)}
                      <div className="label" style={{ marginBottom: 8 }}>Response</div>
                      <pre className="code-block" style={{ color: 'rgba(34,217,138,0.85)' }}>{ep.resp}</pre>
                    </div>
                  </motion.div>
                ))}
              </motion.div>

              {/* KRYV Network integration */}
              <motion.div
                initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                transition={{ duration: 0.4 }}
                className="glass-violet"
                style={{ marginTop: 20, padding: '22px 24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <Badge label="KRYV NETWORK" variant="violet" />
                  <Badge label="INTERNAL TOOL" variant="teal" />
                </div>
                <p style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.8, marginBottom: 14 }}>
                  Every KRYV project uses SCRAPYR as its data layer. NodeMeld discovers new SaaS hourly. VELQA audits competitor GEO files. KRYVLayer pulls keyword clusters. Call SCRAPYR from any project via the REST API.
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <a href="https://scrapyr.kryv.network" target="_blank" rel="noreferrer"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--violet)', textDecoration: 'none', fontWeight: 600 }}>
                    scrapyr.kryv.network <ArrowUpRight size={12} />
                  </a>
                  <a href="https://kryv.network" target="_blank" rel="noreferrer"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-2)', textDecoration: 'none', fontWeight: 600 }}>
                    kryv.network <ArrowUpRight size={12} />
                  </a>
                </div>
              </motion.div>

              {/* Quick start */}
              <motion.div
                initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                transition={{ duration: 0.4, delay: 0.1 }}
                className="glass-blue"
                style={{ marginTop: 14, padding: '22px 24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 12 }}>
                  <Terminal size={14} color="var(--blue)" />
                  <span style={{ fontFamily: "'Unbounded',sans-serif", fontSize: 12, fontWeight: 600, color: 'var(--blue)', letterSpacing: '-0.01em' }}>Quick Start</span>
                </div>
                <p style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.75, marginBottom: 14 }}>
                  Start extracting data in seconds. No auth required for public URLs.
                </p>
                <pre className="code-block">{`# Extract structured data from any URL
curl -X POST https://scrapyr-api.rajatdatta90000.workers.dev/extract \\
  -H "Content-Type: application/json" \\
  -d '{
    "url": "https://producthunt.com",
    "query": "list all product names and upvote counts",
    "format": "json"
  }'`}</pre>
              </motion.div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
};

export default App;
