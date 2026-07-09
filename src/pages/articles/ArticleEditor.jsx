import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import ReactQuill from 'react-quill'
import 'react-quill/dist/quill.snow.css'
import { useAuth } from '../../context/AuthContext'
import { getAPI } from '../../utils/api'
import Button from '../../components/ui/Button'
import toast from 'react-hot-toast'
import { MdSave, MdPublish, MdArrowBack, MdImage, MdStar, MdWhatshot } from 'react-icons/md'

const modules = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ list: 'ordered' }, { list: 'bullet' }],
    ['blockquote', 'code-block'],
    ['link', 'image'],
    ['clean'],
  ],
}

const emptyForm = {
  title: '', subheading: '', excerpt: '', content: '', category: '',
  tags: '', source: '', status: 'draft', isFeatured: false, isBreaking: false,
  isHero: false, isTopStory: false,
  teams: [], competitions: [],
  embeddedVideo: '',
  seo: { metaTitle: '', metaDescription: '', keywords: '' },
  featuredImage: { url: '', publicId: '', alt: '' },
}

export default function ArticleEditor() {
  const { id } = useParams()
  const { activeSite } = useAuth()
  const navigate = useNavigate()
  const isEdit = !!id

  const [form, setForm] = useState(emptyForm)
  const [categories, setCategories] = useState([])
  const [teams, setTeams] = useState([])
  const [competitions, setCompetitions] = useState([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [activeTab, setActiveTab] = useState('content')

  useEffect(() => {
    const api = getAPI(activeSite)
    api.get('/categories').then(res => setCategories(res.data.data || [])).catch(() => {})
    api.get('/teams').then(res => setTeams(res.data.data || [])).catch(() => {})
    api.get('/leagues').then(res => setCompetitions(res.data.data || [])).catch(() => {})

    if (isEdit) {
      api.get(`/articles/admin/all?limit=100`).then(res => {
        const article = res.data.data?.find(a => a._id === id)
        if (article) {
          setForm({
            title: article.title || '',
            subheading: article.subheading || '',
            excerpt: article.excerpt || '',
            content: article.content || '',
            category: article.category?._id || '',
            tags: article.tags?.join(', ') || '',
            source: article.source || '',
            status: article.status || 'draft',
            isFeatured: article.isFeatured || false,
            isBreaking: article.isBreaking || false,
            isHero: article.isHero || false,
            isTopStory: article.isTopStory || false,
            teams: article.teams?.map(t => t._id || t) || [],
            competitions: article.competitions?.map(c => c._id || c) || [],
            embeddedVideo: article.embeddedVideo || '',
            featuredImage: article.featuredImage || { url: '', publicId: '', alt: '' },
            seo: {
              metaTitle: article.seo?.metaTitle || '',
              metaDescription: article.seo?.metaDescription || '',
              keywords: article.seo?.keywords?.join(', ') || '',
            },
          })
        }
      })
    }
  }, [activeSite, id])

  const handleImageUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('image', file)
      const res = await getAPI(activeSite).post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setForm(f => ({ ...f, featuredImage: { url: res.data.data.url, publicId: res.data.data.publicId, alt: f.title } }))
      toast.success('Image uploaded')
    } catch (e) { toast.error('Image upload failed') }
    finally { setUploading(false) }
  }

  // Tagging a team auto-adds that team's competition too, since a story
  // about a team almost always belongs on its league's page as well.
  // Editors can still untick the auto-added competition afterwards --
  // this only fires the moment a team checkbox is ticked, it doesn't
  // force-lock anything.
  const toggleTeam = (teamId) => {
    setForm(f => {
      const has = f.teams.includes(teamId)
      const nextTeams = has ? f.teams.filter(t => t !== teamId) : [...f.teams, teamId]
      let nextCompetitions = f.competitions
      if (!has) {
        const team = teams.find(t => t._id === teamId)
        if (team?.league && !nextCompetitions.includes(team.league)) {
          nextCompetitions = [...nextCompetitions, team.league]
        }
      }
      return { ...f, teams: nextTeams, competitions: nextCompetitions }
    })
  }

  const toggleCompetition = (compId) => {
    setForm(f => ({
      ...f,
      competitions: f.competitions.includes(compId)
        ? f.competitions.filter(c => c !== compId)
        : [...f.competitions, compId],
    }))
  }

  const handleSave = async (status) => {
    if (!form.title || !form.excerpt || !form.content) {
      toast.error('Please fill in title, excerpt and content')
      return
    }
    setLoading(true)
    try {
      const api = getAPI(activeSite)
      const payload = {
        ...form,
        status,
        category: form.category || undefined,
        tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
        seo: { ...form.seo, keywords: form.seo.keywords.split(',').map(k => k.trim()).filter(Boolean) },
      }
      if (isEdit) {
        await api.put(`/articles/${id}`, payload)
        toast.success('Article updated')
      } else {
        await api.post('/articles', payload)
        toast.success('Article created')
      }
      navigate('/articles')
    } catch (e) { toast.error(e.response?.data?.message || 'Failed to save') }
    finally { setLoading(false) }
  }

  const tabs = ['content', 'media', 'seo', 'settings']

  return (
    <div>
      <div className="flex items-start justify-between mb-6 gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/articles')}><MdArrowBack size={16} /> Back</Button>
          <h1 className="text-white text-xl font-bold">{isEdit ? 'Edit Article' : 'New Article'}</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => handleSave('draft')} disabled={loading}><MdSave size={16} /> Save Draft</Button>
          <Button onClick={() => handleSave('published')} disabled={loading}><MdPublish size={16} /> Publish</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main editor */}
        <div className="lg:col-span-2 space-y-4">
          <input
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            placeholder="Article title..."
            className="w-full bg-gray-800 text-white text-xl font-bold border border-gray-700 rounded-xl px-5 py-4 outline-none focus:border-yellow-400 placeholder-gray-600"
          />
          <input
            value={form.subheading}
            onChange={e => setForm(f => ({ ...f, subheading: e.target.value }))}
            placeholder="Sub-heading (optional)..."
            className="w-full bg-gray-800 text-white text-sm border border-gray-700 rounded-xl px-5 py-3 outline-none focus:border-yellow-400 placeholder-gray-600"
          />
          <textarea
            value={form.excerpt}
            onChange={e => setForm(f => ({ ...f, excerpt: e.target.value }))}
            placeholder="Short excerpt (max 300 characters)..."
            maxLength={300}
            rows={3}
            className="w-full bg-gray-800 text-white border border-gray-700 rounded-xl px-5 py-4 outline-none focus:border-yellow-400 resize-none text-sm placeholder-gray-600"
          />

          {/* Tabs */}
          <div className="flex gap-1 bg-gray-900 p-1 rounded-lg">
            {tabs.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2 rounded-md text-xs font-semibold capitalize transition-all ${
                  activeTab === tab ? 'bg-yellow-400 text-black' : 'text-gray-400 hover:text-white'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {activeTab === 'content' && (
            <div className="bg-white rounded-xl overflow-hidden">
              <ReactQuill
                value={form.content}
                onChange={val => setForm(f => ({ ...f, content: val }))}
                modules={modules}
                theme="snow"
              />
            </div>
          )}

          {activeTab === 'media' && (
            <div className="bg-gray-800 rounded-xl p-5 space-y-4">
              <h3 className="text-white font-semibold">Featured Image</h3>
              {form.featuredImage.url && (
                <img src={form.featuredImage.url} alt="Featured" className="w-full h-48 object-cover rounded-lg" />
              )}
              <label className="flex items-center gap-2 cursor-pointer bg-gray-700 hover:bg-gray-600 text-white rounded-lg px-4 py-3 text-sm transition-all w-fit">
                <MdImage size={18} />
                {uploading ? 'Uploading...' : 'Upload Image'}
                <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" disabled={uploading} />
              </label>
              <div>
                <label className="text-gray-400 text-xs uppercase tracking-widest block mb-2">YouTube Embed URL</label>
                <input
                  value={form.embeddedVideo}
                  onChange={e => setForm(f => ({ ...f, embeddedVideo: e.target.value }))}
                  placeholder="https://www.youtube.com/embed/..."
                  className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-yellow-400"
                />
              </div>
            </div>
          )}

          {activeTab === 'seo' && (
            <div className="bg-gray-800 rounded-xl p-5 space-y-4">
              <h3 className="text-white font-semibold">SEO Settings</h3>
              {[
                { label: 'Meta Title', key: 'metaTitle', placeholder: 'SEO title (50-60 chars)' },
                { label: 'Meta Description', key: 'metaDescription', placeholder: 'SEO description (150-160 chars)' },
                { label: 'Keywords', key: 'keywords', placeholder: 'keyword1, keyword2, keyword3' },
              ].map(field => (
                <div key={field.key}>
                  <label className="text-gray-400 text-xs uppercase tracking-widest block mb-2">{field.label}</label>
                  <input
                    value={form.seo[field.key]}
                    onChange={e => setForm(f => ({ ...f, seo: { ...f.seo, [field.key]: e.target.value } }))}
                    placeholder={field.placeholder}
                    className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-yellow-400"
                  />
                </div>
              ))}
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="bg-gray-800 rounded-xl p-5 space-y-4">
              <h3 className="text-white font-semibold">Article Settings</h3>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={form.isFeatured} onChange={e => setForm(f => ({ ...f, isFeatured: e.target.checked }))} className="w-4 h-4 accent-yellow-400" />
                <span className="text-white text-sm">Featured article</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={form.isBreaking} onChange={e => setForm(f => ({ ...f, isBreaking: e.target.checked }))} className="w-4 h-4 accent-yellow-400" />
                <span className="text-white text-sm">Breaking news</span>
              </label>

              <div className="pt-4 border-t border-gray-700 space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={form.isHero} onChange={e => setForm(f => ({ ...f, isHero: e.target.checked }))} className="w-4 h-4 accent-yellow-400" />
                  <span className="text-white text-sm flex items-center gap-1"><MdStar size={14} className="text-yellow-400" /> Set as homepage Main News (hero)</span>
                </label>
                <p className="text-gray-500 text-xs pl-7 -mt-2">
                  Publishing this as hero automatically pushes whatever is currently the hero down into Side News, and the oldest Side News item down into Latest News. Nothing to configure manually.
                </p>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={form.isTopStory} onChange={e => setForm(f => ({ ...f, isTopStory: e.target.checked }))} className="w-4 h-4 accent-yellow-400" />
                  <span className="text-white text-sm flex items-center gap-1"><MdWhatshot size={14} className="text-orange-400" /> Pin to Top Stories for its team/competition</span>
                </label>
                <p className="text-gray-500 text-xs pl-7 -mt-2">
                  Each team/competition page shows its top 6 stories. Pinned stories always appear there; the rest of the 6 fill in automatically with the most recent articles.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="bg-gray-800 rounded-xl p-5 space-y-4">
            <h3 className="text-white font-semibold border-b border-gray-700 pb-3">Details</h3>
            <div>
              <label className="text-gray-400 text-xs uppercase tracking-widest block mb-2">Category</label>
              <select
                value={form.category}
                onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-yellow-400"
              >
                <option value="">Select category</option>
                {categories.map(cat => (
                  <option key={cat._id} value={cat._id}>{cat.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-gray-400 text-xs uppercase tracking-widest block mb-2">Tags</label>
              <input
                value={form.tags}
                onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
                placeholder="football, transfer, premier league"
                className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-yellow-400"
              />
              <p className="text-gray-600 text-xs mt-1">Comma separated</p>
            </div>
            <div>
              <label className="text-gray-400 text-xs uppercase tracking-widest block mb-2">Byline / Source</label>
              <input
                value={form.source}
                onChange={e => setForm(f => ({ ...f, source: e.target.value }))}
                placeholder="e.g. Admin, BBC News, Reuters"
                className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-yellow-400"
              />
              <p className="text-gray-500 text-xs mt-1">Leave blank to default to your account name.</p>
            </div>
            <div>
              <label className="text-gray-400 text-xs uppercase tracking-widest block mb-2">Status</label>
              <select
                value={form.status}
                onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-yellow-400"
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>

          <div className="bg-gray-800 rounded-xl p-5 space-y-3">
            <h3 className="text-white font-semibold border-b border-gray-700 pb-3">Teams</h3>
            <p className="text-gray-500 text-xs -mt-1">Tagging a team also tags its competition below automatically.</p>
            <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
              {teams.length === 0 && <div className="text-gray-600 text-xs">No teams found</div>}
              {teams.map(team => (
                <label key={team._id} className="flex items-center gap-2 cursor-pointer text-sm">
                  <input
                    type="checkbox"
                    checked={form.teams.includes(team._id)}
                    onChange={() => toggleTeam(team._id)}
                    className="w-4 h-4 accent-yellow-400"
                  />
                  <span className="text-gray-300">{team.name}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="bg-gray-800 rounded-xl p-5 space-y-3">
            <h3 className="text-white font-semibold border-b border-gray-700 pb-3">Competitions</h3>
            <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
              {competitions.length === 0 && <div className="text-gray-600 text-xs">No competitions found</div>}
              {competitions.map(comp => (
                <label key={comp._id} className="flex items-center gap-2 cursor-pointer text-sm">
                  <input
                    type="checkbox"
                    checked={form.competitions.includes(comp._id)}
                    onChange={() => toggleCompetition(comp._id)}
                    className="w-4 h-4 accent-yellow-400"
                  />
                  <span className="text-gray-300">{comp.name}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Button className="w-full justify-center" onClick={() => handleSave('published')} disabled={loading}>
              <MdPublish size={16} /> {loading ? 'Saving...' : 'Publish Now'}
            </Button>
            <Button variant="secondary" className="w-full justify-center" onClick={() => handleSave('draft')} disabled={loading}>
              <MdSave size={16} /> Save as Draft
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
