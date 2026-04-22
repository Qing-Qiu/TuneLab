const POLL_INTERVAL = 2600;

function normalizeSong(song = {}) {
  return {
    rid: String(song.rid || song.id || ''),
    name: song.name || song.songName || '未知歌曲',
    artist: song.artist || song.singer || '未知歌手',
    pic: song.pic || song.cover || '/images/icons/music.png'
  };
}

function getErrorMessage(err, fallback = '操作失败') {
  if (!err) return fallback;
  if (err.msg) return err.msg;
  if (err.errMsg) return err.errMsg.includes('cloud.callFunction')
    ? '云函数调用失败'
    : err.errMsg;
  if (err.message) return err.message;
  return fallback;
}

function formatTime(seconds = 0) {
  const total = Math.max(0, Math.floor(Number(seconds) || 0));
  const minute = String(Math.floor(total / 60)).padStart(2, '0');
  const second = String(total % 60).padStart(2, '0');
  return `${minute}:${second}`;
}

function getProgressPercent(current = 0, duration = 0) {
  const safeDuration = Number(duration || 0);
  if (safeDuration <= 0) return 0;
  const percent = (Number(current || 0) / safeDuration) * 100;
  return Math.max(0, Math.min(100, percent));
}

function getSecondsByProgress(progress = 0, duration = 0) {
  const safeDuration = Number(duration || 0);
  if (safeDuration <= 0) return 0;
  const safeProgress = Math.max(0, Math.min(100, Number(progress || 0)));
  return (safeProgress / 100) * safeDuration;
}

function getSyncedPlaybackTime(playback = {}) {
  const baseTime = Math.max(0, Number(playback.currentTime || 0));
  if (!playback.isPlaying) return baseTime;

  const updatedAtMs = Number(playback.updatedAtMs || 0);
  const drift = updatedAtMs ? Math.max(0, (Date.now() - updatedAtMs) / 1000) : 0;
  const duration = Number(playback.duration || 0);
  const targetTime = baseTime + drift;
  return duration > 0 ? Math.min(duration, targetTime) : targetTime;
}

