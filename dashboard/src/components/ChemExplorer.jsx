import { useState, useEffect } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  ResponsiveContainer, ReferenceLine, Cell, Legend,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from 'recharts'
import { api } from '../utils/api'

// WHO drinking water guideline limits (mg/L)
const WHO_LIMITS = {
  pH: { min: 6.5, max: 8.5, unit: '-' },
  TDS: { max: 1000, unit: 'mg/L' },
  Na: { max: 200, unit: 'mg/L' },
  Ca: { max: 200, unit: 'mg/L' },
  Mg: { max: 150, unit: 'mg/L' },
  K: { max: null, unit: 'mg/L' },
  Cl: { max: 250, unit: 'mg/L' },
  SO4: { max: 250, unit: 'mg/L' },
  NO3: { max: 50, unit: 'mg/L' },
  F: { max: 1.5, unit: 'mg/L' },
  As: { max: 0.01, unit: 'mg/L' },
  Pb: { max: 0.01, unit: 'mg/L' },
  Cd: { max: 0.003, unit: 'mg/L' },
  Fe: { max: 0.3, unit: 'mg/L' },
  Cu: { max: 2.0, unit: 'mg/L' },
  Zn: { max: 3.0, unit: 'mg/L' },
  Mn: { max: 0.4, unit: 'mg/L' },
  Cr: { max: 0.05, unit: 'mg/L' },
  Li: { max: null, unit: 'mg/L' },
  HCO3: { max: null, unit: 'mg/L' },
}

const MACRO_ELEMENTS = ['Ca', 'Mg', 'Na', 'K', 'TDS']
const ANIONS = ['Cl', 'SO4', 'HCO3', 'NO3', 'F']
const TRACE_ELEMENTS = ['Fe', 'Cu', 'Zn', 'Li', 'As', 'Pb', 'Cd', 'Mn', 'Cr', 'Sr', 'Ba', 'Ni']
const PHYSICAL = ['pH', 'EC', 'SiO2']

const SOURCE_COLORS = {
  zamzam: '#60a5fa',
  evian: '#34d399',
  vittel: '#fbbf24',
  volvic: '#a78bfa',
  san_pellegrino: '#fb923c',
  perrier: '#22d3ee',
  gerolsteiner: '#e879f9',
  fiji: '#4ade80',
  acqua_panna: '#f97316',
  highland_spring: '#14b8a6',
  spa_reine: '#c084fc',
  luxembourg_tap: '#f43f5e',
}

const SOURCE_LABELS = {
  zamzam: 'Zamzam',
  evian: 'Evian',
  vittel: 'Vittel',
  volvic: 'Volvic',
  san_pellegrino: 'S. Pellegrino',
  perrier: 'Perrier',
  gerolsteiner: 'Gerolsteiner',
  fiji: 'Fiji',
  acqua_panna: 'Acqua Panna',
  highland_spring: 'Highland Sp.',
  spa_reine: 'Spa Reine',
  luxembourg_tap: 'Lux. Tap',
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#1a2140] border border-[#2a3358] rounded-lg p-3 text-xs">
      <p className="text-[#e2e8f0] font-medium mb-1">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} style={{ color: entry.fill || entry.color }}>
          {entry.name}: {entry.value} {entry.payload?.unit || ''}
        </p>
      ))}
    </div>
  )
}

