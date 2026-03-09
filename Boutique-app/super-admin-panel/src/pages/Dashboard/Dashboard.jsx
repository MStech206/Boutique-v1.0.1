import React, { useState, useEffect } from "react";
import { Line } from "react-chartjs-2";
import api from "../../utils/axiosConfig";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from "chart.js";
import "./Dashboard.css";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const formatTime = (ts) => {
  if (!ts) return "—";
  try {
    let date;
    if (ts?._seconds)     date = new Date(ts._seconds * 1000);
    else if (ts?.seconds) date = new Date(ts.seconds * 1000);
    else if (typeof ts === "string" || typeof ts === "number") date = new Date(ts);
    else return "—";
    if (isNaN(date.getTime())) return "—";
    const diffMs    = Date.now() - date;
    const diffMins  = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays  = Math.floor(diffMs / 86400000);
    if (diffMins  <  1) return "just now";
    if (diffMins  < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays  <  7) return `${diffDays}d ago`;
    return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  } catch { return "—"; }
};

const currentMonth   = () => new Date().toISOString().slice(0, 7);
const buildDayLabels = (month) => {
  const [year, mon] = month.split("-").map(Number);
  const days = new Date(year, mon, 0).getDate();
  return Array.from({ length: days }, (_, i) => `${i + 1}`);
};

