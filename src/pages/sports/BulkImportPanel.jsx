import { useState } from 'react'
import { getAPI } from '../../utils/api'
import Button from '../../components/ui/Button'
import toast from 'react-hot-toast'
import { MdUploadFile, MdClose } from 'react-icons/md'

// Accepts CSV with either a header row or this fixed column order:
//   date, homeTeam, awayTeam, homeScore, awayScore, round, venue
// homeScore/awayScore/round/venue are optional -- leave blank for
// not-yet-played fixtures, fill in for historical results.
// Header names are matched loosely (case-insensitive, ignores spaces/underscores).
const HEADER_ALIASES = {
  date: ['date'],
  homeTeam: ['hometeam', 'home', 'home team'],
  awayTeam: ['awayteam', 'away', 'away team'],
  homeScore: ['homescore', 'home score', 'homegoals'],
  awayScore: ['awayscore', 'away score', 'awaygoals'],
  round: ['round', 'matchday', 'week'],
  venue: ['venue', 'stadium'],
}

function normalize(s) { return s.trim().toLowerCase().replace(/[\s_]+/g, ' ') }

function parseCSV(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
  if (!lines.length) return []

  const firstCells = lines[0].split(',').map(c => c.trim())
  const looksLikeHeader = firstCells.some(c => HEADER_ALIASES.date.includes(normalize(c)))

  let colMap = { date: 0, homeTeam: 1, awayTeam: 2, homeScore: 3, awayScore: 4, round: 5, venue: 6 }
  let dataLines = lines

  if (looksLikeHeader) {
    colMap = {}
    firstCells.forEach((cell, i) => {
      const n = normalize(cell)
      for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
        if (aliases.includes(n)) colMap[field] = i
      }
    })
    dataLines = lines.slice(1)
  }

  return dataLines.map(line => {
    const cells = line.split(',').map(c => c.trim())
    const get = (field) => colMap[field] !== undefined ? cells[colMap[field]] : ''
    return {
      date: get('date'),
      homeTeam: get('homeTeam'),
      awayTeam: get('awayTeam'),
      homeScore: get('homeScore'),
      awayScore: get('awayScore'),
      round: get('round'),
      venue: get('venue'),
    }
  }).filter(r => r.date && r.homeTeam && r.awayTeam)
}

export default function BulkImportPanel({ activeSite, leagueId, defaultSeason, onImported, onClose }) {
  const [season, setSeason] = useState(defaultSeason || new Date().getFullYear())
  const [text, setText] = useState('')
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState(null)

  const preview = parseCSV(text)

  const handleImport = async () => {
    if (!leagueId) return toast.error('Pick a competition first')
    if (!preview.length) return toast.error('No valid rows detected -- check the format')
    setImporting(true)
    setResult(null)
    try {
      const res = await getAPI(activeSite).post('/fixtures/import', {
        league: leagueId, season: parseInt(season), results: preview,
      })
      setResult(res.data)
      toast.success(`Imported ${res.data.imported ?? preview.length} fixture(s)`)
      onImported?.()
    } catch (e) {
      toast.error(e.response?.data?.message || 'Import failed')
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="bg-gray-800 border border-yellow-400/30 rounded-xl p-5 mb-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-white font-semibold flex items-center gap-2"><MdUploadFile size={18} /> Bulk Import Results</h3>
        <button onClick={onClose} className="text-gray-500 hover:text-white"><MdClose size={18} /></button>
      </div>

      <p className="text-gray-500 text-xs mb-3">
        Paste CSV -- with or without a header row. Columns: <code className="text-gray-400">date, homeTeam, awayTeam, homeScore, awayScore, round, venue</code>.
        Score/round/venue are optional. Use this for old-season data (e.g. from openfootball) -- each row becomes a finished fixture tagged to the season below.
      </p>

      <div className="flex items-center gap-3 mb-3">
        <label className="text-gray-400 text-xs uppercase tracking-widest">Season</label>
        <input type="number" value={season} onChange={e => setSeason(e.target.value)}
          className="bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-1.5 text-sm w-28 outline-none focus:border-yellow-400" />
        <span className="text-gray-600 text-xs">e.g. 2024 for the 2024/25 season</span>
      </div>

      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        rows={8}
        placeholder={'date,homeTeam,awayTeam,homeScore,awayScore,round,venue\n2024-08-17,Arsenal,Wolves,2,0,1,Emirates Stadium\n2024-08-17,Everton,Brighton,0,3,1,'}
        className="w-full bg-gray-950 text-green-400 font-mono text-xs border border-gray-600 rounded-lg px-3 py-2 outline-none focus:border-yellow-400 resize-y"
      />

      <div className="flex items-center justify-between mt-3">
        <div className="text-gray-500 text-xs">{preview.length} row{preview.length !== 1 ? 's' : ''} detected</div>
        <Button onClick={handleImport} disabled={importing || !preview.length}>
          {importing ? 'Importing...' : `Import ${preview.length || ''} Fixture${preview.length !== 1 ? 's' : ''}`}
        </Button>
      </div>

      {result && (
        <div className="mt-3 text-xs bg-gray-900 rounded-lg p-3">
          <div className="text-green-400">Imported: {result.imported ?? 0}</div>
          {result.skipped > 0 && <div className="text-yellow-500">Skipped: {result.skipped}</div>}
          {result.errors?.length > 0 && (
            <div className="text-red-400 mt-1 max-h-24 overflow-y-auto">
              {result.errors.map((e, i) => <div key={i}>{e}</div>)}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
