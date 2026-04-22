// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV }) // 使用当前云环境

const db = cloud.database()
const _ = db.command

// 云函数入口函数
exports.main = async (event, context) => {
    const wxContext = cloud.getWXContext()
    const openid = wxContext.OPENID

    const { action, data } = event

    switch (action) {
        case 'createRoom':
            return await createRoom(openid, data)
        case 'joinRoom':
            return await joinRoom(openid, data)
        case 'updateState':
            return await updateState(openid, data)
        case 'submitResult':
            return await submitResult(openid, data)
        case 'nextRound':
            return await nextRound(openid, data)
        case 'closeRoom':
            return await closeRoom(openid, data)
        case 'leaveRoom':
            return await leaveRoom(openid, data)
        case 'toggleReady':
            return await toggleReady(openid, data)
        default:
            return {
                code: -1,
                msg: 'Invalid action'
            }
    }
}

async function createRoom(openid, { hostInfo, songs }) {
    try {
        // Generate a 6-digit random numeric ID and avoid collisions.
        let roomId = ''
        for (let i = 0; i < 8; i++) {
            const candidate = Math.floor(100000 + Math.random() * 900000).toString()
            const existing = await db.collection('rooms').where({
                roomId: candidate
            }).limit(1).get()
            const hasActiveRoom = existing.data.some(room => ['waiting', 'ready', 'playing'].includes(room.state))

            if (!hasActiveRoom) {
                roomId = candidate
                break
            }
        }

        if (!roomId) {
            return { code: 1, msg: 'No available room id' }
        }

        const res = await db.collection('rooms').add({
            data: {
                roomId: roomId,
                host: {
                    openid: openid,
                    ...hostInfo,
                    score: 0,
                    hasAnswered: false
                },
                guest: null, // Waiting for guest
                songs: songs, // Shared song list for fairness
                state: 'waiting', // waiting, playing, finished
                currentRound: 0,
                closeReason: null,
                closedAt: null,
                createTime: db.serverDate()
            }
        })

        return {
            code: 0,
            roomId: roomId,
            id: res._id
        }
    } catch (e) {
        console.error(e)
        return { code: 1, msg: 'Create room failed', error: e }
    }
}

async function joinRoom(openid, { roomId, guestInfo }) {
    try {
        // CLEANUP: Robust check for existing sessions
        // Split queries to ensure no index issues with _.or
        const hostRooms = await db.collection('rooms').where({ 'host.openid': openid }).get()
        const guestRooms = await db.collection('rooms').where({ 'guest.openid': openid }).get()

        const allOldRooms = [...hostRooms.data, ...guestRooms.data]

        if (allOldRooms.length > 0) {
            for (const oldRoom of allOldRooms) {
                const isActiveRoom = ['waiting', 'ready', 'playing'].includes(oldRoom.state)

                // If I'm joining the SAME room I'm already in
                if (oldRoom.roomId === roomId && isActiveRoom) {
                    if (oldRoom.host.openid === openid) return { code: 0, msg: 'You are host', isHost: true, data: oldRoom }
                    if (oldRoom.guest && oldRoom.guest.openid === openid) return { code: 0, msg: 'Re-joined', data: oldRoom }
                }

                // STALE Session Cleanup
                if (isActiveRoom && oldRoom.host.openid === openid) {
                    await leaveRoom(openid, { roomId: oldRoom.roomId })
                } else if (isActiveRoom && oldRoom.guest && oldRoom.guest.openid === openid) {
                    await leaveRoom(openid, { roomId: oldRoom.roomId })
                }
            }
        }

        // Proceed to join target room
        const rooms = await db.collection('rooms').where({
            roomId: roomId
        }).get()

        if (rooms.data.length === 0) {
            return { code: 1, msg: 'Room not found' }
        }

        const room = rooms.data[0]

        // Idempotency: Check if I am already the guest (Double check after cleanup logic)
        if (room.guest && room.guest.openid === openid) {
            return { code: 0, msg: 'Joined successfully', data: room }
        }

        if (room.state === 'closed') {
            return { code: 1, msg: 'Room is closed' }
        }

        if (room.state === 'finished') {
            return { code: 1, msg: 'Game already finished' }
        }

        if (room.state !== 'waiting') {
            return { code: 1, msg: 'Room is not open for joining' }
        }

        // Prevent host from joining as guest
        if (room.host.openid === openid) {
            return { code: 0, msg: 'You are host', isHost: true, data: room }
        }

        const guest = {
            openid: openid,
            ...guestInfo,
            score: 0,
            hasAnswered: false,
            isReady: false
        }

        // Atomically claim the empty guest slot. Without the guest:null
        // condition, two users joining together can overwrite each other.
        const joinRes = await db.collection('rooms').where({
            roomId: roomId,
            guest: null,
            state: 'waiting'
        }).update({
            data: {
                guest: _.set(guest),
                state: 'ready'
            }
        })

        if (!joinRes.stats || joinRes.stats.updated === 0) {
            const latestRooms = await db.collection('rooms').where({ roomId: roomId }).get()
            const latestRoom = latestRooms.data[0]

            if (!latestRoom) return { code: 1, msg: 'Room not found' }
            if (latestRoom.guest && latestRoom.guest.openid === openid) {
                return { code: 0, msg: 'Joined successfully', data: latestRoom }
            }
            if (latestRoom.guest) return { code: 1, msg: 'Room is full' }
            return { code: 1, msg: 'Room is not open for joining' }
        }

        const joinedRoomRes = await db.collection('rooms').where({ roomId: roomId }).get()
        return { code: 0, msg: 'Joined successfully', data: joinedRoomRes.data[0] }
    } catch (e) {
        console.error(e)
        return { code: 1, msg: 'Join failed', error: e }
    }
}

