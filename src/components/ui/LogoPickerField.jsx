import { useState, useRef, useEffect, useMemo } from 'react'
import { useAuth } from '../../context/AuthContext'
import { getAPI } from '../../utils/api'
import toast from 'react-hot-toast'
import { MdSearch, MdImage, MdClose } from 'react-icons/md'
import { TEAM_LOGOS, COMPETITION_LOGOS } from '../../data/logos'
import { toOverrideMap, mergeLogoList } from '../../utils/logoAliases'

// kind: 'team' | 'competition'
// value: current logo path stored on the form
// onChange: (newPath) => void
// nameHint: the name currently typed in the Name field, used to prefill search
export default function LogoPickerField({ kind, value, onChange, nameHint = '' }) {
  const { activeSite } = useAuth()
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [uploading, setUploading] = useState(false)
  const [overrides, setOverrides] = useState([])
  const ref = useRef(null)

  useEffect(() => {
    getAPI('sports').get('/logo-aliases').then(res => setOverrides(res.data.data || [])).catch(() => {})
  }, [])

  const overrideMap = useMemo(() => toOverrideMap(overrides), [overrides])
  const list = useMemo(
    () => mergeLogoList(kind === 'team' ? TEAM_LOGOS : COMPETITION_LOGOS, kind, overrideMap),
    [kind, overrideMap]
  )

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const openPicker = () => {
    setSearch(nameHint || '')
    setOpen(true)
  }

  const filtered = list.filter(item => item.searchText.includes(search.toLowerCase()))

  const handleUpload = async (file) => {
    if (!file) return
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('image', file)
      const res = await getAPI(activeSite).post('/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
      onChange(res.data.data.url)
      toast.success('Logo uploaded')
      setOpen(false)
    } catch (e) {
      toast.error('Upload failed')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div ref={ref} className="relative">
      <label className="text-gray-400 text-xs uppercase tracking-widest block mb-1.5">Logo</label>
      <div className="flex items-center gap-2">
        <div className="w-9 h-9 rounded-lg bg-gray-700 flex items-center justify-center shrink-0 overflow-hidden">
          {value ? <img src={value} alt="" className="w-full h-full object-contain p-1" /> : <MdImage size={16} className="text-gray-500" />}
        </div>
        <button
          type="button"
          onClick={openPicker}
          className="flex-1 text-left bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2 text-sm outline-none hover:border-yellow-400 truncate"
        >
          {value || 'Choose from existing logos or upload...'}
        </button>
        {value && (
          <button type="button" onClick={() => onChange('')} className="text-gray-500 hover:text-red-400 shrink-0">
            <MdClose size={16} />
          </button>
        )}
      </div>

      {open && (
        <div className="absolute z-50 mt-2 w-full bg-gray-900 border border-gray-700 rounded-xl shadow-2xl p-3">
          <div className="relative mb-2">
            <MdSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              autoFocus
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={`Search ${kind === 'team' ? 'teams' : 'competitions'}...`}
              className="w-full bg-gray-800 text-white border border-gray-600 rounded-lg pl-8 pr-3 py-2 text-xs outline-none focus:border-yellow-400"
            />
          </div>

          <div className="max-h-80 overflow-y-auto space-y-0.5">
            {filtered.length === 0 ? (
              <div className="text-gray-600 text-xs text-center py-3">No match in the bundled logo set</div>
            ) : filtered.map(item => (
              <button
                key={item.path}
                type="button"
                onClick={() => { onChange(item.path); setOpen(false) }}
                className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-gray-800 text-left"
              >
                <img src={item.path} alt="" className="w-5 h-5 object-contain shrink-0" />
                <span className="text-gray-300 text-xs truncate">{item.displayName}</span>
              </button>
            ))}
          </div>

          <div className="border-t border-gray-700 mt-2 pt-2">
            <label className="flex items-center justify-center gap-1.5 cursor-pointer bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-semibold rounded-lg px-3 py-2 transition-all">
              <MdImage size={14} />
              {uploading ? 'Uploading...' : "Not listed? Upload one"}
              <input type="file" accept="image/*" className="hidden" disabled={uploading}
                onChange={e => handleUpload(e.target.files[0])} />
            </label>
          </div>
        </div>
      )}
    </div>
  )
}
