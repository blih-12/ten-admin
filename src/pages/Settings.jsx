import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { getAPI } from '../utils/api'
import Button from '../components/ui/Button'
import toast from 'react-hot-toast'
import { MdSportsSoccer, MdNewspaper, MdWarning } from 'react-icons/md'

const SPORTS = ['football', 'tennis', 'formula-1', 'nfl', 'nba', 'rugby', 'golf', 'boxing']

function DangerZone() {
  const { user, activeSite } = useAuth()
  const [leagues, setLeagues] = useState([])
  const [scope, setScope] = useState('league')
  const [leagueId, setLeagueId] = useState('')
  const [sport, setSport] = useState('football')
  const [wipeTeams, setWipeTeams] = useState(true)
  const [wipeFixtures, setWipeFixtures] = useState(true)
  const [wipeStandings, setWipeStandings] = useState(true)
  const [resetSeasonTo, setResetSeasonTo] = useState(2026)
  const [confirmText, setConfirmText] = useState('')
  const [working, setWorking] = useState(false)

  useEffect(() => {
    if (activeSite !== 'sports') return
    getAPI(activeSite).get('/leagues').then(res => {
      const ls = res.data.data || []
      setLeagues(ls)
      if (ls.length && !leagueId) setLeagueId(ls[0]._id)
    }).catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSite])

  if (activeSite !== 'sports' || user?.role !== 'admin') return null

  const scopeLabel = scope === 'league'
    ? leagues.find(l => l._id === leagueId)?.name || 'this competition'
    : scope === 'sport' ? `every ${sport} competition` : 'EVERY competition on the Sports site'

  const handleReset = async () => {
    if (confirmText !== 'RESET') return toast.error('Type RESET to confirm')
    if (!wipeTeams && !wipeFixtures && !wipeStandings && !resetSeasonTo) {
      return toast.error('Nothing selected to do')
    }
    setWorking(true)
    try {
      const payload = {
        scope,
        leagueId: scope === 'league' ? leagueId : undefined,
        sport: scope === 'sport' ? sport : undefined,
        wipeTeams, wipeFixtures, wipeStandings,
        resetSeasonTo: resetSeasonTo ? parseInt(resetSeasonTo) : undefined,
      }
      const res = await getAPI(activeSite).post('/sports-data/reset', payload)
      const d = res.data.data
      toast.success(
        `Done -- ${d.teamsDeleted ?? 0} team(s), ${d.fixturesDeleted ?? 0} fixture(s), ${d.standingsDeleted ?? 0} standing(s) deleted` +
        (d.seasonResetTo ? `, season set to ${d.seasonResetTo} for ${d.leaguesUpdated} competition(s)` : '')
      )
      setConfirmText('')
    } catch (e) {
      toast.error(e.response?.data?.message || 'Reset failed')
    } finally {
      setWorking(false)
    }
  }

  return (
    <div className="bg-gray-800 rounded-xl p-5 border border-red-500/30 md:col-span-2">
      <h2 className="text-red-400 font-semibold border-b border-gray-700 pb-3 mb-4 flex items-center gap-2">
        <MdWarning size={18} /> Danger Zone -- Reset Sports Data
      </h2>
      <p className="text-gray-500 text-xs mb-4">
        Clears Teams, Fixtures, and/or Standings so you can start a season clean (e.g. wipe old test data and begin the 2026/27 season).
        Competitions themselves are never deleted here -- only the data under them. This cannot be undone.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
        <div>
          <label className="text-gray-400 text-xs uppercase tracking-widest block mb-1.5">Scope</label>
          <select value={scope} onChange={e => setScope(e.target.value)}
            className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2 text-sm outline-none focus:border-red-400">
            <option value="league">One competition</option>
            <option value="sport">One whole sport</option>
            <option value="all">Everything (all sports)</option>
          </select>
        </div>
        {scope === 'league' && (
          <div>
            <label className="text-gray-400 text-xs uppercase tracking-widest block mb-1.5">Competition</label>
            <select value={leagueId} onChange={e => setLeagueId(e.target.value)}
              className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2 text-sm outline-none focus:border-red-400">
              {leagues.map(l => <option key={l._id} value={l._id}>{l.name}</option>)}
            </select>
          </div>
        )}
        {scope === 'sport' && (
          <div>
            <label className="text-gray-400 text-xs uppercase tracking-widest block mb-1.5">Sport</label>
            <select value={sport} onChange={e => setSport(e.target.value)}
              className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2 text-sm outline-none focus:border-red-400">
              {SPORTS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        )}
        <div>
          <label className="text-gray-400 text-xs uppercase tracking-widest block mb-1.5">Reset season to</label>
          <input type="number" value={resetSeasonTo} onChange={e => setResetSeasonTo(e.target.value)}
            placeholder="e.g. 2026" className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2 text-sm outline-none focus:border-red-400" />
        </div>
      </div>

      <div className="flex gap-5 mb-4">
        {[['wipeTeams', wipeTeams, setWipeTeams, 'Teams'], ['wipeFixtures', wipeFixtures, setWipeFixtures, 'Fixtures'], ['wipeStandings', wipeStandings, setWipeStandings, 'Standings']].map(([key, val, setter, label]) => (
          <label key={key} className="flex items-center gap-2 cursor-pointer text-sm text-gray-300">
            <input type="checkbox" checked={val} onChange={e => setter(e.target.checked)} className="w-4 h-4 accent-red-500" />
            {label}
          </label>
        ))}
      </div>

      <p className="text-yellow-500 text-xs mb-3">This will affect: <strong>{scopeLabel}</strong></p>

      <div className="flex items-center gap-3 flex-wrap">
        <input
          value={confirmText}
          onChange={e => setConfirmText(e.target.value)}
          placeholder='Type "RESET" to confirm'
          className="bg-gray-900 text-white border border-red-500/50 rounded-lg px-3 py-2 text-sm outline-none focus:border-red-400 w-full sm:w-56"
        />
        <Button
          onClick={handleReset}
          disabled={working || confirmText !== 'RESET'}
          variant="danger"
        >
          {working ? 'Working...' : 'Reset Now'}
        </Button>
      </div>
    </div>
  )
}

export default function Settings() {
  const { user, activeSite } = useAuth()
  return (
    <div>
      <h1 className="text-white text-2xl font-bold mb-6">Settings</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gray-800 rounded-xl p-5 space-y-4">
          <h2 className="text-white font-semibold border-b border-gray-700 pb-3">Account</h2>
          <div>
            <label className="text-gray-400 text-xs uppercase tracking-widest block mb-2">Name</label>
            <input defaultValue={user?.name} className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-yellow-400" />
          </div>
          <div>
            <label className="text-gray-400 text-xs uppercase tracking-widest block mb-2">Email</label>
            <input defaultValue={user?.email} className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-yellow-400" />
          </div>
          <div>
            <label className="text-gray-400 text-xs uppercase tracking-widest block mb-2">New Password</label>
            <input type="password" placeholder="Leave blank to keep current" className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-yellow-400" />
          </div>
          <button className="bg-yellow-400 text-black px-4 py-2 rounded-lg text-sm font-semibold hover:bg-yellow-300 transition-all">Save Changes</button>
        </div>

        <div className="bg-gray-800 rounded-xl p-5">
          <h2 className="text-white font-semibold border-b border-gray-700 pb-3 mb-4">Active Site</h2>
          <div className={`p-4 rounded-lg border-2 ${activeSite === 'sports' ? 'border-yellow-400 bg-yellow-400/10' : 'border-white bg-white/10'}`}>
            <div className="text-white font-bold text-lg flex items-center gap-2">
              {activeSite === 'sports' ? <MdSportsSoccer className="text-yellow-400" /> : <MdNewspaper />}
              {activeSite === 'sports' ? 'Ten Sports' : 'Ten News'}
            </div>
            <div className="text-gray-400 text-sm mt-1">Currently managing this site</div>
          </div>
          <p className="text-gray-500 text-xs mt-4">Switch sites using the sidebar toggle.</p>
        </div>

        <DangerZone />
      </div>
    </div>
  )
}
