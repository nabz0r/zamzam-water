import { useState, useEffect } from 'react'
import { MapContainer, TileLayer, Rectangle, Popup, useMap } from 'react-leaflet'
import { api } from '../utils/api'

// Wadi Ibrahim bounding box
const WADI_BBOX = [[21.38, 39.80], [21.46, 39.90]]
const KAABA_CENTER = [21.4225, 39.8262]

// Parse WKT POLYGON to Leaflet bounds
function parseBboxWkt(wkt) {
  if (!wkt) return null
  const match = wkt.match(/POLYGON\(\(([\d\s.,\-]+)\)\)/)
  if (!match) return null
  const coords = match[1].split(',').map((p) => {
    const [lng, lat] = p.trim().split(' ').map(Number)
    return [lat, lng]
  })
  if (coords.length < 4) return null
  const lats = coords.map((c) => c[0])
  const lngs = coords.map((c) => c[1])
  return [
    [Math.min(...lats), Math.min(...lngs)],
    [Math.max(...lats), Math.max(...lngs)],
  ]
}

const LAYER_OPTIONS = [
  { key: 'osm', label: 'OpenStreetMap', url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png' },
  { key: 'satellite', label: 'Satellite (ESRI)', url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}' },
  { key: 'dark', label: 'Dark', url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png' },
]

export default function SatelliteViewer() {
  const [scenes, setScenes] = useState([])
  const [stats, setStats] = useState(null)
  const [selectedScene, setSelectedScene] = useState(null)
  const [selectedDateIdx, setSelectedDateIdx] = useState(0)
  const [layer, setLayer] = useState('satellite')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.satellite.scenes(),
      api.satellite.stats(),
    ]).then(([scenesData, statsData]) => {
      setScenes(scenesData.scenes || [])
      setStats(statsData)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const currentLayer = LAYER_OPTIONS.find((l) => l.key === layer)

  return (
    <div className="flex h-full">
      {/* Left panel */}
      <div className="w-80 bg-[#0f1629] border-r border-[#1e2a4a] flex flex-col overflow-hidden shrink-0">
        <div className="p-4 border-b border-[#1e2a4a]">
          <h2 className="text-lg text-[#e2e8f0] mb-2">Satellite Data</h2>
          <p className="text-xs text-[#64748b]">Wadi Ibrahim basin — Sentinel-2 L2A</p>

          {stats && (
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div className="bg-[#1a2140] rounded p-2">
                <div className="text-[#64748b]">Scenes</div>
                <div className="text-[#e2e8f0] text-lg">{stats.total_scenes}</div>
              </div>
              <div className="bg-[#1a2140] rounded p-2">
                <div className="text-[#64748b]">Avg Cloud</div>
                <div className="text-[#e2e8f0] text-lg">{stats.avg_cloud_cover ?? '—'}%</div>
              </div>
            </div>
          )}
        </div>

        {/* Layer switcher */}
        <div className="p-3 border-b border-[#1e2a4a]">
          <div className="text-xs text-[#64748b] mb-2">Base Layer</div>
          <div className="flex gap-1.5">
            {LAYER_OPTIONS.map((l) => (
              <button
                key={l.key}
                onClick={() => setLayer(l.key)}
                className={`px-2.5 py-1 rounded text-xs transition-colors ${
                  layer === l.key
                    ? 'bg-[#1e3a5f] text-[#60a5fa]'
                    : 'bg-[#1a2140] text-[#64748b] hover:text-[#94a3b8]'
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>

        {/* Scenes list */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <p className="p-4 text-sm text-[#64748b]">Loading scenes...</p>
          ) : scenes.length === 0 ? (
            <div className="p-4 text-sm text-[#64748b]">
              <p>No scenes yet.</p>
              <p className="mt-2 text-xs">
                Run <code className="bg-[#1a2140] px-1 rounded">POST /api/v1/tasks/fetch-satellite</code> to
                search Planetary Computer for Sentinel-2 scenes.
              </p>
            </div>
          ) : (
            scenes.map((scene, i) => {
              const date = scene.acquisition_date?.substring(0, 10) || '—'
              return (
                <button
                  key={scene.id}
                  onClick={() => { setSelectedScene(scene); setSelectedDateIdx(i) }}
                  className={`w-full text-left p-3 border-b border-[#1e2a4a]/50 hover:bg-[#1a2140]/50 transition-colors ${
                    selectedScene?.id === scene.id ? 'bg-[#1a2140]' : ''
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-[#e2e8f0]">{date}</span>
                    <span className="text-xs text-[#64748b]">
                      {scene.cloud_cover?.toFixed(1)}% cloud
                    </span>
                  </div>
                  <div className="text-xs text-[#64748b] mt-1">
                    {scene.satellite} &middot; {scene.resolution_m}m
                  </div>
                </button>
              )
            })
          )}
        </div>

        {/* Timeline slider */}
        {scenes.length > 1 && (
          <div className="p-3 border-t border-[#1e2a4a]">
            <div className="text-xs text-[#64748b] mb-1">Timeline</div>
            <input
              type="range"
              min={0}
              max={scenes.length - 1}
              value={selectedDateIdx}
              onChange={(e) => {
                const idx = parseInt(e.target.value)
                setSelectedDateIdx(idx)
                setSelectedScene(scenes[idx])
              }}
              className="w-full accent-[#60a5fa]"
            />
            <div className="flex justify-between text-xs text-[#64748b] mt-1">
              <span>{scenes[scenes.length - 1]?.acquisition_date?.substring(0, 10)}</span>
              <span>{scenes[0]?.acquisition_date?.substring(0, 10)}</span>
            </div>
          </div>
        )}
      </div>

      {/* Map */}
      <div className="flex-1 relative">
        <MapContainer
          center={KAABA_CENTER}
          zoom={14}
          className="h-full w-full"
          zoomControl={false}
        >
          <TileLayer
            attribution="&copy; contributors"
            url={currentLayer.url}
          />
          {/* Wadi Ibrahim basin outline */}
          <Rectangle
            bounds={WADI_BBOX}
            pathOptions={{
              color: '#60a5fa',
              weight: 2,
              fillOpacity: 0.05,
              dashArray: '6 4',
            }}
          >
            <Popup>
              <div style={{ color: '#1a1a2e' }}>
                <strong>Wadi Ibrahim Basin</strong>
                <div style={{ fontSize: 12 }}>
                  Target study area for hydrogeological analysis
                </div>
              </div>
            </Popup>
          </Rectangle>
          {/* Scene footprints */}
          {scenes.map((scene) => {
            const bounds = parseBboxWkt(scene.bbox_wkt)
            if (!bounds) return null
            const isSelected = selectedScene?.id === scene.id
            return (
              <Rectangle
                key={scene.id}
                bounds={bounds}
                pathOptions={{
                  color: isSelected ? '#fbbf24' : '#34d399',
                  weight: isSelected ? 3 : 1,
                  fillOpacity: isSelected ? 0.15 : 0.03,
                }}
                eventHandlers={{
                  click: () => setSelectedScene(scene),
                }}
              >
                <Popup>
                  <div style={{ color: '#1a1a2e', fontSize: 12 }}>
                    <strong>{scene.acquisition_date?.substring(0, 10)}</strong>
                    <div>Cloud: {scene.cloud_cover?.toFixed(1)}%</div>
                    <div>{scene.satellite} &middot; {scene.resolution_m}m</div>
                  </div>
                </Popup>
              </Rectangle>
            )
          })}
          <MapUpdater layer={layer} />
        </MapContainer>

        {/* Legend overlay */}
        <div className="absolute bottom-4 right-4 bg-[#0f1629]/90 border border-[#1e2a4a] rounded-lg p-3 text-xs z-[1000]">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-4 h-0.5 border-t-2 border-dashed border-[#60a5fa] inline-block" />
            <span className="text-[#94a3b8]">Study area</span>
          </div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-3 h-3 border border-[#34d399] bg-[#34d399]/10 inline-block" />
            <span className="text-[#94a3b8]">Scene footprint</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 border-2 border-[#fbbf24] bg-[#fbbf24]/15 inline-block" />
            <span className="text-[#94a3b8]">Selected scene</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function MapUpdater({ layer }) {
  // Force re-render when layer changes (handled by key on TileLayer parent)
  return null
}
