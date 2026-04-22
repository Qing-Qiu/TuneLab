const cloud = require('wx-server-sdk')
const axios = require('axios')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const CACHE_COLLECTION = 'lyric_cache'
const POSITIVE_TTL = 7 * 24 * 60 * 60 * 1000
const EMPTY_TTL = 5 * 60 * 1000
const REQUEST_TIMEOUT = 6500
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'

exports.main = async (event = {}) => {
  const rid = String(event.rid || '').trim()
  const forceRefresh = !!event.forceRefresh

  if (!rid) {
    return buildResult({
      ok: false,
      code: 'MISSING_RID',
      message: 'Missing song id',
      lyrics: []
    })
  }

  if (!forceRefresh) {
    const cached = await readLyricCache(rid)
    if (cached && cached.fresh) {
      return buildResult({
        ok: Array.isArray(cached.lyrics) && cached.lyrics.length > 0,
        code: cached.code || 'CACHE_HIT',
        source: 'cache',
        cached: true,
        retryable: false,
        message: cached.message || '',
        lyrics: cached.lyrics || []
      })
    }
  }

  try {
    const lyrics = await fetchLyricsWithRetry(rid)
    await writeLyricCache(rid, lyrics, {
      code: lyrics.length ? 'OK' : 'EMPTY',
      message: lyrics.length ? '' : 'No lyric lines found',
      ttl: lyrics.length ? POSITIVE_TTL : EMPTY_TTL
    })

    return buildResult({
      ok: lyrics.length > 0,
      code: lyrics.length ? 'OK' : 'EMPTY',
      source: 'kuwo',
      cached: false,
      retryable: false,
      message: lyrics.length ? '' : 'No lyric lines found',
      lyrics
    })
  } catch (error) {
    console.error('Fetch lyric failed:', error && error.message ? error.message : error)

    const stale = await readLyricCache(rid, { allowExpired: true })
    if (stale && Array.isArray(stale.lyrics) && stale.lyrics.length) {
      return buildResult({
        ok: true,
        code: 'STALE_CACHE',
        source: 'cache',
        cached: true,
        stale: true,
        retryable: true,
        message: 'Using stale lyric cache',
        lyrics: stale.lyrics
      })
    }

    return buildResult({
      ok: false,
      code: getErrorCode(error),
      source: 'kuwo',
      cached: false,
      retryable: true,
      message: error && error.message ? error.message : 'Lyric request failed',
      lyrics: []
    })
  }
}

function buildResult({ ok, code, source = '', cached = false, stale = false, retryable = false, message = '', lyrics = [] }) {
  return {
    ok: !!ok,
    code,
    source,
    cached,
    stale,
    retryable,
    message,
    data: normalizeLyrics(lyrics),
    lyrics: normalizeLyrics(lyrics)
  }
}

async function readLyricCache(rid, options = {}) {
  try {
    const res = await db.collection(CACHE_COLLECTION).where({ rid }).limit(1).get()
    const doc = res && res.data && res.data[0]
    if (!doc) return null

    const expiresAtMs = Number(doc.expiresAtMs || 0)
    const fresh = options.allowExpired || !expiresAtMs || expiresAtMs > Date.now()
    if (!fresh) return { ...doc, fresh: false }

    return {
      ...doc,
      fresh: true,
      lyrics: normalizeLyrics(doc.lyrics || doc.data || [])
    }
  } catch (error) {
    console.warn('Read lyric cache skipped:', error && error.message ? error.message : error)
    return null
  }
}

async function writeLyricCache(rid, lyrics, meta = {}) {
  const now = Date.now()
  const payload = {
    rid,
    lyrics: normalizeLyrics(lyrics),
    code: meta.code || 'OK',
    message: meta.message || '',
    updatedAt: db.serverDate(),
    updatedAtMs: now,
    expiresAtMs: now + (meta.ttl || POSITIVE_TTL)
  }

  try {
    await ensureCollection(CACHE_COLLECTION)
    const res = await db.collection(CACHE_COLLECTION).where({ rid }).limit(1).get()
    const doc = res && res.data && res.data[0]
    if (doc && doc._id) {
      await db.collection(CACHE_COLLECTION).doc(doc._id).update({ data: payload })
      return
    }
    await db.collection(CACHE_COLLECTION).add({ data: payload })
  } catch (error) {
    console.warn('Write lyric cache skipped:', error && error.message ? error.message : error)
  }
}

async function ensureCollection(name) {
  try {
    if (db.createCollection) {
      await db.createCollection(name)
    }
  } catch (error) {
    // Existing collections also reject here, which is fine.
  }
}

async function fetchLyricsWithRetry(rid) {
  const urls = buildLyricUrls(rid)
  let lastError = null

  for (let urlIndex = 0; urlIndex < urls.length; urlIndex += 1) {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const response = await axios.get(urls[urlIndex], {
          timeout: REQUEST_TIMEOUT,
          headers: {
            'User-Agent': USER_AGENT,
            Referer: 'https://m.kuwo.cn/',
            Accept: 'application/json,text/plain,*/*'
          }
        })

        const lyrics = extractLyrics(response && response.data)
        if (lyrics.length) return lyrics

        lastError = new Error('Empty lyric response')
      } catch (error) {
        lastError = error
      }

      if (attempt < 2) {
        await sleep(350 * (attempt + 1) + urlIndex * 250)
      }
    }
  }

  throw lastError || new Error('Lyric request failed')
}

function buildLyricUrls(rid) {
  const reqId = `${Date.now()}-${Math.random().toString(16).slice(2)}`
  const encodedRid = encodeURIComponent(rid)
  return [
    `https://m.kuwo.cn/newh5/singles/songinfoandlrc?musicId=${encodedRid}&httpsStatus=1&reqId=${reqId}`,
    `http://m.kuwo.cn/newh5/singles/songinfoandlrc?musicId=${encodedRid}&httpsStatus=1&reqId=${reqId}`
  ]
}

function extractLyrics(payload) {
  if (!payload) return []
  if (Array.isArray(payload)) return normalizeLyrics(payload)
  if (payload.data && Array.isArray(payload.data.lrclist)) return normalizeLyrics(payload.data.lrclist)
  if (payload.data && Array.isArray(payload.data.lyrics)) return normalizeLyrics(payload.data.lyrics)
  if (Array.isArray(payload.lrclist)) return normalizeLyrics(payload.lrclist)
  if (Array.isArray(payload.lyrics)) return normalizeLyrics(payload.lyrics)
  return []
}

function normalizeLyrics(lyrics) {
  if (!Array.isArray(lyrics)) return []
  return lyrics
    .map((item) => {
      if (typeof item === 'string') {
        return { lineLyric: item.trim(), time: '0' }
      }
      if (!item || typeof item !== 'object') return null
      return {
        lineLyric: String(item.lineLyric || item.lyric || item.text || item.content || '').trim(),
        time: String(item.time || item.startTime || item.timestamp || '0')
      }
    })
    .filter((item) => item && item.lineLyric)
}

function getErrorCode(error) {
  if (!error) return 'UNKNOWN'
  if (error.code === 'ECONNABORTED') return 'TIMEOUT'
  if (error.response && error.response.status) return `HTTP_${error.response.status}`
  return error.code || 'REQUEST_FAILED'
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}
