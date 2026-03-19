import { useState, useEffect } from 'react'
import { api } from '../utils/api'

const PUBLIC_ANALYSES = [
  { source: 'Evian', type: 'Mineral', year: 2024, lab: 'CARSO (Lyon)', method: 'ICP-MS / IC / FAAS', params: 22, location: 'Evian-les-Bains, France' },
  { source: 'Vittel', type: 'Mineral', year: 2024, lab: 'Nestle Waters QC', method: 'ICP-OES / IC', params: 15, location: 'Vosges, France' },
  { source: 'Volvic', type: 'Mineral', year: 2024, lab: 'Danone Waters QC', method: 'ICP-OES / IC', params: 15, location: 'Puy-de-Dome, France' },
  { source: 'Perrier', type: 'Mineral', year: 2024, lab: 'Nestle Waters QC', method: 'ICP-OES / IC', params: 14, location: 'Vergeze, France' },
  { source: 'San Pellegrino', type: 'Mineral', year: 2024, lab: 'Sanpellegrino QC', method: 'ICP-MS / IC / FAAS', params: 17, location: 'Lombardy, Italy' },
  { source: 'Acqua Panna', type: 'Mineral', year: 2024, lab: 'Sanpellegrino QC', method: 'ICP-OES / IC', params: 14, location: 'Tuscany, Italy' },
  { source: 'Gerolsteiner', type: 'Mineral', year: 2024, lab: 'Gerolsteiner GmbH', method: 'ICP-OES / IC / AAS', params: 16, location: 'Eifel, Germany' },
  { source: 'Luxembourg Tap', type: 'Tap', year: 2024, lab: 'LNS Luxembourg', method: 'ICP-MS / IC', params: 21, location: 'Luxembourg City' },
  { source: 'Paris Tap', type: 'Tap', year: 2024, lab: 'Eau de Paris / ARS', method: 'ICP-MS / IC', params: 21, location: 'Paris, France' },
  { source: 'London Tap', type: 'Tap', year: 2024, lab: 'Thames Water / DWI', method: 'ICP-MS / IC', params: 21, location: 'London, UK' },
]