Page({
  data: {
    roomIdInput: '',
    room: null,
    roomId: '',
    isHost: false,
    isMember: false,
    searchKey: '',
    searchResults: [],
    selectedSong: null,
    roomSong: null,
    creating: false,
    joining: false,
    searching: false,
    syncing: false,
    refreshing: false,
    isPlaying: false,
    closing: false,
    currentText: '00:00',
    durationText: '00:00',
    progressPercent: 0,
    durationSeconds: 0,
    isDraggingProgress: false,
    quickReactions: ['好听', '再来一遍', '想你了', '这首给你', '暂停一下'],
    emojiReactions: ['🎧', '❤️', '✨', '👏']
  },

  onLoad(options = {}) {
    this.apiNextAt = {};
    this.songUrlCache = {};
    this.songUrlPending = {};
    this.pollTimer = null;
    this.currentRid = '';
    this.currentVersion = 0;
    this.lastSyncSeekAt = 0;
    this.bindAudioEvents();
    if (options.roomId) {
      this.setData({ roomIdInput: options.roomId });
      this.joinRoom(options.roomId);
    }
  },

  onShow() {
    if (this.data.roomId) this.startPolling();
  },

  onHide() {
    this.stopPolling();
  },

  onUnload() {
    this.stopPolling();
  },

  onShareAppMessage() {
    const roomId = this.data.roomId;
    return {
      title: roomId ? `一起听房间 ${roomId}` : '一起听',
      path: roomId ? `/pages/lab-listen-room/lab-listen-room?roomId=${roomId}` : '/pages/lab-listen-room/lab-listen-room'
    };
  },

  bindAudioEvents() {
    const bgm = wx.getBackgroundAudioManager();
    bgm.onPlay(() => {
      this.setData({ isPlaying: true });
      this.syncLocalTime();
    });
    bgm.onPause(() => {
      this.setData({ isPlaying: false });
      this.syncLocalTime();
    });
    bgm.onStop(() => {
      this.setData({ isPlaying: false });
    });
    bgm.onTimeUpdate(() => this.syncLocalTime());
  },

  syncLocalTime() {
    const bgm = wx.getBackgroundAudioManager();
    const currentTime = Number(bgm.currentTime || 0);
    const duration = Number(bgm.duration || this.data.durationSeconds || 0);
    if (this.data.isDraggingProgress) {
      this.setData({
        durationText: formatTime(duration),
        durationSeconds: duration
      });
      return;
    }
    this.setData({
      currentText: formatTime(currentTime),
      durationText: formatTime(duration),
      progressPercent: getProgressPercent(currentTime, duration),
      durationSeconds: duration
    });
  },

  getPlayableDuration() {
    const bgm = wx.getBackgroundAudioManager();
    const playback = this.data.room && this.data.room.playback ? this.data.room.playback : {};
    return Number(bgm.duration || playback.duration || this.data.durationSeconds || 0);
  },

  callCloudFunction(name, data) {
    return new Promise((resolve, reject) => {
      wx.cloud.callFunction({
        name,
        data,
        success: resolve,
        fail: reject
      });
    });
  },

  callListen(action, data = {}) {
    return this.callCloudFunction('listen-room-functions', { action, data });
  },

  scheduleApiCall(channel, task) {
    const gaps = { songs: 1300, music: 900 };
    const now = Date.now();
    const nextAt = this.apiNextAt[channel] || 0;
    const delay = Math.max(0, nextAt - now);
    this.apiNextAt[channel] = Math.max(now, nextAt) + (gaps[channel] || 1000);
    return new Promise((resolve, reject) => {
      setTimeout(() => task().then(resolve).catch(reject), delay);
    });
  },

  fetchSongUrl(rid) {
    const cacheKey = String(rid || '');
    if (!cacheKey) return Promise.reject(new Error('Missing rid'));
    if (this.songUrlCache[cacheKey]) return Promise.resolve(this.songUrlCache[cacheKey]);
    if (this.songUrlPending[cacheKey]) return this.songUrlPending[cacheKey];

    const request = this.scheduleApiCall('music', () => this.callCloudFunction('music-functions', { rid: cacheKey }))
      .then((res) => {
        if (!res.result) throw new Error('Invalid url');
        this.songUrlCache[cacheKey] = res.result;
        return res.result;
      }).finally(() => {
        delete this.songUrlPending[cacheKey];
      });
    this.songUrlPending[cacheKey] = request;
    return request;
  },

  onSearchInput(e) {
    this.setData({ searchKey: e.detail.value });
  },

  searchSongs() {
    const key = this.data.searchKey.trim();
    if (!key) {
      wx.showToast({ title: '输入歌名或歌手', icon: 'none' });
      return;
    }
    this.setData({ searching: true });
    this.scheduleApiCall('songs', () => this.callCloudFunction('songs-functions', {
      key,
      pn: 1,
      rn: 12
    })).then((res) => {
      const list = Array.isArray(res.result) ? res.result.map(normalizeSong).filter((song) => song.rid) : [];
      this.setData({ searchResults: list });
    }).catch((err) => {
      console.error('搜索歌曲失败', err);
      wx.showToast({ title: '搜索失败', icon: 'none' });
    }).finally(() => {
      this.setData({ searching: false });
    });
  },

  selectSong(e) {
    const rid = String(e.currentTarget.dataset.rid || '');
    const song = this.data.searchResults.find((item) => item.rid === rid);
    if (!song) return;
    this.setData({ selectedSong: song });
  },

  onRoomIdInput(e) {
    this.setData({ roomIdInput: e.detail.value });
  },

  createRoom() {
    if (this.data.creating) return;
    this.setData({ creating: true });
    this.callListen('createRoom', {
      title: '一起听',
      song: null,
      userInfo: { nickName: '我' }
    }).then((res) => {
      const result = res.result || {};
      if (result.code !== 0) throw result;
      this.applyRoomResult(result);
      wx.showToast({ title: '房间已创建', icon: 'success' });
    }).catch((err) => {
      console.error('创建一起听房间失败', err);
      wx.showToast({ title: '创建失败', icon: 'none' });
    }).finally(() => {
      this.setData({ creating: false });
    });
  },

  joinRoom(roomId) {
    if (this.data.joining) return;
    const normalizedRoomId = (typeof roomId === 'string' || typeof roomId === 'number')
      ? String(roomId).trim()
      : String(this.data.roomIdInput || '').trim();
    if (!normalizedRoomId) {
      wx.showToast({ title: '输入房间号', icon: 'none' });
      return;
    }
    this.setData({ joining: true });
    this.callListen('joinRoom', {
      roomId: normalizedRoomId,
      userInfo: { nickName: '我' }
    }).then((res) => {
      const result = res.result || {};
      if (result.code !== 0) throw result;
      this.applyRoomResult(result);
    }).catch((err) => {
      console.error('加入一起听房间失败', err);
      wx.showToast({ title: '加入失败', icon: 'none' });
    }).finally(() => {
      this.setData({ joining: false });
    });
  },

  applyRoomResult(result) {
    const room = result.data || (result && result.roomId ? result : null);
    if (!room || !room.roomId) return;
    const playback = room && room.playback ? room.playback : {};
    const bgm = wx.getBackgroundAudioManager();
    const currentTime = getSyncedPlaybackTime(playback);
    const duration = Number(playback.duration || bgm.duration || 0);
    const hasHostFlag = Object.prototype.hasOwnProperty.call(result, 'isHost');
    const isClosed = room.state === 'closed';
    const patch = {
      room,
      roomId: room.roomId,
      roomIdInput: room.roomId,
      isHost: hasHostFlag ? !!result.isHost : true,
      isMember: result.isMember !== false,
      roomSong: playback.song || null,
      isPlaying: !isClosed && !!(playback.song && playback.isPlaying)
    };
    if (isClosed && !bgm.paused) bgm.pause();
    if (!this.data.isDraggingProgress) {
      Object.assign(patch, {
        currentText: formatTime(currentTime),
        durationText: formatTime(duration),
        progressPercent: getProgressPercent(currentTime, duration),
        durationSeconds: duration
      });
    } else {
      Object.assign(patch, {
        durationText: formatTime(duration),
        durationSeconds: duration
      });
    }
    this.setData(patch);
    if (isClosed) {
      this.stopPolling();
      return;
    }
    this.syncPlaybackFromRoom(room);
    this.startPolling();
  },

  onProgressChanging(e) {
    if (!this.data.isHost || !this.data.roomSong) return;
    const duration = this.getPlayableDuration();
    if (duration <= 0) return;
    const progressPercent = Math.max(0, Math.min(100, Number(e.detail.value || 0)));
    const currentTime = getSecondsByProgress(progressPercent, duration);
    this.setData({
      isDraggingProgress: true,
      currentText: formatTime(currentTime),
      durationText: formatTime(duration),
      progressPercent,
      durationSeconds: duration
    });
  },

  onProgressChange(e) {
    if (!this.data.isHost || !this.data.roomSong) {
      this.setData({ isDraggingProgress: false });
      return;
    }
    const duration = this.getPlayableDuration();
    if (duration <= 0) {
      this.setData({ isDraggingProgress: false });
      return;
    }
    const progressPercent = Math.max(0, Math.min(100, Number(e.detail.value || 0)));
    const currentTime = getSecondsByProgress(progressPercent, duration);
    const bgm = wx.getBackgroundAudioManager();
    bgm.seek(currentTime);
    this.setData({
      isDraggingProgress: false,
      currentText: formatTime(currentTime),
      durationText: formatTime(duration),
      progressPercent,
      durationSeconds: duration
    });
    this.updatePlayback(!bgm.paused, null, currentTime, duration);
  },

  refreshRoom() {
    if (!this.data.roomId || this.data.refreshing) return;
    this.setData({ refreshing: true });
    this.callListen('getRoom', { roomId: this.data.roomId }).then((res) => {
      const result = res.result || {};
      if (result.code !== 0) throw result;
      this.applyRoomResult(result);
    }).catch((err) => {
      console.warn('刷新一起听房间失败', err);
    }).finally(() => {
      this.setData({ refreshing: false });
    });
  },

  startPolling() {
    this.stopPolling();
    if (!this.data.roomId) return;
    if (this.data.room && this.data.room.state === 'closed') return;
    this.pollTimer = setInterval(() => this.refreshRoom(), POLL_INTERVAL);
  },

  stopPolling() {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  },

  syncPlaybackFromRoom(room) {
    const bgm = wx.getBackgroundAudioManager();
    if (room && room.state === 'closed') {
      if (!bgm.paused) bgm.pause();
      return;
    }
    if (!room || !room.playback || !room.playback.song) return;
    const playback = room.playback;
    const song = playback.song;
    const version = Number(playback.version || 0);
    const targetTime = getSyncedPlaybackTime(playback);

    if (this.currentRid !== song.rid || this.currentVersion !== version) {
      this.currentRid = song.rid;
      this.currentVersion = version;
      this.fetchSongUrl(song.rid).then((url) => {
        bgm.title = song.name || '一起听';
        bgm.singer = song.artist || '未知歌手';
        bgm.coverImgUrl = song.pic || '/images/icons/music.png';
        if (bgm.src !== url) bgm.src = url;
        setTimeout(() => {
          const freshTargetTime = getSyncedPlaybackTime(playback);
          if (freshTargetTime > 1) bgm.seek(freshTargetTime);
          if (playback.isPlaying) bgm.play();
          else bgm.pause();
        }, 500);
      }).catch((err) => {
        console.error('同步歌曲失败', err);
      });
      return;
    }

    if (playback.isPlaying && bgm.paused) bgm.play();
    if (!playback.isPlaying && !bgm.paused) bgm.pause();
    const localTime = Number(bgm.currentTime || 0);
    const now = Date.now();
    if (
      playback.isPlaying
      && Math.abs(localTime - targetTime) > 6
      && now - (this.lastSyncSeekAt || 0) > 5000
    ) {
      this.lastSyncSeekAt = now;
      bgm.seek(targetTime);
    }
  },

  updatePlayback(isPlaying, songOverride = null, forcedTime = null, forcedDuration = null) {
    if (this.data.syncing) return;
    if (!this.data.room || !this.data.isHost) {
      wx.showToast({ title: '房主才能控制播放', icon: 'none' });
      return;
    }
    const bgm = wx.getBackgroundAudioManager();
    const playback = this.data.room.playback || {};
    const song = normalizeSong(songOverride || playback.song || this.data.roomSong);
    if (!song.rid) {
      wx.showToast({ title: '先选一首歌', icon: 'none' });
      return;
    }
    const hasForcedTime = forcedTime !== null && forcedTime !== undefined;
    const hasForcedDuration = forcedDuration !== null && forcedDuration !== undefined;
    const currentTime = songOverride
      ? 0
      : Number(hasForcedTime ? forcedTime : (bgm.currentTime || getSyncedPlaybackTime(playback) || 0));
    const duration = songOverride
      ? 0
      : Number(hasForcedDuration ? forcedDuration : (bgm.duration || playback.duration || this.data.durationSeconds || 0));

    this.setData({ syncing: true });
    this.callListen('updatePlayback', {
      roomId: this.data.roomId,
      playback: {
        song,
        isPlaying,
        currentTime,
        duration
      }
    }).then((res) => {
      const result = res.result || {};
      if (result.code !== 0) throw result;
      const updatedPlayback = result.data && result.data.playback
        ? result.data.playback
        : {
          song,
          isPlaying,
          currentTime,
          duration,
          updatedAtMs: Date.now(),
          version: Number(playback.version || 0) + 1
        };
      const nextRoom = {
        ...this.data.room,
        playback: updatedPlayback
      };
      this.setData({
        room: nextRoom,
        roomSong: updatedPlayback.song || song,
        selectedSong: songOverride ? null : this.data.selectedSong,
        isPlaying: !!(updatedPlayback.song && updatedPlayback.isPlaying),
        currentText: formatTime(updatedPlayback.currentTime),
        durationText: formatTime(updatedPlayback.duration),
        progressPercent: getProgressPercent(updatedPlayback.currentTime, updatedPlayback.duration),
        durationSeconds: Number(updatedPlayback.duration || duration || 0)
      }, () => {
        this.syncPlaybackFromRoom(nextRoom);
      });
      setTimeout(() => this.refreshRoom(), 600);
    }).catch((err) => {
      console.error('更新播放状态失败', err);
      wx.showToast({ title: getErrorMessage(err, '同步失败'), icon: 'none' });
    }).finally(() => {
      this.setData({ syncing: false });
    });
  },

  syncSelectedSong() {
    if (!this.data.selectedSong) {
      wx.showToast({ title: '先选一首歌', icon: 'none' });
      return;
    }
    this.updatePlayback(true, this.data.selectedSong);
  },

  syncSongFromRow(e) {
    const rid = String(e.currentTarget.dataset.rid || '');
    const song = this.data.searchResults.find((item) => item.rid === rid);
    if (!song) return;
    this.setData({ selectedSong: song }, () => {
      this.updatePlayback(true, song);
    });
  },

  playRoom() {
    this.updatePlayback(true);
  },

  pauseRoom() {
    this.updatePlayback(false);
  },

  closeRoom() {
    if (!this.data.roomId || !this.data.isHost || this.data.closing) return;
    wx.showModal({
      title: '关闭房间',
      content: '关闭后所有成员会停止播放，房号也不能再加入。',
      confirmText: '关闭',
      confirmColor: '#d94841',
      success: (res) => {
        if (!res.confirm) return;
        this.setData({ closing: true });
        this.callListen('closeRoom', { roomId: this.data.roomId }).then((response) => {
          const result = response.result || {};
          if (result.code !== 0) throw result;
          this.applyRoomResult(result);
          wx.showToast({ title: '房间已关闭', icon: 'success' });
        }).catch((err) => {
          console.error('关闭一起听房间失败', err);
          wx.showToast({ title: getErrorMessage(err, '关闭失败'), icon: 'none' });
        }).finally(() => {
          this.setData({ closing: false });
        });
      }
    });
  },

  copyRoomId() {
    if (!this.data.roomId) return;
    wx.setClipboardData({ data: this.data.roomId });
  },

  sendReaction(e) {
    if (!this.data.roomId) return;
    const text = e.currentTarget.dataset.text || '';
    const type = e.currentTarget.dataset.type || 'emoji';
    this.callListen('sendReaction', {
      roomId: this.data.roomId,
      type,
      text
    }).then(() => this.refreshRoom()).catch((err) => {
      console.error('发送互动失败', err);
    });
  }
});