function Dashboard() {
  const [clientCount,       setClientCount]       = useState("—");
  const [subAdminTotal,     setSubAdminTotal]     = useState("—");
  const [subAdminBreakdown, setSubAdminBreakdown] = useState([]);
  const [showBreakdown,     setShowBreakdown]     = useState(false);

  const [clients,        setClients]        = useState([]);
  const [selectedClient, setSelectedClient] = useState("");
  const [selectedMonth,  setSelectedMonth]  = useState(currentMonth());

  const [ordersChartData, setOrdersChartData] = useState(null);
  const [chartLoading,    setChartLoading]    = useState(false);

  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errors,  setErrors]  = useState([]);

  // ── Initial load ──────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;

    const loadDashboard = async () => {
      const [clientsCountRes, subAdminsRes] = await Promise.allSettled([
        api.get("/super-admin/clients/count"),
        api.get("/super-admin/sub-admins/breakdown"),
      ]);

      if (!mounted) return;

      const errs = [];

      if (clientsCountRes.status === "fulfilled") {
        setClientCount(clientsCountRes.value?.data?.count ?? 0);
      } else {
        errs.push(`clients: ${clientsCountRes.reason?.message}`);
      }

      if (subAdminsRes.status === "fulfilled") {
        const data = subAdminsRes.value?.data;
        setSubAdminTotal(data?.total ?? 0);
        setSubAdminBreakdown(data?.breakdown ?? []);
      } else {
        errs.push(`sub-admins: ${subAdminsRes.reason?.message}`);
      }

      // Clients list for chart dropdown
      try {
        const listRes = await api.get("/super-admin/clients");
        const list = Array.isArray(listRes.data) ? listRes.data : [];
        if (mounted) {
          setClients(list);
          if (list.length > 0) setSelectedClient(list[0].id || list[0].adminId || "");
        }
      } catch (e) {
        console.warn("Could not load clients list:", e.message);
      }

      // Recent activity
      const activity = [];
      try {
        const clientsListRes = await api.get("/super-admin/clients");
        const clientsList = Array.isArray(clientsListRes.data) ? clientsListRes.data : [];
        clientsList
          .filter(c => c.createdAt)
          .sort((a, b) => {
            const ta = a.createdAt?.seconds ?? new Date(a.createdAt).getTime() / 1000;
            const tb = b.createdAt?.seconds ?? new Date(b.createdAt).getTime() / 1000;
            return tb - ta;
          })
          .slice(0, 5)
          .forEach(c => activity.push({
            type: "client", icon: "🏬", color: "primary",
            message: `New boutique added: ${c.boutiqueName}`,
            sub: c.adminEmail || "", time: c.createdAt,
          }));
      } catch (e) { console.warn("Could not load recent clients:", e.message); }

      try {
        const adminsListRes = await api.get("/super-admin/admins");
        const adminsList = Array.isArray(adminsListRes.data)
          ? adminsListRes.data
          : (adminsListRes.data?.admins || []);
        adminsList
          .filter(a => a.createdAt)
          .sort((a, b) => {
            const ta = a.createdAt?.seconds ?? new Date(a.createdAt).getTime() / 1000;
            const tb = b.createdAt?.seconds ?? new Date(b.createdAt).getTime() / 1000;
            return tb - ta;
          })
          .slice(0, 5)
          .forEach(a => activity.push({
            type: "admin", icon: "👤", color: "success",
            message: `New admin created: ${a.name || a.username || a.id}`,
            sub: a.boutiqueName || a.adminId || "", time: a.createdAt,
          }));
      } catch (e) { console.warn("Could not load recent admins:", e.message); }

      activity.sort((a, b) => {
        const ta = a.time?.seconds ?? new Date(a.time).getTime() / 1000 ?? 0;
        const tb = b.time?.seconds ?? new Date(b.time).getTime() / 1000 ?? 0;
        return tb - ta;
      });

      if (mounted) {
        setRecentActivity(activity.slice(0, 8));
        setErrors(errs);
        setLoading(false);
      }
    };

    loadDashboard();
    return () => { mounted = false; };
  }, []);

  // ── Fetch orders chart ────────────────────────────────────────
  useEffect(() => {
    if (!selectedClient) return;
    let mounted = true;
    setChartLoading(true);
    setOrdersChartData(null);

    const fetchChart = async () => {
      try {
        const res = await api.get(
          `/super-admin/clients/${selectedClient}/orders-chart`,
          { params: { month: selectedMonth } }
        );
        if (!mounted) return;
        const counts = Array.isArray(res.data?.counts) ? res.data.counts : [];
        const labels = buildDayLabels(selectedMonth);
        setOrdersChartData({
          labels,
          datasets: [{
            label: "Orders",
            data: counts,
            borderColor: "#0d6efd",
            backgroundColor: "rgba(13,110,253,0.12)",
            pointBackgroundColor: "#0d6efd",
            pointRadius: 4,
            pointHoverRadius: 6,
            tension: 0.4,
            fill: true,
          }],
        });
      } catch (e) {
        console.warn("Could not load orders chart:", e.message);
      } finally {
        if (mounted) setChartLoading(false);
      }
    };

    fetchChart();
    return () => { mounted = false; };
  }, [selectedClient, selectedMonth]);

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: "top" },
      tooltip: { mode: "index", intersect: false },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: { stepSize: 1, precision: 0 },
        grid: { color: "rgba(0,0,0,0.05)" },
      },
      x: { grid: { display: false } },
    },
  };

  const selectedClientLabel = clients.find(
    c => (c.id || c.adminId) === selectedClient
  )?.boutiqueName || selectedClient;

  if (loading) {
    return (
      <div className="dashboard">
        <h2 className="dashboard-title">Dashboard</h2>
        <div className="stats-cards">
          {["primary", "success"].map((c, i) => (
            <div key={i} className={`card bg-${c} text-white`} style={{ opacity: 0.4 }}>
              <div className="card-body text-center">
                <h5>Loading...</h5>
                <p className="fs-3">—</p>
              </div>
            </div>
          ))}
        </div>
        <div className="chart-card card mt-4 p-4 text-center">
          <p className="text-muted mb-0">Loading chart data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <h2 className="dashboard-title">Dashboard</h2>

      {errors.length > 0 && (
        <div className="alert alert-warning py-2 mb-3">
          ⚠️ Some data unavailable: {errors.join(" | ")}
        </div>
      )}

      {/* ── Stat Cards ── */}
      <div className="stats-cards">

        {/* Clients */}
        <div className="card bg-primary text-white">
          <div className="card-body text-center">
            <h5>Clients</h5>
            <p className="fs-3 fw-bold mb-0">{clientCount}</p>
          </div>
        </div>

        {/* Sub Admins — click to expand per-client breakdown */}
        <div
          className="card bg-success text-white"
          style={{ cursor: "pointer" }}
          onClick={() => setShowBreakdown(v => !v)}
          title="Click to see per-client breakdown"
        >
          <div className="card-body text-center">
            <h5 className="mb-1">
              Sub Admins&nbsp;
              <span style={{ fontSize: 12, opacity: 0.8 }}>
                {showBreakdown ? "▲ hide" : "▼ details"}
              </span>
            </h5>
            <p className="fs-3 fw-bold mb-0">{subAdminTotal}</p>
          </div>

          {/* Breakdown table */}
          {showBreakdown && (
            <div
              className="px-3 pb-3"
              onClick={e => e.stopPropagation()}
            >
              {subAdminBreakdown.length === 0 ? (
                <p className="text-center mb-0" style={{ fontSize: 13, opacity: 0.85 }}>
                  No sub-admins found.
                </p>
              ) : (
                <div style={{
                  background: "rgba(255,255,255,0.15)",
                  borderRadius: 8,
                  overflow: "hidden",
                }}>
                  <table className="table table-sm mb-0" style={{ color: "#fff" }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.3)" }}>
                        <th style={{ fontSize: 12, fontWeight: 600, paddingLeft: 10 }}>Client</th>
                        <th className="text-end" style={{ fontSize: 12, fontWeight: 600, paddingRight: 10 }}>
                          Sub Admins
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {subAdminBreakdown.map(row => (
                        <tr
                          key={row.clientId}
                          style={{ borderBottom: "1px solid rgba(255,255,255,0.12)" }}
                        >
                          <td style={{ fontSize: 13, paddingLeft: 10 }}>
                            {row.boutiqueName}
                          </td>
                          <td className="text-end fw-bold" style={{ fontSize: 13, paddingRight: 10 }}>
                            <span style={{
                              background: "rgba(255,255,255,0.25)",
                              borderRadius: 12,
                              padding: "1px 10px",
                            }}>
                              {row.subAdminCount}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Client Orders Chart ── */}
      <div className="chart-card card mt-4">
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
          <h5 className="mb-0">
            Orders — {selectedClientLabel || "Select a client"}
          </h5>
          <div className="d-flex gap-2 flex-wrap">
            <select
              className="form-select form-select-sm"
              style={{ minWidth: 180 }}
              value={selectedClient}
              onChange={e => setSelectedClient(e.target.value)}
            >
              {clients.length === 0 && <option value="">No clients found</option>}
              {clients.map(c => (
                <option key={c.id || c.adminId} value={c.id || c.adminId}>
                  {c.boutiqueName || c.id || c.adminId}
                </option>
              ))}
            </select>
            <input
              type="month"
              className="form-control form-control-sm"
              style={{ minWidth: 150 }}
              value={selectedMonth}
              max={currentMonth()}
              onChange={e => setSelectedMonth(e.target.value)}
            />
          </div>
        </div>

        {chartLoading ? (
          <p className="text-muted text-center py-4 mb-0">Loading chart…</p>
        ) : ordersChartData ? (
          <>
            <div className="chart-container" style={{ height: 240 }}>
              <Line data={ordersChartData} options={lineOptions} />
            </div>
            {ordersChartData.datasets[0].data.every(v => v === 0) && (
              <p className="text-muted text-center small mt-1 mb-2">
                No orders recorded for this client in the selected month.
              </p>
            )}
          </>
        ) : (
          <p className="text-muted text-center py-4 mb-0">
            {clients.length === 0 ? "No clients available." : "Select a client to view the orders chart."}
          </p>
        )}
      </div>

      {/* ── Recent Activity ── */}
      <div className="activity-card card mt-4">
        <div className="d-flex justify-content-between align-items-center mb-2 px-3 pt-3">
          <h5 className="mb-0">Recent Activity</h5>
          <small className="text-muted">Last 8 events</small>
        </div>
        {recentActivity.length === 0 ? (
          <div className="px-3 pb-3">
            <p className="text-muted mb-0">No recent activity found.</p>
          </div>
        ) : (
          <ul className="list-group list-group-flush">
            {recentActivity.map((item, idx) => (
              <li key={idx} className="list-group-item d-flex align-items-start gap-3 py-2">
                <span
                  className={`badge bg-${item.color} d-flex align-items-center justify-content-center`}
                  style={{ width: 36, height: 36, fontSize: 16, borderRadius: 8, flexShrink: 0 }}
                >
                  {item.icon}
                </span>
                <div className="flex-grow-1">
                  <div className="fw-semibold" style={{ fontSize: 14 }}>{item.message}</div>
                  {item.sub && (
                    <div className="text-muted" style={{ fontSize: 12 }}>{item.sub}</div>
                  )}
                </div>
                <span className="text-muted" style={{ fontSize: 12, whiteSpace: "nowrap" }}>
                  {formatTime(item.time)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default Dashboard;