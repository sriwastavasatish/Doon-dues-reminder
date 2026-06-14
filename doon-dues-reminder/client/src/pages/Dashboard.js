import React, { useEffect, useState } from 'react';
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import api from '../utils/api';
import { useAuth } from '../AuthContext';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const COLORS = ['#0EA5E9','#10B981','#F59E0B','#EF4444','#8B5CF6','#F97316'];

const fmt = n => '₹' + (Number(n)||0).toLocaleString('en-IN');

export default function Dashboard() {
  const { user, isAdmin } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard').then(r => setData(r.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:400 }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ fontSize:40, marginBottom:12 }}>⏳</div>
        <p style={{ color:'var(--text2)' }}>Loading dashboard...</p>
      </div>
    </div>
  );

  const stats = data?.stats || {};
  const remaining = (stats.totalDue||0) - (stats.totalCollected||0);
  const collectionPct = stats.totalDue ? Math.round((stats.totalCollected/stats.totalDue)*100) : 0;

  const monthlyData = (data?.monthlyTrend||[]).map(m => ({
    name: MONTHS[(m._id?.m||1)-1] + ' ' + (m._id?.y||''),
    collected: m.total,
    payments: m.count,
  }));

  const pieData = [
    { name:'Paid',    value: stats.paidCount||0,    color:'#10B981' },
    { name:'Partial', value: stats.partialCount||0, color:'#8B5CF6' },
    { name:'Pending', value: stats.pendingCount||0, color:'#F59E0B' },
  ].filter(d => d.value > 0);

  const weekData = (data?.recentPayments||[]).map(p => ({
    date: p._id?.slice(5),
    amount: p.amount,
    count: p.count,
  }));

  const byClass = (data?.byClass||[]).slice(0,8).map(c => ({
    name: c._id || 'Unknown',
    due: c.totalDue - c.totalPaid,
    collected: c.totalPaid,
  }));

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">👋 Welcome, {user?.name?.split(' ')[0]}!</h1>
          <p className="page-subtitle">Here's your school fee collection overview for today</p>
        </div>
        <div style={{ display:'flex', gap:10 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => window.location.reload()}>🔄 Refresh</button>
        </div>
      </div>

      <div className="page-body">
        {/* Stat Cards */}
        <div className="stat-grid" style={{ marginBottom:24 }}>
          <div className="stat-card blue">
            <div className="stat-card-top">
              <div className="stat-card-icon blue">👨‍🎓</div>
              <span style={{ fontSize:11, color:'var(--text3)', fontWeight:600 }}>TOTAL</span>
            </div>
            <div className="stat-value">{stats.total||0}</div>
            <div className="stat-label">Total Students</div>
          </div>
          <div className="stat-card amber">
            <div className="stat-card-top">
              <div className="stat-card-icon amber">💰</div>
              <span style={{ fontSize:11, color:'var(--text3)', fontWeight:600 }}>PENDING</span>
            </div>
            <div className="stat-value" style={{ fontSize:20 }}>{fmt(remaining)}</div>
            <div className="stat-label">Total Dues Remaining</div>
          </div>
          <div className="stat-card green">
            <div className="stat-card-top">
              <div className="stat-card-icon green">✅</div>
              <span style={{ fontSize:11, color:'var(--text3)', fontWeight:600 }}>COLLECTED</span>
            </div>
            <div className="stat-value" style={{ fontSize:20 }}>{fmt(stats.totalCollected)}</div>
            <div className="stat-label">Total Collected</div>
            <div className="stat-change up">📈 {collectionPct}% of total dues</div>
          </div>
          <div className="stat-card red">
            <div className="stat-card-top">
              <div className="stat-card-icon red">⏰</div>
              <span style={{ fontSize:11, color:'var(--text3)', fontWeight:600 }}>PENDING</span>
            </div>
            <div className="stat-value">{stats.pendingCount||0}</div>
            <div className="stat-label">Pending Parents</div>
          </div>
        </div>

        {/* Collection Progress */}
        <div className="card" style={{ marginBottom:24 }}>
          <div className="card-body" style={{ padding:'20px 24px' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
              <span style={{ fontWeight:700, fontSize:14 }}>📊 Overall Collection Progress</span>
              <span style={{ fontWeight:800, color:'var(--primary)', fontSize:18 }}>{collectionPct}%</span>
            </div>
            <div className="progress-bar" style={{ height:10 }}>
              <div className="progress-fill" style={{ width:`${collectionPct}%` }}></div>
            </div>
            <div style={{ display:'flex', gap:24, marginTop:10 }}>
              <span style={{ fontSize:12, color:'var(--text2)' }}>Total: <b>{fmt(stats.totalDue)}</b></span>
              <span style={{ fontSize:12, color:'var(--success)' }}>Collected: <b>{fmt(stats.totalCollected)}</b></span>
              <span style={{ fontSize:12, color:'var(--warning)' }}>Remaining: <b>{fmt(remaining)}</b></span>
            </div>
          </div>
        </div>

        {/* Charts Row 1 */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, marginBottom:24 }}>
          {/* Monthly Trend */}
          <div className="card">
            <div className="card-header">
              <div className="card-icon" style={{ background:'var(--primary-light)' }}>📈</div>
              <div>
                <div className="card-title">Monthly Collection Trend</div>
                <div className="card-subtitle">Last 6 months payment history</div>
              </div>
            </div>
            <div className="card-body">
              <div className="chart-container">
                {monthlyData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={monthlyData}>
                      <defs>
                        <linearGradient id="colorCollected" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#0EA5E9" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#0EA5E9" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="name" tick={{ fontSize:11 }} />
                      <YAxis tick={{ fontSize:11 }} tickFormatter={v => '₹'+v.toLocaleString('en-IN')} />
                      <Tooltip formatter={v => ['₹'+Number(v).toLocaleString('en-IN'), 'Collected']} />
                      <Area type="monotone" dataKey="collected" stroke="#0EA5E9" strokeWidth={2} fill="url(#colorCollected)" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : <div className="empty-state"><div className="empty-icon">📭</div><h3>No payment data yet</h3><p>Payments will appear here once recorded</p></div>}
              </div>
            </div>
          </div>

          {/* Status Pie */}
          <div className="card">
            <div className="card-header">
              <div className="card-icon" style={{ background:'var(--success-light)' }}>🥧</div>
              <div>
                <div className="card-title">Payment Status Breakdown</div>
                <div className="card-subtitle">Paid vs partial vs pending</div>
              </div>
            </div>
            <div className="card-body">
              <div className="chart-container">
                {pieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={3} dataKey="value">
                        {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                      </Pie>
                      <Tooltip formatter={(v, n) => [v + ' students', n]} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : <div className="empty-state"><div className="empty-icon">📭</div><h3>No data</h3></div>}
              </div>
            </div>
          </div>
        </div>

        {/* Charts Row 2 */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, marginBottom:24 }}>
          {/* By Class */}
          <div className="card">
            <div className="card-header">
              <div className="card-icon" style={{ background:'var(--accent-light)' }}>🏫</div>
              <div>
                <div className="card-title">Dues by Class</div>
                <div className="card-subtitle">Remaining vs collected per class</div>
              </div>
            </div>
            <div className="card-body">
              <div className="chart-container">
                {byClass.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={byClass} layout="vertical" margin={{ left:20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis type="number" tick={{ fontSize:10 }} tickFormatter={v => '₹'+v.toLocaleString('en-IN')} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize:11 }} width={80} />
                      <Tooltip formatter={v => '₹'+Number(v).toLocaleString('en-IN')} />
                      <Legend />
                      <Bar dataKey="collected" name="Collected" fill="#10B981" radius={[0,4,4,0]} />
                      <Bar dataKey="due" name="Remaining" fill="#F59E0B" radius={[0,4,4,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <div className="empty-state"><div className="empty-icon">📭</div><h3>No class data</h3></div>}
              </div>
            </div>
          </div>

          {/* This Week */}
          <div className="card">
            <div className="card-header">
              <div className="card-icon" style={{ background:'var(--purple-light)' }}>📅</div>
              <div>
                <div className="card-title">This Week's Collections</div>
                <div className="card-subtitle">Daily payment amounts (last 7 days)</div>
              </div>
            </div>
            <div className="card-body">
              <div className="chart-container">
                {weekData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={weekData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="date" tick={{ fontSize:11 }} />
                      <YAxis tick={{ fontSize:10 }} tickFormatter={v => '₹'+v.toLocaleString('en-IN')} />
                      <Tooltip formatter={v => '₹'+Number(v).toLocaleString('en-IN')} />
                      <Bar dataKey="amount" name="Collected" fill="#8B5CF6" radius={[4,4,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <div className="empty-state"><div className="empty-icon">📭</div><h3>No payments this week</h3></div>}
              </div>
            </div>
          </div>
        </div>

        {/* Recent Payments */}
        {(data?.recentStudents||[]).length > 0 && (
          <div className="card">
            <div className="card-header">
              <div className="card-icon" style={{ background:'var(--success-light)' }}>🕐</div>
              <div>
                <div className="card-title">Recent Payments</div>
                <div className="card-subtitle">Latest fee clearances</div>
              </div>
            </div>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Student</th><th>Parent</th><th>Class</th><th>Amount Paid</th><th>Status</th></tr></thead>
                <tbody>
                  {(data.recentStudents||[]).map(s => (
                    <tr key={s._id}>
                      <td><b>{s.studentName}</b></td>
                      <td style={{ color:'var(--text2)' }}>{s.parentName}</td>
                      <td><span style={{ background:'var(--bg)', padding:'2px 8px', borderRadius:6, fontSize:12 }}>{s.className}</span></td>
                      <td style={{ color:'var(--success)', fontWeight:700 }}>{fmt(s.amountPaid)}</td>
                      <td><span className={`badge badge-${s.status}`}>{s.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