async function updateState(openid, { roomId, state }) {
    try {
        const allowedStates = ['waiting', 'ready', 'playing', 'finished', 'closed']
        if (!allowedStates.includes(state)) {
            return { code: 1, msg: 'Invalid state' }
        }

        const roomRes = await db.collection('rooms').where({ roomId: roomId }).get()
        if (roomRes.data.length === 0) return { code: 1, msg: 'Room not found' }

        const room = roomRes.data[0]
        if (room.host.openid !== openid) {
            return { code: 1, msg: 'Permission denied' }
        }

        let updateData = { state: state }

        // If starting game, reset/init round to 1
        if (state === 'playing') {
            if (!room.guest) return { code: 1, msg: 'No guest in room' }
            if (!room.guest.isReady) return { code: 1, msg: 'Guest is not ready' }

            updateData.currentRound = 1
            updateData['host.score'] = 0
            updateData['host.hasAnswered'] = false
            updateData.closeReason = null
            updateData.closedAt = null
            updateData['guest.hasAnswered'] = false
            updateData['guest.score'] = 0
        } else if (state === 'finished') {
            updateData.closeReason = null
            updateData.closedAt = null
        }

        await db.collection('rooms').doc(room._id).update({
            data: updateData
        })
        return { code: 0 }
    } catch (e) {
        return { code: 1, error: e }
    }
}

async function submitResult(openid, { roomId, round, selectedRid }) {
    try {
        const rooms = await db.collection('rooms').where({
            roomId: roomId
        }).get()

        if (rooms.data.length === 0) return { code: 1, msg: 'Room not found' }
        const room = rooms.data[0]

        if (room.state !== 'playing') return { code: 1, msg: 'Game is not playing' }
        if (Number(round) !== Number(room.currentRound)) return { code: 1, msg: 'Stale round' }

        let updateData = {}
        let currentScore = 0
        let hasAnswered = false
        let scorePath = ''
        let answeredPath = ''
        let openidPath = ''

        if (room.host.openid === openid) {
            currentScore = Number(room.host.score || 0)
            hasAnswered = room.host.hasAnswered
            scorePath = 'host.score'
            answeredPath = 'host.hasAnswered'
            openidPath = 'host.openid'
        } else if (room.guest && room.guest.openid === openid) {
            currentScore = Number(room.guest.score || 0)
            hasAnswered = room.guest.hasAnswered
            scorePath = 'guest.score'
            answeredPath = 'guest.hasAnswered'
            openidPath = 'guest.openid'
        } else {
            return { code: 1, msg: 'Not a player in this room' }
        }

        if (hasAnswered) {
            return { code: 0, msg: 'Already submitted', score: currentScore }
        }

        const targetSong = room.songs && room.songs[Number(room.currentRound) - 1]
        if (!targetSong) return { code: 1, msg: 'Target song missing' }

        const isCorrect = String(selectedRid) === String(targetSong.rid)
        const scoreDelta = isCorrect ? 20 : 0
        const newScore = currentScore + scoreDelta

        updateData[scorePath] = _.inc(scoreDelta)
        updateData[answeredPath] = true

        const submitCondition = {
            roomId: roomId,
            state: 'playing',
            currentRound: room.currentRound,
            [openidPath]: openid,
            [answeredPath]: false
        }

        const submitRes = await db.collection('rooms').where(submitCondition).update({
            data: updateData
        })

        if (!submitRes.stats || submitRes.stats.updated === 0) {
            const latestRooms = await db.collection('rooms').where({ roomId: roomId }).get()
            const latestRoom = latestRooms.data[0]
            const latestPlayer = latestRoom
                ? (latestRoom.host.openid === openid ? latestRoom.host : latestRoom.guest)
                : null
            return { code: 0, msg: 'Already submitted', score: latestPlayer ? Number(latestPlayer.score || 0) : currentScore }
        }

        return { code: 0, correct: isCorrect, score: newScore }
    } catch (e) {
        return { code: 1, error: e }
    }
}

