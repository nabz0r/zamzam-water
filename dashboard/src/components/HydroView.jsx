import { useState, useEffect } from 'react'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
  ResponsiveContainer, Legend,
} from 'recharts'
import { api } from '../utils/api'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// Known Zamzam well recovery data from literature (Springer 2017)
const WELL_DATA = {
  depth_m: 31,
  recovery_min: 11,
  pump_rate_Ls: 8000,
  annual_extraction_m3: 500000,
  peak_demand_Ld: 2000000,
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#1a2140] border border-[#2a3358] rounded-lg p-3 text-xs">
      <p className="text-[#e2e8f0] font-medium mb-1">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} style={{ color: entry.color }}>
          {entry.name}: {typeof entry.value === 'number' ? entry.value.toFixed(1) : entry.value}
        </p>
      ))}
    </div>
  )
}

export default function HydroView() {
  const [stats, setStats] = useState(null)
  const [monthlyData, setMonthlyData] = useState([])
  const [dailyData, setDailyData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.hydro.stats(),
      api.hydro.rainfall('2019-01', null, 'monthly'),
    ]).then(([statsData, rainfallData]) => {
      setStats(statsData)
      setMonthlyData(rainfallData.data || [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  if (loading) return <div className="p-8 text-[#64748b]">Loading hydro data...</div>

  // Build heatmap data (year x month)
  const heatmapData = {}
  for (const m of monthlyData) {
    const [year, month] = m.month.split('-')
    if (!heatmapData[year]) heatmapData[year] = {}
    heatmapData[year][parseInt(month)] = m.total_mm
  }
  const years = Object.keys(heatmapData).sort()

  return (
    <div className="p-8">
      <h2 className="text-2xl text-[#e2e8f0] mb-2">Hydro / Weather Data</h2>
      <p className="text-sm text-[#64748b] mb-6">
        Open-Meteo historical data for Mecca — precipitation, temperature, humidity
      </p>

      {/* Monthly precipitation chart */}
      <div className="bg-[#0f1629] border border-[#1e2a4a] rounded-lg p-6 mb-6">
        <h3 className="text-sm text-[#94a3b8] mb-4">Monthly Precipitation (mm)</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={monthlyData} margin={{ top: 10, right: 30, bottom: 20, left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e2a4a" />
            <XAxis
              dataKey="month"
              tick={{ fill: '#94a3b8', fontSize: 10 }}
              axisLine={{ stroke: '#2a3358' }}
              interval={2}
            />
            <YAxis
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              axisLine={{ stroke: '#2a3358' }}
              label={{ value: 'mm', angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 11 }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line type="monotone" dataKey="total_mm" name="Rainfall" stroke="#60a5fa" strokeWidth={1.5} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Rainfall heatmap (GitHub contribution style) */}
      {years.length > 0 && (
        <div className="bg-[#0f1629] border border-[#1e2a4a] rounded-lg p-6 mb-6">
          <h3 className="text-sm text-[#94a3b8] mb-4">Rainfall Heatmap (mm/month)</h3>
          <div className="overflow-x-auto">
            <table className="text-xs">
              <thead>
                <tr>
                  <th className="px-2 py-1 text-[#64748b]">Year</th>
                  {MONTHS.map((m) => (
                    <th key={m} className="px-2 py-1 text-[#64748b]">{m}</th>
                  ))}
                  <th className="px-2 py-1 text-[#64748b]">Total</th>
                </tr>
              </thead>
              <tbody>
                {years.map((year) => {
                  const yearTotal = Object.values(heatmapData[year]).reduce((a, b) => a + b, 0)
                  return (
                    <tr key={year}>
                      <td className="px-2 py-1 text-[#94a3b8]">{year}</td>
                      {Array.from({ length: 12 }, (_, i) => {
                        const val = heatmapData[year][i + 1] || 0
                        const intensity = Math.min(val / 30, 1)
                        return (
                          <td key={i} className="px-1 py-1">
                            <div
                              className="w-8 h-6 rounded flex items-center justify-center text-[10px]"
                              style={{
                                backgroundColor: val > 0
                                  ? `rgba(96, 165, 250, ${0.15 + intensity * 0.7})`
                                  : '#1a2140',
                                color: val > 5 ? '#e2e8f0' : '#64748b',
                              }}
                            >
                              {val > 0 ? val.toFixed(0) : ''}
                            </div>
                          </td>
                        )
                      })}
                      <td className="px-2 py-1 text-[#e2e8f0] font-mono">{yearTotal.toFixed(0)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Well recovery data from literature */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-[#0f1629] border border-[#1e2a4a] rounded-lg p-5">
          <h3 className="text-sm text-[#94a3b8] mb-3">Zamzam Well Characteristics (Springer 2017)</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-[#64748b]">Well depth</span>
              <span className="text-[#e2e8f0]">{WELL_DATA.depth_m} m</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#64748b]">Recovery time (after 24h pumping)</span>
              <span className="text-[#e2e8f0]">{WELL_DATA.recovery_min} min</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#64748b]">Pump rate</span>
              <span className="text-[#e2e8f0]">{WELL_DATA.pump_rate_Ls.toLocaleString()} L/s</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#64748b]">Annual extraction limit</span>
              <span className="text-[#e2e8f0]">{(WELL_DATA.annual_extraction_m3 / 1000).toLocaleString()} k m³</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#64748b]">Peak demand (Hajj)</span>
              <span className="text-[#e2e8f0]">{(WELL_DATA.peak_demand_Ld / 1e6).toFixed(1)} M L/day</span>
            </div>
          </div>
        </div>

        {stats?.temperature?.avg && (
          <div className="bg-[#0f1629] border border-[#1e2a4a] rounded-lg p-5">
            <h3 className="text-sm text-[#94a3b8] mb-3">Temperature Summary — Mecca</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-[#64748b]">Average</span>
                <span className="text-[#fbbf24]">{stats.temperature.avg}°C</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#64748b]">Minimum recorded</span>
                <span className="text-[#60a5fa]">{stats.temperature.min}°C</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#64748b]">Maximum recorded</span>
                <span className="text-[#f87171]">{stats.temperature.max}°C</span>
              </div>
            </div>
            <p className="text-xs text-[#64748b] mt-4">
              Mecca's arid climate (BWh) means minimal rainfall and extreme
              evaporation. This constrains aquifer recharge to episodic wadi flood events.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
