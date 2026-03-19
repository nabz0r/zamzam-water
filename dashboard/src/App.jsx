import { useState, useEffect } from 'react'
import ChemExplorer from './components/ChemExplorer'
import ArchaeoMap from './components/ArchaeoMap'
import PaperSearch from './components/PaperSearch'
import { api } from './utils/api'

const NAV_ITEMS = [
  { key: 'publications', label: 'Publications', icon: '\u{1F4D1}' },
  { key: 'chemistry', label: 'Chemistry', icon: '\u{1F9EA}' },
  { key: 'archaeology', label: 'Archaeology', icon: '\u{1F3DB}' },
  { key: 'satellite', label: 'Satellite', icon: '\u{1F6F0}' },
  { key: 'lab', label: 'Lab', icon: '\u{1F52C}' },
]

function App() {
  const [page, setPage] = useState('publications')
  const [stats, setStats] = useState({ papers: 0, analyses: 0, sites: 0 })

  useEffect(() => {
    Promise.all([
      api.publications.list(1, 1),
      api.chemistry.elements(),
      api.archaeology.sites(),
    ]).then(([pubs, chem, sites]) => {
      setStats({
        papers: pubs.total,
        analyses: chem.elements.reduce((s, e) => s + e.count, 0),
        sites: sites.features.length,
      })
    }).catch(() => {})
  }, [])

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <aside className="w-56 bg-[#0f1629] border-r border-[#1e2a4a] flex flex-col shrink-0">
        <div className="p-5 border-b border-[#1e2a4a]">
          <h1 className="text-lg leading-tight text-[#e2e8f0]">Zamzam Research</h1>
          <p className="text-xs text-[#64748b] mt-1">Hydrochemical Analysis Platform</p>
        </div>
        <nav className="flex-1 py-3">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.key}
              onClick={() => setPage(item.key)}
              className={`w-full text-left px-5 py-2.5 text-sm flex items-center gap-3 transition-colors ${
                page === item.key
                  ? 'bg-[#1a2140] text-[#e2e8f0] border-r-2 border-[#60a5fa]'
                  : 'text-[#94a3b8] hover:bg-[#1a2140]/50 hover:text-[#cbd5e1]'
              }`}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
        {/* Stats footer */}
        <div className="p-4 border-t border-[#1e2a4a] text-xs text-[#64748b] space-y-1">
          <div className="flex justify-between">
            <span>Papers</span>
            <span className="text-[#94a3b8]">{stats.papers}</span>
          </div>
          <div className="flex justify-between">
            <span>Analyses</span>
            <span className="text-[#94a3b8]">{stats.analyses}</span>
          </div>
          <div className="flex justify-between">
            <span>Sites</span>
            <span className="text-[#94a3b8]">{stats.sites}</span>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto bg-[#0a0e1a]">
        {page === 'publications' && <PaperSearch />}
        {page === 'chemistry' && <ChemExplorer />}
        {page === 'archaeology' && <ArchaeoMap />}
        {page === 'satellite' && (
          <div className="p-8 text-[#64748b]">
            <h2 className="text-2xl text-[#e2e8f0] mb-4">Satellite Data</h2>
            <p>Pipeline coming in Sprint 4 — GEE integration for Wadi Ibrahim basin.</p>
          </div>
        )}
        {page === 'lab' && (
          <div className="p-8 text-[#64748b]">
            <h2 className="text-2xl text-[#e2e8f0] mb-4">Lab Samples</h2>
            <p>Upload and tracking interface coming in Sprint 5.</p>
          </div>
        )}
      </main>
    </div>
  )
}

export default App
