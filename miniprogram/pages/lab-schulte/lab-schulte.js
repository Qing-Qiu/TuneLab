const STORAGE_KEY = 'lab_schulte_records_v1';
const USER_INFO_KEY = 'lab_schulte_user_info_v1';

function shuffle(list) {
  const next = list.slice();
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

function formatMs(ms = 0) {
  const safeMs = Math.max(0, Number(ms) || 0);
  const seconds = Math.floor(safeMs / 1000);
  const centiseconds = Math.floor((safeMs % 1000) / 10);
  return `${String(seconds).padStart(2, '0')}.${String(centiseconds).padStart(2, '0')}`;
}

Page({
  data: {
    sizeOptions: [4, 5, 6],
    size: 5,
    cells: [],
    nextNumber: 1,
    elapsedText: '00.00',
    bestText: '--',
    cloudBestText: '--',
    mistakes: 0,
    isRunning: false,
    isFinished: false,
    recordsLoading: false,
    rankModalVisible: false,
    profileReady: false,
    profileName: '未授权昵称',
    recordStatus: '云记录待同步',
    globalRecords: []
  },

  onLoad() {
    this.loadUserInfo();
    this.resetGame();
    this.loadCloudRecords();
  },

  onUnload() {
    this.clearTicker();
  },

  selectSize(e) {
    const size = Number(e.currentTarget.dataset.size) || 5;
    if (size === this.data.size) return;

    this.setData({ size }, () => {
      this.resetGame();
      this.loadCloudRecords();
    });
  },

  resetGame() {
    this.clearTicker();
    const total = this.data.size * this.data.size;
    const cells = shuffle(Array.from({ length: total }, (_, index) => ({
      number: index + 1,
      done: false
    })));

    this.setData({
      cells,
      nextNumber: 1,
      elapsedText: '00.00',
      bestText: this.getBestText(),
      mistakes: 0,
      isRunning: false,
      isFinished: false
    });
  },

  loadUserInfo() {
    try {
      const userInfo = wx.getStorageSync(USER_INFO_KEY);
      if (userInfo && typeof userInfo === 'object' && userInfo.nickName) {
        this.userInfo = userInfo;
        this.setData({
          profileReady: true,
          profileName: userInfo.nickName
        });
      }
    } catch (err) {
      console.warn('Load schulte profile failed:', err);
    }
  },

  openRankModal() {
    this.setData({
      rankModalVisible: true
    });
    this.loadCloudRecords();
  },

  closeRankModal() {
    this.setData({
      rankModalVisible: false
    });
  },

  noop() {},

  authorizeNickname() {
    if (!wx.getUserProfile) {
      wx.showToast({
        title: '当前微信版本不支持授权',
        icon: 'none'
      });
      return;
    }

    wx.getUserProfile({
      desc: '用于舒尔特全服榜显示昵称',
      success: (res) => {
        const userInfo = res.userInfo || {};
        const nickName = String(userInfo.nickName || '').trim();
        if (!nickName) {
          wx.showToast({
            title: '未获取到昵称',
            icon: 'none'
          });
          return;
        }

        this.userInfo = userInfo;
        try {
          wx.setStorageSync(USER_INFO_KEY, userInfo);
        } catch (err) {
          console.warn('Save schulte profile failed:', err);
        }

        this.setData({
          profileReady: true,
          profileName: nickName,
          recordStatus: '正在更新昵称'
        });

        this.callSchulteFunction('updateProfile', { userInfo })
          .then(() => {
            wx.showToast({
              title: '昵称已更新',
              icon: 'success'
            });
            this.loadCloudRecords();
          })
          .catch((err) => {
            console.warn('Update schulte profile failed:', err);
            this.setData({
              recordStatus: '昵称已保存在本机'
            });
          });
      },
      fail: () => {
        wx.showToast({
          title: '授权后才能显示昵称',
          icon: 'none'
        });
      }
    });
  },

  startGame() {
    if (this.data.isRunning) return;

    this.startAt = Date.now();
    this.setData({
      isRunning: true,
      isFinished: false
    });

    this.timer = setInterval(() => {
      this.setData({
        elapsedText: formatMs(Date.now() - this.startAt)
      });
    }, 80);
  },

  tapCell(e) {
    const index = Number(e.currentTarget.dataset.index);
    const cell = this.data.cells[index];
    if (!cell || cell.done || this.data.isFinished) return;

    if (!this.data.isRunning) {
      this.startGame();
    }

    if (cell.number !== this.data.nextNumber) {
      this.setData({
        mistakes: this.data.mistakes + 1
      });
      wx.vibrateShort({ type: 'light', fail: () => {} });
      return;
    }

    const cells = this.data.cells.slice();
    cells[index] = {
      ...cell,
      done: true
    };

    const nextNumber = this.data.nextNumber + 1;
    const finished = nextNumber > this.data.size * this.data.size;

    this.setData({
      cells,
      nextNumber,
      isFinished: finished
    });

    if (finished) {
      this.finishGame();
    }
  },

  finishGame() {
    this.clearTicker();
    const elapsed = Date.now() - this.startAt;
    const best = this.saveBest(elapsed);

    this.setData({
      isRunning: false,
      isFinished: true,
      elapsedText: formatMs(elapsed),
      bestText: formatMs(best)
    });

    wx.showToast({ title: '完成', icon: 'success' });
    this.submitCloudRecord(elapsed);
  },

  getRecords() {
    try {
      const records = wx.getStorageSync(STORAGE_KEY);
      return records && typeof records === 'object' ? records : {};
    } catch (err) {
      return {};
    }
  },

  getBestText() {
    const records = this.getRecords();
    const best = Number(records[this.data.size] || 0);
    return best ? formatMs(best) : '--';
  },

  saveBest(elapsed) {
    const records = this.getRecords();
    const current = Number(records[this.data.size] || 0);
    const best = current ? Math.min(current, elapsed) : elapsed;
    records[this.data.size] = best;

    try {
      wx.setStorageSync(STORAGE_KEY, records);
    } catch (err) {
      console.warn('Save schulte record failed:', err);
    }

    return best;
  },

  clearTicker() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  },

  callSchulteFunction(action, data = {}) {
    if (!wx.cloud || !wx.cloud.callFunction) {
      return Promise.reject(new Error('Cloud unavailable'));
    }

    return new Promise((resolve, reject) => {
      wx.cloud.callFunction({
        name: 'schulte-functions',
        data: { action, data },
        success: resolve,
        fail: reject
      });
    });
  },

  loadCloudRecords() {
    this.setData({
      recordsLoading: true,
      recordStatus: '正在读取云记录'
    });

    this.callSchulteFunction('getRecords', {
      size: this.data.size
    }).then((res) => {
      const result = res.result || {};
      const mine = result.mine || null;
      const global = Array.isArray(result.global) ? result.global : [];
      this.setData({
        recordsLoading: false,
        recordStatus: global.length ? '云记录已更新' : '暂无全服记录',
        cloudBestText: mine && mine.elapsedMs ? formatMs(mine.elapsedMs) : '--',
        globalRecords: global.slice(0, 10).map((item, index) => ({
          ...item,
          rank: index + 1,
          elapsedText: formatMs(item.elapsedMs),
          mistakesText: `${item.mistakes || 0} 误`
        }))
      });
    }).catch((err) => {
      console.warn('Load cloud schulte records failed:', err);
      this.setData({
        recordsLoading: false,
        recordStatus: '云记录暂不可用'
      });
    });
  },

  submitCloudRecord(elapsedMs) {
    this.setData({
      recordsLoading: true,
      recordStatus: '正在提交成绩'
    });

    this.callSchulteFunction('submitRecord', {
      size: this.data.size,
      elapsedMs,
      mistakes: this.data.mistakes,
      userInfo: this.userInfo || {}
    }).then((res) => {
      const result = res.result || {};
      this.setData({
        recordStatus: result.improved ? '个人云记录已刷新' : '成绩已提交',
        recordsLoading: false
      });
      this.loadCloudRecords();
    }).catch((err) => {
      console.warn('Submit cloud schulte record failed:', err);
      this.setData({
        recordsLoading: false,
        recordStatus: '成绩保存在本机'
      });
    });
  }
});
