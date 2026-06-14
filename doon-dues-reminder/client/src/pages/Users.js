import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import api from '../../utils/api';

const CLASS_OPTIONS = ['Class 1-A','Class 1-B','Class 2-A','Class 2-B','Class 3-A','Class 3-B','Class 4-A','Class 4-B','Class 5-A','Class 5-B','Class 6-A','Class 6-B','Class 7-A','Class 7-B','Class 8-A','Class 8-B','Class 9-A','Class 9-B','Class 10-A','Class 10-B','Class 11-A','Class 11-B','Class 12-A','Class 12-B'];

function UserModal({ user, onClose, onSaved }) {
  const isEdit = !!user;
  const [form, setForm] = useState(user || { name:'', email:'', password:'', role:'teacher', assignedClasses:[], isActive:true });
  const [loading, setLoading] = useState(false);
  const [customClass, setCustomClass] = useState('');

  const toggleClass = cls => {
    setForm(f => ({ ...f, assignedClasses: f.assignedClasses.includes(cls) ? f.assignedClasses.filter(c=>c!==cls) : [...f.assignedClasses, cls] }));
  };

  const addCustomClass = () => {
    if (!customClass.trim()) return;
    if (!form.assignedClasses.includes(customClass.trim())) setForm(f => ({ ...f, assignedClasses: [...f.assignedClasses, customClass.trim()] }));
    setCustomClass('');
  };

  const handleSave = async () => {
    if (!form.name || !form.email) return toast.error('Name and email required');
    if (!isEdit && !form.password) return toast.error('Password required for new user');
    setLoading(true);
    try {
      if (isEdit) await api.put(`/users/${user._id}`, form);
      else await api.post('/users', form);
      toast.success(`User ${isEdit?'updated':'created'}!`);
      onSaved();
      onClose();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e=>e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">{isEdit ? '✏️ Edit User' : '👤 Add User'}</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
            <div className="input-group" style={{ margin:0 }}>
              <label className="input-label">Full Name *</label>
              <input className="input" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="e.g. Priya Sharma" />
            </div>
            <div className="input-group" style={{ margin:0 }}>
              <label className="input-label">Role *</label>
              <select className="input" value={form.role} onChange={e=>setForm(f=>({...f,role:e.target.value}))}>
                <option value="teacher">👨‍🏫 Teacher</option>
                <option value="admin">🔑 Admin</option>
              </select>
            </div>
          </div>
          <div className="input-group" style={{ marginTop:14 }}>
            <label className="input-label">Email Address *</label>
            <input className="input" type="email" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} placeholder="teacher@school.com" />
          </div>
          <div className="input-group">
            <label className="input-label">{isEdit ? 'New Password (leave blank to keep)' : 'Password *'}</label>
            <input className="input" type="password" value={form.password||''} onChange={e=>setForm(f=>({...f,password:e.target.value}))} placeholder="Min 6 characters" />
          </div>
          {form.role === 'teacher' && (
            <div>
              <label className="input-label">Assigned Classes</label>
              <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:10 }}>
                {CLASS_OPTIONS.map(c => (
                  <button key={c} type="button" onClick={()=>toggleClass(c)} style={{ padding:'4px 10px', borderRadius:6, border:'1.5px solid', fontSize:11, fontWeight:700, cursor:'pointer', transition:'all 0.15s',
                    background: form.assignedClasses.includes(c) ? 'var(--primary)' : 'var(--bg)',
                    color: form.assignedClasses.includes(c) ? 'white' : 'var(--text2)',
                    borderColor: form.assignedClasses.includes(c) ? 'var(--primary)' : 'var(--border)',
                  }}>{c}</button>
                ))}
              </div>
              <div style={{ display:'flex', gap:8 }}>
                <input className="input" placeholder="Custom class name..." value={customClass} onChange={e=>setCustomClass(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addCustomClass()} />
                <button className="btn btn-ghost btn-sm" onClick={addCustomClass}>Add</button>
              </div>
            </div>
          )}
          {isEdit && (
            <div style={{ marginTop:14 }}>
              <label style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer', fontSize:13, fontWeight:600 }}>
                <input type="checkbox" checked={form.isActive} onChange={e=>setForm(f=>({...f,isActive:e.target.checked}))} />
                Account Active
              </label>
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={loading}>
            {loading ? '⏳...' : isEdit ? '💾 Update' : '➕ Create User'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editUser, setEditUser] = useState(null);

  const fetchUsers = async () => {
    setLoading(true);
    try { const res = await api.get('/users'); setUsers(res.data.users); }
    catch { toast.error('Failed to load users'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchUsers(); }, []);

  const deactivate = async id => {
    if (!window.confirm('Deactivate this user?')) return;
    try { await api.delete(`/users/${id}`); toast.success('User deactivated'); fetchUsers(); }
    catch { toast.error('Failed'); }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">👥 Teachers & Users</h1>
          <p className="page-subtitle">Manage staff access — assign teachers to classes</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditUser(null); setShowModal(true); }}>+ Add User</button>
      </div>

      <div className="page-body">
        <div className="card">
          <div className="table-wrap">
            {loading ? <div style={{ textAlign:'center', padding:60 }}>⏳ Loading...</div> :
            users.length === 0 ? <div className="empty-state"><div className="empty-icon">👥</div><h3>No users yet</h3></div> : (
              <table>
                <thead>
                  <tr><th>Name</th><th>Email</th><th>Role</th><th>Assigned Classes</th><th>Last Login</th><th>Status</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u._id}>
                      <td>
                        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                          <div style={{ width:32, height:32, borderRadius:'50%', background:'linear-gradient(135deg,var(--primary),var(--accent))', display:'flex', alignItems:'center', justifyContent:'center', color:'white', fontWeight:800, fontSize:12 }}>
                            {u.name?.charAt(0)?.toUpperCase()}
                          </div>
                          <b>{u.name}</b>
                        </div>
                      </td>
                      <td style={{ color:'var(--text2)', fontSize:13 }}>{u.email}</td>
                      <td><span className={`badge badge-${u.role}`}>{u.role}</span></td>
                      <td>
                        {u.role === 'admin' ? <span style={{ color:'var(--text3)', fontSize:12 }}>All classes</span> :
                        u.assignedClasses?.length > 0 ? (
                          <div style={{ display:'flex', flexWrap:'wrap', gap:4 }}>
                            {u.assignedClasses.slice(0,3).map(c => <span key={c} style={{ background:'var(--bg)', border:'1px solid var(--border)', padding:'1px 7px', borderRadius:5, fontSize:11 }}>{c}</span>)}
                            {u.assignedClasses.length > 3 && <span style={{ fontSize:11, color:'var(--text3)' }}>+{u.assignedClasses.length-3} more</span>}
                          </div>
                        ) : <span style={{ color:'var(--text3)', fontSize:12 }}>None assigned</span>}
                      </td>
                      <td style={{ fontSize:12, color:'var(--text2)' }}>{u.lastLogin ? new Date(u.lastLogin).toLocaleDateString() : 'Never'}</td>
                      <td><span className={`badge ${u.isActive?'badge-active':'badge-paused'}`}>{u.isActive?'Active':'Inactive'}</span></td>
                      <td>
                        <div style={{ display:'flex', gap:6 }}>
                          <button className="btn btn-ghost btn-sm" onClick={() => { setEditUser(u); setShowModal(true); }}>✏️ Edit</button>
                          {u.isActive && <button className="btn btn-danger btn-sm" onClick={() => deactivate(u._id)}>🚫</button>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {showModal && <UserModal user={editUser} onClose={() => { setShowModal(false); setEditUser(null); }} onSaved={fetchUsers} />}
    </div>
  );
}
