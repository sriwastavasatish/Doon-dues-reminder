import React, { useState, useEffect } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from 'recharts';
import api from '../utils/api';

const fmt = n => '₹' + (Number(n)||0).toLocaleString('en-IN');
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const COLORS = ['#0EA5E9','#10B981','#F59E0B','#EF4444','#8B5CF6','#F97316','#06B6D4','#84CC16'];

export default function Reports() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/students/stats/summary').then(r => setData(r.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ textAlign:'center', padding:100 }}>⏳ Loading reports...</div>;

  const totals = data?.totals || {};
  const remaining = (totals.totalDue||0) - (totals.totalPaid||0);
  const pct = totals.totalDue ? Math.round((totals.totalPaid/totals.totalDue)*100) : 0;

  const byClass = (data?.byClass||[]).map(c => ({
    name: c._id || 'Unknown',
    due: c.due - c.paid,
    collected: c.paid,
    total: c.count,
    paidCount: c.paidCount,
    pct: c.due ? Math.round((c.paid/c.due)*100) : 0,
  }));

  const monthlyData = (data?.monthlyTrend||[]).map(m => ({
    name: MONTHS[(m._id?.m||1)-1] + "'" + String(m._id?.y||'').slice(2),
    amount: m.total,
    payments: m.count,
  }));

  const statusData = [
    { name: 'Paid', value: totals.paidCount||0, color: '#10B981' },
    { name: 'Partial', value: totals.partialCount||0, color: '#8B5CF6' },
    { name: 'Pending', value: totals.pendingCount||0, color: '#F59E0B' },
  ].filter(d=>d.value>0);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">📈 Reports & Analytics</h1>
          <p className="page-subtitle">Track how much was collected through WhatsApp reminders</p>
        </div>
        <button className="btn btn-ghost" onClick={() => window.location.reload()}>🔄 Refresh</button>
      </div>

      <div className="page-body">
        {/* Top KPI cards */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:14, marginBottom:24 }}>
          {[
            { label:'Total Students', value: totals.totalStudents||0, icon:'👨‍🎓', color:'blue' },
            { label:'Total Dues', value: fmt(totals.totalDue), icon:'💸', color:'amber' },
            { label:'Collected', value: fmt(totals.totalPaid), icon:'✅', color:'green' },
            { label:'Remaining', value: fmt(remaining), icon:'⏳', color:'red' },
            { label:'Collection %', value: pct+'%', icon:'📊', color:'purple' },
          ].map((k,i) => (
            <div key={i} className={`stat-card ${k.color}`}>
              <div className="stat-card-top">
                <div className={`stat-card-icon ${k.color}`}>{k.icon}</div>
              </div>
              <div className="stat-value" style={{ fontSize:20 }}>{k.value}</div>
              <div className="stat-label">{k.label}</div>
            </div>
          ))}
        </div>

        {/* WhatsApp Impact Banner */}
        <div style={{ background:'linear-gradient(135deg,#075E54,#128C7E)', borderRadius:14, padding:24, marginBottom:24, color:'white', display:'flex', alignItems:'center', gap:24 }}>
          <div style={{ fontSize:48 }}>📱</div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:22, fontWeight:800, fontFamily:'var(--font-display)', marginBottom:4 }}>WhatsApp Reminder Impact</div>
            <div style={{ opacity:0.85, fontSize:14 }}>Students who have cleared dues since you started sending reminders</div>
          </div>
          <div style={{ textAlign:'center', background:'rgba(255,255,255,0.15)', borderRadius:12, padding:'16px 24px' }}>
            <div style={{ fontSize:36, fontWeight:800 }}>{totals.paidCount||0}</div>
            <div style={{ fontSize:12, opacity:0.8 }}>Parents Responded</div>
          </div>
          <div style={{ textAlign:'center', background:'rgba(255,255,255,0.15)', borderRadius:12, padding:'16px 24px' }}>
            <div style={{ fontSize:36, fontWeight:800 }}>{fmt(totals.totalPaid)}</div>
            <div style={{ fontSize:12, opacity:0.8 }}>Total Collected</div>
          </div>
        </div>

        {/* Charts Row 1 */}
        <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:20, marginBottom:20 }}>
          <div className="card">
            <div className="card-header">
              <div className="card-icon" style={{ background:'var(--primary-light)' }}>📈</div>
              <div><div className="card-title">Monthly Collection Trend</div><div className="card-subtitle">Amount collected each month</div></div>
            </div>
            <div className="card-body">
              <div className="chart-container" style={{ height:260 }}>
                {monthlyData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="name" tick={{ fontSize:11 }} />
                      <YAxis tick={{ fontSize:10 }} tickFormatter={v=>'₹'+v.toLocaleString('en-IN')} />
                      <Tooltip formatter={v=>['₹'+Number(v).toLocaleString('en-IN'),'Collected']} />
                      <Line type="monotone" dataKey="amount" stroke="#0EA5E9" strokeWidth={3} dot={{ fill:'#0EA5E9', r:5 }} activeDot={{ r:7 }} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : <div className="empty-state"><div className="empty-icon">📭</div><h3>No monthly data yet</h3></div>}
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <div className="card-icon" style={{ background:'var(--success-light)' }}>🥧</div>
              <div><div className="card-title">Status Distribution</div></div>
            </div>
            <div className="card-body">
              <div className="chart-container" style={{ height:260 }}>
                {statusData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={statusData} cx="50%" cy="45%" innerRadius={55} outerRadius={90} paddingAngle={3} dataKey="value">
                        {statusData.map((e,i) => <Cell key={i} fill={e.color} />)}
                      </Pie>
                      <Tooltip formatter={(v,n)=>[v+' students',n]} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : <div className="empty-state"><div className="empty-icon">📭</div><h3>No data</h3></div>}
              </div>
            </div>
          </div>
        </div>

        {/* By Class Table + Chart */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
          <div className="card">
            <div className="card-header">
              <div className="card-icon" style={{ background:'var(--amber-light)' }}>🏫</div>
              <div><div className="card-title">Class-wise Collection</div><div className="card-subtitle">Collected vs pending per class</div></div>
            </div>
            <div className="card-body" style={{ padding:0 }}>
              <div className="chart-container" style={{ height:300, padding:20 }}>
                {byClass.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={byClass.slice(0,8)} layout="vertical" margin={{ left:20, right:20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis type="number" tick={{ fontSize:10 }} tickFormatter={v=>'₹'+v.toLocaleString('en-IN')} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize:10 }} width={75} />
                      <Tooltip formatter={v=>'₹'+Number(v).toLocaleString('en-IN')} />
                      <Legend />
                      <Bar dataKey="collected" name="Collected" fill="#10B981" radius={[0,3,3,0]} stackId="a" />
                      <Bar dataKey="due" name="Remaining" fill="#FCD34D" radius={[0,3,3,0]} stackId="a" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <div className="empty-state"><div className="empty-icon">📭</div><h3>No class data</h3></div>}
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <div className="card-icon" style={{ background:'var(--purple-light)' }}>📋</div>
              <div><div className="card-title">Class-wise Summary</div></div>
            </div>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Class</th><th>Students</th><th>Collected</th><th>Remaining</th><th>%</th></tr></thead>
                <tbody>
                  {byClass.map((c,i) => (
                    <tr key={i}>
                      <td><span style={{ background:'var(--primary-light)', color:'var(--primary-dark)', padding:'2px 8px', borderRadius:5, fontSize:12, fontWeight:700 }}>{c.name}</span></td>
                      <td style={{ fontSize:12 }}>{c.total}</td>
                      <td style={{ color:'var(--success)', fontWeight:700, fontSize:13 }}>{fmt(c.collected)}</td>
                      <td style={{ color:'var(--warning)', fontWeight:700, fontSize:13 }}>{fmt(c.due)}</td>
                      <td>
                        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                          <div style={{ flex:1, background:'var(--border)', borderRadius:99, height:5 }}>
                            <div style={{ width:`${c.pct}%`, background:'var(--success)', height:'100%', borderRadius:99 }}></div>
                          </div>
                          <span style={{ fontSize:12, fontWeight:700, color:'var(--text2)' }}>{c.pct}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