async function nextRound(openid, { roomId }) {
    try {
        const rooms = await db.collection('rooms').where({
            roomId: roomId
        }).get()

        if (rooms.data.length === 0) return { code: 1 }
        const room = rooms.data[0]

        if (room.state !== 'playing') {
            return { code: 1, msg: 'Game is not playing' }
        }

        // Only host can trigger next round to avoid race conditions (or logic: either can if authorized)
        // For simplicity/safety, let's verify it's the host
        if (room.host.openid !== openid) {
            return { code: 1, msg: 'Permission denied' }
        }

        let updateData = {
            currentRound: _.inc(1),
            'host.hasAnswered': false
        }

        if (room.guest) {
            updateData['guest.hasAnswered'] = false
        }

        await db.collection('rooms').doc(room._id).update({
            data: updateData
        })
        return { code: 0 }
    } catch (e) {
        return { code: 1, error: e }
    }
}

async function closeRoom(openid, { roomId }) {
    return leaveRoom(openid, { roomId })
}

async function leaveRoom(openid, { roomId }) {
    try {
        const roomRes = await db.collection('rooms').where({
            roomId: roomId
        }).get()

        if (roomRes.data.length === 0) return { code: 0 } // Already gone

        const room = roomRes.data[0]
        if (room.state === 'closed' || room.state === 'finished') {
            return { code: 0, state: room.state, closeReason: room.closeReason || null }
        }

        const playerRole = getPlayerRole(room, openid)
        if (!playerRole) return { code: 1, msg: 'Permission denied' }

        const updateData = buildLeaveUpdate(room, playerRole)
        if (!updateData) return { code: 0 }

        await db.collection('rooms').doc(room._id).update({
            data: updateData
        })
        return { code: 0, state: updateData.state, closeReason: updateData.closeReason || null }
    } catch (e) {
        return { code: 1, error: e }
    }
}

async function toggleReady(openid, { roomId, isReady }) {
    try {
        const rooms = await db.collection('rooms').where({
            roomId: roomId
        }).get()

        if (rooms.data.length === 0) return { code: 1, msg: 'Room not found' }
        const room = rooms.data[0]

        // Only guest triggers this typically, but let's check who is calling
        let updateData = {}
        if (room.guest && room.guest.openid === openid) {
            updateData['guest.isReady'] = isReady
        } else if (room.host.openid === openid) {
            // Host usually doesn't need ready state since they start game, but support it just in case
            updateData['host.isReady'] = isReady
        } else {
            return { code: 1, msg: 'Not a player' }
        }

        await db.collection('rooms').doc(room._id).update({
            data: updateData
        })
        return { code: 0 }
    } catch (e) {
        return { code: 1, error: e }
    }
}

function getPlayerRole(room, openid) {
    if (room.host && room.host.openid === openid) return 'host'
    if (room.guest && room.guest.openid === openid) return 'guest'
    return ''
}

function buildLeaveUpdate(room, playerRole) {
    if (playerRole === 'host') {
        const updateData = {
            state: 'closed',
            closeReason: 'host_left',
            closedAt: db.serverDate()
        }

        if (room.host) updateData['host.isReady'] = false
        if (room.guest) updateData['guest.isReady'] = false

        return updateData
    }

    if (playerRole === 'guest') {
        if (room.state === 'playing') {
            return {
                state: 'closed',
                closeReason: 'guest_left',
                closedAt: db.serverDate(),
                'guest.isReady': false
            }
        }

        return {
            guest: null,
            state: 'waiting',
            closeReason: null,
            closedAt: null
        }
    }

    return null
}
