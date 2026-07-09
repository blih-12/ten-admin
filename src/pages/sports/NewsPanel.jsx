import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getAPI, formatDate, truncate } from '../../utils/api'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import toast from 'react-hot-toast'
import { MdAdd, MdEdit, MdDelete, MdSearch, MdStar } from 'react-icons/md'

// Shared by the "News" and "Transfers" tabs of a sport — same data (Article),
// just scoped to this sport and, for Transfers, further scoped to whichever
// category the site uses for transfer news.
export default function NewsPanel({ activeSite, sport, transfersOnly = false }) {
  const [articles, setArticles] = useState([])
  const [categories, setCategories] = useState([])
  const [categoryFilter, setCategoryFilter] = useState('')
  const [status, setStatus] = useState('all')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getAPI(activeSite).get('/categories').then(res => {
      const cats = res.data.data || []
      setCategories(cats)
      if (transfersOnly && !categoryFilter) {
        const guess = cats.find(c => c.name.toLowerCase().includes('transfer'))
        if (guess) setCategoryFilter(guess._id)
      }
    }).catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSite])

  const fetchArticles = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page, limit: 15, sport })
      if (status !== 'all') params.append('status', status)
      if (categoryFilter) params.append('category', categoryFilter)
      if (search) params.append('search', search)
      const res = await getAPI(activeSite).get(`/articles/admin/all?${params}`)
      setArticles(res.data.data || [])
      setTotalPages(res.data.pages || 1)
    } catch (e) { toast.error('Failed to load articles') }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchArticles() }, [activeSite, sport, status, categoryFilter, page, search])

  const handleDelete = async (id) => {
    if (!confirm('Delete this article?')) return
    try {
      await getAPI(activeSite).delete(`/articles/${id}`)
      toast.success('Article deleted')
      fetchArticles()
    } catch (e) { toast.error(e.response?.data?.message || 'Failed to delete') }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-2 flex-wrap flex-1">
          <div className="relative">
            <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
              placeholder="Search..."
              className="bg-gray-700 text-white border border-gray-600 rounded-lg pl-8 pr-3 py-2 text-xs outline-none focus:border-yellow-400"
            />
          </div>
          {['all', 'published', 'draft', 'archived'].map(s => (
            <button
              key={s}
              onClick={() => { setStatus(s); setPage(1) }}
              className={`px-3 py-2 rounded-lg text-xs font-medium capitalize ${status === s ? 'bg-yellow-400 text-black' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}
            >
              {s}
            </button>
          ))}
          {!transfersOnly && (
            <select
              value={categoryFilter}
              onChange={e => { setCategoryFilter(e.target.value); setPage(1) }}
              className="bg-gray-700 text-gray-300 text-xs rounded-lg px-2 py-2 outline-none border border-gray-600"
            >
              <option value="">All categories</option>
              {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
            </select>
          )}
        </div>
        <Link to="/articles/new">
          <Button size="sm"><MdAdd size={14} /> New {transfersOnly ? 'Transfer' : 'Article'}</Button>
        </Link>
      </div>

      <div className="bg-gray-800 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : articles.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No {transfersOnly ? 'transfer news' : 'articles'} found for this sport yet</div>
        ) : (
          <>
            <div className="divide-y divide-gray-700">
              {articles.map(a => (
                <div key={a._id} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-750">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      {a.isHero && <MdStar size={12} className="text-yellow-400 shrink-0" title="Homepage hero" />}
                      <div className="text-white text-sm font-medium line-clamp-1">{a.title}</div>
                    </div>
                    <div className="text-gray-500 text-xs mt-0.5">{truncate(a.excerpt, 70)}</div>
                    <div className="text-gray-600 text-xs mt-1">
                      {a.teams?.map(t => t.name).join(', ') || a.competitions?.map(c => c.name).join(', ') || '—'}
                    </div>
                  </div>
                  <Badge status={a.status} />
                  <span className="text-gray-500 text-xs w-24 shrink-0">{formatDate(a.createdAt)}</span>
                  <div className="flex gap-1 shrink-0">
                    <Link to={`/articles/edit/${a._id}`}>
                      <Button variant="ghost" size="sm"><MdEdit size={14} /></Button>
                    </Link>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(a._id)} className="hover:text-red-400">
                      <MdDelete size={14} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between p-4 border-t border-gray-700">
              <span className="text-gray-500 text-sm">Page {page} of {totalPages}</span>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Prev</Button>
                <Button variant="secondary" size="sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
