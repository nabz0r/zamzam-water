import { useState, useEffect, useCallback } from 'react'
import { api } from '../utils/api'

export default function PaperSearch() {
  const [papers, setPapers] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [query, setQuery] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [loading, setLoading] = useState(true)

  const perPage = 15

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = query
        ? await api.publications.search(query, page)
        : await api.publications.list(page, perPage)
      setPapers(data.results)
      setTotal(data.total)
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }, [page, query])

  useEffect(() => { load() }, [load])

  const handleSearch = (e) => {
    e.preventDefault()
    setPage(1)
    setQuery(searchInput)
  }

  const totalPages = Math.ceil(total / perPage)

  return (
    <div className="p-8">
      <h2 className="text-2xl text-[#e2e8f0] mb-6">Publications</h2>

      {/* Search bar */}
      <form onSubmit={handleSearch} className="mb-6 flex gap-3">
        <input
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search papers... (e.g. arsenic, hydrogeology, isotope)"
          className="flex-1 bg-[#1a2140] border border-[#2a3358] rounded-lg px-4 py-2.5 text-sm text-[#e2e8f0] placeholder-[#64748b] focus:outline-none focus:border-[#60a5fa]"
        />
        <button
          type="submit"
          className="px-5 py-2.5 bg-[#1e3a5f] text-[#60a5fa] rounded-lg text-sm hover:bg-[#254a73] transition-colors"
        >
          Search
        </button>
        {query && (
          <button
            type="button"
            onClick={() => { setQuery(''); setSearchInput(''); setPage(1) }}
            className="px-4 py-2.5 text-[#94a3b8] text-sm hover:text-[#e2e8f0]"
          >
            Clear
          </button>
        )}
      </form>

      {query && (
        <p className="text-sm text-[#64748b] mb-4">
          {total} result{total !== 1 ? 's' : ''} for &ldquo;{query}&rdquo;
        </p>
      )}

      {/* Papers list */}
      {loading ? (
        <p className="text-[#64748b]">Loading...</p>
      ) : (
        <div className="space-y-3">
          {papers.map((p) => (
            <div
              key={p.id}
              className="bg-[#0f1629] border border-[#1e2a4a] rounded-lg p-4 hover:border-[#2a3358] transition-colors"
            >
              <h3 className="text-[#e2e8f0] text-sm font-normal leading-snug mb-2">
                {p.title}
              </h3>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#64748b]">
                {p.authors && (
                  <span className="truncate max-w-md">{p.authors}</span>
                )}
                {p.journal && (
                  <span className="text-[#94a3b8]">{p.journal}</span>
                )}
                {p.year && <span>{p.year}</span>}
                {p.doi && (
                  <a
                    href={`https://doi.org/${p.doi}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#60a5fa] hover:underline"
                  >
                    DOI
                  </a>
                )}
              </div>
              {p.abstract && (
                <p className="text-xs text-[#94a3b8] mt-2 line-clamp-2">
                  {p.abstract}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 text-sm rounded bg-[#1a2140] text-[#94a3b8] disabled:opacity-30 hover:bg-[#2a3358]"
          >
            Prev
          </button>
          <span className="text-sm text-[#64748b]">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1.5 text-sm rounded bg-[#1a2140] text-[#94a3b8] disabled:opacity-30 hover:bg-[#2a3358]"
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}
