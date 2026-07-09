import { useState, useEffect } from 'react'
import { getAPI, formatDate } from '../../utils/api'
import Button from '../../components/ui/Button'
import toast from 'react-hot-toast'
import { MdAdd, MdEdit, MdDelete, MdClose, MdCheck, MdUploadFile } from 'react-icons/md'
import BulkImportPanel from './BulkImportPanel'

const STATUS_OPTIONS = [
  { value: 'NS', long: 'Not Started' },
  { value: '1H', long: 'First Half' },
  { value: 'HT', long: 'Half Time' },
  { value: '2H', long: 'Second Half' },
  { value: 'FT', long: 'Match Finished' },
  { value: 'PST', long: 'Postponed' },
  { value: 'CANC', long: 'Cancelled' },
]

const emptyEvent = { minute: '', type: 'Goal', detail: '', team: 'home', player: '' }
const emptyForm = () => ({
  round: '', date: '', venue: '',
  homeTeamId: '', homeTeamName: '', homeTeamLogo: '',
  awayTeamId: '', awayTeamName: '', awayTeamLogo: '',
  scoreHome: '', scoreAway: '', statusShort: 'NS',
  events: [],
})

export default function FixturesManager({ activeSite, sport }) {
  const [leagues, setLeagues] = useState([])
  const [leagueId, setLeagueId] = useState('')
  const [teams, setTeams] = useState([])
  const [fixtures, setFixtures] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(emptyForm())
  const [editingId, setEditingId] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [showBulkImport, setShowBulkImport] = useState(false)

  useEffect(() => {
    getAPI(activeSite).get(`/leagues?sport=${sport}`).then(res => {
      const ls = res.data.data || []
      setLeagues(ls)
      if (ls.length && !leagueId) setLeagueId(ls[0]._id)
    }).catch(() => toast.error('Failed to load competitions'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSite, sport])

  useEffect(() => {
    if (!leagueId) return
    getAPI(activeSite).get(`/teams?league=${leagueId}`).then(res => setTeams(res.data.data || [])).catch(() => setTeams([]))
  }, [activeSite, leagueId])

  const fetchFixtures = async () => {
    if (!leagueId) { setFixtures([]); setLoading(false); return }
    setLoading(true)
    try {
      const res = await getAPI(activeSite).get(`/fixtures?leagueId=${leagueId}&limit=30`)
      setFixtures(res.data.data || [])
    } catch (e) { toast.error('Failed to load fixtures') }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchFixtures() }, [activeSite, leagueId])

  const pickTeam = (side, teamId) => {
    const t = teams.find(x => x._id === teamId)
    if (!t) return
    setForm(f => ({ ...f, [`${side}TeamId`]: t._id, [`${side}TeamName`]: t.name, [`${side}TeamLogo`]: t.logo || '' }))
  }

  const addEvent = () => setForm(f => ({ ...f, events: [...f.events, { ...emptyEvent }] }))
  const updateEvent = (i, patch) => setForm(f => ({ ...f, events: f.events.map((e, idx) => idx === i ? { ...e, ...patch } : e) }))
  const removeEvent = (i) => setForm(f => ({ ...f, events: f.events.filter((_, idx) => idx !== i) }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!leagueId) return toast.error('Pick a competition first')
    if (!form.homeTeamName || !form.awayTeamName) return toast.error('Pick both teams')
    try {
      const statusLong = STATUS_OPTIONS.find(s => s.value === form.statusShort)?.long || 'Not Started'
      const payload = {
        league: leagueId, season: leagues.find(l => l._id === leagueId)?.season, round: form.round,
        date: form.date, venue: form.venue,
        status: { short: form.statusShort, long: statusLong },
        homeTeam: { ref: form.homeTeamId || undefined, name: form.homeTeamName, logo: form.homeTeamLogo },
        awayTeam: { ref: form.awayTeamId || undefined, name: form.awayTeamName, logo: form.awayTeamLogo },
        score: { home: form.scoreHome === '' ? null : parseInt(form.scoreHome), away: form.scoreAway === '' ? null : parseInt(form.scoreAway) },
        events: form.events.map(ev => ({ ...ev, minute: ev.minute ? parseInt(ev.minute) : null, team: ev.team === 'home' ? form.homeTeamName : form.awayTeamName })),
      }
      const api = getAPI(activeSite)
      if (editingId) {
        await api.put(`/fixtures/${editingId}`, payload)
        toast.success('Fixture updated')
      } else {
        await api.post('/fixtures', payload)
        toast.success('Fixture created')
      }
      setForm(emptyForm())
      setEditingId(null)
      setShowForm(false)
      fetchFixtures()
    } catch (e) { toast.error(e.response?.data?.message || 'Failed to save') }
  }

  const handleEdit = (fx) => {
    setEditingId(fx._id)
    setForm({
      round: fx.round || '', date: fx.date ? new Date(fx.date).toISOString().slice(0, 16) : '', venue: fx.venue || '',
      homeTeamId: fx.homeTeam?.ref || '', homeTeamName: fx.homeTeam?.name || '', homeTeamLogo: fx.homeTeam?.logo || '',
      awayTeamId: fx.awayTeam?.ref || '', awayTeamName: fx.awayTeam?.name || '', awayTeamLogo: fx.awayTeam?.logo || '',
      scoreHome: fx.score?.home ?? '', scoreAway: fx.score?.away ?? '', statusShort: fx.status?.short || 'NS',
      events: (fx.events || []).map(ev => ({ ...ev, team: ev.team === fx.homeTeam?.name ? 'home' : 'away' })),
    })
    setShowForm(true)
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this fixture?')) return
    try {
      await getAPI(activeSite).delete(`/fixtures/${id}`)
      toast.success('Fixture deleted')
      fetchFixtures()
    } catch (e) { toast.error(e.response?.data?.message || 'Failed to delete') }
  }

  return (
    <div>
      <div className="flex items-start justify-between mb-4 gap-3 flex-wrap">
        <div>
          <label className="text-gray-400 text-xs uppercase tracking-widest block mb-1.5">Competition</label>
          <select
            value={leagueId}
            onChange={e => { setLeagueId(e.target.value); setShowForm(false); setEditingId(null); setForm(emptyForm()) }}
            className="bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2 text-sm outline-none focus:border-yellow-400 w-full sm:min-w-[220px] sm:w-auto"
          >
            <option value="">Select a competition...</option>
            {leagues.map(l => <option key={l._id} value={l._id}>{l.name}</option>)}
          </select>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="secondary" disabled={!leagueId} onClick={() => setShowBulkImport(v => !v)}>
            <MdUploadFile size={16} /> Bulk Import
          </Button>
          <Button disabled={!leagueId} onClick={() => { setEditingId(null); setForm(emptyForm()); setShowForm(true) }}>
            <MdAdd size={16} /> Add Fixture
          </Button>
        </div>
      </div>

      {showBulkImport && (
        <BulkImportPanel
          activeSite={activeSite}
          leagueId={leagueId}
          defaultSeason={leagues.find(l => l._id === leagueId)?.season}
          onImported={() => { fetchFixtures(); setShowBulkImport(false) }}
          onClose={() => setShowBulkImport(false)}
        />
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-gray-800 rounded-xl p-5 mb-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-gray-400 text-xs uppercase tracking-widest block mb-1.5">Home team</label>
              <select value={form.homeTeamId} onChange={e => pickTeam('home', e.target.value)}
                className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2 text-sm outline-none focus:border-yellow-400">
                <option value="">Pick or type below...</option>
                {teams.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
              </select>
              <input value={form.homeTeamName} onChange={e => setForm(f => ({ ...f, homeTeamName: e.target.value, homeTeamId: '' }))}
                placeholder="Or type team name" className="w-full mt-1.5 bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2 text-sm outline-none focus:border-yellow-400" />
            </div>
            <div>
              <label className="text-gray-400 text-xs uppercase tracking-widest block mb-1.5">Away team</label>
              <select value={form.awayTeamId} onChange={e => pickTeam('away', e.target.value)}
                className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2 text-sm outline-none focus:border-yellow-400">
                <option value="">Pick or type below...</option>
                {teams.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
              </select>
              <input value={form.awayTeamName} onChange={e => setForm(f => ({ ...f, awayTeamName: e.target.value, awayTeamId: '' }))}
                placeholder="Or type team name" className="w-full mt-1.5 bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2 text-sm outline-none focus:border-yellow-400" />
            </div>
            <div>
              <label className="text-gray-400 text-xs uppercase tracking-widest block mb-1.5">Round</label>
              <input value={form.round} onChange={e => setForm(f => ({ ...f, round: e.target.value }))} placeholder="e.g. Matchday 12"
                className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2 text-sm outline-none focus:border-yellow-400" />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="text-gray-400 text-xs uppercase tracking-widest block mb-1.5">Kickoff date/time</label>
              <input type="datetime-local" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2 text-sm outline-none focus:border-yellow-400" />
            </div>
            <div>
              <label className="text-gray-400 text-xs uppercase tracking-widest block mb-1.5">Status</label>
              <select value={form.statusShort} onChange={e => setForm(f => ({ ...f, statusShort: e.target.value }))}
                className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2 text-sm outline-none focus:border-yellow-400">
                {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.long}</option>)}
              </select>
            </div>
            <div>
              <label className="text-gray-400 text-xs uppercase tracking-widest block mb-1.5">Home score</label>
              <input type="number" value={form.scoreHome} onChange={e => setForm(f => ({ ...f, scoreHome: e.target.value }))}
                className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2 text-sm outline-none focus:border-yellow-400" />
            </div>
            <div>
              <label className="text-gray-400 text-xs uppercase tracking-widest block mb-1.5">Away score</label>
              <input type="number" value={form.scoreAway} onChange={e => setForm(f => ({ ...f, scoreAway: e.target.value }))}
                className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2 text-sm outline-none focus:border-yellow-400" />
            </div>
          </div>

          <div>
            <label className="text-gray-400 text-xs uppercase tracking-widest block mb-1.5">Venue</label>
            <input value={form.venue} onChange={e => setForm(f => ({ ...f, venue: e.target.value }))}
              className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2 text-sm outline-none focus:border-yellow-400" />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-gray-400 text-xs uppercase tracking-widest">Match events</label>
              <Button type="button" variant="secondary" size="sm" onClick={addEvent}><MdAdd size={12} /> Add event</Button>
            </div>
            <div className="space-y-2">
              {form.events.map((ev, i) => (
                <div key={i} className="flex items-center gap-2 bg-gray-700/50 rounded-lg p-2 flex-wrap">
                  <input type="number" value={ev.minute} onChange={e => updateEvent(i, { minute: e.target.value })} placeholder="Min"
                    className="w-16 bg-gray-700 text-white border border-gray-600 rounded-lg px-2 py-1.5 text-xs outline-none focus:border-yellow-400" />
                  <select value={ev.type} onChange={e => updateEvent(i, { type: e.target.value })}
                    className="bg-gray-700 text-white border border-gray-600 rounded-lg px-2 py-1.5 text-xs outline-none focus:border-yellow-400">
                    <option value="Goal">Goal</option>
                    <option value="Card">Card</option>
                    <option value="subst">Substitution</option>
                  </select>
                  <select value={ev.team} onChange={e => updateEvent(i, { team: e.target.value })}
                    className="bg-gray-700 text-white border border-gray-600 rounded-lg px-2 py-1.5 text-xs outline-none focus:border-yellow-400">
                    <option value="home">{form.homeTeamName || 'Home'}</option>
                    <option value="away">{form.awayTeamName || 'Away'}</option>
                  </select>
                  <input value={ev.player} onChange={e => updateEvent(i, { player: e.target.value })} placeholder="Player"
                    className="flex-1 bg-gray-700 text-white border border-gray-600 rounded-lg px-2 py-1.5 text-xs outline-none focus:border-yellow-400" />
                  <input value={ev.detail} onChange={e => updateEvent(i, { detail: e.target.value })} placeholder="Detail (e.g. Yellow Card)"
                    className="flex-1 bg-gray-700 text-white border border-gray-600 rounded-lg px-2 py-1.5 text-xs outline-none focus:border-yellow-400" />
                  <Button type="button" variant="ghost" size="sm" onClick={() => removeEvent(i)} className="hover:text-red-400"><MdDelete size={12} /></Button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-2 border-t border-gray-700">
            <Button type="submit" className="flex-1 justify-center">
              {editingId ? <><MdCheck size={16} /> Update Fixture</> : <><MdAdd size={16} /> Create Fixture</>}
            </Button>
            <Button type="button" variant="secondary" onClick={() => { setShowForm(false); setEditingId(null) }}><MdClose size={16} /></Button>
          </div>
        </form>
      )}

      <div className="bg-gray-800 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : !leagueId ? (
          <div className="p-8 text-center text-gray-500">Pick a competition above to view its fixtures</div>
        ) : fixtures.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No fixtures yet for this competition</div>
        ) : (
          <div className="divide-y divide-gray-700">
            {fixtures.map(fx => (
              <div key={fx._id} className="flex items-center justify-between px-5 py-3 hover:bg-gray-750">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-gray-500 text-xs w-16 shrink-0">{fx.date ? formatDate(fx.date) : '—'}</span>
                  <div className="text-white text-sm truncate">
                    {fx.homeTeam?.name} <span className="text-gray-400">{fx.score?.home ?? '-'} : {fx.score?.away ?? '-'}</span> {fx.awayTeam?.name}
                  </div>
                  <span className="text-gray-500 text-xs shrink-0">{fx.status?.short}</span>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button variant="ghost" size="sm" onClick={() => handleEdit(fx)}><MdEdit size={14} /></Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(fx._id)} className="hover:text-red-400"><MdDelete size={14} /></Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
