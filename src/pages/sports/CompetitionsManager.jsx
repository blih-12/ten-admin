import { useState, useEffect } from 'react'
import { getAPI } from '../../utils/api'
import Button from '../../components/ui/Button'
import LogoPickerField from '../../components/ui/LogoPickerField'
import toast from 'react-hot-toast'
import { MdAdd, MdEdit, MdDelete, MdClose, MdCheck, MdSync, MdVisibility, MdVisibilityOff } from 'react-icons/md'

const emptyForm = { name: '', country: '', logo: '', season: new Date().getFullYear(), isManual: true, isActive: true }

export default function CompetitionsManager({ activeSite, sport }) {
  const [leagues, setLeagues] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)

  const fetchLeagues = async () => {
    setLoading(true)
    try {
      const res = await getAPI(activeSite).get(`/leagues?sport=${sport}`)
      setLeagues(res.data.data || [])
    } catch (e) { toast.error('Failed to load competitions') }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchLeagues() }, [activeSite, sport])

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const api = getAPI(activeSite)
      if (editingId) {
        await api.put(`/leagues/${editingId}`, form)
        toast.success('Competition updated')
      } else {
        await api.post('/leagues', { ...form, sport })
        toast.success('Competition created')
      }
      setForm(emptyForm)
      setEditingId(null)
      fetchLeagues()
    } catch (e) { toast.error(e.response?.data?.message || 'Failed to save') }
  }

  const handleEdit = (l) => {
    setEditingId(l._id)
    setForm({ name: l.name, country: l.country || '', logo: l.logo || '', season: l.season, isManual: l.isManual, isActive: l.isActive })
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this competition? This will not delete its teams, fixtures, or standings — remove those separately if needed.')) return
    try {
      await getAPI(activeSite).delete(`/leagues/${id}`)
      toast.success('Competition deleted')
      fetchLeagues()
    } catch (e) { toast.error(e.response?.data?.message || 'Failed to delete') }
  }

  const handleSync = async (id) => {
    try {
      await getAPI(activeSite).post(`/leagues/${id}/sync`)
      toast.success('Sync started — standings and fixtures will update shortly')
    } catch (e) { toast.error(e.response?.data?.message || 'Failed to sync') }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="bg-gray-800 rounded-xl p-5">
        <h3 className="text-white font-semibold mb-4">{editingId ? 'Edit Competition' : 'Add Competition'}</h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-gray-400 text-xs uppercase tracking-widest block mb-1.5">Name *</label>
            <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2 text-sm outline-none focus:border-yellow-400" />
          </div>
          <div>
            <label className="text-gray-400 text-xs uppercase tracking-widest block mb-1.5">Country / Region</label>
            <input value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))}
              className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2 text-sm outline-none focus:border-yellow-400" />
          </div>
          <LogoPickerField kind="competition" value={form.logo} onChange={logo => setForm(f => ({ ...f, logo }))} nameHint={form.name} />
          <div>
            <label className="text-gray-400 text-xs uppercase tracking-widest block mb-1.5">Season</label>
            <input type="number" value={form.season} onChange={e => setForm(f => ({ ...f, season: parseInt(e.target.value) }))}
              className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2 text-sm outline-none focus:border-yellow-400" />
          </div>
          <label className="flex items-center gap-2 text-gray-300 text-sm">
            <input type="checkbox" checked={form.isManual} onChange={e => setForm(f => ({ ...f, isManual: e.target.checked }))} className="w-4 h-4 accent-yellow-400" />
            Manual entry (not synced from an API)
          </label>
          <label className="flex items-center gap-2 text-gray-300 text-sm">
            <input type="checkbox" checked={form.isActive} onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))} className="w-4 h-4 accent-yellow-400" />
            Active
          </label>
          <div className="flex gap-2 pt-1">
            <Button type="submit" className="flex-1 justify-center">
              {editingId ? <><MdCheck size={16} /> Update</> : <><MdAdd size={16} /> Add</>}
            </Button>
            {editingId && (
              <Button type="button" variant="secondary" onClick={() => { setEditingId(null); setForm(emptyForm) }}>
                <MdClose size={16} />
              </Button>
            )}
          </div>
        </form>
      </div>

      <div className="md:col-span-2 bg-gray-800 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-gray-700">
          <h3 className="text-white font-semibold">Competitions ({leagues.length})</h3>
        </div>
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : leagues.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No competitions yet for this sport</div>
        ) : (
          <div className="divide-y divide-gray-700">
            {leagues.map(l => (
              <div key={l._id} className={`flex items-center justify-between gap-2 px-5 py-3 hover:bg-gray-750 ${!l.isActive ? 'opacity-50' : ''}`}>
                <div className="flex items-center gap-3 min-w-0">
                  {l.logo && <img src={l.logo} alt="" className="w-6 h-6 object-contain shrink-0" />}
                  <div className="min-w-0">
                    <div className="text-white text-sm font-medium truncate">{l.name}</div>
                    <div className="text-gray-500 text-xs truncate">{l.country} · {l.season} · {l.isManual ? 'Manual' : 'API-synced'}</div>
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  {!l.isManual && (
                    <Button variant="ghost" size="sm" onClick={() => handleSync(l._id)} title="Sync now"><MdSync size={14} /></Button>
                  )}
                  <Button variant="ghost" size="sm" onClick={() => handleEdit(l)}><MdEdit size={14} /></Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(l._id)} className="hover:text-red-400"><MdDelete size={14} /></Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
