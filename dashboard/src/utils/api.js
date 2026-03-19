const API_BASE = '/api/v1';

export async function fetchJson(path) {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export const api = {
  publications: {
    list: (page = 1, perPage = 20) =>
      fetchJson(`/publications?page=${page}&per_page=${perPage}`),
    search: (q, page = 1) =>
      fetchJson(`/publications/search?q=${encodeURIComponent(q)}&page=${page}`),
    get: (id) => fetchJson(`/publications/${id}`),
  },
  chemistry: {
    elements: () => fetchJson('/chemistry/elements'),
    byElement: (symbol) => fetchJson(`/chemistry/by-element/${symbol}`),
    compare: (elements) =>
      fetchJson(`/chemistry/compare?elements=${elements.join(',')}`),
  },
  archaeology: {
    sites: () => fetchJson('/archaeology/sites'),
    site: (id) => fetchJson(`/archaeology/sites/${id}`),
  },
};
