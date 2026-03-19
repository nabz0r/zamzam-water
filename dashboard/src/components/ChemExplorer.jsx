import { useState, useEffect } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  ResponsiveContainer, ReferenceLine, Cell,
} from 'recharts'
import { api } from '../utils/api'

// WHO drinking water guideline limits (mg/L)
const WHO_LIMITS = {
  Ca: 200, Mg: 150, Na: 200, F: 1.5, Li: null,
  As: 0.01, Pb: 0.01, Cd: 0.003, pH: null, TDS: 1000,
}

const MACRO_ELEMENTS = ['Ca', 'Mg', 'Na', 'TDS']
const MICRO_ELEMENTS = ['F', 'Li', 'As', 'Pb', 'Cd']
const PHYSICAL_PARAMS = ['pH']
const AVAILABLE_ELEMENTS = [...MACRO_ELEMENTS, ...MICRO_ELEMENTS, ...PHYSICAL_PARAMS]
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
          {entry.name}: {entry.value} {entry.payload?.unit || ''}
        </p>
      ))}
    </div>
  )
}

function ChemChart({ title, data, height = 300 }) {
  if (!data || data.length === 0) return null

  const maxWho = Math.max(...data.filter(d => d.whoLimit).map(d => d.whoLimit), 0)
  const maxVal = Math.max(...data.map(d => d.value), 0)
  const yMax = Math.max(maxWho, maxVal) * 1.15

  return (
    <div className="bg-[#0f1629] border border-[#1e2a4a] rounded-lg p-6 mb-6">
      <h3 className="text-sm text-[#94a3b8] mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={{ top: 10, right: 30, bottom: 20, left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e2a4a" />
          <XAxis
            dataKey="element"
            tick={{ fill: '#94a3b8', fontSize: 12 }}
            axisLine={{ stroke: '#2a3358' }}
          />
          <YAxis
            domain={[0, yMax]}
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
            {data.map((entry, i) => (
              <Cell key={entry.element} fill={BAR_COLORS[i % BAR_COLORS.length]} />
            ))}
          </Bar>
          {data.map((entry) =>
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

  // Split selected elements into macro and micro groups
  const allBarData = selected
    .filter((el) => chartData.length > 0 && chartData[0][el] !== undefined)
    .map((el) => {
      const d = details.find((d) => d.element === el)
      return {
        element: el,
        value: chartData[0]?.[el] ?? 0,
        whoLimit: WHO_LIMITS[el],
        unit: d?.unit || 'mg/L',
      }
    })

  const macroData = allBarData.filter((d) => MACRO_ELEMENTS.includes(d.element))
  const microData = allBarData.filter((d) => MICRO_ELEMENTS.includes(d.element) || PHYSICAL_PARAMS.includes(d.element))

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
          {/* Macro elements chart (Ca, Mg, Na, TDS — high values) */}
          {macroData.length > 0 && (
            <ChemChart
              title="Major Elements (mg/L) — Zamzam, Bhardwaj 2023"
              data={macroData}
            />
          )}

          {/* Micro elements chart (F, Li, As, Pb, Cd — small values) */}
          {microData.length > 0 && (
            <ChemChart
              title="Minor / Trace Elements — Zamzam, Bhardwaj 2023"
              data={microData}
              height={280}
            />
          )}

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
