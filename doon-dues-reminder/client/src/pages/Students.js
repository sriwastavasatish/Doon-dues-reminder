import React, { useState, useEffect, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

const fmt = n => '₹' + (Number(n)||0).toLocaleString('en-IN');

function ImportModal({ onClose, onImported }) {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const onDrop = useCallback(async files => {
    if (!files[0]) return;
    setLoading(true);
    const fd = new FormData();
    fd.append('file', files[0]);
    try {
      const res = await api.post('/students/import', fd);
      setResult(res.data);
      toast.success(`✅ ${res.data.inserted} added, ${res.data.updated} updated`);
      onImported();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Import failed');
    } finally { setLoading(false); }
  }, [onImported]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'], 'application/vnd.ms-excel': ['.xls'] }, multiple: false });

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">📂 Import from Excel</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div {...getRootProps()} className={`dropzone${isDragActive ? ' active' : ''}`}>
            <input {...getInputProps()} />
            <div className="dropzone-icon">{loading ? '⏳' : '📊'}</div>
            <h3>{loading ? 'Importing...' : isDragActive ? 'Drop your Excel file here' : 'Drag & drop your Excel file'}</h3>
            <p>Supports .xlsx and .xls files</p>
            {!loading && <button className="btn btn-primary" style={{ marginTop:14 }} onClick={e => e.stopPropagation()}>Browse File</button>}
          </div>

          {result && (
            <div style={{ marginTop:16, padding:16, background:'var(--success-light)', borderRadius:10, border:'1px solid #a7f3d0' }}>
              <div style={{ fontWeight:700, color:'var(--success)', marginBottom:8 }}>✅ Import Complete</div>
              <div style={{ fontSize:13 }}>✨ <b>{result.inserted}</b> new students added</div>
              <div style={{ fontSize:13 }}>🔄 <b>{result.updated}</b> existing records updated</div>
              {result.errors?.length > 0 && (
                <div style={{ marginTop:8 }}>
                  <div style={{ fontSize:12, color:'var(--warning)', fontWeight:600 }}>⚠️ {result.errors.length} rows skipped:</div>
                  {result.errors.slice(0,3).map((e,i) => <div key={i} style={{ fontSize:11, color:'var(--text2)' }}>{e}</div>)}
                </div>
              )}
            </div>
          )}

          <div style={{ marginTop:16, padding:14, background:'var(--bg)', borderRadius:10, fontSize:12, color:'var(--text2)', lineHeight:1.7 }}>
            <strong>📋 Required columns:</strong> Parent Name, Phone Number, Amount Due<br/>
            <strong>📋 Optional:</strong> Student Name, Class, Due Since, Notes<br/>
            <strong>💡 Tip:</strong> Column names are auto-detected — any variation works!
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

function PayModal({ student, onClose, onPaid }) {
  const [amount, setAmount] = useState(student.remainingDue || student.amountDue - student.amountPaid);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);

  const handlePay = async () => {
    if (!amount || amount <= 0) return toast.error('Enter valid amount');
    setLoading(true);
    try {
      await api.patch(`/students/${student._id}/pay`, { amountPaid: amount, note });
      toast.success('✅ Payment recorded!');
      onPaid();
      onClose();
    } catch (err) { toast.error('Failed to record payment'); }
    finally { setLoading(false); }
  };

  const remaining = (student.amountDue||0) - (student.amountPaid||0);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth:420 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">✅ Mark Payment</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div style={{ background:'var(--bg)', borderRadius:10, padding:14, marginBottom:16 }}>
            <div style={{ fontWeight:700 }}>{student.studentName}</div>
            <div style={{ fontSize:13, color:'var(--text2)' }}>{student.parentName} • {student.className}</div>
            <div style={{ display:'flex', gap:16, marginTop:8 }}>
              <span style={{ fontSize:13 }}>Total: <b>{fmt(student.amountDue)}</b></span>
              <span style={{ fontSize:13, color:'var(--success)' }}>Paid: <b>{fmt(student.amountPaid)}</b></span>
              <span style={{ fontSize:13, color:'var(--warning)' }}>Remaining: <b>{fmt(remaining)}</b></span>
            </div>
          </div>
          <div className="input-group">
            <label className="input-label">Amount Being Paid (₹) <span style={{ color:'red' }}>*</span></label>
            <input className="input" type="number" value={amount} onChange={e => setAmount(e.target.value)} min="1" max={remaining} />
          </div>
          <div className="input-group">
            <label className="input-label">Note (optional)</label>
            <input className="input" type="text" value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. Paid by cash, receipt #123" />
          </div>
          <div style={{ display:'flex', gap:10, marginTop:4 }}>
            <button className="btn btn-ghost btn-sm" onClick={() => setAmount(remaining)}>Pay Full ({fmt(remaining)})</button>
            <button className="btn btn-ghost btn-sm" onClick={() => setAmount(Math.floor(remaining/2))}>Pay Half</button>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-success" onClick={handlePay} disabled={loading}>
            {loading ? '⏳ Saving...' : '✅ Confirm Payment'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Students() {
  const { isAdmin } = useAuth();
  const [students, setStudents] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showImport, setShowImport] = useState(false);
  const [payStudent, setPayStudent] = useState(null);
  const [filters, setFilters] = useState({ status: '', className: '', search: '', page: 1 });

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([k,v]) => v && params.append(k, v));
      const res = await api.get(`/students?${params}`);
      setStudents(res.data.students);
      setTotal(res.data.total);
    } catch (err) { toast.error('Failed to load students'); }
    finally { setLoading(false); }
  }, [filters]);

  useEffect(() => { fetchStudents(); }, [fetchStudents]);

  const classes = [...new Set(students.map(s => s.className).filter(Boolean))].sort();

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">👨‍🎓 Students & Dues</h1>
          <p className="page-subtitle">{total} students total · Import Excel to add/update records</p>
        </div>
        <div style={{ display:'flex', gap:10 }}>
          <button className="btn btn-ghost" onClick={() => setShowImport(true)}>📂 Import Excel</button>
          {isAdmin && <button className="btn btn-primary">+ Add Student</button>}
        </div>
      </div>

      <div className="page-body">
        {/* Filters */}
        <div className="card" style={{ marginBottom:20, padding:16 }}>
          <div className="search-bar">
            <div className="input-icon-wrap" style={{ flex:1, maxWidth:300 }}>
              <span className="input-icon">🔍</span>
              <input className="input" placeholder="Search name, parent, phone..." value={filters.search}
                onChange={e => setFilters(f => ({ ...f, search:e.target.value, page:1 }))} />
            </div>
            <select className="input" style={{ width:160 }} value={filters.status}
              onChange={e => setFilters(f => ({ ...f, status:e.target.value, page:1 }))}>
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="partial">Partial</option>
              <option value="paid">Paid</option>
            </select>
            <select className="input" style={{ width:160 }} value={filters.className}
              onChange={e => setFilters(f => ({ ...f, className:e.target.value, page:1 }))}>
              <option value="">All Classes</option>
              {classes.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <button className="btn btn-ghost btn-sm" onClick={() => setFilters({ status:'', className:'', search:'', page:1 })}>Clear</button>
          </div>
        </div>

        {/* Table */}
        <div className="card">
          <div className="table-wrap">
            {loading ? (
              <div style={{ textAlign:'center', padding:60 }}>⏳ Loading...</div>
            ) : students.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📂</div>
                <h3>No students found</h3>
                <p>Import an Excel file to get started</p>
                <button className="btn btn-primary" style={{ marginTop:16 }} onClick={() => setShowImport(true)}>📂 Import Excel</button>
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Student</th>
                    <th>Parent</th>
                    <th>Phone</th>
                    <th>Class</th>
                    <th>Due</th>
                    <th>Paid</th>
                    <th>Remaining</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((s, idx) => {
                    const remaining = (s.amountDue||0) - (s.amountPaid||0);
                    return (
                      <tr key={s._id}>
                        <td style={{ color:'var(--text3)', fontSize:12 }}>{(filters.page-1)*50 + idx + 1}</td>
                        <td>
                          <div style={{ fontWeight:700 }}>{s.studentName || '—'}</div>
                          {s.dueSince && <div style={{ fontSize:11, color:'var(--text3)' }}>Since {s.dueSince}</div>}
                        </td>
                        <td>
                          <div style={{ fontWeight:500 }}>{s.parentName}</div>
                          <div style={{ fontSize:11, color:'var(--text3)' }}>{(s.messageLogs||[]).length} msgs sent</div>
                        </td>
                        <td style={{ fontFamily:'monospace', fontSize:12 }}>{s.phone}</td>
                        <td><span style={{ background:'var(--primary-light)', color:'var(--primary-dark)', padding:'3px 8px', borderRadius:6, fontSize:12, fontWeight:600 }}>{s.className||'—'}</span></td>
                        <td style={{ fontWeight:600 }}>{fmt(s.amountDue)}</td>
                        <td style={{ color:'var(--success)', fontWeight:600 }}>{fmt(s.amountPaid)}</td>
                        <td style={{ color: remaining > 0 ? 'var(--warning)' : 'var(--success)', fontWeight:700 }}>{fmt(remaining)}</td>
                        <td><span className={`badge badge-${s.status}`}>{s.status}</span></td>
                        <td>
                          {s.status !== 'paid' && (
                            <button className="btn btn-success btn-sm" onClick={() => setPayStudent(s)}>✅ Pay</button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
          {total > 50 && (
            <div className="card-actions" style={{ justifyContent:'space-between' }}>
              <span style={{ fontSize:13, color:'var(--text2)' }}>Showing {students.length} of {total}</span>
              <div style={{ display:'flex', gap:8 }}>
                <button className="btn btn-ghost btn-sm" disabled={filters.page<=1} onClick={() => setFilters(f => ({ ...f, page:f.page-1 }))}>← Prev</button>
                <button className="btn btn-ghost btn-sm" disabled={students.length<50} onClick={() => setFilters(f => ({ ...f, page:f.page+1 }))}>Next →</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {showImport && <ImportModal onClose={() => setShowImport(false)} onImported={fetchStudents} />}
      {payStudent && <PayModal student={payStudent} onClose={() => setPayStudent(null)} onPaid={fetchStudents} />}
    </div>
  );
}
