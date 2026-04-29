import { useState, useEffect } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import "./Admin.css";

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    fetch("http://localhost:5001/api/admin/stats")
      .then(res => res.json())
      .then(data => setStats(data))
      .catch(console.error);
  }, []);

  if (!stats) return <div className="admin-loading">Loading Analytics...</div>;

  return (
    <div className="admin-dashboard">
      <div className="admin-kpi-grid">
        <div className="admin-kpi-card">
          <h3>Total Revenue</h3>
          <p className="kpi-value">₹{stats.totalRevenue.toLocaleString()}</p>
          <span className="kpi-trend positive">↑ 12% from last week</span>
        </div>
        <div className="admin-kpi-card">
          <h3>Total Rides</h3>
          <p className="kpi-value">{stats.totalRides}</p>
          <span className="kpi-trend positive">↑ 5% from last week</span>
        </div>
        <div className="admin-kpi-card">
          <h3>Active Users</h3>
          <p className="kpi-value">{stats.activeUsers}</p>
          <span className="kpi-trend neutral">- Stable</span>
        </div>
      </div>

      <div className="admin-chart-section">
        <h3>Revenue Overview (Last 7 Days)</h3>
        <div className="chart-wrapper">
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={stats.chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#000" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#000" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="name" axisLine={false} tickLine={false} dy={10} />
              <YAxis axisLine={false} tickLine={false} dx={-10} tickFormatter={(val) => `₹${val}`} />
              <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
              <Tooltip formatter={(value) => [`₹${value}`, "Revenue"]} />
              <Area type="monotone" dataKey="revenue" stroke="#000" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
