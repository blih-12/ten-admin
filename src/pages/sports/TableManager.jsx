import { useState, useEffect } from 'react'
import { getAPI } from '../../utils/api'
import Button from '../../components/ui/Button'
import toast from 'react-hot-toast'
import { MdAdd, MdEdit, MdDelete, MdClose, MdCheck, MdAutorenew } from 'react-icons/md'

const emptyForm = {
  rank: '', teamName: '', teamLogo: '', points: 0, played: 0, won: 0, drawn: 0, lost: 0,
  goalsFor: 0, goalsAgainst: 0, form: '', description: '',
}

export default function TableManager({ activeSite, sport }) {
  const [leagues, setLeagues] = useState([])
  const [leagueId, setLeagueId] = useState('')
  const [season, setSeason] = useState(new Date().getFullYear())
  const [standings, setStandings] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    getAPI(activeSite).get(`/leagues?sport=${sport}`).then(res => {
      const ls = res.data.data || []
      setLeagues(ls)
      if (ls.length && !leagueId) { setLeagueId(ls[0]._id); setSeason(ls[0].season) }
    }).catch(() => toast.error('Failed to load competitions'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSite, sport])

  const fetchStandings = async () => {
    if (!leagueId) { setStandings([]); setLoading(false); return }
    setLoading(true)
    try {
      const res = await getAPI(activeSite).get(`/standings?leagueId=${leagueId}&season=${season}`)
      setStandings(res.data.data || [])
    } catch (e) { setStandings([]) }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchStandings() }, [activeSite, leagueId, season])

  const handleGenerate = async () => {
    if (!leagueId) return toast.error('Pick a competition first')
    if (!confirm('This replaces the current table for this competition/season with one computed from stored results. Continue?')) return
    setGenerating(true)
    try {
      await getAPI(activeSite).post('/standings/generate', { league: leagueId, season })
      toast.success('Table generated from results')
      fetchStandings()
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to generate -- import fixtures with results first')
    } finally {
      setGenerating(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!leagueId) return toast.error('Pick a competition first')
    try {
      const api = getAPI(activeSite)
      const goalDiff = parseInt(form.goalsFor || 0) - parseInt(form.goalsAgainst || 0)
      const payload = {
        league: leagueId, season, rank: parseInt(form.rank),
        team: { name: form.teamName, logo: form.teamLogo },
        points: parseInt(form.points), played: parseInt(form.played), won: parseInt(form.won),
        drawn: parseInt(form.drawn), lost: parseInt(form.lost),
        goalsFor: parseInt(form.goalsFor), goalsAgainst: parseInt(form.goalsAgainst), goalDiff,
        form: form.form, description: form.description,
      }
      if (editingId) {
        await api.put(`/standings/${editingId}`, payload)
        toast.success('Row updated')
      } else {
        await api.post('/standings', payload)
        toast.success('Row added')
      }
      setForm(emptyForm)
      setEditingId(null)
      fetchStandings()
    } catch (e) { toast.error(e.response?.data?.message || 'Failed to save') }
  }

  const handleEdit = (s) => {
    setEditingId(s._id)
    setForm({
      rank: s.rank, teamName: s.team?.name || '', teamLogo: s.team?.logo || '',
      points: s.points, played: s.played, won: s.won, drawn: s.drawn, lost: s.lost,
      goalsFor: s.goalsFor, goalsAgainst: s.goalsAgainst, form: s.form || '', description: s.description || '',
    })
  }

  const handleDelete = async (id) => {
    if (!confirm('Remove this row from the table?')) return
    try {
      await getAPI(activeSite).delete(`/standings/${id}`)
      toast.success('Row removed')
      fetchStandings()
    } catch (e) { toast.error(e.response?.data?.message || 'Failed to delete') }
  }

  const field = (key, label, type = 'text', width = '') => (
    <div className={width}>
      <label className="text-gray-400 text-xs uppercase tracking-widest block mb-1.5">{label}</label>
      <input
        type={type}
        value={form[key]}
        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
        className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2 text-sm outline-none focus:border-yellow-400"
      />
    </div>
  )

  return (
    <div>
      <div className="flex gap-4 mb-4">
        <div>
          <label className="text-gray-400 text-xs uppercase tracking-widest block mb-1.5">Competition</label>
          <select
            value={leagueId}
            onChange={e => {
              const l = leagues.find(x => x._id === e.target.value)
              setLeagueId(e.target.value)
              if (l) setSeason(l.season)
              setEditingId(null); setForm(emptyForm)
            }}
            className="bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2 text-sm outline-none focus:border-yellow-400 min-w-[220px]"
          >
            <option value="">Select a competition...</option>
            {leagues.map(l => <option key={l._id} value={l._id}>{l.name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-gray-400 text-xs uppercase tracking-widest block mb-1.5">Season</label>
          <input type="number" value={season} onChange={e => setSeason(parseInt(e.target.value))}
            className="w-24 bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2 text-sm outline-none focus:border-yellow-400" />
        </div>
        <div className="flex items-end">
          <Button
            variant="secondary"
            disabled={!leagueId || generating}
            onClick={handleGenerate}
            title="Recomputes the table from every finished, scored fixture stored for this competition/season"
          >
            <MdAutorenew size={16} className={generating ? 'animate-spin' : ''} /> {generating ? 'Generating...' : 'Generate from Results'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gray-800 rounded-xl p-5">
          <h3 className="text-white font-semibold mb-4">{editingId ? 'Edit Row' : 'Add Row'}</h3>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              {field('rank', 'Rank', 'number')}
              {field('teamName', 'Team name')}
            </div>
            {field('teamLogo', 'Team logo URL')}
            <div className="grid grid-cols-3 gap-3">
              {field('played', 'Played', 'number')}
              {field('won', 'Won', 'number')}
              {field('drawn', 'Drawn', 'number')}
            </div>
            <div className="grid grid-cols-3 gap-3">
              {field('lost', 'Lost', 'number')}
              {field('goalsFor', 'GF', 'number')}
              {field('goalsAgainst', 'GA', 'number')}
            </div>
            {field('points', 'Points', 'number')}
            {field('form', 'Form (e.g. WWDLW)')}
            {field('description', 'Description (e.g. Champions League)')}
            <div className="flex gap-2 pt-1">
              <Button type="submit" disabled={!leagueId} className="flex-1 justify-center">
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

        <div className="md:col-span-2 bg-gray-800 rounded-xl overflow-hidden overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading...</div>
          ) : !leagueId ? (
            <div className="p-8 text-center text-gray-500">Pick a competition above to view its table</div>
          ) : standings.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No standings yet for this season</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 text-xs uppercase border-b border-gray-700">
                  <th className="text-left px-4 py-3">#</th>
                  <th className="text-left px-4 py-3">Team</th>
                  <th className="px-2 py-3">P</th>
                  <th className="px-2 py-3">W</th>
                  <th className="px-2 py-3">D</th>
                  <th className="px-2 py-3">L</th>
                  <th className="px-2 py-3">GD</th>
                  <th className="px-2 py-3">Pts</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {standings.map(s => (
                  <tr key={s._id} className="text-gray-300 hover:bg-gray-750">
                    <td className="px-4 py-2.5">{s.rank}</td>
                    <td className="px-4 py-2.5 flex items-center gap-2">
                      {s.team?.logo && <img src={s.team.logo} alt="" className="w-5 h-5 object-contain" />}
                      <span className="text-white">{s.team?.name}</span>
                    </td>
                    <td className="text-center px-2 py-2.5">{s.played}</td>
                    <td className="text-center px-2 py-2.5">{s.won}</td>
                    <td className="text-center px-2 py-2.5">{s.drawn}</td>
                    <td className="text-center px-2 py-2.5">{s.lost}</td>
                    <td className="text-center px-2 py-2.5">{s.goalDiff}</td>
                    <td className="text-center px-2 py-2.5 font-bold text-white">{s.points}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex gap-1 justify-end">
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(s)}><MdEdit size={14} /></Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(s._id)} className="hover:text-red-400"><MdDelete size={14} /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
