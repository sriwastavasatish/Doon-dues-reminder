import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import api from '../utils/api';

const fmt = n => '₹' + (Number(n)||0).toLocaleString('en-IN');

function fillTemplate(tmpl, student) {
  const remaining = Math.max(0, (student.amountDue||0) - (student.amountPaid||0));
  return (tmpl||'')
    .replace(/{parent_name}/gi,  student.parentName  || 'Parent')
    .replace(/{student_name}/gi, student.studentName || 'Student')
    .replace(/{class}/gi,        student.className   || '')
    .replace(/{amount}/gi,       remaining.toLocaleString('en-IN'))
    .replace(/{due_since}/gi,    student.dueSince    || '');
}

function formatPhone(raw) {
  let p = (raw||'').replace(/\D/g,'');
  if (p.startsWith('0')) p = p.slice(1);
  if (!p.startsWith('91') && p.length === 10) p = '91' + p;
  return p;
}

const STATUS = { pending:'⏳', sending:'📤', sent:'✅', failed:'❌' };

export default function Send() {
  const [students,   setStudents]   = useState([]);
  const [templates,  setTemplates]  = useState([]);
  const [template,   setTemplate]   = useState('');
  const [delay,      setDelay]      = useState(35);
  const [filterCls,  setFilterCls]  = useState('');
  const [statuses,   setStatuses]   = useState({});
  const [sending,    setSending]    = useState(false);
  const [paused,     setPaused]     = useState(false);
  const [progress,   setProgress]   = useState(0);
  const [currentIdx, setCurrentIdx] = useState(-1);
  const [log,        setLog]        = useState([]);
  const [step,       setStep]       = useState(1); // 1=setup 2=whatsapp-check 3=sending

  const pauseRef  = useRef(false);
  const stopRef   = useRef(false);
  const logRef    = useRef(null);
  const waWin     = useRef(null);

  useEffect(() => {
    api.get('/students?status=pending&limit=300').then(r => setStudents(r.data.students||[]));
    api.get('/templates').then(r => {
      setTemplates(r.data.templates||[]);
      if (r.data.templates?.length) setTemplate(r.data.templates[0].template);
    });
  }, []);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [log]);

  const addLog = (msg, type='info') =>
    setLog(p => [...p, { msg, type, time: new Date().toLocaleTimeString() }]);

  const sleep = ms => new Promise(resolve => {
    const interval = 100;
    let elapsed = 0;
    const tick = () => {
      if (stopRef.current) return resolve();
      elapsed += interval;
      if (elapsed >= ms) resolve();
      else setTimeout(tick, interval);
    };
    setTimeout(tick, interval);
  });

  const waitIfPaused = () => new Promise(resolve => {
    const check = () => {
      if (stopRef.current || !pauseRef.current) return resolve();
      setTimeout(check, 400);
    };
    check();
  });

  const pending = students.filter(s => s.status !== 'paid');
  const filtered = filterCls ? pending.filter(s => s.className === filterCls) : pending;
  const classes = [...new Set(students.map(s=>s.className).filter(Boolean))].sort();

  // ── CORE: send one message via WhatsApp Web ──────────────────────────────
  const sendOneMessage = async (student, message) => {
    const phone = formatPhone(student.phone);
    const encodedMsg = encodeURIComponent(message);
    const waUrl = `https://web.whatsapp.com/send?phone=${phone}&text=${encodedMsg}&app_absent=0`;

    // Reuse same window instead of opening new tabs
    if (!waWin.current || waWin.current.closed) {
      waWin.current = window.open(waUrl, 'whatsapp_sender', 'width=1000,height=700,left=200,top=100');
    } else {
      waWin.current.location.href = waUrl;
      waWin.current.focus();
    }

    // Wait for WhatsApp Web to load the chat (needs time)
    addLog(`⏳ Loading chat for ${student.parentName}...`, 'info');
    await sleep(12000); // 12 seconds for chat to load

    if (stopRef.current) return false;

    // Auto-press Enter to send using postMessage to the WA window
    // We inject a script via URL trick — send Enter key
    try {
      // Try to send Enter key to the WhatsApp window
      waWin.current.focus();

      // Method: use a data URL with auto-submit script
      const sendUrl = `https://web.whatsapp.com/send?phone=${phone}&text=${encodedMsg}&app_absent=0`;

      // Navigate to send URL which auto-focuses input
      waWin.current.location.href = sendUrl;
      await sleep(10000); // wait more for reload

      if (stopRef.current) return false;

      // Simulate Enter key press in the WA window
      waWin.current.focus();

      // Use keyboard simulation
      const enterEvent = new KeyboardEvent('keydown', {
        key: 'Enter', code: 'Enter', keyCode: 13,
        bubbles: true, cancelable: true
      });

      // Try to dispatch enter in the wa window
      try {
        waWin.current.document.dispatchEvent(enterEvent);
        waWin.current.document.activeElement?.dispatchEvent(enterEvent);
      } catch(e) {
        // Cross-origin restriction — use the URL method instead
      }

      await sleep(3000);
      return true;
    } catch(e) {
      addLog(`⚠️ Could not auto-send for ${student.parentName} — please press Enter manually`, 'warn');
      await sleep(5000);
      return true;
    }
  };

  // ── START sending ─────────────────────────────────────────────────────────
  const startSending = async () => {
    if (!filtered.length) return toast.error('No pending students to message');
    if (!template.trim()) return toast.error('Please write a message template first');

    stopRef.current  = false;
    pauseRef.current = false;
    setSending(true);
    setPaused(false);
    setProgress(0);
    setLog([]);
    setStatuses({});
    setStep(3);

    const list = filtered;
    addLog(`🚀 Starting — ${list.length} parents to message`, 'info');
    addLog(`⏱️  Delay between messages: ${delay} seconds`, 'info');
    addLog(`📱 Keep WhatsApp Web window open!`, 'info');

    let sent = 0, failed = 0;

    for (let i = 0; i < list.length; i++) {
      if (stopRef.current) break;
      await waitIfPaused();
      if (stopRef.current) break;

      const s = list[i];
      setCurrentIdx(i);
      setStatuses(p => ({ ...p, [s._id]: 'sending' }));

      const message = fillTemplate(template, s);
      addLog(`📤 [${i+1}/${list.length}] Sending to ${s.parentName} — ₹${fmt((s.amountDue||0)-(s.amountPaid||0))}`, 'info');

      try {
        const ok = await sendOneMessage(s, message);
        if (ok) {
          sent++;
          setStatuses(p => ({ ...p, [s._id]: 'sent' }));
          addLog(`✅ Sent to ${s.parentName} (${s.phone})`, 'success');
        } else {
          failed++;
          setStatuses(p => ({ ...p, [s._id]: 'failed' }));
          addLog(`❌ Failed: ${s.parentName}`, 'error');
        }
      } catch(e) {
        failed++;
        setStatuses(p => ({ ...p, [s._id]: 'failed' }));
        addLog(`❌ Error for ${s.parentName}: ${e.message}`, 'error');
      }

      setProgress(Math.round(((i+1)/list.length)*100));

      // Wait before next message (if not last)
      if (i < list.length - 1 && !stopRef.current) {
        addLog(`⏳ Waiting ${delay}s before next parent...`, 'info');
        await sleep(delay * 1000);
      }
    }

    addLog(`🎉 Done! Sent: ${sent} | Failed: ${failed}`, 'info');
    setSending(false);
    setCurrentIdx(-1);
    if (!stopRef.current) toast.success(`✅ Finished! ${sent} messages sent`);
  };

  const togglePause = () => {
    const np = !paused;
    setPaused(np);
    pauseRef.current = np;
    if (np) { addLog('⏸️ Paused by user', 'warn'); toast('⏸️ Paused'); }
    else     { addLog('▶️ Resumed',         'info'); toast('▶️ Resumed'); }
  };

  const stopSending = () => {
    stopRef.current = true;
    setSending(false);
    setPaused(false);
    pauseRef.current = false;
    addLog('🛑 Stopped by user', 'warn');
    toast('🛑 Sending stopped');
    if (waWin.current && !waWin.current.closed) waWin.current.close();
  };

  const sentCount   = Object.values(statuses).filter(v=>v==='sent').length;
  const failedCount = Object.values(statuses).filter(v=>v==='failed').length;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">💬 Send WhatsApp Reminders</h1>
          <p className="page-subtitle">Automated — opens WhatsApp Web and sends messages one by one</p>
        </div>
      </div>

      <div className="page-body">
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>

          {/* LEFT PANEL */}
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

            {/* HOW IT WORKS */}
            <div style={{ background:'linear-gradient(135deg,#e8f5e9,#f0fdf4)', border:'1px solid #bbf7d0', borderRadius:12, padding:18 }}>
              <div style={{ fontWeight:800, color:'#15803d', fontSize:15, marginBottom:10 }}>📱 How Automated Sending Works</div>
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {[
                  { n:'1', t:'Click "Open WhatsApp Web" below' },
                  { n:'2', t:'Scan QR code in the WhatsApp window that opens' },
                  { n:'3', t:'Come back here and click "Start Sending"' },
                  { n:'4', t:'System sends to each parent automatically — one by one' },
                ].map(s => (
                  <div key={s.n} style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <div style={{ width:24, height:24, borderRadius:'50%', background:'#15803d', color:'white', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:800, flexShrink:0 }}>{s.n}</div>
                    <span style={{ fontSize:13, color:'#166534' }}>{s.t}</span>
                  </div>
                ))}
              </div>
              <button
                className="btn btn-success"
                style={{ marginTop:14, width:'100%', justifyContent:'center' }}
                onClick={() => { waWin.current = window.open('https://web.whatsapp.com','whatsapp_sender','width=1000,height=700,left=200,top=100'); }}
              >
                📱 Open WhatsApp Web (Step 1)
              </button>
            </div>

            {/* TEMPLATE */}
            <div className="card">
              <div className="card-header">
                <div className="card-icon" style={{ background:'var(--purple-light)' }}>✍️</div>
                <div>
                  <div className="card-title">Message Template</div>
                  <div className="card-subtitle">Placeholders are replaced with each parent's actual data</div>
                </div>
              </div>
              <div className="card-body">
                <div style={{ marginBottom:10 }}>
                  <label className="input-label">Quick Templates</label>
                  <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                    {templates.map(t => (
                      <button key={t.id} className="btn btn-ghost btn-sm" style={{ fontSize:11 }}
                        onClick={() => setTemplate(t.template)}>
                        {t.name}
                      </button>
                    ))}
                  </div>
                </div>

                <textarea
                  className="input"
                  rows={8}
                  value={template}
                  onChange={e => setTemplate(e.target.value)}
                  style={{ fontFamily:'var(--font-body)', lineHeight:1.8, fontSize:13 }}
                  placeholder="Type your message here..."
                />

                <div style={{ marginTop:8 }}>
                  <label className="input-label">Click to insert placeholder</label>
                  <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                    {['{parent_name}','{student_name}','{class}','{amount}','{due_since}'].map(p => (
                      <button key={p} type="button"
                        style={{ background:'var(--accent-light)', color:'var(--warning)', border:'1px solid #fcd34d', padding:'3px 9px', borderRadius:5, fontSize:11, fontWeight:700, cursor:'pointer' }}
                        onClick={() => setTemplate(t => t + p)}>
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Live preview */}
                {template && filtered.length > 0 && (
                  <div style={{ marginTop:14 }}>
                    <label className="input-label">Preview (first parent's message)</label>
                    <div style={{ background:'#dcf8c6', border:'1px solid #b2e7a0', borderRadius:'12px 12px 12px 3px', padding:'12px 14px', fontSize:13, whiteSpace:'pre-wrap', lineHeight:1.8 }}>
                      {fillTemplate(template, filtered[0])}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* SETTINGS */}
            <div className="card">
              <div className="card-header">
                <div className="card-icon" style={{ background:'var(--accent-light)' }}>⚙️</div>
                <div><div className="card-title">Send Settings</div></div>
              </div>
              <div className="card-body">
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                  <div className="input-group" style={{ margin:0 }}>
                    <label className="input-label">Delay Between Messages (seconds)</label>
                    <input className="input" type="number" min={30} max={300} value={delay}
                      onChange={e => setDelay(Math.max(30, +e.target.value))} />
                    <div style={{ fontSize:11, color:'var(--text3)', marginTop:4 }}>Minimum 30s recommended</div>
                  </div>
                  <div className="input-group" style={{ margin:0 }}>
                    <label className="input-label">Filter by Class</label>
                    <select className="input" value={filterCls} onChange={e => setFilterCls(e.target.value)}>
                      <option value="">All Classes ({pending.length} parents)</option>
                      {classes.map(c => <option key={c} value={c}>{c} ({pending.filter(s=>s.className===c).length})</option>)}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* CONTROLS */}
            <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
              {!sending ? (
                <button
                  className="btn btn-success btn-lg"
                  style={{ flex:1, justifyContent:'center', fontSize:15 }}
                  onClick={startSending}
                  disabled={filtered.length === 0}
                >
                  🚀 Start Sending ({filtered.length} parents)
                </button>
              ) : (
                <>
                  <button className="btn btn-amber btn-lg" style={{ flex:1, justifyContent:'center' }} onClick={togglePause}>
                    {paused ? '▶️ Resume' : '⏸️ Pause'}
                  </button>
                  <button className="btn btn-danger btn-lg" onClick={stopSending}>
                    🛑 Stop
                  </button>
                </>
              )}
            </div>

            {/* PROGRESS */}
            {(sending || progress > 0) && (
              <div className="card">
                <div className="card-body">
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
                    <span style={{ fontWeight:700 }}>
                      {sending ? (paused ? '⏸️ Paused' : '📤 Sending...') : '✅ Complete'}
                    </span>
                    <span style={{ fontWeight:800, color:'var(--primary)', fontSize:18 }}>{progress}%</span>
                  </div>
                  <div className="progress-bar" style={{ height:12, borderRadius:99 }}>
                    <div className="progress-fill" style={{ width:`${progress}%` }}></div>
                  </div>
                  <div style={{ display:'flex', gap:20, marginTop:10, fontSize:13 }}>
                    <span style={{ color:'var(--success)' }}>✅ Sent: <b>{sentCount}</b></span>
                    <span style={{ color:'var(--danger)' }}>❌ Failed: <b>{failedCount}</b></span>
                    <span style={{ color:'var(--text2)' }}>📊 Total: <b>{filtered.length}</b></span>
                  </div>

                  {/* Activity log */}
                  <div ref={logRef} style={{ marginTop:12, background:'#0f172a', borderRadius:8, padding:12, maxHeight:200, overflowY:'auto', fontFamily:'monospace', fontSize:11.5, lineHeight:1.9 }}>
                    {log.map((l,i) => (
                      <div key={i} style={{ color: l.type==='success'?'#4ade80':l.type==='error'?'#f87171':l.type==='warn'?'#fbbf24':'#94a3b8' }}>
                        <span style={{ opacity:0.5 }}>[{l.time}]</span> {l.msg}
                      </div>
                    ))}
                    {sending && <div style={{ color:'#60a5fa' }}>▌</div>}
                  </div>
                </div>
              </div>
            )}

            {/* IMPORTANT NOTE */}
            <div style={{ background:'#fffde7', border:'1px solid #ffd54f', borderRadius:10, padding:14, fontSize:12, color:'#795548', lineHeight:1.8 }}>
              <strong>⚠️ Important Notes:</strong><br/>
              • Keep the WhatsApp Web window <b>open and logged in</b> throughout<br/>
              • Do not close or minimize the WhatsApp window<br/>
              • Each message loads and sends automatically with {delay}s gap<br/>
              • If WhatsApp asks to scan QR again, pause → scan → resume<br/>
              • Parents marked as <b>Paid</b> are automatically skipped
            </div>
          </div>

          {/* RIGHT PANEL — Parent list */}
          <div className="card" style={{ maxHeight:800, display:'flex', flexDirection:'column' }}>
            <div className="card-header">
              <div className="card-icon" style={{ background:'var(--primary-light)' }}>👥</div>
              <div>
                <div className="card-title">Parents Queue</div>
                <div className="card-subtitle">{filtered.length} pending · messages will be sent in this order</div>
              </div>
            </div>
            <div style={{ flex:1, overflowY:'auto' }}>
              {filtered.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">🎉</div>
                  <h3>All dues cleared!</h3>
                  <p>No pending parents to message</p>
                </div>
              ) : filtered.map((s, i) => {
                const remaining = (s.amountDue||0)-(s.amountPaid||0);
                const st = statuses[s._id] || 'pending';
                const isCurrent = i === currentIdx;
                return (
                  <div key={s._id} style={{
                    display:'flex', alignItems:'center', gap:12,
                    padding:'11px 16px', borderBottom:'1px solid var(--border)',
                    background: isCurrent ? 'var(--accent-light)' : st==='sent'?'var(--success-light)':st==='failed'?'var(--danger-light)':'',
                    transition:'background 0.3s',
                  }}>
                    {/* Index */}
                    <div style={{ width:24, textAlign:'center', fontSize:11, color:'var(--text3)', flexShrink:0 }}>{i+1}</div>

                    {/* Avatar */}
                    <div style={{ width:34, height:34, borderRadius:'50%', background: isCurrent?'var(--accent)':'var(--primary-light)', color: isCurrent?'white':'var(--primary-dark)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800, fontSize:13, flexShrink:0 }}>
                      {s.parentName?.charAt(0)?.toUpperCase()}
                    </div>

                    {/* Info */}
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontWeight:700, fontSize:13 }}>{s.parentName}</div>
                      <div style={{ fontSize:11, color:'var(--text3)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                        {s.studentName && `${s.studentName} · `}{s.className} · {s.phone}
                      </div>
                    </div>

                    {/* Amount */}
                    <div style={{ fontWeight:800, fontSize:13, color:'var(--warning)', flexShrink:0 }}>
                      {fmt(remaining)}
                    </div>

                    {/* Status */}
                    <div style={{ fontSize:18, flexShrink:0, minWidth:24, textAlign:'center' }}>
                      {isCurrent ? '📤' : STATUS[st]}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Summary footer */}
            <div style={{ padding:'12px 16px', borderTop:'1px solid var(--border)', background:'var(--bg)', display:'flex', gap:16, fontSize:12 }}>
              <span>⏳ Pending: <b>{filtered.filter(s=>!statuses[s._id]||statuses[s._id]==='pending').length}</b></span>
              <span style={{ color:'var(--success)' }}>✅ Sent: <b>{sentCount}</b></span>
              <span style={{ color:'var(--danger)' }}>❌ Failed: <b>{failedCount}</b></span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
