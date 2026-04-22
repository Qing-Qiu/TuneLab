const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command
const COLLECTION = 'schulte_records'
const VALID_SIZES = [4, 5, 6]

exports.main = async (event = {}) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const action = event.action
  const data = event.data || {}

  switch (action) {
    case 'submitRecord':
      return submitRecord(openid, data)
    case 'getRecords':
      return getRecords(openid, data)
    case 'updateProfile':
      return updateProfile(openid, data)
    default:
      return { code: 1, msg: 'Invalid action' }
  }
}

async function submitRecord(openid, { size, elapsedMs, mistakes = 0, userInfo = {} }) {
  try {
    const safeSize = Number(size)
    const safeElapsed = Math.round(Number(elapsedMs) || 0)
    const safeMistakes = Math.max(0, Math.round(Number(mistakes) || 0))

    if (!VALID_SIZES.includes(safeSize)) return { code: 1, msg: 'Invalid size' }
    if (safeElapsed <= 0 || safeElapsed > 20 * 60 * 1000) return { code: 1, msg: 'Invalid elapsed' }

    await ensureCollection(COLLECTION)
    const now = Date.now()
    const displayName = getDisplayName(openid, userInfo)
    const res = await db.collection(COLLECTION).where({
      openid,
      size: safeSize
    }).limit(1).get()
    const current = res.data[0]

    if (!current) {
      const record = {
        openid,
        size: safeSize,
        elapsedMs: safeElapsed,
        mistakes: safeMistakes,
        displayName,
        playCount: 1,
        createdAt: db.serverDate(),
        createdAtMs: now,
        updatedAt: db.serverDate(),
        updatedAtMs: now
      }
      await db.collection(COLLECTION).add({ data: record })
      return { code: 0, improved: true, data: record }
    }

    const improved = safeElapsed < Number(current.elapsedMs || Infinity)
      || (safeElapsed === Number(current.elapsedMs || Infinity) && safeMistakes < Number(current.mistakes || Infinity))
    const updateData = {
      displayName,
      playCount: _.inc(1),
      lastElapsedMs: safeElapsed,
      lastMistakes: safeMistakes,
      updatedAt: db.serverDate(),
      updatedAtMs: now
    }

    if (improved) {
      updateData.elapsedMs = safeElapsed
      updateData.mistakes = safeMistakes
      updateData.bestAt = db.serverDate()
      updateData.bestAtMs = now
    }

    await db.collection(COLLECTION).doc(current._id).update({ data: updateData })
    return {
      code: 0,
      improved,
      data: {
        ...current,
        ...updateData,
        elapsedMs: improved ? safeElapsed : current.elapsedMs,
        mistakes: improved ? safeMistakes : current.mistakes
      }
    }
  } catch (error) {
    console.error('Submit schulte record failed:', error)
    return { code: 1, msg: 'Submit failed', error }
  }
}

async function getRecords(openid, { size }) {
  try {
    const safeSize = Number(size)
    if (!VALID_SIZES.includes(safeSize)) return { code: 1, msg: 'Invalid size' }

    const mineRes = await db.collection(COLLECTION).where({
      openid,
      size: safeSize
    }).limit(1).get()
    const globalRes = await db.collection(COLLECTION)
      .where({ size: safeSize })
      .orderBy('elapsedMs', 'asc')
      .orderBy('mistakes', 'asc')
      .orderBy('updatedAtMs', 'asc')
      .limit(20)
      .get()

    return {
      code: 0,
      mine: sanitizeRecord(mineRes.data[0]),
      global: (globalRes.data || []).map(sanitizeRecord).filter(Boolean)
    }
  } catch (error) {
    console.warn('Get schulte records failed:', error)
    return { code: 0, mine: null, global: [] }
  }
}

async function updateProfile(openid, { userInfo = {} }) {
  try {
    await ensureCollection(COLLECTION)
    const displayName = getDisplayName(openid, userInfo)
    const now = Date.now()
    const res = await db.collection(COLLECTION).where({ openid }).update({
      data: {
        displayName,
        updatedAt: db.serverDate(),
        updatedAtMs: now
      }
    })

    return {
      code: 0,
      displayName,
      updated: (res.stats && res.stats.updated) || 0
    }
  } catch (error) {
    console.error('Update schulte profile failed:', error)
    return { code: 1, msg: 'Update profile failed', error }
  }
}

async function ensureCollection(name) {
  try {
    if (db.createCollection) {
      await db.createCollection(name)
    }
  } catch (error) {
    // Already exists or current environment does not allow creation.
  }
}

function sanitizeRecord(record) {
  if (!record) return null
  return {
    size: record.size,
    elapsedMs: Number(record.elapsedMs || 0),
    mistakes: Number(record.mistakes || 0),
    displayName: record.displayName || '听友',
    playCount: Number(record.playCount || 1),
    updatedAtMs: Number(record.updatedAtMs || 0)
  }
}

function getDisplayName(openid, userInfo = {}) {
  const rawName = String(userInfo.nickName || userInfo.name || '').trim()
  if (rawName) return rawName.slice(0, 16)
  const tail = String(openid || '').slice(-4).toUpperCase()
  return tail ? `听友${tail}` : '听友'
}
