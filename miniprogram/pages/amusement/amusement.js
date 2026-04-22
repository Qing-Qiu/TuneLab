const PLAYLIST_STORAGE_KEY = 'music_playlists_v1';
const PLAYLIST_AUTOPLAY_KEY = 'music_playlist_autoplay';
const PLAYLIST_CLOUD_COLLECTION = 'music_playlists';
const PLAYLIST_CLOUD_DOC_ID = 'my-playlists';

function getDefaultPlaylists() {
  return [
    {
      id: 'playlist-favorite',
      name: '我的喜欢',
      desc: '随手收进来的歌',
      cover: '/images/icons/music.png',
      songs: [],
      createdAt: Date.now()
    },
    {
      id: 'playlist-night',
      name: '夜间循环',
      desc: '适合慢慢听的队列',
      cover: '/images/icons/music.png',
      songs: [],
      createdAt: Date.now() + 1
    }
  ];
}

function normalizeSong(song = {}) {
  return {
    rid: String(song.rid || song.id || ''),
    name: song.name || song.songName || '未知歌曲',
    artist: song.artist || song.singer || '未知歌手',
    pic: song.pic || song.cover || '/images/icons/music.png'
  };
}

function normalizePlaylist(playlist = {}) {
  const songs = Array.isArray(playlist.songs) ? playlist.songs.map(normalizeSong).filter((song) => song.rid) : [];
  return {
    id: playlist.id || `playlist-${Date.now()}`,
    name: playlist.name || '未命名歌单',
    desc: playlist.desc || '本地歌单',
    cover: playlist.cover || (songs[0] && songs[0].pic) || '/images/icons/music.png',
    songs,
    createdAt: playlist.createdAt || Date.now(),
    updatedAt: playlist.updatedAt || playlist.createdAt || Date.now()
  };
}

