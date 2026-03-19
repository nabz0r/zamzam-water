import { useState, useEffect } from 'react'
import { api } from '../utils/api'

function MetricCard({ label, value, sub, color }) {
  return (
    <div className="bg-[#0f1629] border border-[#1e2a4a] rounded-lg p-5">
      <div className="text-xs text-[#64748b] mb-1">{label}</div>
      <div className="text-3xl font-light" style={{ color, fontFamily: 'Georgia, serif' }}>
        {value}
      </div>
      {sub && <div className="text-xs text-[#64748b] mt-1">{sub}</div>}
    </div>
  )
}

function Sparkline({ data, color, height = 40 }) {
  if (!data || data.length === 0) return null
  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1
  const w = 200
  const points = data
    .map((v, i) => `${(i / (data.length - 1)) * w},${height - ((v - min) / range) * height}`)
    .join(' ')

  return (
    <svg width={w} height={height} className="mt-2">
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" opacity="0.7" />
    </svg>
  )
}

export default function Home({ toggles = {} }) {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetches = [
      api.publications.list(1, 1),
      api.chemistry.elements(),
      toggles.satellite !== false ? api.satellite.stats() : Promise.resolve(null),
      toggles.archaeology !== false ? api.archaeology.sites() : Promise.resolve(null),
      api.hydro.stats().catch(() => null),
    ]
    Promise.all(fetches).then(([pubs, chem, sat, sites, hydro]) => {
      setStats({
        papers: pubs.total,
        analyses: chem.elements.reduce((s, e) => s + e.count, 0),
        elements: chem.elements.length,
        scenes: sat?.total_scenes ?? 0,
        sites: sites?.features?.length ?? 0,
        hydroDays: hydro?.total_days || 0,
        annualRainfall: hydro?.annual_rainfall || [],
        temperature: hydro?.temperature || {},
      })
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  if (loading) return <div className="p-8 text-[#64748b]">Loading dashboard...</div>
  if (!stats) return <div className="p-8 text-[#64748b]">Failed to load stats.</div>

  return (
    <div className="p-8">
      <div className="mb-8">
        <h2 className="text-3xl text-[#e2e8f0] mb-1" style={{ fontFamily: 'Georgia, serif' }}>
          Zamzam Research Platform
        </h2>
        <p className="text-sm text-[#64748b]">
          Independent hydrochemical analysis of Zamzam water and Quranic archaeological sites
        </p>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-5 gap-4 mb-8">
        <MetricCard label="Publications" value={stats.papers} sub="from PubMed" color="#60a5fa" />
        <MetricCard label="Chemical Analyses" value={stats.analyses} sub={`${stats.elements} elements`} color="#34d399" />
        {toggles.satellite !== false && (
          <MetricCard label="Satellite Scenes" value={stats.scenes} sub="Sentinel-2 L2A" color="#fbbf24" />
        )}
        {toggles.archaeology !== false && (
          <MetricCard label="Archaeological Sites" value={stats.sites} sub="Quranic locations" color="#f87171" />
        )}
        <MetricCard
          label="Weather Data"
          value={stats.hydroDays.toLocaleString()}
          sub="days of records"
          color="#a78bfa"
        />
      </div>

      {/* Annual rainfall sparkline */}
      {stats.annualRainfall.length > 0 && (
        <div className="bg-[#0f1629] border border-[#1e2a4a] rounded-lg p-6 mb-6">
          <h3 className="text-sm text-[#94a3b8] mb-3">Annual Rainfall — Mecca (mm)</h3>
          <div className="flex items-end gap-3">
            {stats.annualRainfall.map((yr) => {
              const maxMm = Math.max(...stats.annualRainfall.map((y) => y.total_mm))
              const pct = (yr.total_mm / (maxMm || 1)) * 100
              return (
                <div key={yr.year} className="flex flex-col items-center gap-1">
                  <div
                    className="w-10 rounded-t"
                    style={{
                      height: `${Math.max(pct * 1.5, 4)}px`,
                      backgroundColor: '#60a5fa',
                      opacity: 0.7 + (pct / 300),
                    }}
                  />
                  <span className="text-xs text-[#64748b]">{yr.year}</span>
                  <span className="text-xs text-[#94a3b8]">{yr.total_mm.toFixed(0)}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Quick stats row */}
      <div className="grid grid-cols-2 gap-4">
        {stats.temperature.avg && (
          <div className="bg-[#0f1629] border border-[#1e2a4a] rounded-lg p-5">
            <h3 className="text-sm text-[#94a3b8] mb-2">Temperature — Mecca</h3>
            <div className="flex gap-6 text-sm">
              <div>
                <span className="text-[#64748b]">Avg: </span>
                <span className="text-[#e2e8f0]">{stats.temperature.avg}°C</span>
              </div>
              <div>
                <span className="text-[#64748b]">Min: </span>
                <span className="text-[#60a5fa]">{stats.temperature.min}°C</span>
              </div>
              <div>
                <span className="text-[#64748b]">Max: </span>
                <span className="text-[#f87171]">{stats.temperature.max}°C</span>
              </div>
            </div>
          </div>
        )}
        <div className="bg-[#0f1629] border border-[#1e2a4a] rounded-lg p-5">
          <h3 className="text-sm text-[#94a3b8] mb-2">Key Coordinates</h3>
          <div className="text-sm text-[#e2e8f0] space-y-1">
            <div>Zamzam Well: 21.4225°N, 39.8262°E</div>
            <div>Wadi Ibrahim: 21.38–21.46°N, 39.80–39.90°E</div>
          </div>
        </div>
      </div>
    </div>
  )
}
