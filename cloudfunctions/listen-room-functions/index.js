const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command
const COLLECTION = 'listen_rooms'
const ROOM_TTL = 6 * 60 * 60 * 1000
const MAX_MEMBERS = 8
const MAX_EVENTS = 30

exports.main = async (event = {}) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const action = event.action
  const data = event.data || {}

  switch (action) {
    case 'createRoom':
      return createRoom(openid, data)
    case 'joinRoom':
      return joinRoom(openid, data)
    case 'getRoom':
      return getRoom(openid, data)
    case 'updatePlayback':
      return updatePlayback(openid, data)
    case 'sendReaction':
      return sendReaction(openid, data)
    case 'heartbeat':
      return heartbeat(openid, data)
    case 'leaveRoom':
      return leaveRoom(openid, data)
    case 'closeRoom':
      return closeRoom(openid, data)
    default:
      return { code: 1, msg: 'Invalid action' }
  }
}

async function createRoom(openid, { userInfo = {}, song = null, title = '一起听' }) {
  try {
    await ensureCollection(COLLECTION)
    const roomId = await createRoomId()
    if (!roomId) return { code: 1, msg: 'No available room id' }

    const now = Date.now()
    const host = buildMember(openid, userInfo, 'host')
    const room = {
      roomId,
      title: String(title || '一起听').slice(0, 24),
      state: 'open',
      ownerOpenid: openid,
      hostOpenid: openid,
      maxMembers: MAX_MEMBERS,
      members: [host],
      playback: buildPlayback(song, {
        isPlaying: false,
        currentTime: 0,
        updatedBy: openid
      }),
      events: [{
        id: createEventId(),
        type: 'system',
        text: '房间已创建',
        openid,
        createdAtMs: now
      }],
      createTime: db.serverDate(),
      createdAtMs: now,
      updatedAt: db.serverDate(),
      updatedAtMs: now,
      expiresAtMs: now + ROOM_TTL,
      closeReason: ''
    }

    const res = await db.collection(COLLECTION).add({ data: room })
    return { code: 0, roomId, id: res._id, data: room }
  } catch (error) {
    console.error('Create listen room failed:', error)
    return { code: 1, msg: 'Create room failed', error }
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

async function joinRoom(openid, { roomId, userInfo = {} }) {
  try {
    const room = await findRoom(roomId)
    if (!room) return { code: 1, msg: 'Room not found' }
    if (room.state === 'closed') return { code: 1, msg: 'Room is closed' }
    if (isExpired(room)) {
      await closeRoomDocument(room, {
        reason: 'expired',
        openid,
        eventText: '房间已过期'
      })
      return { code: 1, msg: 'Room expired' }
    }

    const members = Array.isArray(room.members) ? room.members.slice() : []
    const existingIndex = members.findIndex((member) => member.openid === openid)
    const now = Date.now()

    if (existingIndex >= 0) {
      members[existingIndex] = {
        ...members[existingIndex],
        ...normalizeUserInfo(userInfo),
        isOnline: true,
        lastSeenAtMs: now
      }
    } else {
      if (members.length >= Number(room.maxMembers || MAX_MEMBERS)) {
        return { code: 1, msg: 'Room is full' }
      }
      members.push(buildMember(openid, userInfo, 'member'))
    }

    const events = appendEvent(room.events, {
      type: 'system',
      text: existingIndex >= 0 ? '成员回到房间' : '新成员加入',
      openid
    })

    await db.collection(COLLECTION).doc(room._id).update({
      data: {
        members,
        events,
        state: room.state === 'open' ? 'open' : room.state,
        updatedAt: db.serverDate(),
        updatedAtMs: now,
        expiresAtMs: now + ROOM_TTL
      }
    })

    return getRoom(openid, { roomId })
  } catch (error) {
    console.error('Join listen room failed:', error)
    return { code: 1, msg: 'Join room failed', error }
  }
}

async function getRoom(openid, { roomId }) {
  try {
    let room = await findRoom(roomId)
    if (!room) return { code: 1, msg: 'Room not found' }
    if (isExpired(room) && room.state !== 'closed') {
      room = await closeRoomDocument(room, {
        reason: 'expired',
        openid,
        eventText: '房间已过期'
      })
    }

    return {
      code: 0,
      isHost: room.hostOpenid === openid,
      isMember: isMember(room, openid),
      data: sanitizeRoom(room)
    }
  } catch (error) {
    return { code: 1, msg: 'Get room failed', error }
  }
}

async function updatePlayback(openid, { roomId, playback = {} }) {
  try {
    const room = await findRoom(roomId)
    if (!room) return { code: 1, msg: 'Room not found' }
    if (room.state === 'closed') return { code: 1, msg: 'Room is closed' }
    if (isExpired(room)) {
      await closeRoomDocument(room, {
        reason: 'expired',
        openid,
        eventText: '房间已过期'
      })
      return { code: 1, msg: 'Room expired' }
    }
    if (!canControl(room, openid)) return { code: 1, msg: 'Permission denied' }

    const now = Date.now()
    const oldPlayback = room.playback || {}
    const currentRid = oldPlayback.song ? oldPlayback.song.rid : ''
    const nextSong = playback.song || oldPlayback.song || null
    const nextRid = nextSong ? nextSong.rid || nextSong.id || '' : ''
    if (!nextRid) return { code: 1, msg: 'Missing song' }

    const nextPlayback = buildPlayback(nextSong, {
      isPlaying: !!playback.isPlaying,
      currentTime: Number(playback.currentTime || 0),
      duration: Number(playback.duration || oldPlayback.duration || 0),
      updatedBy: openid,
      version: Number(oldPlayback.version || 0) + 1
    })
    const eventText = currentRid !== nextRid && nextPlayback.song
      ? `开始听 ${nextPlayback.song.name}`
      : (nextPlayback.isPlaying ? '继续播放' : '暂停播放')

    await db.collection(COLLECTION).doc(room._id).update({
      data: {
        playback: _.set(nextPlayback),
        state: nextPlayback.isPlaying ? 'playing' : 'paused',
        events: appendEvent(room.events, {
          type: 'system',
          text: eventText,
          openid
        }),
        updatedAt: db.serverDate(),
        updatedAtMs: now,
        expiresAtMs: now + ROOM_TTL
      }
    })

    return { code: 0, data: { playback: nextPlayback } }
  } catch (error) {
    console.error('Update playback failed:', error)
    return { code: 1, msg: error && error.message ? error.message : 'Update playback failed' }
  }
}

async function sendReaction(openid, { roomId, type = 'emoji', text = '' }) {
  try {
    const room = await findRoom(roomId)
    if (!room) return { code: 1, msg: 'Room not found' }
    if (room.state === 'closed') return { code: 1, msg: 'Room is closed' }
    if (isExpired(room)) {
      await closeRoomDocument(room, {
        reason: 'expired',
        openid,
        eventText: '房间已过期'
      })
      return { code: 1, msg: 'Room expired' }
    }
    if (!isMember(room, openid)) return { code: 1, msg: 'Not in room' }

    const events = appendEvent(room.events, {
      type: type === 'quick' ? 'quick' : 'emoji',
      text: String(text || '').slice(0, 24),
      openid
    })

    await db.collection(COLLECTION).doc(room._id).update({
      data: {
        events,
        updatedAt: db.serverDate(),
        updatedAtMs: Date.now()
      }
    })

    return { code: 0, data: events[events.length - 1] }
  } catch (error) {
    return { code: 1, msg: 'Send reaction failed', error }
  }
}

async function heartbeat(openid, { roomId, userInfo = {} }) {
  try {
    const room = await findRoom(roomId)
    if (!room) return { code: 1, msg: 'Room not found' }
    if (room.state === 'closed') return { code: 1, msg: 'Room is closed' }
    if (isExpired(room)) {
      await closeRoomDocument(room, {
        reason: 'expired',
        openid,
        eventText: '房间已过期'
      })
      return { code: 1, msg: 'Room expired' }
    }
    if (!isMember(room, openid)) return { code: 1, msg: 'Not in room' }

    const now = Date.now()
    const members = (room.members || []).map((member) => {
      if (member.openid !== openid) return member
      return {
        ...member,
        ...normalizeUserInfo(userInfo),
        isOnline: true,
        lastSeenAtMs: now
      }
    })

    await db.collection(COLLECTION).doc(room._id).update({
      data: {
        members,
        updatedAt: db.serverDate(),
        updatedAtMs: now,
        expiresAtMs: now + ROOM_TTL
      }
    })

    return { code: 0 }
  } catch (error) {
    return { code: 1, msg: 'Heartbeat failed', error }
  }
}

async function leaveRoom(openid, { roomId }) {
  try {
    const room = await findRoom(roomId)
    if (!room) return { code: 0 }
    if (!isMember(room, openid)) return { code: 0 }

    const members = (room.members || []).filter((member) => member.openid !== openid)
    const now = Date.now()

    if (!members.length || room.ownerOpenid === openid) {
      await closeRoomDocument(room, {
        reason: members.length ? 'host_left' : 'empty',
        openid,
        members,
        eventText: members.length ? '房主已关闭房间' : '房间已关闭'
      })
      return { code: 0, state: 'closed' }
    }

    const nextHostOpenid = room.hostOpenid === openid ? members[0].openid : room.hostOpenid
    const nextMembers = members.map((member) => ({
      ...member,
      role: member.openid === nextHostOpenid ? 'host' : 'member'
    }))

    await db.collection(COLLECTION).doc(room._id).update({
      data: {
        members: nextMembers,
        hostOpenid: nextHostOpenid,
        events: appendEvent(room.events, {
          type: 'system',
          text: '成员离开房间',
          openid
        }),
        updatedAt: db.serverDate(),
        updatedAtMs: now
      }
    })

    return { code: 0, state: room.state }
  } catch (error) {
    return { code: 1, msg: 'Leave room failed', error }
  }
}

async function closeRoom(openid, { roomId }) {
  try {
    const room = await findRoom(roomId)
    if (!room) return { code: 0 }
    if (room.ownerOpenid !== openid && room.hostOpenid !== openid) {
      return { code: 1, msg: 'Permission denied' }
    }

    const closedRoom = await closeRoomDocument(room, {
      reason: 'manual',
      openid,
      eventText: '房间已关闭'
    })

    return {
      code: 0,
      state: 'closed',
      isHost: closedRoom.hostOpenid === openid,
      isMember: isMember(closedRoom, openid),
      data: sanitizeRoom(closedRoom)
    }
  } catch (error) {
    return { code: 1, msg: 'Close room failed', error }
  }
}

async function createRoomId() {
  for (let i = 0; i < 10; i += 1) {
    const roomId = Math.floor(100000 + Math.random() * 900000).toString()
    const res = await db.collection(COLLECTION).where({ roomId }).limit(1).get()
    if (!res.data.length) return roomId
  }
  return ''
}

async function findRoom(roomId) {
  if (!roomId) return null
  const res = await db.collection(COLLECTION).where({
    roomId: String(roomId)
  }).orderBy('updatedAtMs', 'desc').limit(1).get()
  return res.data[0] || null
}

function buildMember(openid, userInfo = {}, role = 'member') {
  const now = Date.now()
  return {
    openid,
    ...normalizeUserInfo(userInfo),
    role,
    isOnline: true,
    joinedAtMs: now,
    lastSeenAtMs: now
  }
}

function normalizeUserInfo(userInfo = {}) {
  return {
    nickName: String(userInfo.nickName || userInfo.name || '听友').slice(0, 20),
    avatarUrl: String(userInfo.avatarUrl || userInfo.avatar || '')
  }
}

function buildPlayback(song, options = {}) {
  const now = Date.now()
  return {
    song: normalizeSong(song),
    isPlaying: !!options.isPlaying,
    currentTime: Math.max(0, Number(options.currentTime || 0)),
    duration: Math.max(0, Number(options.duration || 0)),
    updatedAtMs: now,
    updatedBy: options.updatedBy || '',
    version: Number(options.version || 1)
  }
}

function normalizeSong(song = {}) {
  if (!song) return null
  const rid = String(song.rid || song.id || '')
  if (!rid) return null
  return {
    rid,
    name: String(song.name || song.songName || '未知歌曲').slice(0, 64),
    artist: String(song.artist || song.singer || '未知歌手').slice(0, 64),
    pic: String(song.pic || song.cover || '')
  }
}

function appendEvent(events = [], event) {
  const item = {
    id: createEventId(),
    type: event.type || 'emoji',
    text: String(event.text || '').slice(0, 24),
    openid: event.openid || '',
    createdAtMs: Date.now()
  }
  return (Array.isArray(events) ? events.slice() : []).concat(item).slice(-MAX_EVENTS)
}

function createEventId() {
  return `evt-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`
}

function isExpired(room) {
  return Number(room.expiresAtMs || 0) > 0 && Number(room.expiresAtMs) < Date.now()
}

function getSyncedPlaybackTime(playback = {}) {
  const baseTime = Math.max(0, Number(playback.currentTime || 0))
  if (!playback.isPlaying) return baseTime

  const updatedAtMs = Number(playback.updatedAtMs || 0)
  const drift = updatedAtMs ? Math.max(0, (Date.now() - updatedAtMs) / 1000) : 0
  const duration = Number(playback.duration || 0)
  const targetTime = baseTime + drift
  return duration > 0 ? Math.min(duration, targetTime) : targetTime
}

async function closeRoomDocument(room, options = {}) {
  const now = Date.now()
  const reason = options.reason || 'manual'
  const openid = options.openid || ''
  const members = Array.isArray(options.members) ? options.members : (room.members || [])
  const nextMembers = members.map((member) => ({
    ...member,
    isOnline: false,
    lastSeenAtMs: now
  }))
  const playback = room.playback || {}
  const nextPlayback = playback.song
    ? buildPlayback(playback.song, {
      isPlaying: false,
      currentTime: getSyncedPlaybackTime(playback),
      duration: Number(playback.duration || 0),
      updatedBy: openid,
      version: Number(playback.version || 0) + 1
    })
    : buildPlayback(null, {
      isPlaying: false,
      currentTime: 0,
      updatedBy: openid,
      version: Number(playback.version || 0) + 1
    })
  const events = appendEvent(room.events, {
    type: 'system',
    text: options.eventText || '房间已关闭',
    openid
  })
  const closedRoom = {
    ...room,
    state: 'closed',
    closeReason: reason,
    members: nextMembers,
    playback: nextPlayback,
    events,
    updatedAtMs: now,
    expiresAtMs: now
  }

  await db.collection(COLLECTION).doc(room._id).update({
    data: {
      state: 'closed',
      closeReason: reason,
      members: nextMembers,
      playback: _.set(nextPlayback),
      events,
      updatedAt: db.serverDate(),
      updatedAtMs: now,
      expiresAtMs: now
    }
  })

  return closedRoom
}

function isMember(room, openid) {
  return Array.isArray(room.members) && room.members.some((member) => member.openid === openid)
}

function canControl(room, openid) {
  if (!openid) return false
  if (room.hostOpenid === openid || room.ownerOpenid === openid) return true
  const members = Array.isArray(room.members) ? room.members : []
  return members.some((member) => member.openid === openid && member.role === 'host')
}

function sanitizeRoom(room) {
  return {
    _id: room._id,
    roomId: room.roomId,
    title: room.title,
    state: room.state,
    ownerOpenid: room.ownerOpenid,
    hostOpenid: room.hostOpenid,
    maxMembers: room.maxMembers || MAX_MEMBERS,
    members: room.members || [],
    playback: room.playback || buildPlayback(null),
    events: room.events || [],
    createdAtMs: room.createdAtMs || 0,
    updatedAtMs: room.updatedAtMs || 0,
    expiresAtMs: room.expiresAtMs || 0,
    closeReason: room.closeReason || ''
  }
}
