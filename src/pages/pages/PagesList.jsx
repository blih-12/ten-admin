import { Link } from 'react-router-dom'
import { MdChevronRight, MdWebAsset } from 'react-icons/md'
import { useAuth } from '../../context/AuthContext'

// Static registry of pages the admin can edit. Adding a new page here is
// all it takes to expose it in the admin -- the PageSectionEditor itself
// is fully generic and reads/writes whatever sections exist for the slug.
const PAGES = [
  { slug: 'home', name: 'Home', description: 'Hero banner, promo banner, section headings' },
  { slug: 'sports', name: 'Sports', description: 'Page header, banner image, SEO' },
  { slug: 'results', name: 'Results & Fixtures', description: 'Page header, empty state message, SEO' },
  { slug: 'transfers', name: 'Transfers', description: 'Page header, banner image, SEO' },
  { slug: 'about', name: 'About', description: 'Hero, who we are, what we cover, stats, join us CTA' },
  { slug: 'contact', name: 'Contact', description: 'Hero and contact details' },
]

export default function PagesList() {
  const { activeSite } = useAuth()

  if (activeSite !== 'sports') {
    return (
      <div className="bg-gray-800 rounded-xl p-8 text-center text-gray-500">
        Page editing is only available on the Sports site right now. Switch site from the sidebar to continue.
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-white text-2xl font-bold">Pages</h1>
        <p className="text-gray-500 text-sm mt-1">Pick a page to edit its content -- every field on the live site is listed and editable here.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {PAGES.map(page => (
          <Link
            key={page.slug}
            to={`/pages/${page.slug}`}
            className="bg-gray-800 hover:bg-gray-750 border border-gray-700 hover:border-yellow-400/50 rounded-xl p-5 flex items-center justify-between transition-all group"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-gray-700 group-hover:bg-yellow-400/10 flex items-center justify-center text-gray-400 group-hover:text-yellow-400 transition-all">
                <MdWebAsset size={20} />
              </div>
              <div>
                <div className="text-white font-semibold">{page.name}</div>
                <div className="text-gray-500 text-xs mt-0.5">{page.description}</div>
              </div>
            </div>
            <MdChevronRight size={20} className="text-gray-600 group-hover:text-yellow-400 transition-all" />
          </Link>
        ))}
      </div>
    </div>
  )
}
