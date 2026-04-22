const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command
const COLLECTION = 'place_songs'
const MAX_LIST = 80

exports.main = async (event = {}) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const action = event.action
  const data = event.data || {}

  switch (action) {
    case 'list':
      return listPlaceSongs(openid, data)
    case 'create':
      return createPlaceSong(openid, data)
    case 'like':
      return likePlaceSong(openid, data)
    case 'delete':
      return deletePlaceSong(openid, data)
    default:
      return { code: 1, msg: 'Invalid action' }
  }
}

async function ensureCollection(name) {
  try {
    if (db.createCollection) {
      await db.createCollection(name)
    }
  } catch (error) {
    // Existing collections reject here, which is fine.
  }
}

async function listPlaceSongs(openid, { limit = MAX_LIST } = {}) {
  try {
    await ensureCollection(COLLECTION)
    const pageSize = Math.max(1, Math.min(Number(limit) || MAX_LIST, MAX_LIST))
    const res = await db.collection(COLLECTION)
      .orderBy('createdAtMs', 'desc')
      .limit(pageSize * 2)
      .get()

    return {
      code: 0,
      data: res.data
        .filter((item) => item.deleted !== true)
        .slice(0, pageSize)
        .map((item) => sanitizeEntry(item, openid))
    }
  } catch (error) {
    console.error('List place songs failed:', error)
    return { code: 1, msg: 'List failed', error }
  }
}

async function createPlaceSong(openid, data = {}) {
  try {
    await ensureCollection(COLLECTION)
    const entry = normalizeEntry(openid, data)
    if (!entry.placeName || !entry.songName || !entry.note) {
      return { code: 1, msg: 'Missing required fields' }
    }
    if (!Number.isFinite(entry.latitude) || !Number.isFinite(entry.longitude)) {
      return { code: 1, msg: 'Invalid location' }
    }

    const res = await db.collection(COLLECTION).add({ data: entry })
    return {
      code: 0,
      id: res._id,
      data: sanitizeEntry({ ...entry, _id: res._id }, openid)
    }
  } catch (error) {
    console.error('Create place song failed:', error)
    return { code: 1, msg: 'Create failed', error }
  }
}

async function likePlaceSong(openid, { id = '' }) {
  try {
    if (!id) return { code: 1, msg: 'Missing id' }
    const doc = await db.collection(COLLECTION).doc(String(id)).get()
    const entry = doc.data
    if (!entry || entry.deleted === true) return { code: 1, msg: 'Entry not found' }
    if (entry.openid === openid) return { code: 1, msg: 'Owner cannot like own entry' }

    const likedOpenids = Array.isArray(entry.likedOpenids) ? entry.likedOpenids : []
    if (likedOpenids.includes(openid)) {
      return {
        code: 0,
        liked: true,
        likeCount: Number(entry.likeCount || likedOpenids.length || 0)
      }
    }

    const likeCount = Number(entry.likeCount || likedOpenids.length || 0) + 1
    await db.collection(COLLECTION).doc(String(id)).update({
      data: {
        likedOpenids: _.addToSet(openid),
        likeCount: _.inc(1),
        updatedAt: db.serverDate(),
        updatedAtMs: Date.now()
      }
    })

    return {
      code: 0,
      liked: true,
      likeCount
    }
  } catch (error) {
    console.error('Like place song failed:', error)
    return { code: 1, msg: 'Like failed', error }
  }
}

async function deletePlaceSong(openid, { id = '' }) {
  try {
    if (!id) return { code: 1, msg: 'Missing id' }
    const doc = await db.collection(COLLECTION).doc(String(id)).get()
    const entry = doc.data
    if (!entry || entry.openid !== openid) {
      return { code: 1, msg: 'Permission denied' }
    }

    await db.collection(COLLECTION).doc(String(id)).update({
      data: {
        deleted: true,
        deletedAt: db.serverDate(),
        deletedAtMs: Date.now()
      }
    })
    return { code: 0 }
  } catch (error) {
    console.error('Delete place song failed:', error)
    return { code: 1, msg: 'Delete failed', error }
  }
}

function normalizeEntry(openid, data = {}) {
  const now = Date.now()
  return {
    openid,
    nickName: String(data.nickName || '匿名听友').slice(0, 20),
    placeName: String(data.placeName || '').slice(0, 48),
    address: String(data.address || '').slice(0, 96),
    latitude: Number(data.latitude),
    longitude: Number(data.longitude),
    coordinateText: String(data.coordinateText || '').slice(0, 40),
    songRid: String(data.songRid || data.rid || '').slice(0, 32),
    songName: String(data.songName || '').slice(0, 64),
    artist: String(data.artist || '').slice(0, 64),
    songPic: String(data.songPic || data.pic || '').slice(0, 240),
    note: String(data.note || '').slice(0, 120),
    likedOpenids: [],
    likeCount: 0,
    createdAt: db.serverDate(),
    createdAtMs: now,
    deleted: false
  }
}

function sanitizeEntry(entry = {}, openid = '') {
  return {
    _id: entry._id || '',
    nickName: entry.nickName || '匿名听友',
    placeName: entry.placeName || '',
    address: entry.address || '',
    latitude: Number(entry.latitude || 0),
    longitude: Number(entry.longitude || 0),
    coordinateText: entry.coordinateText || '',
    songRid: entry.songRid || '',
    songName: entry.songName || '',
    artist: entry.artist || '',
    songPic: entry.songPic || '',
    note: entry.note || '',
    createdAtMs: entry.createdAtMs || 0,
    isOwner: entry.openid === openid,
    liked: Array.isArray(entry.likedOpenids) && entry.likedOpenids.includes(openid),
    likeCount: Number(entry.likeCount || (Array.isArray(entry.likedOpenids) ? entry.likedOpenids.length : 0) || 0)
  }
}
