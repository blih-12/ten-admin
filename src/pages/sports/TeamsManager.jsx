import { useState, useEffect, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getAPI } from '../../utils/api'
import Button from '../../components/ui/Button'
import LogoPickerField from '../../components/ui/LogoPickerField'
import toast from 'react-hot-toast'
import { MdAdd, MdEdit, MdDelete, MdClose, MdCheck, MdSearch, MdLinkOff, MdLink, MdRefresh } from 'react-icons/md'

const emptyForm = { name: '', shortName: '', logo: '', country: '', founded: '', stadium: '' }
const currentSeasonGuess = () => {
  // Football-style season: Aug–Jul. Before August, we're still in last
  // year's season (e.g. Feb 2027 is still the 26/27 season -> 2026).
  const now = new Date()
  return now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1
}

export default function TeamsManager({ activeSite, sport }) {
  const queryClient = useQueryClient()
  const [leagueId, setLeagueId] = useState('')
  const [season, setSeason] = useState(currentSeasonGuess())
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)

  // ── Assign-existing-team picker ────────────────────────────────────────
  const [assignOpen, setAssignOpen] = useState(false)
  const [assignSearch, setAssignSearch] = useState('')
  const [assigning, setAssigning] = useState(null) // team _id currently being assigned
  const assignRef = useRef(null)

  // Cached queries. staleTime/refetch behavior is inherited from the
  // app-wide QueryClient defaults (5 min stale, no refetch-on-focus) --
  // navigating away and back reuses cached data instead of re-hitting the
  // API. The refresh button below force-refetches all of them on demand.
  const { data: leagues = [], isFetching: leaguesFetching } = useQuery({
    queryKey: ['leagues', activeSite, sport],
    queryFn: () => getAPI(activeSite).get(`/leagues?sport=${sport}`).then(r => r.data.data || []),
  })

  useEffect(() => {
    if (leagues.length && !leagueId) setLeagueId(leagues[0]._id)
  }, [leagues, leagueId])

  // When switching competitions, default the season to that league's
  // current season (bumped from the Competitions tab) rather than leaving
  // whatever season was selected before.
  useEffect(() => {
    const l = leagues.find(l => l._id === leagueId)
    if (l) setSeason(l.season || currentSeasonGuess())
  }, [leagueId]) // eslint-disable-line react-hooks/exhaustive-deps

  const { data: seasonsList = [], isFetching: seasonsFetching } = useQuery({
    queryKey: ['roster-seasons', activeSite, leagueId],
    queryFn: () => getAPI(activeSite).get(`/leagues/${leagueId}/roster-seasons`).then(r => r.data.data || []),
    enabled: !!leagueId,
  })

  const { data: roster = [], isLoading: rosterLoading, isFetching: rosterFetching } = useQuery({
    queryKey: ['roster', activeSite, leagueId, season],
    queryFn: () => getAPI(activeSite).get(`/leagues/${leagueId}/roster?season=${season}`).then(r => r.data.data || []),
    enabled: !!leagueId && !!season,
  })

  const { data: allTeams = [], isFetching: allTeamsFetching } = useQuery({
    queryKey: ['teams', activeSite, sport],
    queryFn: () => getAPI(activeSite).get(`/teams?sport=${sport}`).then(r => r.data.data || []),
  })

  const loading = rosterLoading
  const isFetching = leaguesFetching || seasonsFetching || rosterFetching || allTeamsFetching

  useEffect(() => {
    const handler = (e) => { if (assignRef.current && !assignRef.current.contains(e.target)) setAssignOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Invalidates the queries this page depends on -- used both after a
  // mutation (so the UI reflects the change) and by the manual Refresh
  // button (so the person can force a fresh pull on demand instead of it
  // happening automatically on every visit).
  const refreshAll = () => {
    queryClient.invalidateQueries({ queryKey: ['leagues', activeSite, sport] })
    queryClient.invalidateQueries({ queryKey: ['roster-seasons', activeSite, leagueId] })
    queryClient.invalidateQueries({ queryKey: ['roster', activeSite, leagueId, season] })
    queryClient.invalidateQueries({ queryKey: ['teams', activeSite, sport] })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!leagueId) return toast.error('Pick a competition first')
    if (!season) return toast.error('Pick a season first')
    try {
      const api = getAPI(activeSite)
      const payload = { ...form, founded: form.founded ? parseInt(form.founded) : null, sport }
      let teamId = editingId
      if (editingId) {
        await api.put(`/teams/${editingId}`, payload)
        toast.success('Team updated')
      } else {
        const res = await api.post('/teams', payload)
        teamId = res.data.data._id
        await api.post(`/leagues/${leagueId}/roster`, { teamId, season })
        toast.success('Team created and added to this season')
      }
      setForm(emptyForm)
      setEditingId(null)
      refreshAll()
    } catch (e) { toast.error(e.response?.data?.message || 'Failed to save') }
  }

  const handleEdit = (t) => {
    setEditingId(t._id)
    setForm({ name: t.name, shortName: t.shortName || '', logo: t.logo || '', country: t.country || '', founded: t.founded || '', stadium: t.stadium || '' })
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this team? This removes it permanently, including from every season\'s roster it was ever part of.')) return
    try {
      await getAPI(activeSite).delete(`/teams/${id}`)
      toast.success('Team deleted')
      refreshAll()
    } catch (e) { toast.error(e.response?.data?.message || 'Failed to delete') }
  }

  // Pulls a team off this league+season's roster. The team itself, and its
  // membership in any other season, is untouched.
  const handleUnassign = async (t) => {
    try {
      await getAPI(activeSite).delete(`/leagues/${leagueId}/roster/${t._id}?season=${season}`)
      toast.success(`${t.name} removed from ${season}/${String(season + 1).slice(2)}`)
      refreshAll()
    } catch (e) { toast.error('Failed to unassign') }
  }

  // Adds an existing team to this league+season's roster.
  const handleAssign = async (t) => {
    if (!leagueId) return toast.error('Pick a competition first')
    setAssigning(t._id)
    try {
      await getAPI(activeSite).post(`/leagues/${leagueId}/roster`, { teamId: t._id, season })
      toast.success(`${t.name} added to ${season}/${String(season + 1).slice(2)}`)
      setAssignSearch('')
      setAssignOpen(false)
      refreshAll()
    } catch (e) { toast.error('Failed to assign') }
    finally { setAssigning(null) }
  }

  const currentLeague = leagues.find(l => l._id === leagueId)
  const rosterIds = new Set(roster.map(t => t._id))
  const assignCandidates = allTeams
    .filter(t => !rosterIds.has(t._id)) // hide teams already on this season's roster
    .filter(t => t.name.toLowerCase().includes(assignSearch.toLowerCase()))
    .slice(0, 50)

  const seasonLabel = (s) => `${s}/${String(s + 1).slice(2)}`

  return (
    <div>
      <div className="mb-4 flex items-end gap-3 flex-wrap justify-between">
        <div className="flex items-end gap-3 flex-wrap">
        <div>
          <label className="text-gray-400 text-xs uppercase tracking-widest block mb-1.5">Competition</label>
          <select
            value={leagueId}
            onChange={e => { setLeagueId(e.target.value); setEditingId(null); setForm(emptyForm) }}
            className="bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2 text-sm outline-none focus:border-yellow-400 min-w-[220px]"
          >
            <option value="">Select a competition...</option>
            {leagues.map(l => <option key={l._id} value={l._id}>{l.name}</option>)}
          </select>
        </div>

        <div>
          <label className="text-gray-400 text-xs uppercase tracking-widest block mb-1.5">Season</label>
          <input
            type="number"
            value={season}
            onChange={e => setSeason(parseInt(e.target.value) || '')}
            disabled={!leagueId}
            className="bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2 text-sm outline-none focus:border-yellow-400 w-28 disabled:opacity-50"
          />
        </div>

        {seasonsList.length > 0 && (
          <div className="flex items-center gap-1.5 pb-2.5">
            <span className="text-gray-600 text-xs">Recorded:</span>
            {seasonsList.map(s => (
              <button
                key={s}
                type="button"
                onClick={() => setSeason(s)}
                className={`text-xs px-2 py-1 rounded-md transition-all ${s === season ? 'bg-yellow-400 text-black font-semibold' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
              >
                {seasonLabel(s)}
              </button>
            ))}
          </div>
        )}

        {currentLeague && season === currentLeague.season && (
          <div className="text-gray-500 text-xs pb-2.5">— this is {currentLeague.name}'s current season</div>
        )}
        </div>

        <button
          type="button"
          onClick={refreshAll}
          disabled={isFetching}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-sm text-gray-200 transition-colors shrink-0 mb-0.5"
        >
          <MdRefresh className={isFetching ? 'animate-spin' : ''} size={16} />
          {isFetching ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="space-y-6">
          <div className="bg-gray-800 rounded-xl p-5">
            <h3 className="text-white font-semibold mb-4">{editingId ? 'Edit Team' : 'Add New Team'}</h3>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="text-gray-400 text-xs uppercase tracking-widest block mb-1.5">Name *</label>
                <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2 text-sm outline-none focus:border-yellow-400" />
              </div>
              <div>
                <label className="text-gray-400 text-xs uppercase tracking-widest block mb-1.5">Short name</label>
                <input value={form.shortName} onChange={e => setForm(f => ({ ...f, shortName: e.target.value }))} placeholder="e.g. MUN"
                  className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2 text-sm outline-none focus:border-yellow-400" />
              </div>
              <LogoPickerField kind="team" value={form.logo} onChange={logo => setForm(f => ({ ...f, logo }))} nameHint={form.name} />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-400 text-xs uppercase tracking-widest block mb-1.5">Country</label>
                  <input value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))}
                    className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2 text-sm outline-none focus:border-yellow-400" />
                </div>
                <div>
                  <label className="text-gray-400 text-xs uppercase tracking-widest block mb-1.5">Founded</label>
                  <input type="number" value={form.founded} onChange={e => setForm(f => ({ ...f, founded: e.target.value }))}
                    className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2 text-sm outline-none focus:border-yellow-400" />
                </div>
              </div>
              <div>
                <label className="text-gray-400 text-xs uppercase tracking-widest block mb-1.5">Stadium</label>
                <input value={form.stadium} onChange={e => setForm(f => ({ ...f, stadium: e.target.value }))}
                  className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2 text-sm outline-none focus:border-yellow-400" />
              </div>
              <div className="flex gap-2 pt-1">
                <Button type="submit" disabled={!leagueId || !season} className="flex-1 justify-center">
                  {editingId ? <><MdCheck size={16} /> Update</> : <><MdAdd size={16} /> Add to {season ? seasonLabel(season) : '...'}</>}
                </Button>
                {editingId && (
                  <Button type="button" variant="secondary" onClick={() => { setEditingId(null); setForm(emptyForm) }}>
                    <MdClose size={16} />
                  </Button>
                )}
              </div>
            </form>
          </div>

          <div ref={assignRef} className="bg-gray-800 rounded-xl p-5 relative">
            <h3 className="text-white font-semibold mb-1">Assign Existing Team</h3>
            <p className="text-gray-500 text-xs mb-3">Add a team already in the database to this competition's {season ? seasonLabel(season) : ''} roster — for promotions, relegations, or a new season rollover.</p>
            <div className="relative">
              <MdSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                value={assignSearch}
                onFocus={() => setAssignOpen(true)}
                onChange={e => { setAssignSearch(e.target.value); setAssignOpen(true) }}
                placeholder={leagueId ? 'Search teams...' : 'Pick a competition first'}
                disabled={!leagueId || !season}
                className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg pl-8 pr-3 py-2 text-sm outline-none focus:border-yellow-400 disabled:opacity-50"
              />
            </div>

            {assignOpen && leagueId && season && (
              <div className="absolute z-40 left-5 right-5 mt-1 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl max-h-72 overflow-y-auto">
                {assignCandidates.length === 0 ? (
                  <div className="text-gray-600 text-xs text-center py-4">No matching teams</div>
                ) : assignCandidates.map(t => (
                  <button
                    key={t._id}
                    type="button"
                    disabled={assigning === t._id}
                    onClick={() => handleAssign(t)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-gray-800 text-left disabled:opacity-50"
                  >
                    {t.logo ? <img src={t.logo} alt="" className="w-5 h-5 object-contain shrink-0" /> : <div className="w-5 h-5 shrink-0" />}
                    <div className="min-w-0 flex-1">
                      <div className="text-gray-200 text-xs font-medium truncate">{t.name}</div>
                      <div className="text-gray-500 text-[11px]">{t.league?.name || 'Unassigned'} (current)</div>
                    </div>
                    <MdLink size={14} className="text-gray-600 shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="md:col-span-2 bg-gray-800 rounded-xl overflow-hidden self-start">
          <div className="p-4 border-b border-gray-700">
            <h3 className="text-white font-semibold">
              Roster {currentLeague && season ? `— ${currentLeague.name} ${seasonLabel(season)}` : ''} ({roster.length})
            </h3>
          </div>
          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading...</div>
          ) : !leagueId ? (
            <div className="p-8 text-center text-gray-500">Pick a competition above to view its roster</div>
          ) : !season ? (
            <div className="p-8 text-center text-gray-500">Pick a season above</div>
          ) : roster.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No teams recorded for {seasonLabel(season)} yet — add one, or assign an existing team from the panel on the left</div>
          ) : (
            <div className="divide-y divide-gray-700">
              {roster.map(t => (
                <div key={t._id} className="flex items-center justify-between gap-2 px-5 py-3 hover:bg-gray-750">
                  <div className="flex items-center gap-3 min-w-0">
                    {t.logo && <img src={t.logo} alt="" className="w-6 h-6 object-contain shrink-0" />}
                    <div className="min-w-0">
                      <div className="text-white text-sm font-medium truncate">{t.name}</div>
                      <div className="text-gray-500 text-xs truncate">{t.stadium || '—'} {t.founded ? `· est. ${t.founded}` : ''}</div>
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(t)} title="Edit team details"><MdEdit size={14} /></Button>
                    <Button variant="ghost" size="sm" onClick={() => handleUnassign(t)} title={`Remove from ${seasonLabel(season)} (keeps the team)`}><MdLinkOff size={14} /></Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(t._id)} className="hover:text-red-400" title="Delete team permanently"><MdDelete size={14} /></Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}