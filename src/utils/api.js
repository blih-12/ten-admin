import axios from 'axios'

// The admin panel manages two separate backends (Sports / News), switched
// via the sidebar's site toggle. getAPI(site) returns an axios instance
// pointed at the right one, with the auth token attached on every call --
// reading straight from localStorage rather than relying on a global axios
// default header, since that can go stale across a site switch or a
// page refresh timing gap.
export const getAPI = (site) => {
  const base = site === 'sports' ? import.meta.env.VITE_SPORTS_API_URL : import.meta.env.VITE_NEWS_API_URL
  const instance = axios.create({ baseURL: base })
  instance.interceptors.request.use(config => {
    const token = localStorage.getItem('token')
    if (token) config.headers.Authorization = `Bearer ${token}`
    return config
  })
  return instance
}

export const formatDate = (date) => new Date(date).toLocaleDateString('en-GB', {
  day: 'numeric', month: 'long', year: 'numeric'
})

export const timeAgo = (date) => {
  const seconds = Math.floor((new Date() - new Date(date)) / 1000)
  if (seconds < 60) return 'Just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`
  return formatDate(date)
}

export const truncate = (str, n) => str?.length > n ? str.slice(0, n) + '...' : str

export const readTime = (content = '') => {
  const words = content.replace(/<[^>]*>/g, '').trim().split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.round(words / 200))
}

export default getAPI