function PublicAnalysesTable() {
  return (
    <div className="bg-[#0f1629] border border-[#1e2a4a] rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[#1e2a4a] text-[#64748b] text-xs">
            <th className="text-left px-4 py-3 font-medium">Source</th>
            <th className="text-left px-4 py-3 font-medium">Type</th>
            <th className="text-right px-4 py-3 font-medium">Year</th>
            <th className="text-left px-4 py-3 font-medium">Lab</th>
            <th className="text-left px-4 py-3 font-medium">Method</th>
            <th className="text-right px-4 py-3 font-medium">Params</th>
            <th className="text-left px-4 py-3 font-medium">Location</th>
          </tr>
        </thead>
        <tbody>
          {PUBLIC_ANALYSES.map((a) => (
            <tr key={a.source} className="border-b border-[#1e2a4a]/50 hover:bg-[#1a2140]/30">
              <td className="px-4 py-2 text-[#e2e8f0] font-medium">{a.source}</td>
              <td className="px-4 py-2">
                <span className={`px-2 py-0.5 rounded text-xs ${
                  a.type === 'Tap' ? 'bg-[#1e3a5f]/50 text-[#60a5fa]' : 'bg-[#0a2e1a]/50 text-[#34d399]'
                }`}>{a.type}</span>
              </td>
              <td className="px-4 py-2 text-right text-[#94a3b8]">{a.year}</td>
              <td className="px-4 py-2 text-[#94a3b8] text-xs">{a.lab}</td>
              <td className="px-4 py-2 text-[#64748b] text-xs">{a.method}</td>
              <td className="px-4 py-2 text-right text-[#e2e8f0] font-mono">{a.params}</td>
              <td className="px-4 py-2 text-[#64748b] text-xs">{a.location}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="px-4 py-2 border-t border-[#1e2a4a] text-xs text-[#64748b]">
        {PUBLIC_ANALYSES.length} sources — data from official labels, EU regulatory reports, and municipal water quality reports
      </div>
    </div>
  )
}

const STATUS_COLS = [
  { key: 'pending', label: 'Pending', color: '#94a3b8' },
  { key: 'received', label: 'Received', color: '#fbbf24' },
  { key: 'analyzed', label: 'Analyzed', color: '#34d399' },
  { key: 'published', label: 'Published', color: '#60a5fa' },
]

export default function LabTracker() {
  const [samples, setSamples] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    batch_id: '',
    sample_label: '',
    collection_date: '',
    collection_location: 'Masjid Al-Haram, Mecca',
    collector: '',
    transport_method: '',
    notes: '',
  })
  const [loading, setLoading] = useState(true)

  const load = () => {
    api.lab.samples()
      .then((data) => { setSamples(data.samples || []); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(load, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await api.lab.createSample(form)
      setShowForm(false)
      setForm({ batch_id: '', sample_label: '', collection_date: '', collection_location: 'Masjid Al-Haram, Mecca', collector: '', transport_method: '', notes: '' })
      load()
    } catch (err) {
      console.error(err)
    }
  }

  const groupedByStatus = {}
  for (const col of STATUS_COLS) {
    groupedByStatus[col.key] = samples.filter((s) => s.status === col.key)
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl text-[#e2e8f0]">Lab Samples</h2>
          <p className="text-sm text-[#64748b]">Track independent Zamzam water analyses</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-[#1e3a5f] text-[#60a5fa] rounded-lg text-sm hover:bg-[#254a73] transition-colors"
        >
          + New Sample
        </button>
      </div>

      {/* New sample form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-[#0f1629] border border-[#1e2a4a] rounded-lg p-5 mb-6">
          <h3 className="text-sm text-[#94a3b8] mb-4">Register New Sample Batch</h3>
          <div className="grid grid-cols-2 gap-4 mb-4">
            {[
              { key: 'batch_id', label: 'Batch ID', placeholder: 'e.g. ZAM-2026-001' },
              { key: 'sample_label', label: 'Sample Label', placeholder: 'e.g. Zamzam tap water - Mataf east' },
              { key: 'collection_date', label: 'Collection Date', placeholder: 'YYYY-MM-DD', type: 'date' },
              { key: 'collection_location', label: 'Location', placeholder: 'Masjid Al-Haram' },
              { key: 'collector', label: 'Collector', placeholder: 'Name' },
              { key: 'transport_method', label: 'Transport', placeholder: 'e.g. 4°C cooler, HDPE container' },
            ].map(({ key, label, placeholder, type }) => (
              <div key={key}>
                <label className="text-xs text-[#64748b] mb-1 block">{label}</label>
                <input
                  type={type || 'text'}
                  value={form[key]}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  placeholder={placeholder}
                  required={key === 'batch_id' || key === 'sample_label'}
                  className="w-full bg-[#1a2140] border border-[#2a3358] rounded px-3 py-2 text-sm text-[#e2e8f0] placeholder-[#4a5568] focus:outline-none focus:border-[#60a5fa]"
                />
              </div>
            ))}
          </div>
          <div className="mb-4">
            <label className="text-xs text-[#64748b] mb-1 block">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Chain of custody notes, special handling..."
              rows={2}
              className="w-full bg-[#1a2140] border border-[#2a3358] rounded px-3 py-2 text-sm text-[#e2e8f0] placeholder-[#4a5568] focus:outline-none focus:border-[#60a5fa]"
            />
          </div>
          <div className="flex gap-3">
            <button type="submit" className="px-4 py-2 bg-[#1e3a5f] text-[#60a5fa] rounded text-sm hover:bg-[#254a73]">
              Create Sample
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-[#64748b] text-sm">
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Kanban board */}
      {loading ? (
        <p className="text-[#64748b]">Loading samples...</p>
      ) : (
        <div className="grid grid-cols-4 gap-4">
          {STATUS_COLS.map((col) => (
            <div key={col.key} className="bg-[#0f1629]/50 border border-[#1e2a4a] rounded-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-[#1e2a4a] flex items-center gap-2">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: col.color }} />
                <span className="text-sm text-[#e2e8f0]">{col.label}</span>
                <span className="text-xs text-[#64748b] ml-auto">{groupedByStatus[col.key].length}</span>
              </div>
              <div className="p-2 space-y-2 min-h-[200px]">
                {groupedByStatus[col.key].map((s) => (
                  <div key={s.id} className="bg-[#1a2140] rounded p-3 text-xs">
                    <div className="text-[#e2e8f0] font-medium mb-1">{s.batch_id}</div>
                    <div className="text-[#94a3b8]">{s.sample_label}</div>
                    {s.collection_date && (
                      <div className="text-[#64748b] mt-1">{s.collection_date.substring(0, 10)}</div>
                    )}
                  </div>
                ))}
                {groupedByStatus[col.key].length === 0 && (
                  <div className="text-center text-[#4a5568] text-xs py-8">No samples</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Public Reference Analyses */}
      <div className="mt-8 mb-6">
        <h3 className="text-lg text-[#e2e8f0] mb-1">Public Reference Analyses</h3>
        <p className="text-sm text-[#64748b] mb-4">
          Published water quality data from regulatory reports and official labels
        </p>
        <PublicAnalysesTable />
      </div>

      {/* Protocol link */}
      <div className="mt-6 bg-[#0f1629] border border-[#1e2a4a] rounded-lg p-5">
        <h3 className="text-sm text-[#94a3b8] mb-2">Sampling Protocol</h3>
        <p className="text-xs text-[#64748b]">
          See <code className="bg-[#1a2140] px-1.5 py-0.5 rounded">docs/SAMPLING_PROTOCOL.md</code> for
          detailed instructions on sample collection, transport, recommended labs (LIST, SGS, Eurofins),
          and analysis packages (ICP-MS, isotopes, metagenomics). Estimated cost: €3,000–5,000 for full package.
        </p>
      </div>
    </div>
  )
}
