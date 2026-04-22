const STORAGE_KEY = 'place_song_wall_cache_v1';
const NICKNAME_KEY = 'place_song_wall_nickname_v1';
const DEFAULT_CENTER = {
  latitude: 31.2304,
  longitude: 121.4737
};

function getTimeText(timestamp = Date.now()) {
  const date = new Date(Number(timestamp) || Date.now());
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  return `${month}-${day} ${hour}:${minute}`;
}

function formatCoordinate(place) {
  if (!place) return '';
  return `${Number(place.latitude).toFixed(4)}, ${Number(place.longitude).toFixed(4)}`;
}

function normalizeEntry(entry = {}) {
  return {
    _id: entry._id || entry.id || '',
    nickName: entry.nickName || '匿名听友',
    placeName: entry.placeName || '',
    address: entry.address || '',
    latitude: Number(entry.latitude || 0),
    longitude: Number(entry.longitude || 0),
    coordinateText: entry.coordinateText || '',
    songRid: String(entry.songRid || entry.rid || ''),
    songName: entry.songName || entry.song || '',
    artist: entry.artist || '',
    songPic: entry.songPic || entry.pic || '/images/icons/music.png',
    note: entry.note || '',
    createdAtMs: Number(entry.createdAtMs || Date.now()),
    createdAtText: getTimeText(entry.createdAtMs),
    isOwner: !!entry.isOwner,
    likeCount: Math.max(0, Number(entry.likeCount || 0)),
    liked: !!entry.liked
  };
}

function normalizeSong(song = {}) {
  return {
    rid: String(song.rid || song.id || ''),
    name: song.name || song.songName || '未知歌曲',
    artist: song.artist || song.singer || '未知歌手',
    pic: song.pic || song.cover || '/images/icons/music.png'
  };
}

