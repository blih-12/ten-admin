import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '../../context/AuthContext'
import { getAPI } from '../../utils/api'
import toast from 'react-hot-toast'
import { MdImage, MdSearch, MdCheckCircle, MdWarning } from 'react-icons/md'

function LogoRow({ entity, kind, onUploaded }) {
  const { activeSite } = useAuth()
  const [uploading, setUploading] = useState(false)

  const handleUpload = async (file) => {
    if (!file) return
    setUploading(true)
    try {
      const api = getAPI(activeSite)
      const formData = new FormData()
      formData.append('image', file)
      const uploadRes = await api.post('/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
      const url = uploadRes.data.data.url
      const endpoint = kind === 'team' ? `/teams/${entity._id}` : `/leagues/${entity._id}`
      await api.put(endpoint, { logo: url })
      toast.success(`Logo assigned to ${entity.name}`)
      onUploaded()
    } catch (e) {
      toast.error(e.response?.data?.message || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="flex items-center justify-between px-4 py-2.5 hover:bg-gray-750">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-9 h-9 rounded-lg bg-gray-700 flex items-center justify-center shrink-0 overflow-hidden">
          {entity.logo
            ? <img src={entity.logo} alt={entity.name} className="w-full h-full object-contain p-1" />
            : <MdWarning size={16} className="text-yellow-500" />}
        </div>
        <div className="min-w-0">
          <div className="text-white text-sm font-medium truncate">{entity.name}</div>
          <div className="text-gray-500 text-xs">
            {kind === 'team' ? (entity.league?.name || entity.sport) : entity.sport}
            {entity.country ? ` \u00b7 ${entity.country}` : ''}
          </div>
        </div>
      </div>
      <label className={`flex items-center gap-1.5 shrink-0 cursor-pointer text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${
        entity.logo ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' : 'bg-yellow-400 hover:bg-yellow-300 text-black'
      }`}>
        <MdImage size={14} />
        {uploading ? 'Uploading...' : entity.logo ? 'Replace' : 'Upload'}
        <input type="file" accept="image/*" className="hidden" disabled={uploading}
          onChange={e => handleUpload(e.target.files[0])} />
      </label>
    </div>
  )
}

export default function LogoManager() {
  const { activeSite } = useAuth()
  const [teams, setTeams] = useState([])
  const [leagues, setLeagues] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [missingOnly, setMissingOnly] = useState(false)

  const fetchAll = async () => {
    setLoading(true)
    try {
      const api = getAPI(activeSite)
      const [teamsRes, leaguesRes] = await Promise.all([
        api.get('/teams'),
        api.get('/leagues'),
      ])
      setTeams(teamsRes.data.data || [])
      setLeagues(leaguesRes.data.data || [])
    } catch (e) {
      toast.error('Failed to load teams/competitions')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchAll() }, [activeSite])

  const filteredLeagues = useMemo(() => {
    return leagues
      .filter(l => !missingOnly || !l.logo)
      .filter(l => l.name.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [leagues, search, missingOnly])

  const filteredTeams = useMemo(() => {
    return teams
      .filter(t => !missingOnly || !t.logo)
      .filter(t => t.name.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [teams, search, missingOnly])

  const missingCount = teams.filter(t => !t.logo).length + leagues.filter(l => !l.logo).length

  if (activeSite !== 'sports') {
    return (
      <div className="bg-gray-800 rounded-xl p-8 text-center text-gray-500">
        Logo management is only available on the Sports site.
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <div className="relative flex-1">
            <MdSearch size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search teams or competitions..."
              className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg pl-9 pr-3 py-2 text-sm outline-none focus:border-yellow-400"
            />
          </div>
          <label className="flex items-center gap-2 text-xs text-gray-400 whitespace-nowrap cursor-pointer">
            <input type="checkbox" checked={missingOnly} onChange={e => setMissingOnly(e.target.checked)} className="w-4 h-4 accent-yellow-400" />
            Missing logos only
          </label>
        </div>
        <div className="text-xs text-gray-500 flex items-center gap-1.5">
          {missingCount === 0
            ? <><MdCheckCircle size={14} className="text-green-500" /> All logos assigned</>
            : <><MdWarning size={14} className="text-yellow-500" /> {missingCount} missing logo{missingCount !== 1 ? 's' : ''}</>}
        </div>
      </div>

      {loading ? (
        <div className="p-8 text-center text-gray-500">Loading...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-800 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-gray-700">
              <h3 className="text-white font-semibold text-sm">Competitions & Leagues ({filteredLeagues.length})</h3>
            </div>
            {filteredLeagues.length === 0 ? (
              <div className="p-6 text-center text-gray-600 text-sm">No matches</div>
            ) : (
              <div className="divide-y divide-gray-700 max-h-[600px] overflow-y-auto">
                {filteredLeagues.map(l => <LogoRow key={l._id} entity={l} kind="league" onUploaded={fetchAll} />)}
              </div>
            )}
          </div>

          <div className="bg-gray-800 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-gray-700">
              <h3 className="text-white font-semibold text-sm">Teams ({filteredTeams.length})</h3>
            </div>
            {filteredTeams.length === 0 ? (
              <div className="p-6 text-center text-gray-600 text-sm">No matches</div>
            ) : (
              <div className="divide-y divide-gray-700 max-h-[600px] overflow-y-auto">
                {filteredTeams.map(t => <LogoRow key={t._id} entity={t} kind="team" onUploaded={fetchAll} />)}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
