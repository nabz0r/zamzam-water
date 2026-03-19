import { useState, useEffect } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  ResponsiveContainer, ReferenceLine, Legend, Cell,
} from 'recharts'
import { api } from '../utils/api'

// WHO drinking water guideline limits (mg/L)
const WHO_LIMITS = {
  Ca: 200, Mg: 150, Na: 200, F: 1.5, Li: null,
  As: 0.01, Pb: 0.01, Cd: 0.003, pH: null, TDS: 1000,
}

const AVAILABLE_ELEMENTS = ['Ca', 'Mg', 'Na', 'F', 'Li', 'As', 'Pb', 'Cd', 'pH', 'TDS']
const DEFAULT_SELECTED = ['Ca', 'Mg', 'Na', 'F', 'Li']

const BAR_COLORS = [
  '#60a5fa', '#34d399', '#fbbf24', '#f87171', '#a78bfa',
  '#22d3ee', '#fb923c', '#e879f9', '#38bdf8', '#4ade80',
]

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#1a2140] border border-[#2a3358] rounded-lg p-3 text-xs">
      <p className="text-[#e2e8f0] font-medium mb-1">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} style={{ color: entry.color }}>
          {entry.name}: {entry.value}
        </p>
      ))}
    </div>
  )
}

export default function ChemExplorer() {
  const [selected, setSelected] = useState(DEFAULT_SELECTED)
  const [chartData, setChartData] = useState([])
  const [details, setDetails] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (selected.length === 0) return
    setLoading(true)
    api.chemistry.compare(selected).then((data) => {
      setChartData(data.data)
      // Also fetch individual element details
      return Promise.all(selected.map((el) => api.chemistry.byElement(el)))
    }).then((results) => {
      const all = results.flatMap((r) => r.measurements.map((m) => ({ ...m, element: r.element })))
      setDetails(all)
      setLoading(false)
    }).catch((e) => {
      console.error(e)
      setLoading(false)
    })
  }, [selected])

  const toggleElement = (el) => {
    setSelected((prev) =>
      prev.includes(el) ? prev.filter((e) => e !== el) : [...prev, el]
    )
  }

  // Build chart data: one bar per element with its value
  const barData = selected
    .filter((el) => chartData.length > 0 && chartData[0][el] !== undefined)
    .map((el) => ({
      element: el,
      value: chartData[0]?.[el] ?? 0,
      whoLimit: WHO_LIMITS[el],
    }))

  return (
    <div className="p-8">
      <h2 className="text-2xl text-[#e2e8f0] mb-2">Chemistry Explorer</h2>
      <p className="text-sm text-[#64748b] mb-6">
        Zamzam water composition — published analyses
      </p>

      {/* Element selector */}
      <div className="flex flex-wrap gap-2 mb-6">
        {AVAILABLE_ELEMENTS.map((el) => (
          <button
            key={el}
            onClick={() => toggleElement(el)}
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
              selected.includes(el)
                ? 'bg-[#1e3a5f] text-[#60a5fa] border border-[#60a5fa]/30'
                : 'bg-[#1a2140] text-[#64748b] border border-[#2a3358] hover:text-[#94a3b8]'
            }`}
          >
            {el}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-[#64748b]">Loading chart data...</p>
      ) : (
        <>
          {/* Bar chart */}
          <div className="bg-[#0f1629] border border-[#1e2a4a] rounded-lg p-6 mb-6">
            <h3 className="text-sm text-[#94a3b8] mb-4">
              Concentration by Element (Zamzam, Bhardwaj 2023)
            </h3>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={barData} margin={{ top: 10, right: 30, bottom: 20, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e2a4a" />
                <XAxis
                  dataKey="element"
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                  axisLine={{ stroke: '#2a3358' }}
                />
                <YAxis
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                  axisLine={{ stroke: '#2a3358' }}
                  label={{
                    value: 'Concentration',
                    angle: -90,
                    position: 'insideLeft',
                    fill: '#64748b',
                    fontSize: 12,
                  }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" name="Zamzam" radius={[4, 4, 0, 0]}>
                  {barData.map((entry, i) => (
                    <Cell key={entry.element} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                  ))}
                </Bar>
                {/* WHO limit reference lines */}
                {barData.map((entry) =>
                  entry.whoLimit ? (
                    <ReferenceLine
                      key={`who-${entry.element}`}
                      y={entry.whoLimit}
                      stroke="#f87171"
                      strokeDasharray="6 3"
                      strokeWidth={1.5}
                    />
                  ) : null
                )}
              </BarChart>
            </ResponsiveContainer>
            <div className="flex items-center gap-4 mt-2 text-xs text-[#64748b]">
              <span className="flex items-center gap-1.5">
                <span className="w-4 h-0.5 bg-[#f87171] inline-block" style={{ borderTop: '2px dashed #f87171' }} />
                WHO guideline limit
              </span>
            </div>
          </div>

          {/* Details table */}
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
                  <th className="text-left px-6 py-3 font-medium">Method</th>
                  <th className="text-left px-6 py-3 font-medium">Source</th>
                  <th className="text-right px-6 py-3 font-medium">Year</th>
                </tr>
              </thead>
              <tbody>
                {details.map((d, i) => (
                  <tr
                    key={i}
                    className="border-b border-[#1e2a4a]/50 hover:bg-[#1a2140]/30"
                  >
                    <td className="px-6 py-2.5 text-[#e2e8f0] font-mono">{d.element}</td>
                    <td className="px-6 py-2.5 text-right text-[#e2e8f0] font-mono">{d.value}</td>
                    <td className="px-6 py-2.5 text-[#94a3b8]">{d.unit}</td>
                    <td className="px-6 py-2.5 text-[#94a3b8]">{d.analytical_method || '—'}</td>
                    <td className="px-6 py-2.5 text-[#64748b]">{d.source}</td>
                    <td className="px-6 py-2.5 text-right text-[#94a3b8]">{d.publication_year || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
