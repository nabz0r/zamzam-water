import { useState, useEffect } from 'react'
import { api } from '../utils/api'

const WHO_LIMITS = {
  pH: { max: 8.5, min: 6.5 }, TDS: { max: 1000 }, Na: { max: 200 }, Ca: { max: 200 },
  Mg: { max: 150 }, Cl: { max: 250 }, SO4: { max: 250 }, NO3: { max: 50 },
  F: { max: 1.5 }, As: { max: 0.01 }, Pb: { max: 0.01 }, Cd: { max: 0.003 },
  Fe: { max: 0.3 }, Cu: { max: 2.0 }, Zn: { max: 3.0 },
}

function WHORow({ element, value, unit }) {
  const who = WHO_LIMITS[element]
  if (!who) return null
  const limit = who.max
  const ratio = limit ? value / limit : null
  let status = 'safe'
  let label = 'Safe'
  if (ratio !== null) {
    if (ratio > 1) { status = 'exceed'; label = 'Exceeds' }
    else if (ratio > 0.8) { status = 'near'; label = 'Near limit' }
  }
  const bg = { safe: 'bg-[#0a2e1a] text-[#34d399]', near: 'bg-[#2e2a0a] text-[#fbbf24]', exceed: 'bg-[#2e0a0a] text-[#f87171]' }
  return (
    <tr className="border-b border-[#1e2a4a]/50">
      <td className="px-4 py-2 text-[#e2e8f0] font-mono">{element}</td>
      <td className="px-4 py-2 text-right font-mono text-[#e2e8f0]">{value}</td>
      <td className="px-4 py-2 text-[#64748b]">{unit}</td>
      <td className="px-4 py-2 text-right font-mono text-[#94a3b8]">{limit || '—'}</td>
      <td className="px-4 py-2 text-right font-mono text-[#94a3b8]">{ratio ? ratio.toFixed(2) : '—'}</td>
      <td className="px-4 py-2 text-center"><span className={`px-2 py-0.5 rounded text-xs ${bg[status]}`}>{label}</span></td>
    </tr>
  )
}

export default function ResearchView() {
  const [zamzamData, setZamzamData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.chemistry.compare(
      ['pH','TDS','Ca','Mg','Na','K','Cl','SO4','HCO3','NO3','F','Fe','Cu','Zn','As','Pb','Cd'],
      ['zamzam']
    ).then((data) => {
      // Merge all zamzam rows into one object
      const merged = {}
      for (const row of data.data) {
        for (const [k, v] of Object.entries(row)) {
          if (k !== 'source' && k !== 'year' && v !== undefined && !merged[k]) merged[k] = v
        }
      }
      setZamzamData(merged)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const findings = [
    { icon: '1', title: 'WHO Compliance', text: 'All health-based parameters within WHO drinking water guidelines. Na slightly above aesthetic threshold (200 mg/L) — taste, not safety.' },
    { icon: '2', title: 'Inter-study Consistency', text: 'CV < 25% for major ions across 5 independent studies (2009–2025). Measurements are reproducible and reliable.' },
    { icon: '3', title: 'Distinctive Mineral Profile', text: 'Na-K-Cl dominant fingerprint — typical of a deep crystalline aquifer. More mineralized than Evian/Volvic, comparable to Vittel/S. Pellegrino.' },
    { icon: '4', title: 'Arsenic Controversy Resolved', text: 'Peer-reviewed ICP-MS data: 0.006–0.013 µg/L (1000x below WHO limit). BBC 2011 tested retail bottles with unaccredited lab.' },
  ]

  const gaps = [
    'Isotopic analysis (δ18O, δ2H, ¹⁴C) for water age and recharge source',
    'Longitudinal temporal monitoring (monthly over 2+ years)',
    'Microbiome characterization (16S rRNA sequencing)',
    'Rare earth elements (REE profile as geochemical tracer)',
    'Organic micropollutants (pharmaceuticals, microplastics)',
  ]

  return (
    <div className="p-8 max-w-5xl">
      <h2 className="text-2xl text-[#e2e8f0] mb-1">Research Overview</h2>
      <p className="text-sm text-[#64748b] mb-8">
        Meta-analysis of Zamzam water chemical composition — 5 peer-reviewed studies, 16 comparison waters, 23+ elements
      </p>

      {/* Key findings */}
      <section className="mb-8">
        <h3 className="text-sm text-[#94a3b8] uppercase tracking-wider mb-4">Key Findings</h3>
        <div className="grid grid-cols-2 gap-4">
          {findings.map((f) => (
            <div key={f.icon} className="bg-[#0f1629] border border-[#1e2a4a] rounded-lg p-5">
              <div className="flex items-start gap-3">
                <span className="shrink-0 w-7 h-7 rounded-full bg-[#1e3a5f] text-[#60a5fa] flex items-center justify-center text-sm font-bold">{f.icon}</span>
                <div>
                  <h4 className="text-sm text-[#e2e8f0] font-medium mb-1">{f.title}</h4>
                  <p className="text-xs text-[#94a3b8] leading-relaxed">{f.text}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* WHO compliance table */}
      <section className="mb-8">
        <h3 className="text-sm text-[#94a3b8] uppercase tracking-wider mb-4">WHO Compliance — Zamzam Water (mean values)</h3>
        {loading ? <p className="text-[#64748b]">Loading...</p> : (
          <div className="bg-[#0f1629] border border-[#1e2a4a] rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#1e2a4a] text-[#64748b] text-xs">
                  <th className="text-left px-4 py-2">Element</th>
                  <th className="text-right px-4 py-2">Value</th>
                  <th className="text-left px-4 py-2">Unit</th>
                  <th className="text-right px-4 py-2">WHO Limit</th>
                  <th className="text-right px-4 py-2">Ratio</th>
                  <th className="text-center px-4 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {Object.keys(WHO_LIMITS).map((el) =>
                  zamzamData[el] !== undefined ? <WHORow key={el} element={el} value={zamzamData[el]} unit="mg/L" /> : null
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Research gaps */}
      <section className="mb-8">
        <h3 className="text-sm text-[#94a3b8] uppercase tracking-wider mb-4">Research Gaps</h3>
        <div className="bg-[#0f1629] border border-[#1e2a4a] rounded-lg p-5">
          <ul className="space-y-2">
            {gaps.map((g, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-[#94a3b8]">
                <span className="text-[#64748b] shrink-0">—</span> {g}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Abstract link */}
      <section>
        <h3 className="text-sm text-[#94a3b8] uppercase tracking-wider mb-4">Draft Paper</h3>
        <div className="bg-[#0f1629] border border-[#1e2a4a] rounded-lg p-5">
          <h4 className="text-sm text-[#e2e8f0] italic leading-snug mb-2">
            "Comprehensive meta-analysis of Zamzam water chemical composition: a multi-source independent assessment"
          </h4>
          <p className="text-xs text-[#64748b]">
            Target: Applied Water Science (Springer) / Heliyon (Elsevier) — Draft in docs/draft_abstract.md
          </p>
        </div>
      </section>
    </div>
  )
}
