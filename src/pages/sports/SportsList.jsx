import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { getAPI } from '../../utils/api'
import { MdChevronRight, MdSportsSoccer } from 'react-icons/md'
import toast from 'react-hot-toast'

export default function SportsList() {
  const { activeSite } = useAuth()
  const [sports, setSports] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (activeSite !== 'sports') return
    (async () => {
      setLoading(true)
      try {
        const res = await getAPI(activeSite).get('/nav-items/admin/all')
        setSports(res.data.data || [])
      } catch (e) { toast.error('Failed to load sports') }
      finally { setLoading(false) }
    })()
  }, [activeSite])

  if (activeSite !== 'sports') {
    return (
      <div className="bg-gray-800 rounded-xl p-8 text-center text-gray-500">
        Sports management is only available on the Sports site. Switch site from the sidebar to continue.
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-white text-2xl font-bold">Sports</h1>
        <p className="text-gray-500 text-sm mt-1">Pick a sport to manage its news, results & fixtures, transfers, teams, competitions, and table.</p>
      </div>

      {loading ? (
        <div className="p-8 text-center text-gray-500">Loading...</div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {sports.map(sport => (
            <Link
              key={sport._id}
              to={`/sports/${sport.slug}`}
              className={`bg-gray-800 hover:bg-gray-750 border border-gray-700 hover:border-yellow-400/50 rounded-xl p-5 flex items-center justify-between transition-all group ${!sport.isActive ? 'opacity-50' : ''}`}
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-gray-700 group-hover:bg-yellow-400/10 flex items-center justify-center text-gray-400 group-hover:text-yellow-400 transition-all">
                  <MdSportsSoccer size={20} />
                </div>
                <div>
                  <div className="text-white font-semibold">{sport.label}</div>
                  <div className="text-gray-500 text-xs mt-0.5">{sport.subnav?.length || 0} sub-pages{!sport.isActive ? ' — hidden from nav' : ''}</div>
                </div>
              </div>
              <MdChevronRight size={20} className="text-gray-600 group-hover:text-yellow-400 transition-all" />
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
