import { useState, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import { api } from '../utils/api'

// Custom marker icons by evidence status
const statusColors = {
  confirmed: '#34d399',
  partial: '#fbbf24',
  investigation: '#fb923c',
  unlocated: '#f87171',
}

const statusLabels = {
  confirmed: 'Confirmed',
  partial: 'Partially confirmed',
  investigation: 'Under investigation',
  unlocated: 'Not yet located',
}

function createIcon(status) {
  const color = statusColors[status] || '#94a3b8'
  return L.divIcon({
    className: '',
    html: `<div style="
      width: 14px; height: 14px;
      background: ${color};
      border: 2px solid #0f1629;
      border-radius: 50%;
      box-shadow: 0 0 6px ${color}80;
    "></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
    popupAnchor: [0, -10],
  })
}

function StatusBadge({ status }) {
  const color = statusColors[status] || '#94a3b8'
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs"
      style={{ backgroundColor: color + '20', color }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{ backgroundColor: color }}
      />
      {statusLabels[status] || status}
    </span>
  )
}

export default function ArchaeoMap() {
  const [sites, setSites] = useState([])
  const [selectedSite, setSelectedSite] = useState(null)
  const [filterStatus, setFilterStatus] = useState('all')

  useEffect(() => {
    api.archaeology.sites().then((data) => {
      setSites(data.features)
    }).catch(console.error)
  }, [])

  const filteredSites = filterStatus === 'all'
    ? sites
    : sites.filter((s) => s.properties.evidence_status === filterStatus)

  const validSites = filteredSites.filter((s) => s.geometry)

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <div className="w-80 bg-[#0f1629] border-r border-[#1e2a4a] flex flex-col overflow-hidden shrink-0">
        <div className="p-4 border-b border-[#1e2a4a]">
          <h2 className="text-lg text-[#e2e8f0] mb-3">Quranic Sites</h2>
          {/* Status filter */}
          <div className="flex flex-wrap gap-1.5">
            {['all', 'confirmed', 'partial', 'investigation', 'unlocated'].map((s) => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`px-2.5 py-1 rounded text-xs transition-colors ${
                  filterStatus === s
                    ? 'bg-[#1e3a5f] text-[#60a5fa]'
                    : 'bg-[#1a2140] text-[#64748b] hover:text-[#94a3b8]'
                }`}
              >
                {s === 'all' ? 'All' : statusLabels[s]}
              </button>
            ))}
          </div>
        </div>
        {/* Sites list */}
        <div className="flex-1 overflow-y-auto">
          {filteredSites.map((site, i) => {
            const p = site.properties
            return (
              <button
                key={i}
                onClick={() => setSelectedSite(site)}
                className={`w-full text-left p-3 border-b border-[#1e2a4a]/50 hover:bg-[#1a2140]/50 transition-colors ${
                  selectedSite === site ? 'bg-[#1a2140]' : ''
                }`}
              >
                <div className="text-sm text-[#e2e8f0]">{p.name_en}</div>
                {p.name_ar && (
                  <div className="text-xs text-[#64748b] mt-0.5" dir="rtl">{p.name_ar}</div>
                )}
                <div className="flex items-center gap-2 mt-1.5">
                  <StatusBadge status={p.evidence_status} />
                  {p.country && (
                    <span className="text-xs text-[#64748b]">{p.country}</span>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Map */}
      <div className="flex-1 relative">
        <MapContainer
          center={[25, 40]}
          zoom={5}
          className="h-full w-full"
          zoomControl={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://carto.com">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />
          {validSites.map((site, i) => {
            const p = site.properties
            const [lng, lat] = site.geometry.coordinates
            return (
              <Marker
                key={i}
                position={[lat, lng]}
                icon={createIcon(p.evidence_status)}
                eventHandlers={{
                  click: () => setSelectedSite(site),
                }}
              >
                <Popup>
                  <div style={{ color: '#1a1a2e', minWidth: 200 }}>
                    <strong>{p.name_en}</strong>
                    {p.name_ar && <div style={{ direction: 'rtl', fontSize: 13 }}>{p.name_ar}</div>}
                    {p.quranic_name && (
                      <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
                        Quranic: {p.quranic_name}
                      </div>
                    )}
                    {p.surah_refs && (
                      <div style={{ fontSize: 12, color: '#666' }}>
                        Refs: {p.surah_refs}
                      </div>
                    )}
                    {p.description && (
                      <div style={{ fontSize: 12, marginTop: 6 }}>
                        {p.description}
                      </div>
                    )}
                  </div>
                </Popup>
              </Marker>
            )
          })}
          {selectedSite?.geometry && (
            <FlyToSite coords={selectedSite.geometry.coordinates} />
          )}
        </MapContainer>

        {/* Legend */}
        <div className="absolute bottom-4 right-4 bg-[#0f1629]/90 border border-[#1e2a4a] rounded-lg p-3 text-xs z-[1000]">
          {Object.entries(statusLabels).map(([key, label]) => (
            <div key={key} className="flex items-center gap-2 mb-1 last:mb-0">
              <span
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: statusColors[key] }}
              />
              <span className="text-[#94a3b8]">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function FlyToSite({ coords }) {
  const map = useMap()
  useEffect(() => {
    if (coords) {
      map.flyTo([coords[1], coords[0]], 8, { duration: 1.5 })
    }
  }, [coords, map])
  return null
}
