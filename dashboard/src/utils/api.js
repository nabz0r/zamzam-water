const API_BASE = '/api/v1';

export async function fetchJson(path, options) {
  const res = await fetch(`${API_BASE}${path}`, options);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export const api = {
  publications: {
    list: (page = 1, perPage = 20, relevantOnly = true) =>
      fetchJson(`/publications?page=${page}&per_page=${perPage}&relevant_only=${relevantOnly}`),
    search: (q, page = 1) =>
      fetchJson(`/publications/search?q=${encodeURIComponent(q)}&page=${page}`),
    get: (id) => fetchJson(`/publications/${id}`),
  },
  chemistry: {
    elements: () => fetchJson('/chemistry/elements'),
    sources: () => fetchJson('/chemistry/sources'),
    byElement: (symbol) => fetchJson(`/chemistry/by-element/${symbol}`),
    compare: (elements, sources) => {
      let path = `/chemistry/compare?elements=${elements.join(',')}`
      if (sources && sources.length > 0) path += `&sources=${sources.join(',')}`
      return fetchJson(path)
    },
  },
  archaeology: {
    sites: () => fetchJson('/archaeology/sites'),
    site: (id) => fetchJson(`/archaeology/sites/${id}`),
  },
  satellite: {
    scenes: () => fetchJson('/satellite/scenes'),
    stats: () => fetchJson('/satellite/stats'),
  },
  hydro: {
    stats: () => fetchJson('/hydro/stats'),
    rainfall: (start, end, resolution = 'daily') => {
      let path = `/hydro/rainfall?resolution=${resolution}`;
      if (start) path += `&start=${start}`;
      if (end) path += `&end=${end}`;
      return fetchJson(path);
    },
  },
  lab: {
    samples: () => fetchJson('/lab/samples'),
    createSample: (data) =>
      fetchJson('/lab/samples', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
  },
  admin: {
    stats: () => fetchJson('/admin/stats'),
    ingestPapers: () => fetchJson('/tasks/ingest-papers', { method: 'POST' }),
    syncHydro: () => fetchJson('/tasks/sync-hydro', { method: 'POST' }),
    fetchSatellite: () => fetchJson('/tasks/fetch-satellite', { method: 'POST' }),
    parsePdfs: () => fetchJson('/tasks/parse-pdfs', { method: 'POST' }),
    generateEmbeddings: () => fetchJson('/tasks/generate-embeddings', { method: 'POST' }),
    seed: () => fetchJson('/admin/seed', { method: 'POST' }),
    classify: () => fetchJson('/admin/classify', { method: 'POST' }),
  },
};
