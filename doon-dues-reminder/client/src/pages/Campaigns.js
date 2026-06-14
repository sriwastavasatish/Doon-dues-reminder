import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import api from '../../utils/api';

const DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const DEFAULT_SLOTS = [
  { label:'Morning', time:'09:00', template:`🙏 Namaskar {parent_name} Ji,\n\nAapke bachhe *{student_name}* ({class}) ki school fees mein *₹{amount}* abhi baki hai.\n\nKripaya aaj fees jama karva dein. 🙏\n— Doon School`, enabled:true },
  { label:'Afternoon', time:'13:00', template:`Dear {parent_name} Ji,\n\nGentle reminder: *₹{amount}* in school fees for *{student_name}* ({class}) is pending.\n\nPlease clear at your earliest. Thank you 🙏\n— School Office`, enabled:true },
  { label:'Evening', time:'17:00', template:`🔔 Respected {parent_name} Ji,\n\nUrgent: School fees of *₹{amount}* for *{student_name}* ({class}) are still outstanding.\n\nPlease clear immediately to avoid any inconvenience. 🙏\n— School Management`, enabled:false },
];

function CampaignModal({ campaign, onClose, onSaved }) {
  const isEdit = !!campaign;
  const [form, setForm] = useState(campaign || {
    name: '', description: '', targetClasses: [],
    scheduleSlots: DEFAULT_SLOTS,
    delayBetweenMessages: 30,
    messagesToSendPerDay: 2,
    daysActive: ['Mon','Tue','Wed','Thu','Fri'],
    status: 'active',
  });
  const [loading, setLoading] = useState(false);
  const [activeSlot, setActiveSlot] = useState(0);
  const [templates, setTemplates] = useState([]);

  useEffect(() => {
    api.get('/templates').then(r => setTemplates(r.data.templates));
  }, []);

  const updateSlot = (idx, field, value) => {
    setForm(f => {
      const slots = [...f.scheduleSlots];
      slots[idx] = { ...slots[idx], [field]: value };
      return { ...f, scheduleSlots: slots };
    });
  };

  const addSlot = () => {
    setForm(f => ({ ...f, scheduleSlots: [...f.scheduleSlots, { label:`Slot ${f.scheduleSlots.length+1}`, time:'10:00', template:'', enabled:true }] }));
    setActiveSlot(form.scheduleSlots.length);
  };

  const removeSlot = idx => {
    setForm(f => ({ ...f, scheduleSlots: f.scheduleSlots.filter((_,i) => i!==idx) }));
    setActiveSlot(0);
  };

  const toggleDay = day => {
    setForm(f => ({ ...f, daysActive: f.daysActive.includes(day) ? f.daysActive.filter(d=>d!==day) : [...f.daysActive, day] }));
  };

  const handleSave = async () => {
    if (!form.name) return toast.error('Campaign name required');
    if (!form.scheduleSlots.some(s => s.enabled)) return toast.error('At least one enabled slot required');
    setLoading(true);
    try {
      if (isEdit) await api.put(`/campaigns/${campaign._id}`, form);
      else await api.post('/campaigns', form);
      toast.success(`Campaign ${isEdit?'updated':'created'}!`);
      onSaved();
      onClose();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to save'); }
    finally { setLoading(false); }
  };

  const placeholders = ['{parent_name}','{student_name}','{class}','{amount}','{due_since}'];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth:680 }} onClick={e=>e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">{isEdit ? '✏️ Edit Campaign' : '📅 New Campaign'}</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body" style={{ display:'flex', flexDirection:'column', gap:16 }}>
          {/* Basic Info */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
            <div className="input-group" style={{ margin:0 }}>
              <label className="input-label">Campaign Name *</label>
              <input className="input" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="e.g. April Dues Reminder" />
            </div>
            <div className="input-group" style={{ margin:0 }}>
              <label className="input-label">Status</label>
              <select className="input" value={form.status} onChange={e=>setForm(f=>({...f,status:e.target.value}))}>
                <option value="active">🟢 Active</option>
                <option value="paused">⏸️ Paused</option>
              </select>
            </div>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
            <div className="input-group" style={{ margin:0 }}>
              <label className="input-label">Delay Between Messages (seconds)</label>
              <input className="input" type="number" min="15" max="300" value={form.delayBetweenMessages} onChange={e=>setForm(f=>({...f,delayBetweenMessages:+e.target.value}))} />
            </div>
            <div className="input-group" style={{ margin:0 }}>
              <label className="input-label">Messages Per Day</label>
              <select className="input" value={form.messagesToSendPerDay} onChange={e=>setForm(f=>({...f,messagesToSendPerDay:+e.target.value}))}>
                {[1,2,3].map(n=><option key={n} value={n}>{n} {n===1?'time':'times'} per day</option>)}
              </select>
            </div>
          </div>

          {/* Active Days */}
          <div>
            <label className="input-label">Active Days</label>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              {DAYS.map(d => (
                <button key={d} type="button" onClick={()=>toggleDay(d)}
                  style={{ padding:'6px 14px', borderRadius:8, border:'1.5px solid', fontSize:12, fontWeight:700, cursor:'pointer', transition:'all 0.15s',
                    background: form.daysActive.includes(d) ? 'var(--primary)' : 'var(--bg)',
                    color: form.daysActive.includes(d) ? 'white' : 'var(--text2)',
                    borderColor: form.daysActive.includes(d) ? 'var(--primary)' : 'var(--border)',
                  }}>
                  {d}
                </button>
              ))}
            </div>
          </div>

          {/* Message Slots */}
          <div>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
              <label className="input-label" style={{ margin:0 }}>Message Slots (Time & Template)</label>
              <button className="btn btn-ghost btn-sm" onClick={addSlot}>+ Add Slot</button>
            </div>
            <div style={{ display:'flex', gap:8, marginBottom:12, flexWrap:'wrap' }}>
              {form.scheduleSlots.map((s,i) => (
                <button key={i} type="button" onClick={()=>setActiveSlot(i)}
                  style={{ padding:'6px 14px', borderRadius:8, border:'1.5px solid', fontSize:12, fontWeight:700, cursor:'pointer', transition:'all 0.15s',
                    background: activeSlot===i ? 'var(--primary)' : 'var(--bg)',
                    color: activeSlot===i ? 'white' : 'var(--text2)',
                    borderColor: activeSlot===i ? 'var(--primary)' : 'var(--border)',
                    opacity: s.enabled ? 1 : 0.5,
                  }}>
                  {s.label || `Slot ${i+1}`} · {s.time}
                </button>
              ))}
            </div>

            {form.scheduleSlots[activeSlot] && (
              <div style={{ background:'var(--bg)', borderRadius:10, padding:16, border:'1.5px solid var(--border)' }}>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr auto', gap:12, marginBottom:12, alignItems:'end' }}>
                  <div className="input-group" style={{ margin:0 }}>
                    <label className="input-label">Slot Label</label>
                    <input className="input" value={form.scheduleSlots[activeSlot].label} onChange={e=>updateSlot(activeSlot,'label',e.target.value)} placeholder="e.g. Morning" />
                  </div>
                  <div className="input-group" style={{ margin:0 }}>
                    <label className="input-label">Send Time</label>
                    <input className="input" type="time" value={form.scheduleSlots[activeSlot].time} onChange={e=>updateSlot(activeSlot,'time',e.target.value)} />
                  </div>
                  <div style={{ display:'flex', gap:8, alignItems:'center', paddingBottom:2 }}>
                    <label style={{ fontSize:12, fontWeight:600, color:'var(--text2)', display:'flex', alignItems:'center', gap:6, cursor:'pointer' }}>
                      <input type="checkbox" checked={form.scheduleSlots[activeSlot].enabled} onChange={e=>updateSlot(activeSlot,'enabled',e.target.checked)} />
                      Enabled
                    </label>
                    {form.scheduleSlots.length > 1 && <button className="btn btn-danger btn-sm btn-icon" onClick={()=>removeSlot(activeSlot)}>🗑️</button>}
                  </div>
                </div>

                <label className="input-label">Quick Template</label>
                <div style={{ display:'flex', gap:8, marginBottom:10, flexWrap:'wrap' }}>
                  {templates.map(t => (
                    <button key={t.id} className="btn btn-ghost btn-sm" style={{ fontSize:11 }} onClick={()=>updateSlot(activeSlot,'template',t.template)}>
                      {t.name}
                    </button>
                  ))}
                </div>

                <label className="input-label">Message Template *</label>
                <textarea className="input" rows={7} value={form.scheduleSlots[activeSlot].template} onChange={e=>updateSlot(activeSlot,'template',e.target.value)} placeholder="Type your message here. Use placeholders below." />
                <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginTop:8 }}>
                  <span style={{ fontSize:11, color:'var(--text3)', marginRight:4 }}>Click to insert:</span>
                  {placeholders.map(p => (
                    <button key={p} type="button" style={{ background:'var(--accent-light)', color:'var(--warning)', border:'1px solid #fcd34d', padding:'2px 8px', borderRadius:5, fontSize:11, fontWeight:700, cursor:'pointer' }}
                      onClick={()=>updateSlot(activeSlot,'template', form.scheduleSlots[activeSlot].template + p)}>
                      {p}
                    </button>
                  ))}
                </div>

                {form.scheduleSlots[activeSlot].template && (
                  <div style={{ marginTop:12, background:'#e8f5e9', borderRadius:8, padding:12, fontSize:12.5, whiteSpace:'pre-wrap', lineHeight:1.7, borderLeft:'3px solid var(--success)' }}>
                    <div style={{ fontSize:10, fontWeight:700, color:'var(--success)', marginBottom:6 }}>PREVIEW</div>
                    {form.scheduleSlots[activeSlot].template
                      .replace(/{parent_name}/g,'Ramesh Kumar')
                      .replace(/{student_name}/g,'Aarav Kumar')
                      .replace(/{class}/g,'Class 5-A')
                      .replace(/{amount}/g,'8,500')
                      .replace(/{due_since}/g,'April 2025')}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={loading}>
            {loading ? '⏳ Saving...' : isEdit ? '💾 Update Campaign' : '🚀 Create Campaign'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Campaigns() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editCampaign, setEditCampaign] = useState(null);

  const fetchCampaigns = async () => {
    setLoading(true);
    try {
      const res = await api.get('/campaigns');
      setCampaigns(res.data.campaigns);
    } catch { toast.error('Failed to load campaigns'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchCampaigns(); }, []);

  const deleteCampaign = async id => {
    if (!window.confirm('Delete this campaign?')) return;
    try { await api.delete(`/campaigns/${id}`); toast.success('Deleted'); fetchCampaigns(); }
    catch { toast.error('Delete failed'); }
  };

  const toggleStatus = async campaign => {
    const newStatus = campaign.status === 'active' ? 'paused' : 'active';
    try { await api.put(`/campaigns/${campaign._id}`, { ...campaign, status: newStatus }); fetchCampaigns(); }
    catch { toast.error('Failed to update status'); }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">📅 Campaigns</h1>
          <p className="page-subtitle">Schedule automated WhatsApp reminders with custom times & templates</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditCampaign(null); setShowModal(true); }}>+ New Campaign</button>
      </div>

      <div className="page-body">
        {loading ? <div style={{ textAlign:'center', padding:80 }}>⏳ Loading campaigns...</div> :
        campaigns.length === 0 ? (
          <div className="card"><div className="empty-state">
            <div className="empty-icon">📅</div>
            <h3>No campaigns yet</h3>
            <p>Create a campaign to start automating reminders</p>
            <button className="btn btn-primary" style={{ marginTop:16 }} onClick={() => setShowModal(true)}>+ Create First Campaign</button>
          </div></div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            {campaigns.map(c => (
              <div className="card" key={c._id}>
                <div className="card-body" style={{ padding:20 }}>
                  <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:16, flexWrap:'wrap' }}>
                    <div style={{ flex:1 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:6 }}>
                        <h3 style={{ fontSize:16 }}>{c.name}</h3>
                        <span className={`badge badge-${c.status}`}>{c.status}</span>
                      </div>
                      {c.description && <p style={{ fontSize:13, color:'var(--text2)', marginBottom:10 }}>{c.description}</p>}
                      <div style={{ display:'flex', gap:20, flexWrap:'wrap', fontSize:13 }}>
                        <span>⏱️ <b>{c.delayBetweenMessages}s</b> delay</span>
                        <span>📤 <b>{c.messagesToSendPerDay}x</b> per day</span>
                        <span>📅 <b>{c.daysActive?.join(', ') || 'Daily'}</b></span>
                        <span>💬 <b>{c.totalMessagesSent||0}</b> messages sent</span>
                      </div>
                      <div style={{ display:'flex', gap:8, marginTop:12, flexWrap:'wrap' }}>
                        {c.scheduleSlots?.map((s,i) => (
                          <span key={i} style={{ background: s.enabled ? 'var(--primary-light)' : 'var(--bg)', color: s.enabled ? 'var(--primary-dark)' : 'var(--text3)', border:'1px solid var(--border)', padding:'4px 10px', borderRadius:20, fontSize:12, fontWeight:600, opacity: s.enabled ? 1 : 0.5 }}>
                            🕐 {s.label} · {s.time}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div style={{ display:'flex', gap:8 }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => toggleStatus(c)}>
                        {c.status === 'active' ? '⏸️ Pause' : '▶️ Activate'}
                      </button>
                      <button className="btn btn-ghost btn-sm" onClick={() => { setEditCampaign(c); setShowModal(true); }}>✏️ Edit</button>
                      <button className="btn btn-danger btn-sm" onClick={() => deleteCampaign(c._id)}>🗑️</button>
                    </div>
                  </div>
                  {c.runLogs?.length > 0 && (
                    <div style={{ marginTop:14, paddingTop:14, borderTop:'1px solid var(--border)' }}>
                      <div style={{ fontSize:11, fontWeight:700, color:'var(--text3)', marginBottom:8 }}>LAST RUNS</div>
                      <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
                        {c.runLogs.slice(-3).reverse().map((r,i) => (
                          <div key={i} style={{ background:'var(--bg)', borderRadius:8, padding:'6px 12px', fontSize:12 }}>
                            <span style={{ color:'var(--text3)' }}>{new Date(r.runAt).toLocaleDateString()} {r.slot}</span>
                            <span style={{ color:'var(--success)', marginLeft:8 }}>✅ {r.totalSent}</span>
                            {r.totalFailed > 0 && <span style={{ color:'var(--danger)', marginLeft:4 }}>❌ {r.totalFailed}</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && <CampaignModal campaign={editCampaign} onClose={() => { setShowModal(false); setEditCampaign(null); }} onSaved={fetchCampaigns} />}
    </div>
  );
}
