import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import api from '../../utils/api';

const fmt = n => '₹' + (Number(n)||0).toLocaleString('en-IN');

function fillTemplate(tmpl, student) {
  return tmpl
    .replace(/{parent_name}/gi, student.parentName || 'Parent')
    .replace(/{student_name}/gi, student.studentName || 'Student')
    .replace(/{class}/gi, student.className || '')
    .replace(/{amount}/gi, Number((student.amountDue||0)-(student.amountPaid||0)).toLocaleString('en-IN'))
    .replace(/{due_since}/gi, student.dueSince || '');
}

function formatPhone(raw) {
  let p = (raw||'').replace(/\D/g,'');
  if (p.startsWith('0')) p = p.slice(1);
  if (!p.startsWith('91') && p.length===10) p = '91' + p;
  return p;
}

const STATUS_ICON = { pending:'⏳', sending:'📤', sent:'✅', failed:'❌', skipped:'⏭️' };

export default function Send() {
  const [students, setStudents] = useState([]);
  const [template, setTemplate] = useState(`🙏 Namaskar {parent_name} Ji,\n\nAapke bachhe *{student_name}* ({class}) ki school fees mein *₹{amount}* abhi baki hai.\n\nKripaya aaj fees jama karva dein. Aapka sahyog hamara umang badhata hai. 🙏\n\n— Doon School`);
  const [delay, setDelay] = useState(30);
  const [status, setStatus] = useState({});
  const [sending, setSending] = useState(false);
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [log, setLog] = useState([]);
  const [filter, setFilter] = useState('');
  const [builtinTemplates, setBuiltinTemplates] = useState([]);
  const pauseRef = useRef(false);
  const logRef = useRef(null);

  useEffect(() => {
    api.get('/students?status=pending&limit=200').then(r => setStudents(r.data.students));
    api.get('/templates').then(r => setBuiltinTemplates(r.data.templates));
  }, []);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [log]);

  const sleep = ms => new Promise(r => setTimeout(r, ms));

  const waitIfPaused = () => new Promise(resolve => {
    const check = () => { if (!pauseRef.current) resolve(); else setTimeout(check, 300); };
    check();
  });

  const addLog = (msg, type='info') => setLog(prev => [...prev, { msg, type, time: new Date().toLocaleTimeString() }]);

  const startSending = async () => {
    const toSend = students.filter(s => s.status !== 'paid' && s.amountDue > s.amountPaid);
    if (!toSend.length) { toast.error('No pending students'); return; }
    if (!template.trim()) { toast.error('Please write a message template'); return; }

    setSending(true); setPaused(false); pauseRef.current = false;
    setProgress(0); setLog([]);
    addLog(`🚀 Starting — ${toSend.length} parents to message`, 'info');
    addLog(`⏱️ Delay: ${delay}s between messages`, 'info');

    let sent = 0, failed = 0;
    for (let i = 0; i < toSend.length; i++) {
      await waitIfPaused();
      const s = toSend[i];
      setStatus(prev => ({ ...prev, [s._id]: 'sending' }));
      const msg = fillTemplate(template, s);
      const phone = formatPhone(s.phone);
      const waUrl = `https://web.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(msg)}`;

      try {
        window.open(waUrl, '_blank', 'width=900,height=700');
        sent++;
        setStatus(prev => ({ ...prev, [s._id]: 'sent' }));
        addLog(`✅ Sent to ${s.parentName} (${s.phone}) — ₹${Number(s.amountDue-s.amountPaid).toLocaleString('en-IN')}`, 'success');
      } catch {
        failed++;
        setStatus(prev => ({ ...prev, [s._id]: 'failed' }));
        addLog(`❌ Failed: ${s.parentName}`, 'error');
      }

      setProgress(Math.round(((i+1)/toSend.length)*100));
      if (i < toSend.length - 1) await sleep(delay * 1000);
    }

    addLog(`🎉 Complete! Sent: ${sent} | Failed: ${failed}`, 'info');
    setSending(false);
    toast.success(`✅ Done! ${sent} messages sent`);
  };

  const togglePause = () => {
    const newPaused = !paused;
    setPaused(newPaused);
    pauseRef.current = newPaused;
    if (newPaused) addLog('⏸️ Paused by user', 'warn');
    else addLog('▶️ Resumed', 'info');
    toast(newPaused ? '⏸️ Paused' : '▶️ Resumed');
  };

  const pending = students.filter(s => s.status !== 'paid');
  const filtered = filter ? pending.filter(s => s.className === filter) : pending;
  const classes = [...new Set(students.map(s=>s.className).filter(Boolean))].sort();
  const sentCount = Object.values(status).filter(v=>v==='sent').length;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">💬 Send Reminders</h1>
          <p className="page-subtitle">Manually send personalised WhatsApp messages to pending parents</p>
        </div>
      </div>

      <div className="page-body">
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
          {/* Left: Template & Settings */}
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            {/* WhatsApp Web Notice */}
            <div style={{ background:'linear-gradient(135deg,#e8f5e9,#f0fdf4)', border:'1px solid #bbf7d0', borderRadius:12, padding:16 }}>
              <div style={{ fontWeight:700, color:'#15803d', marginBottom:8 }}>📱 Before you start</div>
              <ol style={{ paddingLeft:18, fontSize:13, color:'#166534', lineHeight:2 }}>
                <li>Open <strong>Google Chrome</strong></li>
                <li>Go to <strong>web.whatsapp.com</strong> & scan QR</li>
                <li>Keep the tab open throughout</li>
                <li>Click <strong>Start Sending</strong> below ↓</li>
              </ol>
            </div>

            {/* Template */}
            <div className="card">
              <div className="card-header">
                <div className="card-icon" style={{ background:'var(--purple-light)' }}>✍️</div>
                <div><div className="card-title">Message Template</div><div className="card-subtitle">Use placeholders — they auto-fill per parent</div></div>
              </div>
              <div className="card-body">
                <div style={{ marginBottom:10 }}>
                  <label className="input-label">Quick Templates</label>
                  <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                    {builtinTemplates.map(t => (
                      <button key={t.id} className="btn btn-ghost btn-sm" style={{ fontSize:11 }} onClick={() => setTemplate(t.template)}>{t.name}</button>
                    ))}
                  </div>
                </div>
                <textarea className="input" rows={9} value={template} onChange={e=>setTemplate(e.target.value)} style={{ fontFamily:'var(--font-body)', lineHeight:1.7 }} />
                <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginTop:8 }}>
                  {['{parent_name}','{student_name}','{class}','{amount}','{due_since}'].map(p => (
                    <button key={p} type="button" style={{ background:'var(--accent-light)', color:'var(--warning)', border:'1px solid #fcd34d', padding:'2px 8px', borderRadius:5, fontSize:11, fontWeight:700, cursor:'pointer' }}
                      onClick={() => setTemplate(t => t + p)}>{p}</button>
                  ))}
                </div>
              </div>
            </div>

            {/* Settings */}
            <div className="card">
              <div className="card-header">
                <div className="card-icon" style={{ background:'var(--accent-light)' }}>⚙️</div>
                <div><div className="card-title">Send Settings</div></div>
              </div>
              <div className="card-body">
                <div className="input-group">
                  <label className="input-label">Delay Between Messages (seconds) — min 15s recommended</label>
                  <input className="input" type="number" min={15} max={300} value={delay} onChange={e=>setDelay(+e.target.value)} />
                </div>
                <div className="input-group">
                  <label className="input-label">Filter by Class (optional)</label>
                  <select className="input" value={filter} onChange={e=>setFilter(e.target.value)}>
                    <option value="">All Classes ({pending.length} parents)</option>
                    {classes.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* Controls */}
            <div style={{ display:'flex', gap:10 }}>
              {!sending ? (
                <button className="btn btn-success btn-lg" style={{ flex:1, justifyContent:'center' }} onClick={startSending}>
                  🚀 Start Sending ({filtered.length} parents)
                </button>
              ) : (
                <>
                  <button className="btn btn-amber btn-lg" style={{ flex:1, justifyContent:'center' }} onClick={togglePause}>
                    {paused ? '▶️ Resume' : '⏸️ Pause'}
                  </button>
                </>
              )}
            </div>

            {/* Progress */}
            {(sending || progress > 0) && (
              <div className="card">
                <div className="card-body">
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
                    <span style={{ fontWeight:700, fontSize:14 }}>Progress</span>
                    <span style={{ fontWeight:800, color:'var(--primary)' }}>{progress}%</span>
                  </div>
                  <div className="progress-bar" style={{ height:10 }}>
                    <div className="progress-fill" style={{ width:`${progress}%` }}></div>
                  </div>
                  <div style={{ display:'flex', gap:20, marginTop:10, fontSize:13 }}>
                    <span style={{ color:'var(--success)' }}>✅ Sent: <b>{sentCount}</b></span>
                    <span style={{ color:'var(--text2)' }}>Total: <b>{filtered.length}</b></span>
                  </div>
                  <div ref={logRef} style={{ marginTop:12, background:'var(--bg)', borderRadius:8, padding:12, maxHeight:160, overflowY:'auto', fontFamily:'monospace', fontSize:11, lineHeight:2 }}>
                    {log.map((l,i) => (
                      <div key={i} style={{ color: l.type==='success'?'var(--success)':l.type==='error'?'var(--danger)':l.type==='warn'?'var(--warning)':'var(--text2)' }}>
                        [{l.time}] {l.msg}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right: Parent List */}
          <div className="card" style={{ maxHeight:700, display:'flex', flexDirection:'column' }}>
            <div className="card-header">
              <div className="card-icon" style={{ background:'var(--primary-light)' }}>👥</div>
              <div>
                <div className="card-title">Parents to Message</div>
                <div className="card-subtitle">{filtered.length} pending parents</div>
              </div>
            </div>
            <div style={{ flex:1, overflowY:'auto' }}>
              {filtered.length === 0 ? (
                <div className="empty-state"><div className="empty-icon">🎉</div><h3>All clear!</h3><p>No pending dues</p></div>
              ) : filtered.map(s => {
                const remaining = (s.amountDue||0)-(s.amountPaid||0);
                const st = status[s._id] || 'pending';
                return (
                  <div key={s._id} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 16px', borderBottom:'1px solid var(--border)', transition:'background 0.15s', background: st==='sending'?'var(--accent-light)':st==='sent'?'var(--success-light)':st==='failed'?'var(--danger-light)':'' }}>
                    <div style={{ width:36, height:36, borderRadius:'50%', background:'var(--primary-light)', color:'var(--primary-dark)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800, fontSize:13, flexShrink:0 }}>
                      {s.parentName?.charAt(0)?.toUpperCase()}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontWeight:700, fontSize:13 }}>{s.parentName}</div>
                      <div style={{ fontSize:11, color:'var(--text3)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                        {s.studentName && `${s.studentName} · `}{s.className} · {s.phone}
                      </div>
                    </div>
                    <div style={{ fontWeight:800, fontSize:13, color:'var(--warning)', flexShrink:0 }}>{fmt(remaining)}</div>
                    <div style={{ fontSize:18, flexShrink:0 }}>{STATUS_ICON[st]}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
