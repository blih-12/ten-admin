import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { getAPI } from '../../utils/api'
import toast from 'react-hot-toast'
import { MdArrowBack } from 'react-icons/md'
import NewsPanel from './NewsPanel'
import FixturesManager from './FixturesManager'
import TeamsManager from './TeamsManager'
import CompetitionsManager from './CompetitionsManager'
import TableManager from './TableManager'

// Maps a nav sub-nav "tab" key to the admin component that manages it.
const TAB_COMPONENTS = {
  news:         (props) => <NewsPanel {...props} transfersOnly={false} />,
  transfers:    (props) => <NewsPanel {...props} transfersOnly={true} />,
  results:      (props) => <FixturesManager {...props} />,
  teams:        (props) => <TeamsManager {...props} />,
  competitions: (props) => <CompetitionsManager {...props} />,
  table:        (props) => <TableManager {...props} />,
  standings:    (props) => <TableManager {...props} />,
}

export default function SportDetail() {
  const { slug } = useParams()
  const { activeSite } = useAuth()
  const [sport, setSport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState(null)

  useEffect(() => {
    if (activeSite !== 'sports') return
    setLoading(true)
    getAPI(activeSite).get('/nav-items/admin/all').then(res => {
      const found = (res.data.data || []).find(s => s.slug === slug)
      setSport(found || null)
      if (found?.subnav?.length) setActiveTab([...found.subnav].sort((a, b) => a.order - b.order)[0].tab)
    }).catch(() => toast.error('Failed to load sport'))
      .finally(() => setLoading(false))
  }, [activeSite, slug])

  if (activeSite !== 'sports') {
    return (
      <div className="bg-gray-800 rounded-xl p-8 text-center text-gray-500">
        Sports management is only available on the Sports site. Switch site from the sidebar to continue.
      </div>
    )
  }

  if (loading) return <div className="p-8 text-center text-gray-500">Loading...</div>
  if (!sport) return <div className="bg-gray-800 rounded-xl p-8 text-center text-gray-500">Sport not found</div>

  const sortedSubnav = [...sport.subnav].sort((a, b) => a.order - b.order)
  const ActiveComponent = TAB_COMPONENTS[activeTab]

  return (
    <div>
      <Link to="/sports" className="inline-flex items-center gap-1.5 text-gray-500 hover:text-white text-sm mb-4">
        <MdArrowBack size={16} /> All sports
      </Link>
      <h1 className="text-white text-2xl font-bold mb-5">{sport.label}</h1>

      <div className="flex gap-1 border-b border-gray-700 mb-6 overflow-x-auto">
        {sortedSubnav.map(s => (
          <button
            key={s.tab}
            onClick={() => setActiveTab(s.tab)}
            className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-all ${
              activeTab === s.tab ? 'border-yellow-400 text-white' : 'border-transparent text-gray-500 hover:text-gray-300'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {ActiveComponent
        ? <ActiveComponent activeSite={activeSite} sport={sport.slug} />
        : <div className="text-gray-500 text-sm">Select a tab above</div>}
    </div>
  )
}