Page({
  data: {
    entries: [],
    draftPlace: null,
    draftSong: '',
    draftArtist: '',
    draftNote: '',
    draftNickName: '匿名听友',
    searchKey: '',
    searchResults: [],
    selectedSong: null,
    selectedEntryId: '',
    mapLatitude: DEFAULT_CENTER.latitude,
    mapLongitude: DEFAULT_CENTER.longitude,
    mapScale: 12,
    mapMarkers: [],
    includePoints: [],
    totalEntries: 0,
    totalPlaces: 0,
    latestText: '还没有留声',
    loading: false,
    submitting: false,
    searching: false,
    cloudReady: true
  },

  onLoad() {
    this.apiNextAt = {};
    this.loadNickname();
    this.loadCachedEntries();
    this.loadEntries();
  },

  onShow() {
    this.loadEntries();
  },

  loadNickname() {
    let nickName = '匿名听友';
    try {
      nickName = wx.getStorageSync(NICKNAME_KEY) || nickName;
    } catch (err) {
      console.warn('读取昵称失败', err);
    }
    this.setData({ draftNickName: nickName });
  },

  loadCachedEntries() {
    try {
      const entries = wx.getStorageSync(STORAGE_KEY) || [];
      if (Array.isArray(entries) && entries.length) {
        this.applyEntries(entries.map(normalizeEntry), false);
      }
    } catch (err) {
      console.warn('读取留声缓存失败', err);
    }
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

  callPlaceFunction(action, data = {}) {
    return this.callCloudFunction('place-song-functions', { action, data });
  },

  scheduleApiCall(channel, task) {
    const gaps = { songs: 1300 };
    const now = Date.now();
    const nextAt = this.apiNextAt[channel] || 0;
    const delay = Math.max(0, nextAt - now);
    this.apiNextAt[channel] = Math.max(now, nextAt) + (gaps[channel] || 1000);
    return new Promise((resolve, reject) => {
      setTimeout(() => task().then(resolve).catch(reject), delay);
    });
  },

  loadEntries() {
    if (this.data.loading) return;
    this.setData({ loading: true });
    this.callPlaceFunction('list', { limit: 80 }).then((res) => {
      const result = res.result || {};
      if (result.code !== 0) throw result;
      const entries = (result.data || []).map(normalizeEntry);
      this.applyEntries(entries, true);
      this.setData({ cloudReady: true });
    }).catch((err) => {
      console.warn('加载全局留声失败', err);
      this.setData({ cloudReady: false });
      wx.showToast({
        title: '全局列表暂时不可用',
        icon: 'none'
      });
    }).finally(() => {
      this.setData({ loading: false });
    });
  },

  applyEntries(entries, persist) {
    this.setData({ entries }, () => {
      this.refreshStats();
      this.refreshMap();
    });

    if (!persist) return;
    try {
      wx.setStorageSync(STORAGE_KEY, entries);
    } catch (err) {
      console.warn('缓存留声失败', err);
    }
  },

  choosePlace() {
    wx.chooseLocation({
      success: (res) => {
        this.setDraftPlace({
          name: res.name || '地图选点',
          address: res.address || '',
          latitude: Number(res.latitude),
          longitude: Number(res.longitude)
        });
      },
      fail: () => {
        wx.showToast({
          title: '未选择位置',
          icon: 'none'
        });
      }
    });
  },

  useCurrentLocation() {
    wx.getLocation({
      type: 'gcj02',
      isHighAccuracy: true,
      success: (res) => {
        this.setDraftPlace({
          name: '当前位置',
          address: '由手机定位获取',
          latitude: Number(res.latitude),
          longitude: Number(res.longitude)
        });
      },
      fail: () => {
        wx.showToast({
          title: '定位失败',
          icon: 'none'
        });
      }
    });
  },

  setDraftPlace(place) {
    this.setData({
      draftPlace: {
        ...place,
        coordinateText: formatCoordinate(place)
      },
      mapLatitude: place.latitude,
      mapLongitude: place.longitude,
      mapScale: 16,
      selectedEntryId: ''
    }, () => {
      this.refreshMap();
    });
  },

  onSongInput(e) {
    this.setData({ draftSong: e.detail.value });
  },

  onArtistInput(e) {
    this.setData({ draftArtist: e.detail.value });
  },

  onSongSearchInput(e) {
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
      rn: 10
    })).then((res) => {
      const list = Array.isArray(res.result) ? res.result.map(normalizeSong).filter((song) => song.rid) : [];
      this.setData({ searchResults: list });
      if (!list.length) {
        wx.showToast({ title: '没有找到歌曲', icon: 'none' });
      }
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
    this.setData({
      selectedSong: song,
      draftSong: song.name,
      draftArtist: song.artist
    });
  },

  onNoteInput(e) {
    this.setData({ draftNote: e.detail.value });
  },

  onNickNameInput(e) {
    const nickName = e.detail.value;
    this.setData({ draftNickName: nickName });
    try {
      wx.setStorageSync(NICKNAME_KEY, nickName);
    } catch (err) {
      console.warn('保存昵称失败', err);
    }
  },

  saveEntry() {
    if (this.data.submitting) return;
    if (!this.data.draftPlace) {
      wx.showToast({ title: '先选一个位置', icon: 'none' });
      return;
    }

    const selectedSong = this.data.selectedSong;
    const note = this.data.draftNote.trim();
    if (!selectedSong || !selectedSong.rid) {
      wx.showToast({ title: '先选一首歌', icon: 'none' });
      return;
    }
    if (!note) {
      wx.showToast({ title: '写一句话', icon: 'none' });
      return;
    }

    const place = this.data.draftPlace;
    this.setData({ submitting: true });
    this.callPlaceFunction('create', {
      nickName: this.data.draftNickName.trim() || '匿名听友',
      placeName: place.name,
      address: place.address,
      latitude: place.latitude,
      longitude: place.longitude,
      coordinateText: place.coordinateText,
      songRid: selectedSong.rid,
      songName: selectedSong.name,
      artist: selectedSong.artist,
      songPic: selectedSong.pic,
      note
    }).then((res) => {
      const result = res.result || {};
      if (result.code !== 0) throw result;
      const entry = normalizeEntry(result.data);
      const entries = [entry, ...this.data.entries.filter((item) => item._id !== entry._id)];
      this.applyEntries(entries, true);
      this.setData({
        selectedEntryId: entry._id,
        draftSong: '',
        draftArtist: '',
        searchKey: '',
        searchResults: [],
        selectedSong: null,
        draftNote: ''
      });
      wx.showToast({ title: '已发布', icon: 'success' });
    }).catch((err) => {
      console.error('保存留声失败', err);
      wx.showToast({ title: '保存失败', icon: 'none' });
    }).finally(() => {
      this.setData({ submitting: false });
    });
  },

  clearDraft() {
    this.setData({
      draftPlace: null,
      draftSong: '',
      draftArtist: '',
      searchKey: '',
      searchResults: [],
      selectedSong: null,
      draftNote: '',
      selectedEntryId: ''
    }, () => {
      this.refreshMap();
    });
  },

  selectEntry(e) {
    const entryId = e.currentTarget.dataset.entryId;
    const entry = this.data.entries.find((item) => item._id === entryId);
    if (!entry) return;
    this.setData({
      selectedEntryId: entryId,
      mapLatitude: entry.latitude,
      mapLongitude: entry.longitude,
      mapScale: 16
    }, () => {
      this.refreshMap();
    });
  },

  onMarkerTap(e) {
    const markerId = Number(e.detail.markerId);
    if (markerId === 1) return;
    const index = markerId - 100;
    const entry = this.data.entries[index];
    if (!entry) return;
    this.setData({
      selectedEntryId: entry._id,
      mapLatitude: entry.latitude,
      mapLongitude: entry.longitude,
      mapScale: 16
    }, () => {
      this.refreshMap();
    });
  },

  openEntryMap(e) {
    const entryId = e.currentTarget.dataset.entryId;
    const entry = this.data.entries.find((item) => item._id === entryId);
    if (!entry) return;
    this.openLocation(entry);
  },

  openDraftMap() {
    if (!this.data.draftPlace) {
      wx.showToast({ title: '先选一个位置', icon: 'none' });
      return;
    }

    this.openLocation({
      placeName: this.data.draftPlace.name,
      address: this.data.draftPlace.address,
      latitude: this.data.draftPlace.latitude,
      longitude: this.data.draftPlace.longitude,
      coordinateText: this.data.draftPlace.coordinateText
    });
  },

  openLocation(entry) {
    wx.openLocation({
      latitude: Number(entry.latitude),
      longitude: Number(entry.longitude),
      name: entry.placeName,
      address: entry.address || entry.coordinateText || '',
      scale: 17
    });
  },

  copyEntry(e) {
    const entryId = e.currentTarget.dataset.entryId;
    const entry = this.data.entries.find((item) => item._id === entryId);
    if (!entry) return;
    wx.setClipboardData({
      data: this.formatEntry(entry)
    });
  },

  deleteEntry(e) {
    const entryId = e.currentTarget.dataset.entryId;
    const entry = this.data.entries.find((item) => item._id === entryId);
    if (!entry || !entry.isOwner) return;

    wx.showModal({
      title: '删除留声',
      content: '要从全局墙移除这条内容吗？',
      confirmText: '删除',
      confirmColor: '#d75f50',
      success: (res) => {
        if (!res.confirm) return;
        this.callPlaceFunction('delete', { id: entryId }).then((result) => {
          if ((result.result || {}).code !== 0) throw result.result;
          const entries = this.data.entries.filter((item) => item._id !== entryId);
          this.applyEntries(entries, true);
        }).catch((err) => {
          console.error('删除留声失败', err);
          wx.showToast({ title: '删除失败', icon: 'none' });
        });
      }
    });
  },

  likeEntry(e) {
    const entryId = e.currentTarget.dataset.entryId;
    const entry = this.data.entries.find((item) => item._id === entryId);
    if (!entry || entry.isOwner) return;
    if (entry.liked) {
      wx.showToast({ title: '已经赞过了', icon: 'none' });
      return;
    }

    this.callPlaceFunction('like', { id: entryId }).then((res) => {
      const result = res.result || {};
      if (result.code !== 0) throw result;
      const entries = this.data.entries.map((item) => {
        if (item._id !== entryId) return item;
        return {
          ...item,
          liked: true,
          likeCount: Number(result.likeCount || item.likeCount + 1)
        };
      });
      this.applyEntries(entries, true);
    }).catch((err) => {
      console.error('点赞留声失败', err);
      wx.showToast({ title: '点赞失败', icon: 'none' });
    });
  },

  exportMixtape() {
    if (!this.data.entries.length) {
      wx.showToast({ title: '还没有留声', icon: 'none' });
      return;
    }
    wx.setClipboardData({
      data: this.data.entries.map((entry, index) => `${index + 1}. ${this.formatEntry(entry)}`).join('\n\n')
    });
  },

  formatEntry(entry) {
    const artist = entry.artist ? ` - ${entry.artist}` : '';
    return `${entry.placeName}\n${entry.songName}${artist}\n${entry.note}\n${entry.nickName} · ${entry.createdAtText}`;
  },

  refreshStats() {
    const uniquePlaces = new Set(this.data.entries.map((entry) => `${entry.latitude},${entry.longitude}`));
    this.setData({
      totalEntries: this.data.entries.length,
      totalPlaces: uniquePlaces.size,
      latestText: this.data.entries[0] ? this.data.entries[0].createdAtText : '还没有留声'
    });
  },

  refreshMap() {
    const markers = this.data.entries.map((entry, index) => {
      const selected = entry._id === this.data.selectedEntryId;
      return {
        id: 100 + index,
        latitude: entry.latitude,
        longitude: entry.longitude,
        title: entry.placeName,
        width: selected ? 34 : 28,
        height: selected ? 34 : 28,
        callout: {
          content: `${entry.placeName} · ${entry.songName}`,
          color: '#f4f7f6',
          fontSize: 12,
          borderRadius: 8,
          bgColor: selected ? '#3f8577' : '#172421',
          padding: 7,
          display: selected ? 'ALWAYS' : 'BYCLICK'
        }
      };
    });
    const includePoints = this.data.entries.map((entry) => ({
      latitude: entry.latitude,
      longitude: entry.longitude
    }));

    if (this.data.draftPlace) {
      markers.unshift({
        id: 1,
        latitude: this.data.draftPlace.latitude,
        longitude: this.data.draftPlace.longitude,
        title: this.data.draftPlace.name,
        width: 32,
        height: 32,
        callout: {
          content: `待发布 · ${this.data.draftPlace.name}`,
          color: '#12201d',
          fontSize: 12,
          borderRadius: 8,
          bgColor: '#f1a36c',
          padding: 7,
          display: 'ALWAYS'
        }
      });
      includePoints.unshift({
        latitude: this.data.draftPlace.latitude,
        longitude: this.data.draftPlace.longitude
      });
    }

    const firstPoint = this.data.draftPlace || this.data.entries[0];
    this.setData({
      mapMarkers: markers,
      includePoints,
      mapLatitude: firstPoint ? Number(firstPoint.latitude) : this.data.mapLatitude,
      mapLongitude: firstPoint ? Number(firstPoint.longitude) : this.data.mapLongitude,
      mapScale: firstPoint ? this.data.mapScale : 12
    });
  }
});
