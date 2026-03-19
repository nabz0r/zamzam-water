import { useState, useEffect, useCallback } from 'react'
import { api } from '../utils/api'

const TASKS = [
  {
    key: 'ingest',
    label: 'Scrape PubMed',
    desc: 'Search PubMed for Zamzam water papers and store metadata',
    action: () => api.admin.ingestPapers(),
  },
  {
    key: 'hydro',
    label: 'Sync Weather',
    desc: 'Fetch precipitation, temperature, humidity from Open-Meteo',
    action: () => api.admin.syncHydro(),
  },
  {
    key: 'satellite',
    label: 'Fetch Satellite',
    desc: 'Search Planetary Computer for Sentinel-2 scenes over Mecca',
    action: () => api.admin.fetchSatellite(),
  },
  {
    key: 'pdfs',
    label: 'Parse PDFs',
    desc: 'Download open-access PDFs and extract chemical data',
    action: () => api.admin.parsePdfs(),
  },
  {
    key: 'embeddings',
    label: 'Generate Embeddings',
    desc: 'Create pgvector embeddings via Ollama (requires Ollama running)',
    action: () => api.admin.generateEmbeddings(),
  },
]

const TABLE_LABELS = {
  publications: 'Publications',
  chemical_analyses: 'Chemical Analyses',
  satellite_data: 'Satellite Scenes',
  hydro_monitoring: 'Weather Records',
  lab_samples: 'Lab Samples',
  archaeological_sites: 'Archaeological Sites',
}

function TaskButton({ task }) {
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  const run = async () => {
    setRunning(true)
    setResult(null)
    setError(null)
    try {
      const data = await task.action()
      setResult(data)
    } catch (e) {
      setError(e.message)
    }
    setRunning(false)
  }

  return (
    <div className="bg-[#0f1629] border border-[#1e2a4a] rounded-lg p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <h4 className="text-sm text-[#e2e8f0] font-medium">{task.label}</h4>
          <p className="text-xs text-[#64748b] mt-0.5">{task.desc}</p>
        </div>
        <button
          onClick={run}
          disabled={running}
          className={`px-4 py-2 rounded-lg text-sm shrink-0 transition-colors ${
            running
              ? 'bg-[#1a2140] text-[#64748b] cursor-wait'
              : 'bg-[#1e3a5f] text-[#60a5fa] hover:bg-[#254a73]'
          }`}
        >
          {running ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Running...
            </span>
          ) : (
            'Run'
          )}
        </button>
      </div>
      {result && (
        <div className="mt-3 p-2.5 bg-[#0a2e1a] border border-[#1a5a34] rounded text-xs text-[#34d399]">
          {result.status === 'completed' ? 'Done' : result.status}
          {result.records_stored !== undefined && ` — ${result.records_stored} records stored`}
          {result.new_papers !== undefined && ` — ${result.new_papers} new papers`}
          {result.scenes_stored !== undefined && ` — ${result.scenes_stored} scenes stored`}
          {result.pdfs_parsed !== undefined && ` — ${result.pdfs_parsed} PDFs parsed`}
          {result.embeddings_generated !== undefined && ` — ${result.embeddings_generated} embeddings`}
        </div>
      )}
      {error && (
        <div className="mt-3 p-2.5 bg-[#2e0a0a] border border-[#5a1a1a] rounded text-xs text-[#f87171]">
          Error: {error}
        </div>
      )}
    </div>
  )
}

export default function AdminPanel() {
  const [dbStats, setDbStats] = useState(null)
  const [loading, setLoading] = useState(true)

  const loadStats = useCallback(async () => {
    try {
      const data = await api.admin.stats()
      setDbStats(data)
    } catch (e) {
      console.error('Failed to load admin stats:', e)
    }
    setLoading(false)
  }, [])

  useEffect(() => { loadStats() }, [loadStats])

  return (
    <div className="p-8">
      <h2 className="text-2xl text-[#e2e8f0] mb-2">Admin Panel</h2>
      <p className="text-sm text-[#64748b] mb-8">
        Data ingestion controls and database statistics
      </p>

      {/* Data Ingestion */}
      <section className="mb-8">
        <h3 className="text-sm text-[#94a3b8] uppercase tracking-wider mb-4">
          Data Ingestion
        </h3>
        <div className="grid gap-3">
          {TASKS.map((task) => (
            <TaskButton key={task.key} task={task} />
          ))}
        </div>
      </section>

      {/* Database Stats */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm text-[#94a3b8] uppercase tracking-wider">
            Database Stats
          </h3>
          <button
            onClick={loadStats}
            className="text-xs text-[#60a5fa] hover:text-[#93bbfd] transition-colors"
          >
            Refresh
          </button>
        </div>
        {loading ? (
          <p className="text-[#64748b] text-sm">Loading stats...</p>
        ) : dbStats ? (
          <div className="bg-[#0f1629] border border-[#1e2a4a] rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#1e2a4a] text-[#64748b] text-xs">
                  <th className="text-left px-6 py-3 font-medium">Table</th>
                  <th className="text-right px-6 py-3 font-medium">Count</th>
                  <th className="text-right px-6 py-3 font-medium">Last Updated</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(TABLE_LABELS).map(([key, label]) => (
                  <tr
                    key={key}
                    className="border-b border-[#1e2a4a]/50 hover:bg-[#1a2140]/30"
                  >
                    <td className="px-6 py-2.5 text-[#e2e8f0]">{label}</td>
                    <td className="px-6 py-2.5 text-right text-[#e2e8f0] font-mono">
                      {(dbStats.counts[key] || 0).toLocaleString()}
                    </td>
                    <td className="px-6 py-2.5 text-right text-[#94a3b8] text-xs">
                      {dbStats.last_updated[key]
                        ? new Date(dbStats.last_updated[key]).toLocaleDateString('en-GB', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-[#64748b] text-sm">Failed to load stats.</p>
        )}
      </section>
    </div>
  )
}
