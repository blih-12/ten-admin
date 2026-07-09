import { useState, useEffect, useMemo } from 'react'
import { getAPI } from '../../utils/api'
import { TEAM_LOGOS, COMPETITION_LOGOS } from '../../data/logos'
import { toOverrideMap, mergeLogoList, defaultDisplayName } from '../../utils/logoAliases'
import toast from 'react-hot-toast'
import { MdSearch, MdEdit, MdCheck, MdClose, MdRestore } from 'react-icons/md'

// Which bundled logo entry is currently being edited: { kind, slug } or null
function EditRow({ entry, kind, onSaved, onCancel }) {
  const [displayName, setDisplayName] = useState(entry.displayName)
  const [aliasText, setAliasText] = useState(entry.aliases.join(', '))
  const [saving, setSaving] = useState(false)

  const save = async () => {
    if (!displayName.trim()) return toast.error('Name cannot be empty')
    setSaving(true)
    try {
      const aliases = aliasText.split(',').map(a => a.trim()).filter(Boolean)
      const res = await getAPI('sports').put(`/logo-aliases/${kind}/${entry.slug}`, { displayName: displayName.trim(), aliases })
      toast.success(`Saved "${displayName.trim()}"`)
      onSaved(res.data.data)
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="px-4 py-3 bg-gray-750 bg-gray-700/40 flex flex-col sm:flex-row gap-2 sm:items-center">
      <img src={entry.path} alt="" className="w-8 h-8 object-contain shrink-0" />
      <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-2 gap-2">
        <input
          autoFocus
          value={displayName}
          onChange={e => setDisplayName(e.target.value)}
          placeholder="Display name"
          className="w-full bg-gray-800 text-white border border-gray-600 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-yellow-400"
        />
        <input
          value={aliasText}
          onChange={e => setAliasText(e.target.value)}
          placeholder="Aliases, comma separated (e.g. man utd, mufc)"
          className="w-full bg-gray-800 text-white border border-gray-600 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-yellow-400"
        />
      </div>
      <div className="flex gap-1 shrink-0">
        <button onClick={save} disabled={saving} className="p-2 text-green-400 hover:bg-gray-700 rounded-lg disabled:opacity-50" title="Save">
          <MdCheck size={16} />
        </button>
        <button onClick={onCancel} className="p-2 text-gray-400 hover:bg-gray-700 rounded-lg" title="Cancel">
          <MdClose size={16} />
        </button>
      </div>
    </div>
  )
}

export default function LogoLibrary() {
  const [overrides, setOverrides] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [kindFilter, setKindFilter] = useState('all') // all | team | competition
  const [editing, setEditing] = useState(null) // { kind, slug } | null

  const fetchOverrides = async () => {
    setLoading(true)
    try {
      const res = await getAPI('sports').get('/logo-aliases')
      setOverrides(res.data.data || [])
    } catch (e) {
      toast.error('Failed to load logo names -- backend may not have the /logo-aliases route yet')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchOverrides() }, [])

  const overrideMap = useMemo(() => toOverrideMap(overrides), [overrides])

  const allEntries = useMemo(() => {
    const teams = mergeLogoList(TEAM_LOGOS, 'team', overrideMap).map(e => ({ ...e, kind: 'team' }))
    const comps = mergeLogoList(COMPETITION_LOGOS, 'competition', overrideMap).map(e => ({ ...e, kind: 'competition' }))
    return [...teams, ...comps]
  }, [overrideMap])

  const filtered = useMemo(() => {
    return allEntries
      .filter(e => kindFilter === 'all' || e.kind === kindFilter)
      .filter(e => !search || e.searchText.includes(search.toLowerCase()))
  }, [allEntries, kindFilter, search])

  const handleSaved = (item) => {
    setOverrides(prev => {
      const others = prev.filter(o => !(o.kind === item.kind && o.slug === item.slug))
      return [...others, item]
    })
    setEditing(null)
  }

  const handleReset = async (entry, kind) => {
    if (!confirm(`Reset "${entry.displayName}" back to the default name?`)) return
    try {
      await getAPI('sports').delete(`/logo-aliases/${kind}/${entry.slug}`)
      setOverrides(prev => prev.filter(o => !(o.kind === kind && o.slug === entry.slug)))
      toast.success('Reset to default')
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to reset')
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-1 min-w-[220px]">
          <div className="relative flex-1">
            <MdSearch size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search bundled logos..."
              className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg pl-9 pr-3 py-2 text-sm outline-none focus:border-yellow-400"
            />
          </div>
        </div>
        <div className="flex gap-1 bg-gray-900 p-1 rounded-lg">
          {[['all', 'All'], ['team', 'Teams'], ['competition', 'Competitions']].map(([v, label]) => (
            <button
              key={v}
              onClick={() => setKindFilter(v)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                kindFilter === v ? 'bg-yellow-400 text-black' : 'text-gray-400 hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <p className="text-gray-500 text-xs mb-3">
        These names/aliases only control how each bundled logo shows up and gets found when searching the logo picker across the admin.
        They don't rename the team or competition record itself -- do that from the Teams / Competitions pages.
      </p>

      <div className="bg-gray-800 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No matches</div>
        ) : (
          <div className="divide-y divide-gray-700 max-h-[65vh] overflow-y-auto">
            {filtered.map(entry => {
              const isEditing = editing?.kind === entry.kind && editing?.slug === entry.slug
              const isOverridden = !!overrideMap[`${entry.kind}:${entry.slug}`]

              if (isEditing) {
                return (
                  <EditRow
                    key={`${entry.kind}:${entry.slug}`}
                    entry={entry}
                    kind={entry.kind}
                    onSaved={handleSaved}
                    onCancel={() => setEditing(null)}
                  />
                )
              }

              return (
                <div key={`${entry.kind}:${entry.slug}`} className="flex items-center justify-between gap-2 px-4 py-2.5 hover:bg-gray-750">
                  <div className="flex items-center gap-3 min-w-0">
                    <img src={entry.path} alt="" className="w-7 h-7 object-contain shrink-0" />
                    <div className="min-w-0">
                      <div className="text-white text-sm font-medium truncate flex items-center gap-1.5">
                        {entry.displayName}
                        <span className="text-gray-600 text-[10px] uppercase tracking-widest border border-gray-700 rounded px-1 py-0.5 shrink-0">{entry.kind}</span>
                      </div>
                      <div className="text-gray-500 text-xs truncate">
                        {entry.slug}{entry.aliases.length > 0 ? ` \u00b7 aliases: ${entry.aliases.join(', ')}` : ''}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    {isOverridden && (
                      <button onClick={() => handleReset(entry, entry.kind)} className="p-2 text-gray-500 hover:text-yellow-400 hover:bg-gray-700 rounded-lg" title="Reset to default name">
                        <MdRestore size={16} />
                      </button>
                    )}
                    <button onClick={() => setEditing({ kind: entry.kind, slug: entry.slug })} className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg" title="Rename / edit aliases">
                      <MdEdit size={16} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