Page({
  data: {
    songs: '',
    songs_backup: '',
    tabValue: '1',
    app: null,
    total: 300,
    currentPage: 1,
    currentNumber: 0,
    eachPageSongs: 10,
    searchContent: '',
    isLoading: false,
    isLastPage: false,
    // Game State
    gameState: 'intro', // intro, playing, result
    gameScore: 0,
    gameRound: 0,
    gameTotalRounds: 5,
    targetSong: null,
    gameOptions: [],
    showRoundResult: false,
    roundResult: '', // 'correct' or 'wrong'
    gameSongsPool: [], // Pool of songs to use for the game
    isPlaying: false,
    playerVisible: false,
    playerMode: 'idle',
    playerSong: null,
    playerSongIndex: -1,
    playerSrc: '',
    playerLoading: false,
    playerCurrentTime: 0,
    playerDuration: 0,
    playerProgress: 0,
    playerCurrentText: '00:00',
    playerDurationText: '00:00',
    playerDetailVisible: false,
    playerLyricLines: [],
    playerLyricItems: [],
    activeLyricIndex: 0,
    activeLyricId: '',
    lyricLoading: false,
    lyricError: '',
    playlists: [],
    selectedPlaylistId: '',
    selectedPlaylistName: '',
    selectedPlaylistDesc: '',
    selectedPlaylistCover: '/images/icons/music.png',
    selectedPlaylistSongs: [],
    playlistNameDraft: '',
    playlistEditorVisible: false,
    playlistNameEdit: '',
    playlistDescEdit: '',
    playlistCoverEdit: '',
    playlistCreatorVisible: false,
    addToPlaylistVisible: false,
    addTargetSong: null,
    playerQueue: [],
    playerQueueName: '',
    isPlaylistSorting: false,
    dragSongIndex: -1,
    playlistExpanded: false,
    playlistCloudSyncing: false,
    playlistCloudStatus: '仅保存在本机',
    playlistCloudUpdatedText: '',
    singerList: [
      '热门歌曲', '周杰伦', '林俊杰', '陈奕迅', '邓紫棋', '薛之谦',
      '李荣浩', '五月天', '张杰', '王力宏', '陶喆', '汪苏泷',
      '许嵩', '蔡依林', '孙燕姿', '梁静茹', 'Taylor Swift',
      'Justin Bieber', 'Ed Sheeran'
    ],
    selectedSinger: '热门歌曲',
    customTheme: '',
    joinRoomVisible: false,
    joinRoomId: '',
    isMultiplayer: false,
    isHost: false,
    roomId: null,
    userInfo: null,
    opponentInfo: null,
    opponentScore: 0,
    waitingForOpponentNext: false,
    roomWatcher: null,
    timeLeft: 20,
    isRoundPreparing: false,
    isTransitioning: false,
    isReadyUpdating: false,
    isReady: false,


  },

  onLoad(options) {
    this.setData({
      app: getApp(),
    });
    this.hasQuit = false; // Initialize quit flag
    this.apiNextAt = {};
    this.songResultCache = {};
    this.songResultPending = {};
    this.songUrlCache = {};
    this.songUrlPending = {};
    this.lyricCache = {};
    this.lyricPending = {};
    this.currentPlaybackQueue = [];
    this.loadPlaylists();
    this.data.app.globalData.currentSong = wx.getBackgroundAudioManager();

    // Get User Info for PK
    wx.getUserProfile({
      desc: '用于展示头像昵称',
      success: (res) => {
        this.setData({ userInfo: res.userInfo });
      },
      fail: () => {
        // Fallback or silent fail
      }
    });

    // Handle Join Room via Share Link
    if (options.roomId) {
      this.handleJoinRoom(options.roomId);
    }

    // ... rest of onLoad
    // Check initial orientation
    const windowInfo = wx.getWindowInfo();
    const isLandscape = windowInfo.windowWidth > windowInfo.windowHeight;
    this.setData({
      isLandscape: isLandscape
    });

    // Toggle Tabbar
    if (isLandscape) {
      wx.hideTabBar({ fail: () => { } });
    } else {
      // wx.showTabBar({ fail: () => { } }); // Removed to prevent summoning native bar
    }

    // Bind BGM events to update UI state
    const bgm = this.data.app.globalData.currentSong;
    bgm.onPlay(() => {
      const nextData = { isPlaying: true };
      if (this.data.playerMode === 'music') {
        nextData.playerVisible = true;
        if (this.data.playerSrc) {
          nextData.playerLoading = false;
        }
      }
      this.setData(nextData);
      this.syncPlayerProgress();
    });
    bgm.onPause(() => {
      const nextData = { isPlaying: false };
      if (!(this.data.playerMode === 'music' && this.data.playerLoading && !this.data.playerSrc)) {
        nextData.playerLoading = false;
      }
      this.setData(nextData);
    });
    bgm.onStop(() => {
      const nextData = { isPlaying: false };
      if (!(this.data.playerMode === 'music' && this.data.playerLoading && !this.data.playerSrc)) {
        nextData.playerLoading = false;
      }
      this.setData(nextData);
    });
    bgm.onEnded(() => {
      this.setData({ isPlaying: false, playerLoading: false });
      if (this.data.playerMode === 'music') {
        this.playNextSong();
      }
    });
    bgm.onTimeUpdate(() => this.syncPlayerProgress());
    bgm.onCanplay(() => this.syncPlayerProgress());
    bgm.onWaiting(() => {
      if (this.data.playerMode === 'music') {
        this.setData({ playerLoading: true });
      }
    });
    bgm.onError(err => {
      console.error('Audio playback failed:', err);
      this.setData({ isPlaying: false, playerLoading: false });
      wx.showToast({ title: '播放失败', icon: 'none' });
    });
  },

  onResize(res) {
    const isLandscape = res.deviceOrientation === 'landscape' || res.size.windowWidth > res.size.windowHeight;
    this.setData({
      isLandscape: isLandscape
    });

    if (isLandscape) {
      wx.hideTabBar({ fail: () => { } });
    } else {
      // wx.showTabBar({ fail: () => { } }); // Removed to prevent summoning native bar
    }
  },

  // ... (existing code)



  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({
        value: 'pages/amusement/amusement'
      });
    }
    this.loadPlaylists();
    this.consumePendingPlaylistPlayback();
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

  scheduleApiCall(channel, task) {
    const gaps = {
      songs: 1400,
      music: 900,
      lyric: 1800
    };
    const now = Date.now();
    const gap = gaps[channel] || 1000;
    this.apiNextAt = this.apiNextAt || {};

    const nextAt = this.apiNextAt[channel] || 0;
    const delay = Math.max(0, nextAt - now);
    this.apiNextAt[channel] = Math.max(now, nextAt) + gap;

    return new Promise((resolve, reject) => {
      setTimeout(() => {
        task().then(resolve).catch(reject);
      }, delay);
    });
  },

  getCacheValue(cache, key) {
    const item = cache && cache[key];
    if (!item) return null;
    if (item.expiresAt && item.expiresAt < Date.now()) {
      delete cache[key];
      return null;
    }
    return item.value;
  },

  setCacheValue(cache, key, value, ttl = 300000) {
    cache[key] = {
      value,
      expiresAt: Date.now() + ttl
    };
  },

  fetchSongsFromApi(key, pn, rn) {
    const normalizedKey = (key || '').trim() || '热门歌曲';
    const cacheKey = `${normalizedKey}|${pn}|${rn}`;
    const cached = this.getCacheValue(this.songResultCache, cacheKey);
    if (cached) return Promise.resolve(cached.map(item => ({ ...item })));

    if (this.songResultPending[cacheKey]) {
      return this.songResultPending[cacheKey].then(result => result.map(item => ({ ...item })));
    }

    const request = this.scheduleApiCall('songs', () => this.callCloudFunction('songs-functions', {
      key: normalizedKey,
      pn,
      rn
    })).then(res => {
      if (!Array.isArray(res.result)) {
        throw res.result || new Error('Invalid songs result');
      }

      this.setCacheValue(this.songResultCache, cacheKey, res.result, 300000);
      return res.result;
    }).finally(() => {
      delete this.songResultPending[cacheKey];
    });

    this.songResultPending[cacheKey] = request;
    return request.then(result => result.map(item => ({ ...item })));
  },

  fetchSongUrl(rid) {
    const cacheKey = String(rid || '');
    if (!cacheKey) return Promise.reject(new Error('Missing song rid'));

    const cached = this.getCacheValue(this.songUrlCache, cacheKey);
    if (cached) return Promise.resolve(cached);

    if (this.songUrlPending[cacheKey]) {
      return this.songUrlPending[cacheKey];
    }

    const request = this.scheduleApiCall('music', () => this.callCloudFunction('music-functions', {
      rid
    })).then(res => {
      if (!res.result) {
        throw new Error('Invalid song url');
      }

      this.setCacheValue(this.songUrlCache, cacheKey, res.result, 1800000);
      return res.result;
    }).finally(() => {
      delete this.songUrlPending[cacheKey];
    });

    this.songUrlPending[cacheKey] = request;
    return request;
  },

  normalizeLyricResponse(rawResult) {
    let raw = rawResult;
    if (rawResult && Object.prototype.hasOwnProperty.call(rawResult, 'result')) {
      raw = rawResult.result;
    }

    if (typeof raw === 'string') {
      try {
        raw = JSON.parse(raw);
      } catch (err) {
        console.warn('Lyric parse failed:', err);
        return {
          ok: false,
          retryable: true,
          message: '歌词解析失败',
          items: []
        };
      }
    }

    const ok = raw && typeof raw === 'object' && Object.prototype.hasOwnProperty.call(raw, 'ok')
      ? !!raw.ok
      : true;
    const retryable = !!(raw && typeof raw === 'object' && raw.retryable);
    const message = raw && typeof raw === 'object' ? (raw.message || raw.code || '') : '';

    if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
      if (Array.isArray(raw.lyrics)) {
        raw = raw.lyrics;
      } else if (Array.isArray(raw.data)) {
        raw = raw.data;
      } else if (raw.data && Array.isArray(raw.data.lyrics)) {
        raw = raw.data.lyrics;
      } else if (raw.data && Array.isArray(raw.data.lrclist)) {
        raw = raw.data.lrclist;
      }
    }

    if (!Array.isArray(raw)) {
      return {
        ok,
        retryable,
        message,
        items: []
      };
    }

    const items = raw
      .map(item => {
        if (typeof item === 'string') {
          return {
            text: item,
            time: 0
          };
        }
        if (!item || typeof item !== 'object') return null;
        return {
          text: item.lineLyric || item.lyric || item.text || item.content || '',
          time: this.parseLyricTime(item.time || item.startTime || item.timestamp || 0)
        };
      })
      .filter(Boolean)
      .map((item, index) => ({
        id: `lyric-${index}`,
        text: String(item.text || '').trim(),
        time: Number(item.time) || 0
      }))
      .filter(item => item.text)
      .sort((a, b) => a.time - b.time || Number(a.id.split('-')[1]) - Number(b.id.split('-')[1]))
      .map((item, index) => ({
        ...item,
        id: `lyric-${index}`
      }));

    return {
      ok: ok || items.length > 0,
      retryable,
      message,
      items
    };
  },

  parseLyricResult(rawResult) {
    return this.normalizeLyricResponse(rawResult).items;
  },

  parseLyricTime(value) {
    if (typeof value === 'number') return value;
    const raw = String(value || '').trim();
    if (!raw) return 0;

    const colonMatch = raw.match(/^(\d+):(\d+(?:\.\d+)?)$/);
    if (colonMatch) {
      return Number(colonMatch[1]) * 60 + Number(colonMatch[2]);
    }

    return Number(raw) || 0;
  },

  fetchLyricItems(rid) {
    const cacheKey = String(rid || '');
    if (!cacheKey) return Promise.resolve([]);

    const cached = this.getCacheValue(this.lyricCache, cacheKey);
    if (cached) return Promise.resolve([...cached]);

    if (this.lyricPending[cacheKey]) {
      return this.lyricPending[cacheKey].then(items => items.map(item => ({ ...item })));
    }

    const request = this.scheduleApiCall('lyric', () => this.callCloudFunction('lyric-functions', {
      rid
    })).then(res => {
      const lyricResult = this.normalizeLyricResponse(res);
      if (!lyricResult.ok && lyricResult.retryable && !lyricResult.items.length) {
        throw new Error(lyricResult.message || '歌词暂时不可用');
      }

      const ttl = lyricResult.items.length ? 1800000 : 120000;
      this.setCacheValue(this.lyricCache, cacheKey, lyricResult.items, ttl);
      return lyricResult.items;
    }).finally(() => {
      delete this.lyricPending[cacheKey];
    });

    this.lyricPending[cacheKey] = request;
    return request.then(items => items.map(item => ({ ...item })));
  },

  fetchLyricLines(rid) {
    return this.fetchLyricItems(rid).then(items => items.map(item => item.text));
  },

  formatPlayerTime(seconds = 0) {
    const safeSeconds = Math.max(0, Math.floor(Number(seconds) || 0));
    const minutes = Math.floor(safeSeconds / 60);
    const secs = safeSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  },

  getSongList() {
    if (Array.isArray(this.currentPlaybackQueue) && this.currentPlaybackQueue.length) {
      return this.currentPlaybackQueue;
    }
    if (Array.isArray(this.data.playerQueue) && this.data.playerQueue.length) {
      return this.data.playerQueue;
    }
    return Array.isArray(this.data.songs_backup) ? this.data.songs_backup : [];
  },

  getSearchSongList() {
    return Array.isArray(this.data.songs_backup) ? this.data.songs_backup.map(normalizeSong).filter((song) => song.rid) : [];
  },

  loadPlaylists() {
    let playlists = [];
    try {
      playlists = wx.getStorageSync(PLAYLIST_STORAGE_KEY) || [];
    } catch (err) {
      console.warn('读取歌单失败', err);
    }

    if (!Array.isArray(playlists) || !playlists.length) {
      playlists = getDefaultPlaylists();
      this.persistPlaylists(playlists, { silent: true });
      return;
    }

    const normalized = playlists.map(normalizePlaylist);
    const selectedPlaylistId = this.data.selectedPlaylistId || (normalized[0] && normalized[0].id) || '';
    this.setData({ playlists: normalized }, () => {
      this.updateSelectedPlaylist(selectedPlaylistId);
    });
  },

  persistPlaylists(playlists, options = {}) {
    const normalized = playlists.map(normalizePlaylist);
    try {
      wx.setStorageSync(PLAYLIST_STORAGE_KEY, normalized);
    } catch (err) {
      console.error('保存歌单失败', err);
      if (!options.silent) {
        wx.showToast({ title: '歌单保存失败', icon: 'none' });
      }
    }

    const selectedPlaylistId = this.data.selectedPlaylistId || (normalized[0] && normalized[0].id) || '';
    const nextData = { playlists: normalized };
    if (!options.silent) {
      nextData.playlistCloudStatus = options.fromCloud ? '已从云端恢复' : '本地有新更改';
      nextData.playlistCloudUpdatedText = this.getPlaylistCloudTimeText();
    }

    this.setData(nextData, () => {
      this.updateSelectedPlaylist(selectedPlaylistId);
    });
  },

  getPlaylistCloudTimeText(timestamp = Date.now()) {
    const date = new Date(timestamp);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hour = String(date.getHours()).padStart(2, '0');
    const minute = String(date.getMinutes()).padStart(2, '0');
    return `${month}-${day} ${hour}:${minute}`;
  },

  getPlaylistCloudCollection() {
    if (!wx.cloud || !wx.cloud.database) return null;

    try {
      return wx.cloud.database().collection(PLAYLIST_CLOUD_COLLECTION);
    } catch (err) {
      console.error('初始化歌单云端失败', err);
      return null;
    }
  },

  ensurePlaylistCloudCollection() {
    if (!wx.cloud || !wx.cloud.database) return Promise.resolve();

    try {
      const db = wx.cloud.database();
      if (!db.createCollection) return Promise.resolve();
      return db.createCollection(PLAYLIST_CLOUD_COLLECTION).catch(() => {});
    } catch (err) {
      return Promise.resolve();
    }
  },

  syncPlaylistsToCloud() {
    const collection = this.getPlaylistCloudCollection();
    if (!collection) {
      wx.showToast({ title: '当前环境暂不支持云同步', icon: 'none' });
      return;
    }

    const updatedAt = Date.now();
    const payload = {
      playlists: (this.data.playlists || []).map(normalizePlaylist),
      updatedAt,
      version: 1
    };

    this.setData({
      playlistCloudSyncing: true,
      playlistCloudStatus: '正在同步云端'
    });

    this.ensurePlaylistCloudCollection()
      .then(() => collection.where({ key: PLAYLIST_CLOUD_DOC_ID }).limit(1).get())
      .then((res) => {
        const backup = res && res.data && res.data[0];
        if (backup && backup._id) {
          return collection.doc(backup._id).update({
            data: payload
          });
        }
        return collection.add({
          data: {
            key: PLAYLIST_CLOUD_DOC_ID,
            ...payload
          }
        });
      })
      .then(() => {
        this.setData({
          playlistCloudSyncing: false,
          playlistCloudStatus: '已同步到云端',
          playlistCloudUpdatedText: this.getPlaylistCloudTimeText(updatedAt)
        });
        wx.showToast({ title: '歌单已同步', icon: 'success' });
      })
      .catch((err) => {
        console.error('同步歌单失败', err);
        this.setData({
          playlistCloudSyncing: false,
          playlistCloudStatus: '云同步失败'
        });
        wx.showToast({ title: '云同步失败，请稍后再试', icon: 'none' });
      });
  },

  restorePlaylistsFromCloud() {
    const collection = this.getPlaylistCloudCollection();
    if (!collection) {
      wx.showToast({ title: '当前环境暂不支持云恢复', icon: 'none' });
      return;
    }

    this.setData({
      playlistCloudSyncing: true,
      playlistCloudStatus: '正在读取云端'
    });

    collection.where({ key: PLAYLIST_CLOUD_DOC_ID }).limit(1).get()
      .then((res) => {
        const cloudData = res && res.data && res.data[0] ? res.data[0] : {};
        const playlists = Array.isArray(cloudData.playlists) ? cloudData.playlists : [];
        if (!playlists.length) {
          throw new Error('empty playlist cloud backup');
        }

        this.persistPlaylists(playlists, { fromCloud: true });
        this.setData({
          playlistCloudSyncing: false,
          playlistCloudStatus: '已从云端恢复',
          playlistCloudUpdatedText: this.getPlaylistCloudTimeText(cloudData.updatedAt || Date.now())
        });
        wx.showToast({ title: '已恢复歌单', icon: 'success' });
      })
      .catch((err) => {
        console.error('恢复歌单失败', err);
        this.setData({
          playlistCloudSyncing: false,
          playlistCloudStatus: '云端暂无可恢复歌单'
        });
        wx.showToast({ title: '云端暂无歌单', icon: 'none' });
      });
  },

  updateSelectedPlaylist(playlistId = this.data.selectedPlaylistId) {
    const playlists = this.data.playlists || [];
    const playlist = playlists.find((item) => item.id === playlistId) || playlists[0];

    this.setData({
      selectedPlaylistId: playlist ? playlist.id : '',
      selectedPlaylistName: playlist ? playlist.name : '',
      selectedPlaylistDesc: playlist ? playlist.desc : '',
      selectedPlaylistCover: playlist ? playlist.cover : '/images/icons/music.png',
      selectedPlaylistSongs: playlist ? playlist.songs : []
    });
  },

  showPlaylistCreator() {
    this.setData({
      playlistCreatorVisible: true,
      playlistNameDraft: ''
    });
  },

  togglePlaylistExpanded() {
    this.setData({
      playlistExpanded: !this.data.playlistExpanded
    });
  },

  hidePlaylistCreator() {
    this.setData({
      playlistCreatorVisible: false,
      playlistNameDraft: ''
    });
  },

  onPlaylistNameInput(e) {
    this.setData({
      playlistNameDraft: this.getEventValue(e)
    });
  },

  createPlaylist() {
    return this.createPlaylistByName(this.data.playlistNameDraft, { closeCreator: true });
  },

  createPlaylistFromAddSheet() {
    const playlistName = String(this.data.playlistNameDraft || '').trim();
    const targetSong = this.data.addTargetSong;
    if (!playlistName) {
      wx.showToast({ title: '先写歌单名', icon: 'none' });
      return;
    }
    if (!targetSong) return;

    const playlist = {
      id: `playlist-${Date.now()}`,
      name: playlistName,
      desc: '自建歌单',
      cover: (targetSong && targetSong.pic) || '/images/icons/music.png',
      songs: [normalizeSong(targetSong)],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    this.persistPlaylists([playlist, ...this.data.playlists]);
    this.setData({
      selectedPlaylistId: playlist.id,
      addToPlaylistVisible: false,
      addTargetSong: null,
      playlistNameDraft: ''
    }, () => {
      this.updateSelectedPlaylist(playlist.id);
    });
    wx.showToast({ title: '已加入歌单', icon: 'success' });
  },

  createPlaylistByName(name, options = {}) {
    const playlistName = String(name || '').trim();
    if (!playlistName) {
      wx.showToast({ title: '先写歌单名', icon: 'none' });
      return null;
    }

    const playlist = {
      id: `playlist-${Date.now()}`,
      name: playlistName,
      desc: '自建歌单',
      cover: '/images/icons/music.png',
      songs: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    const playlists = [playlist, ...this.data.playlists];
    this.persistPlaylists(playlists);
    this.setData({
      selectedPlaylistId: playlist.id,
      playlistCreatorVisible: options.closeCreator ? false : this.data.playlistCreatorVisible,
      playlistNameDraft: options.closeCreator ? '' : this.data.playlistNameDraft
    }, () => {
      this.updateSelectedPlaylist(playlist.id);
    });
    wx.showToast({ title: '歌单已创建', icon: 'success' });
    return playlist;
  },

  selectPlaylist(e) {
    const playlistId = e.currentTarget.dataset.playlistId;
    if (!playlistId) return;
    this.setData({
      isPlaylistSorting: false,
      dragSongIndex: -1
    }, () => {
      this.updateSelectedPlaylist(playlistId);
    });
  },

  showPlaylistEditor() {
    const playlist = this.data.playlists.find((item) => item.id === this.data.selectedPlaylistId);
    if (!playlist) return;

    this.setData({
      playlistEditorVisible: true,
      playlistNameEdit: playlist.name,
      playlistDescEdit: playlist.desc,
      playlistCoverEdit: playlist.cover || '/images/icons/music.png'
    });
  },

  hidePlaylistEditor() {
    this.setData({
      playlistEditorVisible: false,
      playlistNameEdit: '',
      playlistDescEdit: '',
      playlistCoverEdit: ''
    });
  },

  onPlaylistEditNameInput(e) {
    this.setData({
      playlistNameEdit: this.getEventValue(e)
    });
  },

  onPlaylistEditDescInput(e) {
    this.setData({
      playlistDescEdit: this.getEventValue(e)
    });
  },

  savePlaylistEditor() {
    const playlistId = this.data.selectedPlaylistId;
    const name = String(this.data.playlistNameEdit || '').trim();
    const desc = String(this.data.playlistDescEdit || '').trim();
    if (!playlistId || !name) {
      wx.showToast({ title: '歌单名不能为空', icon: 'none' });
      return;
    }

    const playlists = this.data.playlists.map((playlist) => {
      if (playlist.id !== playlistId) return playlist;
      return {
        ...playlist,
        name,
        desc: desc || '本地歌单',
        cover: this.data.playlistCoverEdit || playlist.cover || '/images/icons/music.png',
        updatedAt: Date.now()
      };
    });
    this.persistPlaylists(playlists);
    this.setData({
      playlistEditorVisible: false,
      playlistNameEdit: '',
      playlistDescEdit: '',
      playlistCoverEdit: ''
    });
    wx.showToast({ title: '歌单已更新', icon: 'success' });
  },

  choosePlaylistCoverFromAlbum() {
    const onChoose = (tempFilePath) => {
      if (!tempFilePath) return;
      wx.saveFile({
        tempFilePath,
        success: (res) => {
          this.setData({
            playlistCoverEdit: res.savedFilePath || tempFilePath
          });
        },
        fail: () => {
          this.setData({
            playlistCoverEdit: tempFilePath
          });
        }
      });
    };

    if (wx.chooseMedia) {
      wx.chooseMedia({
        count: 1,
        mediaType: ['image'],
        sourceType: ['album', 'camera'],
        success: (res) => {
          const file = res.tempFiles && res.tempFiles[0];
          onChoose(file && file.tempFilePath);
        }
      });
      return;
    }

    wx.chooseImage({
      count: 1,
      sourceType: ['album', 'camera'],
      success: (res) => {
        onChoose(res.tempFilePaths && res.tempFilePaths[0]);
      }
    });
  },

  selectPlaylistCoverFromSong(e) {
    const cover = e.currentTarget.dataset.cover;
    if (!cover) return;

    this.setData({
      playlistCoverEdit: cover
    });
  },

  deleteSelectedPlaylist() {
    const playlistId = this.data.selectedPlaylistId;
    const playlist = this.data.playlists.find((item) => item.id === playlistId);
    if (!playlist) return;

    wx.showModal({
      title: '删除歌单',
      content: `要删除「${playlist.name}」吗？歌曲只会从这个本地歌单移除。`,
      confirmText: '删除',
      confirmColor: '#d75f50',
      success: (res) => {
        if (!res.confirm) return;
        let playlists = this.data.playlists.filter((item) => item.id !== playlistId);
        if (!playlists.length) playlists = getDefaultPlaylists();
        this.persistPlaylists(playlists);
      }
    });
  },

  openAddSongSheet(e) {
    const index = Number(e.currentTarget.dataset.num);
    const song = this.getSearchSongList()[index];
    if (!song || !song.rid) {
      wx.showToast({ title: '歌曲信息不完整', icon: 'none' });
      return;
    }

    this.setData({
      addTargetSong: song,
      addToPlaylistVisible: true,
      playlistNameDraft: ''
    });
  },

  closeAddSongSheet() {
    this.setData({
      addToPlaylistVisible: false,
      addTargetSong: null,
      playlistNameDraft: ''
    });
  },

  addTargetToPlaylist(e) {
    const playlistId = e.currentTarget.dataset.playlistId;
    if (!playlistId || !this.data.addTargetSong) return;
    this.addSongToPlaylist(playlistId, this.data.addTargetSong);
    this.setData({
      addToPlaylistVisible: false,
      addTargetSong: null,
      playlistNameDraft: ''
    });
  },

  addSongToPlaylist(playlistId, rawSong) {
    const song = normalizeSong(rawSong);
    if (!song.rid) return;

    const playlists = this.data.playlists.map((playlist) => {
      if (playlist.id !== playlistId) return playlist;

      const exists = playlist.songs.some((item) => item.rid === song.rid);
      const songs = exists ? playlist.songs : [song, ...playlist.songs];
      return {
        ...playlist,
        songs,
        cover: playlist.cover && playlist.cover !== '/images/icons/music.png' ? playlist.cover : (song.pic || playlist.cover),
        updatedAt: Date.now()
      };
    });

    this.persistPlaylists(playlists);
    wx.showToast({ title: '已加入歌单', icon: 'success' });
  },

  removePlaylistSong(e) {
    const index = Number(e.currentTarget.dataset.num);
    const playlistId = this.data.selectedPlaylistId;
    const playlist = this.data.playlists.find((item) => item.id === playlistId);
    if (!playlist) return;

    this.updatePlaylistSongs(playlistId, playlist.songs.filter((item, itemIndex) => itemIndex !== index));
  },

  updatePlaylistSongs(playlistId, songs) {
    const playlists = this.data.playlists.map((playlist) => {
      if (playlist.id !== playlistId) return playlist;
      return {
        ...playlist,
        songs,
        cover: playlist.cover || (songs[0] && songs[0].pic) || '/images/icons/music.png',
        updatedAt: Date.now()
      };
    });

    try {
      wx.setStorageSync(PLAYLIST_STORAGE_KEY, playlists);
    } catch (err) {
      console.error('保存歌单排序失败', err);
      wx.showToast({ title: '排序保存失败', icon: 'none' });
    }

    this.setData({ playlists }, () => {
      this.updateSelectedPlaylist(playlistId);
    });
  },

  startPlaylistSongDrag(e) {
    const index = Number(e.currentTarget.dataset.num);
    if (!this.data.selectedPlaylistSongs[index]) return;

    this.setData({
      isPlaylistSorting: true,
      dragSongIndex: index
    });
    wx.vibrateShort({ type: 'light' });
  },

  movePlaylistSongDrag(e) {
    if (!this.data.isPlaylistSorting || this.data.dragSongIndex < 0) return;
    const touch = e.touches && e.touches[0];
    if (!touch || this.playlistDragQuerying) return;

    const y = Number(touch.clientY || touch.pageY || 0);
    this.playlistDragQuerying = true;
    wx.createSelectorQuery()
      .in(this)
      .selectAll('.playlist-song-row')
      .boundingClientRect((rects) => {
        this.playlistDragQuerying = false;
        if (!Array.isArray(rects) || !rects.length) return;

        let targetIndex = this.data.dragSongIndex;
        for (let i = 0; i < rects.length; i += 1) {
          const rect = rects[i];
          const middle = rect.top + rect.height / 2;
          if (y < middle) {
            targetIndex = i;
            break;
          }
          targetIndex = i;
        }

        if (targetIndex !== this.data.dragSongIndex) {
          this.reorderPlaylistSong(this.data.dragSongIndex, targetIndex);
        }
      })
      .exec();
  },

  reorderPlaylistSong(fromIndex, toIndex) {
    const playlistId = this.data.selectedPlaylistId;
    const songs = this.data.selectedPlaylistSongs.slice();
    if (!songs[fromIndex] || toIndex < 0 || toIndex >= songs.length) return;

    const [song] = songs.splice(fromIndex, 1);
    songs.splice(toIndex, 0, song);
    this.setData({
      dragSongIndex: toIndex
    });
    this.updatePlaylistSongs(playlistId, songs);
  },

  endPlaylistSongDrag() {
    if (!this.data.isPlaylistSorting) return;
    this.setData({
      isPlaylistSorting: false,
      dragSongIndex: -1
    });
  },

  playSelectedPlaylist() {
    this.playPlaylistById(this.data.selectedPlaylistId, 0);
  },

  playPlaylistSong(e) {
    if (this.data.isPlaylistSorting) return;
    const index = Number(e.currentTarget.dataset.num) || 0;
    this.playPlaylistById(this.data.selectedPlaylistId, index);
  },

  playPlaylistById(playlistId, startIndex = 0) {
    const playlist = this.data.playlists.find((item) => item.id === playlistId);
    if (!playlist || !playlist.songs.length) {
      wx.showToast({ title: '这个歌单还没有歌', icon: 'none' });
      return;
    }

    const queue = playlist.songs.map(normalizeSong).filter((song) => song.rid);
    this.playSongByIndex(startIndex, {
      queue,
      queueName: playlist.name
    });
  },

  consumePendingPlaylistPlayback() {
    let pending = null;
    try {
      pending = wx.getStorageSync(PLAYLIST_AUTOPLAY_KEY);
      if (pending) wx.removeStorageSync(PLAYLIST_AUTOPLAY_KEY);
    } catch (err) {
      console.warn('读取待播放歌单失败', err);
    }
    if (!pending || !pending.playlistId) return;

    const play = () => {
      this.setData({
        tabValue: '1'
      });
      this.updateSelectedPlaylist(pending.playlistId);
      this.playPlaylistById(pending.playlistId, Number(pending.startIndex) || 0);
    };

    if (!this.data.playlists.length || !this.data.playlists.some((item) => item.id === pending.playlistId)) {
      let playlists = [];
      try {
        playlists = wx.getStorageSync(PLAYLIST_STORAGE_KEY) || [];
      } catch (err) {
        console.warn('刷新歌单失败', err);
      }
      const normalized = Array.isArray(playlists) ? playlists.map(normalizePlaylist) : [];
      this.setData({
        playlists: normalized
      }, play);
      return;
    }
    play();
  },

  noop() {},

  getResetPlayerProgressData(lyricItems = this.data.playerLyricItems) {
    const activeLyricId = Array.isArray(lyricItems) && lyricItems[0] ? lyricItems[0].id : '';

    return {
      playerCurrentTime: 0,
      playerDuration: 0,
      playerProgress: 0,
      playerCurrentText: '00:00',
      playerDurationText: '00:00',
      activeLyricIndex: 0,
      activeLyricId
    };
  },

  syncPlayerProgress() {
    if (this.data.playerMode !== 'music') return;
    if (this.data.playerLoading && !this.data.playerSrc) return;
    const bgm = this.data.app && this.data.app.globalData.currentSong;
    if (!bgm) return;

    const currentTime = Number(bgm.currentTime) || 0;
    const duration = Number(bgm.duration) || this.data.playerDuration || 0;
    const playerProgress = duration > 0 ? Math.min(1000, Math.round((currentTime / duration) * 1000)) : 0;

    const lyricData = this.updateActiveLyric(currentTime);

    this.setData({
      playerCurrentTime: currentTime,
      playerDuration: duration,
      playerProgress,
      playerCurrentText: this.formatPlayerTime(currentTime),
      playerDurationText: duration > 0 ? this.formatPlayerTime(duration) : '00:00',
      ...lyricData
    });
  },

  buildLyricItems(song) {
    if (!song) return [];
    return [
      '正在播放',
      song.name || '未知歌曲',
      song.artist || '未知歌手',
      '暂无歌词',
      '让旋律先往前走',
      '在这一段里慢慢听'
    ].map((text, index) => ({
      id: `lyric-${index}`,
      text,
      time: index * 6
    }));
  },

  buildLyricLines(song) {
    return this.buildLyricItems(song).map(item => item.text);
  },

  getActiveLyricIndex(currentTime = 0, lyricItems = this.data.playerLyricItems) {
    if (!Array.isArray(lyricItems) || !lyricItems.length) return 0;

    let activeIndex = 0;
    for (let i = 0; i < lyricItems.length; i++) {
      const itemTime = Number(lyricItems[i].time) || 0;
      if (itemTime <= currentTime + 0.2) {
        activeIndex = i;
      } else {
        break;
      }
    }

    return activeIndex;
  },

  updateActiveLyric(currentTime = this.data.playerCurrentTime, lyricItems = this.data.playerLyricItems) {
    if (!Array.isArray(lyricItems) || !lyricItems.length) return {};
    const activeLyricIndex = this.getActiveLyricIndex(currentTime, lyricItems);
    const activeLyricId = lyricItems[activeLyricIndex] ? lyricItems[activeLyricIndex].id : '';
    if (activeLyricIndex === this.data.activeLyricIndex && activeLyricId === this.data.activeLyricId) return {};

    return {
      activeLyricIndex,
      activeLyricId
    };
  },

  playSongByIndex(index, options = {}) {
    const songList = Array.isArray(options.queue) && options.queue.length
      ? options.queue.map(normalizeSong).filter((song) => song.rid)
      : this.getSongList();
    if (!songList.length) {
      wx.showToast({ title: '先搜索歌曲', icon: 'none' });
      return;
    }

    if (Array.isArray(options.queue) && options.queue.length) {
      this.currentPlaybackQueue = songList;
      this.setData({
        playerQueue: songList,
        playerQueueName: options.queueName || '播放队列'
      });
    }

    const normalizedIndex = ((Number(index) || 0) + songList.length) % songList.length;
    const song = songList[normalizedIndex];
    if (!song || !song.rid) {
      wx.showToast({ title: '歌曲信息不完整', icon: 'none' });
      return;
    }

    const now = Date.now();
    if (this.data.playerLoading && now - (this.lastMusicTapAt || 0) < 1000) {
      wx.showToast({ title: '正在取歌，稍等一下', icon: 'none' });
      return;
    }
    this.lastMusicTapAt = now;

    const requestId = (this.playerRequestId || 0) + 1;
    this.playerRequestId = requestId;
    const lyricItems = this.buildLyricItems(song);
    const bgm = this.data.app && this.data.app.globalData.currentSong;

    if (bgm) {
      try {
        bgm.stop();
      } catch (err) {
        console.warn('Stop previous song failed:', err);
      }
    }

    this.setData({
      playerVisible: true,
      playerMode: 'music',
      playerSong: song,
      playerSongIndex: normalizedIndex,
      playerSrc: '',
      playerLoading: true,
      playerLyricLines: lyricItems.map(item => item.text),
      playerLyricItems: lyricItems,
      lyricLoading: false,
      lyricError: '',
      ...this.getResetPlayerProgressData(lyricItems)
    });

    this.fetchSongUrl(song.rid).then(url => {
      if (requestId !== this.playerRequestId || this.data.playerMode !== 'music') return;

      const bgm = this.data.app.globalData.currentSong;
      bgm.title = song.name || '未知歌曲';
      bgm.singer = song.artist || '未知歌手';
      bgm.coverImgUrl = song.pic || '/images/icons/music.png';
      bgm.src = url;

      this.setData({
        playerSrc: url,
        playerLoading: false
      });
    }).catch(err => {
      if (requestId !== this.playerRequestId) return;
      console.error('Load song failed:', err);
      this.setData({ playerLoading: false });
      wx.showToast({ title: '播放失败', icon: 'none' });
    });
  },

  playSong(e) {
    const queue = this.getSearchSongList();
    this.playSongByIndex(e.currentTarget.dataset.num, {
      queue,
      queueName: this.data.searchContent ? `搜索：${this.data.searchContent}` : '推荐歌曲'
    });
  },

  togglePlayer() {
    const bgm = this.data.app && this.data.app.globalData.currentSong;
    if (!bgm || !this.data.playerSong) return;

    if (!this.data.playerSrc) {
      this.playSongByIndex(this.data.playerSongIndex);
      return;
    }

    if (bgm.paused) {
      bgm.play();
    } else {
      bgm.pause();
    }
  },

  playPreviousSong() {
    this.playSongByIndex(this.data.playerSongIndex - 1);
  },

  playNextSong() {
    this.playSongByIndex(this.data.playerSongIndex + 1);
  },

  onPlayerSeek(e) {
    const bgm = this.data.app && this.data.app.globalData.currentSong;
    const duration = this.data.playerDuration;
    if (!bgm || !duration) return;

    const value = Number(e.detail.value) || 0;
    const nextTime = Math.max(0, Math.min(duration, (value / 1000) * duration));
    bgm.seek(nextTime);
    const lyricData = this.updateActiveLyric(nextTime);
    this.setData({
      playerCurrentTime: nextTime,
      playerProgress: value,
      playerCurrentText: this.formatPlayerTime(nextTime),
      ...lyricData
    });
  },

  closePlayer() {
    const bgm = this.data.app && this.data.app.globalData.currentSong;
    if (bgm && this.data.playerMode === 'music') {
      bgm.stop();
    }

    this.currentPlaybackQueue = [];
    this.setData({
      playerVisible: false,
      playerMode: 'idle',
      playerSong: null,
      playerSongIndex: -1,
      playerSrc: '',
      playerLoading: false,
      playerDetailVisible: false,
      playerLyricLines: [],
      playerLyricItems: [],
      activeLyricIndex: 0,
      activeLyricId: '',
      lyricLoading: false,
      lyricError: '',
      playerCurrentTime: 0,
      playerDuration: 0,
      playerProgress: 0,
      playerCurrentText: '00:00',
      playerDurationText: '00:00',
      playerQueue: [],
      playerQueueName: ''
    });
  },

  loadLyricsForSong(song = this.data.playerSong) {
    if (!song || !song.rid) return;
    const requestId = (this.lyricRequestId || 0) + 1;
    this.lyricRequestId = requestId;

    this.setData({
      lyricLoading: true,
      lyricError: '',
      playerLyricLines: ['歌词加载中...'],
      playerLyricItems: [{
        id: 'lyric-0',
        text: '歌词加载中...',
        time: 0
      }],
      activeLyricIndex: 0,
      activeLyricId: 'lyric-0'
    });

    this.fetchLyricItems(song.rid).then(items => {
      if (requestId !== this.lyricRequestId) return;
      const nextItems = items.length ? items : this.buildLyricItems(song);
      const activeLyricIndex = this.getActiveLyricIndex(this.data.playerCurrentTime, nextItems);
      this.setData({
        playerLyricLines: nextItems.map(item => item.text),
        playerLyricItems: nextItems,
        activeLyricIndex,
        activeLyricId: nextItems[activeLyricIndex] ? nextItems[activeLyricIndex].id : '',
        lyricLoading: false,
        lyricError: items.length ? '' : '暂无歌词'
      });
    }).catch(err => {
      if (requestId !== this.lyricRequestId) return;
      console.error('Load lyrics failed:', err);
      const fallbackItems = this.buildLyricItems(song);
      this.setData({
        playerLyricLines: fallbackItems.map(item => item.text),
        playerLyricItems: fallbackItems,
        activeLyricIndex: 0,
        activeLyricId: fallbackItems[0] ? fallbackItems[0].id : '',
        lyricLoading: false,
        lyricError: '歌词加载失败'
      });
    });
  },

  showPlayerDetail() {
    if (!this.data.playerSong) return;
    this.setData({ playerDetailVisible: true });
    this.loadLyricsForSong();
  },

  openPlayerDetail() {
    this.showPlayerDetail();
  },

  closePlayerDetail() {
    this.setData({ playerDetailVisible: false });
  },

  openQuiz() {
    this.setData({
      tabValue: '2',
      gameState: 'intro',
      joinRoomVisible: false,
      playerDetailVisible: false
    });
  },

  returnToMusic() {
    this.setData({
      tabValue: '1',
      joinRoomVisible: false
    });
  },



  onReachBottom() {
    if (this.data.isLoading || this.data.isLastPage) return;
    this.setData({
      currentPage: this.data.currentPage + 1
    });
    this.getSongs();
  },

  getSongs() {
    const requestId = (this.songListRequestId || 0) + 1;
    this.songListRequestId = requestId;

    this.setData({
      isLoading: true
    });

    // Only show loading toast if it's the first page or network is slow
    if (this.data.currentPage === 1) {
      wx.showLoading({
        title: '加载中...',
      });
    }

    this.fetchSongsFromApi(this.data.searchContent, this.data.currentPage, this.data.eachPageSongs).then(newSongs => {
      wx.hideLoading();
      if (requestId !== this.songListRequestId) return;

      const isLastPage = newSongs.length < this.data.eachPageSongs;
      const existingSongs = Array.isArray(this.data.songs) ? this.data.songs : [];
      const allSongs = this.data.currentPage === 1 ? newSongs : existingSongs.concat(newSongs);

      this.setData({
        songs: allSongs,
        songs_backup: allSongs,
        isLoading: false,
        isLastPage: isLastPage
      });
    }).catch(err => {
      wx.hideLoading();
      if (requestId !== this.songListRequestId) return;

      console.error('songs-functions returned invalid result:', err);
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
      this.setData({
        isLoading: false,
        isLastPage: true
      });
    });
  },

  canSubmitSearch(keyword) {
    const now = Date.now();
    if (this.data.isLoading) {
      wx.showToast({ title: '搜索中，稍等一下', icon: 'none' });
      return false;
    }

    if (keyword === this.lastSearchKeyword && now - (this.lastSearchSubmitAt || 0) < 1200) {
      wx.showToast({ title: '搜索太频繁了', icon: 'none' });
      return false;
    }

    this.lastSearchKeyword = keyword;
    this.lastSearchSubmitAt = now;
    return true;
  },

  getEventValue(e) {
    if (!e || !e.detail) return '';
    if (typeof e.detail.value === 'string') return e.detail.value;
    if (typeof e.detail === 'string') return e.detail;
    return '';
  },

  onSearchInput(e) {
    this.setData({
      searchContent: this.getEventValue(e)
    });
  },

  submitSearch(e) {
    const nextKeyword = this.getEventValue(e).trim();
    const keyword = nextKeyword || this.data.searchContent.trim();
    if (!this.canSubmitSearch(keyword)) return;

    this.setData({
      searchContent: keyword,
      currentPage: 1,
      songs: [],
      songs_backup: [],
      isLastPage: false
    });

    this.getSongs();
  },

  clearSearch() {
    this.songListRequestId = (this.songListRequestId || 0) + 1;
    this.setData({
      searchContent: '',
      currentPage: 1,
      songs: [],
      songs_backup: [],
      isLastPage: false
    });
  },

  onSearch(e) {
    this.submitSearch(e);
  },

  // 计算字符串总权值的函数
  calculateWeight(str, num) {
    const charWeight = {
      'chinese': 2, // 中文字符的权值
      'uppercase': 1.5, // 大写字母的权值
      'lowercase': 1.5, // 小写字母的权值
      'other': 1.5 // 其他字符的默认权值
    };
    let totalWeight = 0,
      cnt = 0;
    for (let char of str) {
      let charCode = char.charCodeAt(0);
      if (charCode >= 0x4e00 && charCode <= 0x9fff) { // 中文字符
        totalWeight += charWeight.chinese;
      } else if (charCode >= 0x41 && charCode <= 0x5a) { // 大写字母
        totalWeight += charWeight.uppercase;
      } else if (charCode >= 0x61 && charCode <= 0x7a) { // 小写字母
        totalWeight += charWeight.lowercase;
      } else { // 其他字符
        totalWeight += charWeight.other;
      }
      cnt = cnt + 1;
      if (totalWeight >= num) break;
    }
    return cnt;
  },

  modifySongs(songs) {
    console.log(songs);
    return songs;
  },




  // --- Guess the Song Game Logic ---

  // Online PK Data
  initPKData() {
    this.setData({
      isMultiplayer: false,
      isHost: false,
      roomId: null,
      userInfo: null,
      opponentInfo: null,
      opponentScore: 0,
      waitingForOpponentNext: false,
      roomWatcher: null,
      isReady: false
    });
  },

  closeRoomWatcher() {
    if (this.roomWatcher) {
      this.roomWatcher.close();
      this.roomWatcher = null;
    }
  },

  leaveCurrentRoom(roomId) {
    if (!roomId) return Promise.resolve();
    if (this.pendingLeaveRoomId === roomId && this.pendingLeavePromise) {
      return this.pendingLeavePromise;
    }

    const promise = wx.cloud.callFunction({
      name: 'game-functions',
      data: {
        action: 'leaveRoom',
        data: { roomId }
      }
    }).catch(err => {
      console.error('Leave room failed', err);
      return null;
    }).finally(() => {
      if (this.pendingLeaveRoomId === roomId) {
        this.pendingLeaveRoomId = null;
        this.pendingLeavePromise = null;
      }
    });

    this.pendingLeaveRoomId = roomId;
    this.pendingLeavePromise = promise;
    return promise;
  },

  hashSeed(value = '') {
    let hash = 2166136261;
    for (let i = 0; i < value.length; i++) {
      hash ^= value.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  },

  shuffleArray(array) {
    const copied = [...array];
    for (let i = copied.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copied[i], copied[j]] = [copied[j], copied[i]];
    }
    return copied;
  },

  deterministicSortSongs(songs, seed) {
    return [...songs]
      .map((song, index) => ({
        song,
        index,
        weight: this.hashSeed(`${seed}-${song.rid || song.name || index}-${index}`)
      }))
      .sort((a, b) => a.weight - b.weight || a.index - b.index)
      .map(item => item.song);
  },

  buildRoundQuestion(pool, options = {}) {
    const { deterministic = false, seed = '' } = options;
    if (!Array.isArray(pool) || pool.length < 4) return null;

    if (!deterministic) {
      const shuffled = this.shuffleArray(pool);
      const targetSong = shuffled[0];
      const distractors = shuffled.slice(1, 4);
      return {
        targetSong,
        gameOptions: this.shuffleArray([targetSong, ...distractors]),
        nextPool: pool.filter(song => String(song.rid) !== String(targetSong.rid))
      };
    }

    const targetSong = pool[0];
    const distractors = [];
    const candidateIndices = [10, 25, 40, 1, 2, 3, 4, 5, 6];

    candidateIndices.forEach(idx => {
      const candidate = pool[idx];
      if (!candidate) return;
      if (String(candidate.rid) === String(targetSong.rid)) return;
      if (distractors.some(song => String(song.rid) === String(candidate.rid))) return;
      distractors.push(candidate);
    });

    if (distractors.length < 3) return null;

    return {
      targetSong,
      gameOptions: this.deterministicSortSongs([targetSong, ...distractors.slice(0, 3)], seed),
      nextPool: pool.slice(1)
    };
  },

  clearRoundStartTimer() {
    if (this.questionStartTimer) {
      clearTimeout(this.questionStartTimer);
      this.questionStartTimer = null;
    }
  },

  scheduleRoundStart(rid, delay = 1000) {
    this.clearRoundStartTimer();
    const token = (this.questionStartToken || 0) + 1;
    this.questionStartToken = token;

    this.questionStartTimer = setTimeout(() => {
      this.questionStartTimer = null;
      if (this.hasQuit || this.data.gameState !== 'playing') return;

      this.playGameSong(rid).catch(() => {
        wx.showToast({ title: '题目音频加载失败', icon: 'none' });
      }).finally(() => {
        if (token !== this.questionStartToken || this.hasQuit || this.data.gameState !== 'playing') return;
        this.setData({ isRoundPreparing: false });
        this.startTimer();
      });
    }, delay);
  },

  applyRoundQuestion(question, options = {}) {
    if (!question) return false;
    this.stopTimer();

    const nextData = {
      targetSong: question.targetSong,
      gameOptions: question.gameOptions,
      showRoundResult: false,
      roundResult: '',
      waitingForOpponentNext: false,
      isRoundPreparing: true,
      timeLeft: 20
    };

    if (options.incrementRound) {
      nextData.gameRound = this.data.gameRound + 1;
    }

    if (options.trimPool !== false) {
      nextData.gameSongsPool = question.nextPool;
    }

    this.setData(nextData);
    this.scheduleRoundStart(question.targetSong.rid, options.delay || 1000);
    return true;
  },

  submitMultiplayerResult(selectedRid = '') {
    return wx.cloud.callFunction({
      name: 'game-functions',
      data: {
        action: 'submitResult',
        data: {
          roomId: this.data.roomId,
          round: this.data.gameRound,
          selectedRid
        }
      }
    }).then(res => {
      if (res.result && res.result.code === 0 && typeof res.result.score === 'number') {
        this.setData({ gameScore: res.result.score });
      } else if (res.result && res.result.code !== 0) {
        console.error('Submit result failed:', res.result);
      }
      return res;
    }).catch(err => {
      console.error('Submit result cloud call failed:', err);
      return null;
    });
  },

  getClosedRoomMessage(room) {
    if (room.closeReason === 'host_left') {
      return this.data.isHost ? '房间已关闭' : '房主已退出，房间已关闭';
    }
    if (room.closeReason === 'guest_left') {
      return this.data.isHost ? '对手已离开，本局已结束' : '房间已关闭';
    }
    return '房间已关闭';
  },

  showJoinRoomDialog() {
    this.setData({ joinRoomVisible: true });
  },

  hideJoinRoomDialog() {
    this.setData({ joinRoomVisible: false, joinRoomId: '' });
  },

  onJoinRoomInput(e) {
    this.setData({ joinRoomId: e.detail.value });
  },

  confirmJoinRoom() {
    const roomId = this.data.joinRoomId;
    if (!roomId) {
      wx.showToast({ title: '请输入房间号', icon: 'none' });
      return;
    }
    if (roomId.length !== 6) {
      wx.showToast({ title: '房间号必须为6位数字', icon: 'none' });
      return;
    }
    this.hideJoinRoomDialog();
    this.handleJoinRoom(roomId);
  },

  handleJoinRoom(roomId) {
    wx.showLoading({ title: '加入房间中...' });

    // Need user info first
    const join = () => {
      wx.cloud.callFunction({
        name: 'game-functions',
        data: {
          action: 'joinRoom',
          data: {
            roomId: roomId,
            guestInfo: this.data.userInfo || { nickName: 'Guest', avatarUrl: '' }
          }
        },
        success: res => {
          wx.hideLoading();
          if (res.result.code === 0) {
            const room = res.result.data || {}; // If re-joining
            this.setData({
              gameState: 'lobby',
              tabValue: '2', // Switch to game tab
              isMultiplayer: true,
              isHost: res.result.isHost || false,
              roomId: roomId,
              opponentInfo: res.result.isHost ? room.guest : room.host
            });

            this.hasQuit = false; // Reset quit flag on join
            if (room.state === 'finished') {
              wx.showToast({ title: '该对局已结束', icon: 'none' });
              return;
            }

            // If I am guest, opponent is host. If I am host (re-join), opponent is guest.
            // Actually, simplest is to watch the room and let watcher update UI.
            if (room._id) {
              this.watchRoom(room._id);
            } else {
              console.error('Room ID missing from join response');
              // Fallback if _id is missing (unlikely but safe)
              this.watchRoomByRoomId(roomId);
            }

          } else {
            console.error('Join Room Cloud Error:', res.result);
            const errMsg = res.result.msg || (res.result.error ? JSON.stringify(res.result.error) : '未知错误');
            wx.showToast({ title: '加入失败: ' + errMsg, icon: 'none', duration: 3000 });
          }
        },
        fail: err => {
          wx.hideLoading();
          wx.showToast({ title: '加入失败', icon: 'none' });
        }
      });
    };

    if (!this.data.userInfo) {
      // Since getUserProfile must be triggered by tap, we might need a distinct "Join" button if not already auth.
      // For now, let's assume we can try or use default.
      // Actually, we can't call getUserProfile automatically.
      // User will join as "Anonymous" if not tapped before.
      join();
    } else {
      join();
    }
  },

  startOnlinePK() {
    // Get User Info first if possible
    wx.getUserProfile({
      desc: '展示头像',
      success: (res) => {
        this.setData({ userInfo: res.userInfo });
        this.createPKRoom();
      },
      fail: () => {
        wx.showToast({ title: '需要授权才能PK', icon: 'none' });
      }
    });
  },

  copyRoomId() {
    if (this.data.roomId) {
      wx.setClipboardData({
        data: this.data.roomId,
        success: () => {
          wx.showToast({
            title: '房间号已复制',
            icon: 'success'
          });
        }
      });
    }
  },

  createPKRoom() {
    this.setData({
      gameState: 'lobby',
      isMultiplayer: true,
      isHost: true,
      opponentInfo: null
    });
    this.hasQuit = false; // Reset quit flag

    // 1. Prepare Songs
    this.fetchGameSongs().then(() => {
      const songList = this.data.gameSongsPool.slice(0, 50); // Take top 50 for the room

      wx.showLoading({ title: '创建房间...' });
      wx.cloud.callFunction({
        name: 'game-functions',
        data: {
          action: 'createRoom',
          data: {
            hostInfo: this.data.userInfo,
            songs: songList
          }
        },
        success: res => {
          wx.hideLoading();
          if (res.result.code === 0) {
            this.setData({ roomId: res.result.roomId });
            this.watchRoom(res.result.id); // Watch by _id
          } else {
            console.error('Create room failed:', res.result);
            wx.showToast({
              title: res.result.msg || '创建失败: ' + res.result.code,
              icon: 'none',
              duration: 3000
            });
            setTimeout(() => {
              this.goToIntro();
            }, 1000); // Delay return to intro so user can see toast
          }
        },
        fail: err => {
          wx.hideLoading();
          console.error('Create room cloud call failed:', err);
          wx.showToast({ title: '创建请求失败: ' + err.errMsg, icon: 'none', duration: 2000 });
          setTimeout(() => {
            this.goToIntro();
          }, 2000);
        }
      });
    }).catch(err => {
      console.error("Fetch songs failed:", err);
      wx.hideLoading();
      wx.showToast({ title: '无法获取题目数据', icon: 'none', duration: 2000 });
      setTimeout(() => {
        this.goToIntro();
      }, 2000);
    });
  },

  watchRoomByRoomId(roomId) {
    // Fallback for legacy or error cases
    console.warn('Using fallback watchByRoomId');
    const db = wx.cloud.database();
    this.watcherGen = (this.watcherGen || 0) + 1;
    const myGen = this.watcherGen;
    this.roomWatcher = db.collection('rooms').where({
      roomId: roomId
    }).watch({
      onChange: snapshot => {
        if (myGen !== this.watcherGen) return;
        if (!this.roomWatcher) return;
        if (snapshot.docs.length === 0) {
          if (!this.hasQuit && this.data.isMultiplayer) {
            wx.showToast({ title: '房间已关闭', icon: 'none' });
            this.goToIntro({ skipLeaveRoom: true });
          }
          return;
        }
        const room = snapshot.docs[0];
        if (room.roomId !== this.data.roomId || this.hasQuit) return;
        this.handleRoomUpdate(room);
      },
      onError: err => console.error('Watch Error', err)
    });
  },

  watchRoom(roomDocId) {
    // 1. CLEANUP: Close existing watcher to prevent leaks from previous rooms
    if (this.roomWatcher) {
      console.log('Closing existing watcher before starting new one');
      this.closeRoomWatcher();
    }

    const db = wx.cloud.database();

    // Use doc() for specific document watching - strictly correct and efficient
    // 4. GEN ID: Invalidate old watchers
    this.watcherGen = (this.watcherGen || 0) + 1;
    const myGen = this.watcherGen;

    this.roomWatcher = db.collection('rooms').doc(roomDocId).watch({
      onChange: snapshot => {
        // Gen Check
        if (myGen !== this.watcherGen) {
          console.log(`Watcher gen mismatch: ${myGen} vs ${this.watcherGen}`);
          return;
        }
        // 0. VITAL SAFETY: If we cleaned up the watcher (set to null), ignore any pending callbacks
        if (!this.roomWatcher) {
          console.log('Ignored watcher update - watcher is closed');
          return;
        }

        // snapshot.docs[0] is the changed document (if using where), for doc() it's snapshot directly?
        // Wait, for doc(), onChange returns the doc snapshot.
        // Snapshot format for doc(): { docs: [room], ... } or just room?
        // WeChat Cloud DB `watch` on doc returns same Snapshot structure with docs array (length 0 or 1).

        if (snapshot.docs.length === 0) {
          if (!this.hasQuit && this.data.isMultiplayer) {
            wx.showToast({ title: '房间已关闭', icon: 'none' });
            this.goToIntro({ skipLeaveRoom: true });
          }
          return;
        }
        const room = snapshot.docs[0];

        // 3. QUIT GUARD: Strict synchronous check
        if (this.hasQuit) {
          console.log('Ignored watcher update due to quit');
          return;
        }

        // 2. SAFETY GUARD: Ignore updates if this room doesn't match our current target
        if (room.roomId !== this.data.roomId) {
          console.warn('Received update for stale room:', room.roomId, 'Current:', this.data.roomId);
          // With doc listener this is less likely but good sanity check if roomId changed
          return;
        }

        this.handleRoomUpdate(room);
      },
      onError: err => {
        console.error('Watch closed', err);
      }
    });
  },

  handleRoomUpdate(room) {
    const newRound = room.currentRound || 0;
    const myScore = this.data.isHost ? Number(room.host?.score || 0) : Number(room.guest?.score || 0);
    const rivalScore = this.data.isHost ? Number(room.guest?.score || 0) : Number(room.host?.score || 0);

    if (room.state === 'closed') {
      if (!this.hasQuit && this.data.isMultiplayer) {
        wx.showToast({ title: this.getClosedRoomMessage(room), icon: 'none' });
        this.goToIntro({ skipLeaveRoom: true });
      }
      return;
    }

    if (room.state === 'finished') {
      this.setData({
        isMultiplayer: true,
        gameScore: myScore,
        opponentScore: rivalScore
      });
      this.endGame();
      return;
    }

    if (this.data.isHost) {
      if (room.guest) {
        const guestJoinedNow = !this.data.opponentInfo || this.data.opponentInfo.openid !== room.guest.openid;
        this.setData({ opponentInfo: room.guest });
        if (guestJoinedNow) {
          wx.showToast({ title: '对手已加入', icon: 'none' });
        }
      } else if (this.data.opponentInfo) {
        this.setData({ opponentInfo: null });
        if (this.data.gameState === 'lobby') {
          wx.showToast({ title: '对手已离开', icon: 'none' });
        }
      }

      if (room.guest && this.data.opponentInfo && this.data.opponentInfo.isReady !== room.guest.isReady) {
        this.setData({
          ['opponentInfo.isReady']: !!room.guest.isReady
        });
      }
    } else {
      if (room.host) {
        this.setData({ opponentInfo: room.host });
      }

      this.setData({
        isReady: !!(room.guest && room.guest.isReady)
      });
    }

    if (room.state === 'playing' && this.data.gameState === 'lobby') {
      wx.hideLoading();
      this.setData({
        gameSongsPool: Array.isArray(room.songs) ? room.songs.slice(Math.max(newRound - 1, 0)) : [],
        gameState: 'playing',
        gameScore: myScore,
        gameRound: 0,
        opponentScore: rivalScore,
        showRoundResult: false,
        roundResult: '',
        isTransitioning: false
      });
    }

    if (newRound > this.data.gameRound) {
      this.stopTimer();
      this.setData({
        gameRound: newRound,
        gameScore: myScore,
        opponentScore: rivalScore,
        gameSongsPool: Array.isArray(room.songs) ? room.songs.slice(Math.max(newRound - 1, 0)) : this.data.gameSongsPool,
        showRoundResult: false,
        roundResult: '',
        isTransitioning: false,
        timeLeft: 20
      });
      this.syncRound();
      return;
    }

    this.setData({
      gameScore: myScore,
      opponentScore: rivalScore,
    });

    if (this.data.isHost && room.state === 'playing' && !this.data.isTransitioning && room.host.hasAnswered && room.guest && room.guest.hasAnswered) {
      this.checkGameEndOrNextRound();
    }
  },


  startPKGame() {
    if (this.data.isTransitioning) return;
    if (!this.data.opponentInfo) return;

    // Check if opponent is ready
    if (!this.data.opponentInfo.isReady) {
      wx.showToast({ title: '对手未准备', icon: 'none' });
      return;
    }

    this.setData({ isTransitioning: true });
    wx.showLoading({ title: '正在开始...' });

    wx.cloud.callFunction({
      name: 'game-functions',
      data: {
        action: 'updateState',
        data: {
          roomId: this.data.roomId,
          state: 'playing'
        }
      },
      success: (res) => {
        // Watcher will trigger local start
        if (res.result && res.result.code !== 0) {
          wx.hideLoading();
          this.setData({ isTransitioning: false });
          const errMsg = res.result.msg || (res.result.error ? JSON.stringify(res.result.error) : '未知错误');
          console.error('Start Game Cloud Error:', res.result);
          wx.showToast({ title: '失败: ' + errMsg, icon: 'none', duration: 3000 });
        }
      },
      fail: (err) => {
        wx.hideLoading();
        this.setData({ isTransitioning: false });
        console.error('Start game failed', err);
        wx.showToast({ title: '请求失败，请重试', icon: 'none' });
      }
    });
  },

  toggleReady() {
    if (this.data.isReadyUpdating) return;
    const newStatus = !this.data.isReady;
    this.setData({ isReady: newStatus, isReadyUpdating: true });

    wx.cloud.callFunction({
      name: 'game-functions',
      data: {
        action: 'toggleReady',
        data: {
          roomId: this.data.roomId,
          isReady: newStatus
        }
      },
      success: res => {
        if (!res.result || res.result.code !== 0) {
          this.setData({ isReady: !newStatus, isReadyUpdating: false });
          wx.showToast({ title: (res.result && res.result.msg) || '操作失败', icon: 'none' });
          return;
        }
        this.setData({ isReadyUpdating: false });
      },
      fail: err => {
        console.error('Toggle ready failed', err);
        this.setData({ isReady: !newStatus, isReadyUpdating: false }); // Revert on fail
        wx.showToast({ title: '操作失败', icon: 'none' });
      }
    });
  },

  onShareAppMessage() {
    if (this.data.isMultiplayer && this.data.roomId) {
      return {
        title: '来和我PK听歌识曲！',
        path: `/pages/amusement/amusement?roomId=${this.data.roomId}`,
        imageUrl: '/images/avatars/cat.jpg'
      }
    }
    return {
      title: '听音辨曲挑战',
      path: '/pages/amusement/amusement'
    }
  },

  onUnload() {
    this.stopTimer();
    const roomId = this.data.roomId;
    if (this.data.isMultiplayer && roomId && !this.hasQuit) {
      this.leaveCurrentRoom(roomId);
    }
    this.closeRoomWatcher();
  },

  startGame() {
    this.hasQuit = false; // Reset quit flag
    this.setData({
      isMultiplayer: false,
      gameState: 'playing',
      gameScore: 0,
      gameRound: 0,
      gameSongsPool: [],
      showRoundResult: false,
      roundResult: '',
      opponentScore: 0,
      isRoundPreparing: false,
      isTransitioning: false
    });
    this.fetchGameSongs().then(() => {
      this.startRound();
    }).catch(err => {
      console.error("Start Game Error:", err);
      // Optional: reset game state if needed
    });
  },

  fetchGameSongs() {
    // Strategy update: Fetch from Page 1 with a larger batch (rn=80) 
    // to utilize the API's relevance sorting (better quality/studio versions usually appear first).
    // Randomness is introduced by shuffling the filtered result.
    return new Promise((resolve, reject) => {
      // If multiplayer and songs already synced, skip fetch
      if (this.data.isMultiplayer && this.data.gameSongsPool.length > 0) {
        resolve();
        return;
      }

      wx.showLoading({ title: '准备题目中...' });

      const key = this.data.selectedSinger;

      this.fetchSongsFromApi(key, 1, 80).then(result => {
        wx.hideLoading();
        let newSongs = result;

        // Strict Filter for Studio Versions:
        // 1. No "Live", "Concert" keywords
        // 2. No brackets '()' or '（）' unless they contain "feat" or "ft"
        newSongs = newSongs.filter(song => {
          const name = (song.name || '').toLowerCase();
          const invalidKeywords = ['live', 'concert', '演唱会', '音乐会', '现场版', 'live版', 'demo'];

          // Basic keyword check
          if (invalidKeywords.some(keyword => name.includes(keyword))) {
            return false;
          }

          // Bracket check
          if (name.includes('(') || name.includes('（')) {
            // Allow if it contains "feat" or "ft" (collaboration)
            if (name.includes('feat') || name.includes('ft.')) {
              return true;
            }
            // Otherwise, assume the bracket contains info we don't want (remix, cover info, etc.)
            // This matches the user's observation that "clean" titles are usually the right ones.
            return false;
          }

          return true;
        });

        // Deduplicate by Song Name
        const uniqueNames = new Set();
        newSongs = newSongs.filter(song => {
          const name = song.name;
          if (uniqueNames.has(name)) {
            return false;
          }
          uniqueNames.add(name);
          return true;
        });

        if (newSongs.length < 4) {
          // If we filtered too aggressively, fallback or show error.
          // For now, let's try to just resolve with what we have if barely enough, or error.
          wx.showToast({ title: '符合条件的歌曲不足，请重试', icon: 'none' });
          reject();
          return;
        }

        // Shuffle the high-quality pool to ensure variety every time we play top songs
        const shuffle = (array) => {
          for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
          }
          return array;
        };

        this.setData({
          gameSongsPool: shuffle(newSongs)
        });
        resolve();
      }).catch(err => {
        wx.hideLoading();
        wx.showToast({ title: '网络错误', icon: 'none' });
        console.error(err);
        reject(err);
      });
    });
  },

  startRound() {
    if (this.hasQuit || this.data.gameState === 'intro') return; // Guard: If already quit, don't start


    if (this.data.gameRound >= this.data.gameTotalRounds) {
      this.endGame();
      return;
    }

    const pool = this.data.gameSongsPool;
    if (pool.length < 4) {
      this.endGame();
      return;
    }
    const question = this.buildRoundQuestion(pool);
    if (!question) {
      this.endGame();
      return;
    }

    this.applyRoundQuestion(question, { incrementRound: true });
  },

  syncRound() {
    if (this.hasQuit || this.data.gameState === 'intro') return; // Guard: If already quit, don't sync
    const pool = this.data.gameSongsPool;
    if (pool.length < 4) {
      this.endGame();
      return;
    }
    const question = this.buildRoundQuestion(pool, {
      deterministic: true,
      seed: `${this.data.roomId || 'pk'}-${this.data.gameRound}`
    });
    if (!question) {
      this.endGame();
      return;
    }

    this.applyRoundQuestion(question);
  },

  startTimer() {
    this.stopTimer();
    this.setData({ timeLeft: 20 });
    this.timer = setInterval(() => {
      if (this.data.timeLeft <= 0) {
        this.stopTimer();
        this.handleTimeout();
        return;
      }
      this.setData({ timeLeft: this.data.timeLeft - 1 });
    }, 1000);
  },

  stopTimer() {
    this.clearRoundStartTimer();
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    if (this.roundTimer) {
      clearTimeout(this.roundTimer);
      this.roundTimer = null;
    }
  },

  handleTimeout() {
    if (this.hasQuit || this.data.gameState === 'intro') return; // Guard: If already quit, ignore timeout


    if (this.data.isMultiplayer) {
      if (!this.data.showRoundResult) {
        this.setData({ showRoundResult: true, roundResult: 'timeout' });
        this.submitMultiplayerResult('');
      }
    } else {
      // Single player timeout
      this.setData({ showRoundResult: true, roundResult: 'wrong' });
      setTimeout(() => { this.startRound(); }, 1500);
    }
  },

  checkGameEndOrNextRound() {
    if (this.data.gameRound >= this.data.gameTotalRounds) {
      console.log('Max rounds reached, finishing game');
      this.finishPKGame();
    } else {
      console.log('Proceeding to next round');
      this.callNextRound();
    }
  },

  finishPKGame() {
    this.setData({ isTransitioning: true });
    wx.cloud.callFunction({
      name: 'game-functions',
      data: {
        action: 'updateState',
        data: {
          roomId: this.data.roomId,
          state: 'finished'
        }
      }
    }).then(res => {
      console.log('Game finished:', res);
      this.setData({ isTransitioning: false });
    }).catch(err => {
      console.error('Failed to finish game:', err);
      this.setData({ isTransitioning: false });
    });
  },

  callNextRound() {
    console.log('Calling nextRound cloud function...');
    this.setData({ isTransitioning: true });
    wx.cloud.callFunction({
      name: 'game-functions',
      data: {
        action: 'nextRound',
        data: { roomId: this.data.roomId }
      }
    }).then(res => {
      console.log('nextRound result:', res);
      if (res.result.code !== 0) {
        console.error('nextRound failed:', res.result.msg);
        this.setData({ isTransitioning: false });
      }
    }).catch(err => {
      console.error('nextRound call error:', err);
      this.setData({ isTransitioning: false });
    });
  },

  playGameSong(rid) {
    const bgm = this.data.app.globalData.currentSong;
    // bgm.stop(); // Removed to prevent "interrupted by pause" race condition
    const requestId = (this.gameSongRequestId || 0) + 1;
    this.gameSongRequestId = requestId;

    this.setData({
      playerVisible: false,
      playerMode: 'game',
      playerLoading: false,
      playerDetailVisible: false
    });

    return this.fetchSongUrl(rid).then(url => {
      if (requestId !== this.gameSongRequestId || this.hasQuit || this.data.gameState !== 'playing') return null;

      bgm.title = "猜猜我是谁";
      bgm.singer = "神秘歌手";
      bgm.coverImgUrl = "https://img4.kuwo.cn/star/albumcover/300";
      bgm.src = url;
      // Setting src automatically plays on backgroundAudioManager.
      return url;
    }).catch(err => {
      console.error("Failed to get song url", err);
      throw err;
    });
  },

  handleGuess(e) {
    if (this.data.showRoundResult || this.data.isRoundPreparing) return;

    const selectedRid = e.currentTarget.dataset.rid;
    const targetRid = this.data.targetSong.rid;
    const isCorrect = selectedRid === targetRid;
    this.stopTimer();
    this.setData({
      showRoundResult: true,
      roundResult: isCorrect ? 'correct' : 'wrong'
    });

    if (isCorrect) {
      if (!this.data.isMultiplayer) {
        this.setData({
          gameScore: this.data.gameScore + 20
        });
      }
      wx.showToast({ title: '答对了！', icon: 'success' });
    } else {
      wx.vibrateShort({ type: 'medium' });
      wx.showToast({ title: '答错了', icon: 'error' });
    }

    if (this.data.isMultiplayer) {
      this.submitMultiplayerResult(selectedRid);
    }

    if (!this.data.isMultiplayer) {
      this.roundTimer = setTimeout(() => {
        this.startRound();
      }, 1500);
    }
    // Multiplayer waits for watcher/timer
  },

  endGame() {
    if (this.hasQuit || this.data.gameState === 'intro') return; // Guard: If already quit, don't show result


    this.stopTimer(); // Stop any running timer immediately
    this.setData({
      gameState: 'result',
      isRoundPreparing: false
    });
    this.data.app.globalData.currentSong.stop();
  },

  restartGame() {
    if (this.data.isMultiplayer) {
      // Return to lobby for multiplayer
      this.goToIntro();
      // Ideally: Re-ready logic, but simpler to just quit to intro for MVP
    } else {
      this.startGame();
    }
  },

  onSingerChange(e) {
    // Handling tag selection
    const singer = e.currentTarget.dataset.item;
    console.log("Selected singer:", singer);
    this.setData({
      selectedSinger: singer,
      customTheme: '' // Clear custom theme when tag is selected
    });
  },

  onSearchCustomTheme(e) {
    const theme = e.detail.value.trim();

    if (!theme) {
      wx.showToast({ title: '请输入主题', icon: 'none' });
      return;
    }

    // Regex: Only allow Chinese, Letters (a-z, A-Z), Numbers (0-9)
    const isValid = /^[\u4e00-\u9fa5a-zA-Z0-9]+$/.test(theme);

    if (!isValid) {
      wx.showToast({ title: '仅支持中文、字母和数字', icon: 'none' });
      return;
    }

    this.setData({
      selectedSinger: theme, // Use the input as the key
      customTheme: theme,
    });
  },

  onInputCustomTheme(e) {
    // Optional: Real-time update or just wait for confirm
    // If we want to deselect tags immediately when typing:
    if (e.detail.value && this.data.selectedSinger !== e.detail.value) {
      this.setData({
        selectedSinger: '', // Deselect tags
        customTheme: e.detail.value
      });
    }
  },

  onExitGame() {
    if (this.data.gameState !== 'playing') return;

    wx.showModal({
      title: this.data.isMultiplayer ? '退出对战' : '退出挑战',
      content: this.data.isMultiplayer
        ? '确定要离开当前对战并返回选择界面吗？'
        : '确定要放弃当前的挑战并返回选择界面吗？',
      confirmText: '退出',
      confirmColor: '#d54941',
      cancelText: '继续',
      success: (res) => {
        if (res.confirm) {
          this.goToIntro();
        }
      }
    });
  },

  goToIntro(options = {}) {
    const config = options && options.currentTarget ? {} : options;
    const skipLeaveRoom = !!config.skipLeaveRoom;
    const currentRoomId = this.data.roomId;
    const shouldLeaveRoom = !skipLeaveRoom && this.data.isMultiplayer && currentRoomId;

    this.hasQuit = true; // Set strict quit flag immediately
    this.watcherGen = (this.watcherGen || 0) + 1; // INVALIDATE all Previous Watchers
    this.stopTimer(); // Ensure timer is stopped when quitting to intro
    this.closeRoomWatcher();

    if (shouldLeaveRoom) {
      this.leaveCurrentRoom(currentRoomId);
    }

    this.setData({
      gameState: 'intro',
      gameScore: 0,
      gameRound: 0,
      targetSong: null,
      gameOptions: [],
      showRoundResult: false,
      isRoundPreparing: false,
      gameSongsPool: [],
      isMultiplayer: false,
      isHost: false,
      roomId: null,
      opponentInfo: null,
      opponentScore: 0,
      isReady: false,
      isReadyUpdating: false,
      waitingForOpponentNext: false,
      joinRoomVisible: false
    });

    // Stop music
    if (this.data.app && this.data.app.globalData.currentSong) {
      this.data.app.globalData.currentSong.stop();
    }
  },

  toggleGameMusic() {
    if (this.data.isRoundPreparing) return;
    const bgm = this.data.app.globalData.currentSong;
    if (bgm.paused) {
      bgm.play();
    } else {
      bgm.pause();
    }
  },

})