function ComparisonChart({ title, elements, compareData, selectedSources }) {
  // Build grouped bar data: one row per element, one bar per source
  const chartData = elements
    .filter((el) => compareData.some((d) => d[el] !== undefined))
    .map((el) => {
      const row = { element: el }
      for (const d of compareData) {
        if (d[el] !== undefined) {
          row[d.source] = d[el]
        }
      }
      return row
    })

  if (chartData.length === 0) return null

  return (
    <div className="bg-[#0f1629] border border-[#1e2a4a] rounded-lg p-6 mb-6">
      <h3 className="text-sm text-[#94a3b8] mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={chartData} margin={{ top: 10, right: 30, bottom: 20, left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e2a4a" />
          <XAxis dataKey="element" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={{ stroke: '#2a3358' }} />
          <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={{ stroke: '#2a3358' }} />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontSize: 12, color: '#94a3b8' }} />
          {selectedSources.map((src) => (
            <Bar
              key={src}
              dataKey={src}
              name={SOURCE_LABELS[src] || src}
              fill={SOURCE_COLORS[src] || '#94a3b8'}
              radius={[3, 3, 0, 0]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

function WHOTable({ compareData }) {
  // Get Zamzam data (latest study = bhardwaj_2023 or average)
  const zamzamRows = compareData.filter((d) => d.source === 'zamzam')
  if (zamzamRows.length === 0) return null

  // Merge all zamzam measurements into one object (take first found per element)
  const zamzamVals = {}
  for (const row of zamzamRows) {
    for (const [key, val] of Object.entries(row)) {
      if (key !== 'source' && key !== 'year' && val !== undefined && !zamzamVals[key]) {
        zamzamVals[key] = val
      }
    }
  }

  const elements = Object.keys(zamzamVals).filter((k) => WHO_LIMITS[k])

  return (
    <div className="bg-[#0f1629] border border-[#1e2a4a] rounded-lg overflow-hidden mb-6">
      <h3 className="text-sm text-[#94a3b8] px-6 py-4 border-b border-[#1e2a4a]">
        WHO Compliance — Zamzam Water
      </h3>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[#1e2a4a] text-[#64748b] text-xs">
            <th className="text-left px-6 py-3 font-medium">Element</th>
            <th className="text-right px-6 py-3 font-medium">Zamzam Value</th>
            <th className="text-right px-6 py-3 font-medium">WHO Limit</th>
            <th className="text-center px-6 py-3 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {elements.map((el) => {
            const val = zamzamVals[el]
            const who = WHO_LIMITS[el]
            let status = 'ok'
            let statusLabel = 'OK'
            if (who.max !== null && who.max !== undefined) {
              if (val > who.max) {
                status = 'exceed'
                statusLabel = 'Exceeds'
              } else if (val > who.max * 0.8) {
                status = 'warn'
                statusLabel = 'Near limit'
              }
            }
            if (who.min !== undefined && val < who.min) {
              status = 'exceed'
              statusLabel = 'Below min'
            }
            if (who.max === null && who.min === undefined) {
              status = 'na'
              statusLabel = 'No limit'
            }

            const statusColors = {
              ok: 'text-[#34d399] bg-[#0a2e1a]',
              warn: 'text-[#fbbf24] bg-[#2e2a0a]',
              exceed: 'text-[#f87171] bg-[#2e0a0a]',
              na: 'text-[#64748b] bg-[#1a2140]',
            }

            return (
              <tr key={el} className="border-b border-[#1e2a4a]/50 hover:bg-[#1a2140]/30">
                <td className="px-6 py-2.5 text-[#e2e8f0] font-mono">{el}</td>
                <td className="px-6 py-2.5 text-right text-[#e2e8f0] font-mono">{val}</td>
                <td className="px-6 py-2.5 text-right text-[#94a3b8] font-mono">
                  {who.max !== null ? who.max : '—'}
                  {who.min !== undefined && ` (min: ${who.min})`}
                </td>
                <td className="px-6 py-2.5 text-center">
                  <span className={`px-2 py-0.5 rounded text-xs ${statusColors[status]}`}>
                    {statusLabel}
                  </span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

const RADAR_ELEMENTS = ['Ca', 'Mg', 'Na', 'K', 'Cl', 'SO4', 'HCO3', 'F']

function RadarFingerprint({ compareData, selectedSources }) {
  // Build per-source values for radar elements
  const sourceVals = {}
  for (const src of selectedSources) {
    const rows = compareData.filter((d) => d.source === src)
    const merged = {}
    for (const row of rows) {
      for (const [k, v] of Object.entries(row)) {
        if (k !== 'source' && k !== 'year' && v !== undefined) merged[k] = v
      }
    }
    sourceVals[src] = merged
  }

  // Normalize: find max per element across selected sources
  const maxPerEl = {}
  for (const el of RADAR_ELEMENTS) {
    maxPerEl[el] = Math.max(...selectedSources.map((s) => sourceVals[s]?.[el] || 0), 1)
  }

  const radarData = RADAR_ELEMENTS.map((el) => {
    const row = { element: el }
    for (const src of selectedSources) {
      row[src] = ((sourceVals[src]?.[el] || 0) / maxPerEl[el]) * 100
    }
    return row
  })

  if (selectedSources.length === 0) return null

  return (
    <div className="bg-[#0f1629] border border-[#1e2a4a] rounded-lg p-6 mb-6">
      <h3 className="text-sm text-[#94a3b8] mb-4">Mineral Fingerprint (normalized radar)</h3>
      <ResponsiveContainer width="100%" height={380}>
        <RadarChart data={radarData}>
          <PolarGrid stroke="#2a3358" />
          <PolarAngleAxis dataKey="element" tick={{ fill: '#94a3b8', fontSize: 12 }} />
          <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
          {selectedSources.map((src) => (
            <Radar
              key={src}
              name={SOURCE_LABELS[src] || src}
              dataKey={src}
              stroke={SOURCE_COLORS[src] || '#94a3b8'}
              fill={SOURCE_COLORS[src] || '#94a3b8'}
              fillOpacity={src === 'zamzam' ? 0.15 : 0.05}
              strokeWidth={src === 'zamzam' ? 2.5 : 1.5}
            />
          ))}
          <Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />
          <Tooltip />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  )
}

function Heatmap({ compareData, selectedSources }) {
  const elements = ['Ca', 'Mg', 'Na', 'K', 'Cl', 'SO4', 'HCO3', 'F', 'TDS']

  // Build matrix
  const matrix = []
  for (const src of selectedSources) {
    const rows = compareData.filter((d) => d.source === src)
    const merged = {}
    for (const row of rows) {
      for (const [k, v] of Object.entries(row)) {
        if (k !== 'source' && k !== 'year' && v !== undefined) merged[k] = v
      }
    }
    matrix.push({ source: src, ...merged })
  }

  // Max per element for normalization
  const maxPerEl = {}
  for (const el of elements) {
    maxPerEl[el] = Math.max(...matrix.map((r) => r[el] || 0), 1)
  }

  if (selectedSources.length < 2) return null

  return (
    <div className="bg-[#0f1629] border border-[#1e2a4a] rounded-lg p-6 mb-6">
      <h3 className="text-sm text-[#94a3b8] mb-4">Concentration Heatmap (normalized per element)</h3>
      <div className="overflow-x-auto">
        <table className="text-xs">
          <thead>
            <tr>
              <th className="px-3 py-2 text-left text-[#64748b]">Source</th>
              {elements.map((el) => (
                <th key={el} className="px-3 py-2 text-center text-[#94a3b8] font-mono">{el}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matrix.map((row) => (
              <tr key={row.source}>
                <td className="px-3 py-1.5 text-[#e2e8f0] whitespace-nowrap">
                  <span className="inline-block w-2 h-2 rounded-full mr-1.5"
                    style={{ backgroundColor: SOURCE_COLORS[row.source] || '#666' }} />
                  {SOURCE_LABELS[row.source] || row.source}
                </td>
                {elements.map((el) => {
                  const val = row[el]
                  const norm = val ? val / maxPerEl[el] : 0
                  const r = Math.round(norm * 220 + 35)
                  const g = Math.round((1 - norm) * 100 + 30)
                  const b = Math.round((1 - norm) * 60 + 30)
                  return (
                    <td key={el} className="px-3 py-1.5 text-center font-mono"
                      style={{
                        backgroundColor: val ? `rgba(${r}, ${g}, ${b}, 0.3)` : 'transparent',
                        color: norm > 0.6 ? '#fbbf24' : '#94a3b8',
                      }}>
                      {val != null ? (val >= 1 ? val.toFixed(0) : val.toFixed(2)) : '—'}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function ChemExplorer() {
  const [availableSources, setAvailableSources] = useState([])
  const [selectedSources, setSelectedSources] = useState(['zamzam'])
  const [compareData, setCompareData] = useState([])
  const [details, setDetails] = useState([])
  const [loading, setLoading] = useState(true)

  // Load available sources on mount
  useEffect(() => {
    api.chemistry.sources().then((data) => {
      setAvailableSources(data.sources.map((s) => s.source))
    }).catch(console.error)
  }, [])

  // Load comparison data when sources change
  useEffect(() => {
    if (selectedSources.length === 0) return
    setLoading(true)
    const allElements = [...MACRO_ELEMENTS, ...ANIONS, ...TRACE_ELEMENTS, ...PHYSICAL]
    api.chemistry.compare(allElements, selectedSources).then((data) => {
      setCompareData(data.data)
      // Fetch details for table
      return Promise.all(
        allElements.slice(0, 10).map((el) => api.chemistry.byElement(el).catch(() => null))
      )
    }).then((results) => {
      const all = results
        .filter(Boolean)
        .flatMap((r) => r.measurements
          .filter((m) => selectedSources.includes(m.sample_source))
          .map((m) => ({ ...m, element: r.element }))
        )
      setDetails(all)
      setLoading(false)
    }).catch((e) => {
      console.error(e)
      setLoading(false)
    })
  }, [selectedSources])

  const toggleSource = (src) => {
    setSelectedSources((prev) =>
      prev.includes(src) ? prev.filter((s) => s !== src) : [...prev, src]
    )
  }

  const isComparison = selectedSources.length > 1

  return (
    <div className="p-8">
      <h2 className="text-2xl text-[#e2e8f0] mb-2">Chemistry Explorer</h2>
      <p className="text-sm text-[#64748b] mb-6">
        {isComparison ? 'Comparing water sources' : 'Zamzam water composition — published analyses'}
      </p>

      {/* Source selector */}
      <div className="mb-6">
        <p className="text-xs text-[#64748b] mb-2">Water Sources</p>
        <div className="flex flex-wrap gap-2">
          {availableSources.map((src) => (
            <button
              key={src}
              onClick={() => toggleSource(src)}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                selectedSources.includes(src)
                  ? 'border text-[#e2e8f0]'
                  : 'bg-[#1a2140] text-[#64748b] border border-[#2a3358] hover:text-[#94a3b8]'
              }`}
              style={selectedSources.includes(src) ? {
                backgroundColor: (SOURCE_COLORS[src] || '#60a5fa') + '20',
                borderColor: (SOURCE_COLORS[src] || '#60a5fa') + '60',
                color: SOURCE_COLORS[src] || '#60a5fa',
              } : undefined}
            >
              {SOURCE_LABELS[src] || src}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="text-[#64748b]">Loading chart data...</p>
      ) : (
        <>
          {/* Major elements chart */}
          <ComparisonChart
            title="Major Elements (mg/L)"
            elements={MACRO_ELEMENTS}
            compareData={compareData}
            selectedSources={selectedSources}
          />

          {/* Anions chart */}
          <ComparisonChart
            title="Anions (mg/L)"
            elements={ANIONS}
            compareData={compareData}
            selectedSources={selectedSources}
          />

          {/* Radar fingerprint */}
          {selectedSources.length >= 1 && (
            <RadarFingerprint compareData={compareData} selectedSources={selectedSources} />
          )}

          {/* Heatmap */}
          <Heatmap compareData={compareData} selectedSources={selectedSources} />

          {/* Trace elements (only if zamzam selected — others don't have trace data) */}
          {selectedSources.includes('zamzam') && (
            <ComparisonChart
              title="Trace Elements"
              elements={TRACE_ELEMENTS}
              compareData={compareData}
              selectedSources={selectedSources}
            />
          )}

          {/* WHO Compliance table */}
          <WHOTable compareData={compareData} />

          {/* Details table */}
          {details.length > 0 && (
            <div className="bg-[#0f1629] border border-[#1e2a4a] rounded-lg overflow-hidden">
              <h3 className="text-sm text-[#94a3b8] px-6 py-4 border-b border-[#1e2a4a]">
                Measurement Details
              </h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#1e2a4a] text-[#64748b] text-xs">
                    <th className="text-left px-6 py-3 font-medium">Element</th>
                    <th className="text-right px-6 py-3 font-medium">Value</th>
                    <th className="text-left px-6 py-3 font-medium">Unit</th>
                    <th className="text-left px-6 py-3 font-medium">Source</th>
                    <th className="text-left px-6 py-3 font-medium">Method</th>
                    <th className="text-left px-6 py-3 font-medium">Study</th>
                    <th className="text-right px-6 py-3 font-medium">Year</th>
                  </tr>
                </thead>
                <tbody>
                  {details.map((d, i) => (
                    <tr key={i} className="border-b border-[#1e2a4a]/50 hover:bg-[#1a2140]/30">
                      <td className="px-6 py-2.5 text-[#e2e8f0] font-mono">{d.element}</td>
                      <td className="px-6 py-2.5 text-right text-[#e2e8f0] font-mono">{d.value}</td>
                      <td className="px-6 py-2.5 text-[#94a3b8]">{d.unit}</td>
                      <td className="px-6 py-2.5 text-[#94a3b8]">
                        <span
                          className="inline-block w-2 h-2 rounded-full mr-1.5"
                          style={{ backgroundColor: SOURCE_COLORS[d.sample_source] || '#64748b' }}
                        />
                        {SOURCE_LABELS[d.sample_source] || d.sample_source}
                      </td>
                      <td className="px-6 py-2.5 text-[#64748b] text-xs">{d.analytical_method || '—'}</td>
                      <td className="px-6 py-2.5 text-[#64748b] text-xs truncate max-w-[200px]">{d.notes || '—'}</td>
                      <td className="px-6 py-2.5 text-right text-[#94a3b8]">{d.publication_year || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}
