const STORAGE_KEY = 'lab_shake_history_v1';
const SHAKE_GAP = 900;
const SHAKE_THRESHOLD = 1.65;

const BOX_POOL = [
  {
    type: 'song',
    tag: '盲听',
    title: '把歌名遮住听 30 秒',
    text: '从首页随便点一首，只看封面不看名字，猜猜它属于哪个心情。'
  },
  {
    type: 'idea',
    tag: '冷知识',
    title: '耳朵会自己调音量',
    text: '人在嘈杂环境里会自动把注意力推向想听的声音，这叫鸡尾酒会效应。'
  },
  {
    type: 'sound',
    tag: '小音效',
    title: '叮咚一下',
    text: '这次盲盒没有歌，但适合给自己一个很短的开场提示。'
  },
  {
    type: 'song',
    tag: '氛围任务',
    title: '找一首雨天感的歌',
    text: '关键词可以试试“雨”“夜”“窗”“海”，然后把它收进夜间循环。'
  },
  {
    type: 'idea',
    tag: '灵感',
    title: '给今天选一个 BGM',
    text: '不是最喜欢的那首，而是最像今天的那首。'
  },
  {
    type: 'sound',
    tag: '搞怪音效',
    title: '假装舞台灯亮了',
    text: '现在请在心里播放一个“噔噔噔噔”的出场音。'
  },
  {
    type: 'song',
    tag: '搜索任务',
    title: '找一首只适合夜路的歌',
    text: '关键词可以试试“夜”“路”“风”“远方”。'
  },
  {
    type: 'song',
    tag: '搜索任务',
    title: '找一首开头就抓人的歌',
    text: '只听前 10 秒，第一反应不喜欢就立刻换。'
  },
  {
    type: 'song',
    tag: '歌单任务',
    title: '给“通勤”建一个小歌单',
    text: '只放 3 首歌：出门、路上、快到了。'
  },
  {
    type: 'song',
    tag: '歌单任务',
    title: '做一组反差歌单',
    text: '第一首很安静，第二首很明亮，第三首负责收尾。'
  },
  {
    type: 'song',
    tag: '心情任务',
    title: '找一首“没事，我很好”的歌',
    text: '不一定开心，但要有一点重新站稳的感觉。'
  },
  {
    type: 'song',
    tag: '心情任务',
    title: '找一首“今天不想解释”的歌',
    text: '适合耳机里偷偷播放，外表平静，内心有戏。'
  },
  {
    type: 'song',
    tag: '盲听',
    title: '随机点一首老歌',
    text: '不要看年份，只判断它现在还打不打动你。'
  },
  {
    type: 'song',
    tag: '盲听',
    title: '选一首没听过的歌',
    text: '听到副歌前不许切，给它一次完整开场。'
  },
  {
    type: 'song',
    tag: '封面任务',
    title: '只凭封面选歌',
    text: '找一张最像电影海报的封面，然后播放。'
  },
  {
    type: 'idea',
    tag: '冷知识',
    title: '副歌不一定最先写出来',
    text: '很多歌会先有一句旋律钩子，再慢慢长成完整结构。'
  },
  {
    type: 'idea',
    tag: '冷知识',
    title: '耳熟有时来自重复',
    text: '旋律反复出现时，大脑会更快把它当成熟悉内容。'
  },
  {
    type: 'idea',
    tag: '冷知识',
    title: '低频更像身体感受',
    text: '鼓和贝斯常常不是“听见”，而是让身体先感觉到。'
  },
  {
    type: 'idea',
    tag: '冷知识',
    title: '安静也是编曲',
    text: '留白能让下一段进入时更有重量。'
  },
  {
    type: 'idea',
    tag: '冷知识',
    title: '同一首歌会被场景改写',
    text: '走路、坐车、深夜和晴天，听感可能完全不同。'
  },
  {
    type: 'idea',
    tag: '灵感',
    title: '给现在的天气配一首歌',
    text: '不要选最准确的，选最有画面的。'
  },
  {
    type: 'idea',
    tag: '灵感',
    title: '写一句今天的片尾字幕',
    text: '然后找一首能接住这句话的歌。'
  },
  {
    type: 'idea',
    tag: '灵感',
    title: '给一个朋友选一首歌',
    text: '不用发出去，只要你觉得“像 TA”。'
  },
  {
    type: 'idea',
    tag: '灵感',
    title: '选一首适合重启的歌',
    text: '它可以不燃，但要让你愿意再开始一次。'
  },
  {
    type: 'idea',
    tag: '灵感',
    title: '给明天留一首歌',
    text: '明天打开时，看看今天的你想把什么递过去。'
  },
  {
    type: 'idea',
    tag: '小游戏',
    title: '三秒歌名挑战',
    text: '播放一首熟歌，三秒内说出歌名，说不出就收藏。'
  },
  {
    type: 'idea',
    tag: '小游戏',
    title: '只听鼓点猜情绪',
    text: '先不看歌名，判断它是散步、奔跑还是发呆。'
  },
  {
    type: 'idea',
    tag: '小游戏',
    title: '副歌前暂停',
    text: '听到副歌前暂停，猜下一句会往上还是往下走。'
  },
  {
    type: 'idea',
    tag: '小游戏',
    title: '封面命名',
    text: '遮住歌名，只看封面给它起一个临时名字。'
  },
  {
    type: 'sound',
    tag: '小音效',
    title: '电梯到站',
    text: '叮。恭喜抵达今天的下一段剧情。'
  },
  {
    type: 'sound',
    tag: '小音效',
    title: '游戏通关',
    text: '请在脑内播放一声清脆的胜利提示音。'
  },
  {
    type: 'sound',
    tag: '小音效',
    title: '相机快门',
    text: '咔嚓。把这一秒存成一张不会过曝的照片。'
  },
  {
    type: 'sound',
    tag: '小音效',
    title: '老式开机',
    text: '滴，系统启动。今天的能量条重新计算。'
  },
  {
    type: 'sound',
    tag: '小音效',
    title: '消息弹出',
    text: '不是催你回复，是提醒你可以对自己温柔一点。'
  },
  {
    type: 'song',
    tag: '地点任务',
    title: '给窗外配乐',
    text: '看向窗外 5 秒，再搜索第一个冒出来的关键词。'
  },
  {
    type: 'song',
    tag: '地点任务',
    title: '给楼下配乐',
    text: '想象楼下正在发生一场电影开场，给它选歌。'
  },
  {
    type: 'song',
    tag: '地点任务',
    title: '给回家路配乐',
    text: '选一首适合从地铁口走到门口的歌。'
  },
  {
    type: 'song',
    tag: '地点任务',
    title: '给操场配乐',
    text: '它可以青春，也可以只是风很大的感觉。'
  },
  {
    type: 'song',
    tag: '地点任务',
    title: '给便利店配乐',
    text: '选一首适合半夜买饮料时播放的歌。'
  },
  {
    type: 'idea',
    tag: '一句话',
    title: '今天适合慢一点',
    text: '慢不是退后，是把每一步踩实。'
  },
  {
    type: 'idea',
    tag: '一句话',
    title: '把音量调低一点',
    text: '有些歌小声听，反而会离你更近。'
  },
  {
    type: 'idea',
    tag: '一句话',
    title: '不急着定义今天',
    text: '一首歌没听完前，故事也还没结束。'
  },
  {
    type: 'idea',
    tag: '一句话',
    title: '今晚先不复盘',
    text: '把注意力交给鼓点，其他的明天再说。'
  },
  {
    type: 'idea',
    tag: '一句话',
    title: '你可以换一首',
    text: '不合适的歌可以切，不合适的节奏也可以。'
  }
];

Page({
  data: {
    isListening: false,
    shakeCount: 0,
    currentBox: null,
    history: []
  },

  onLoad() {
    this.boundAccelerometerChange = this.handleAccelerometerChange.bind(this);
    this.loadHistory();
  },

  onUnload() {
    this.stopShake();
  },

  toggleShake() {
    if (this.data.isListening) {
      this.stopShake();
    } else {
      this.startShake();
    }
  },

  startShake() {
    wx.startAccelerometer({
      interval: 'game',
      success: () => {
        this.setData({ isListening: true });
        wx.onAccelerometerChange(this.boundAccelerometerChange);
      },
      fail: (err) => {
        console.error('Start accelerometer failed:', err);
        wx.showToast({ title: '当前设备暂不可用', icon: 'none' });
      }
    });
  },

  stopShake() {
    try {
      if (wx.offAccelerometerChange) {
        wx.offAccelerometerChange(this.boundAccelerometerChange);
      }
      wx.stopAccelerometer();
    } catch (err) {
      console.warn('Stop accelerometer skipped:', err);
    }
    this.lastVector = null;
    this.setData({ isListening: false });
  },

  handleAccelerometerChange(res) {
    const vector = {
      x: Number(res.x) || 0,
      y: Number(res.y) || 0,
      z: Number(res.z) || 0
    };

    if (!this.lastVector) {
      this.lastVector = vector;
      return;
    }

    const delta = Math.abs(vector.x - this.lastVector.x)
      + Math.abs(vector.y - this.lastVector.y)
      + Math.abs(vector.z - this.lastVector.z);
    this.lastVector = vector;

    const now = Date.now();
    if (delta < SHAKE_THRESHOLD || now - (this.lastShakeAt || 0) < SHAKE_GAP) return;

    this.lastShakeAt = now;
    this.openBlindBox('shake');
  },

  openBlindBox(source = 'manual') {
    const box = {
      ...BOX_POOL[Math.floor(Math.random() * BOX_POOL.length)],
      id: `box-${Date.now()}`
    };
    const history = [box].concat(this.data.history || []).slice(0, 6);

    this.setData({
      currentBox: box,
      history,
      shakeCount: this.data.shakeCount + 1
    });

    this.persistHistory(history);
    this.triggerBoxFeedback(source, box);
  },

  triggerBoxFeedback(source, box) {
    if (source === 'shake' && wx.vibrateLong) {
      wx.vibrateLong({
        fail: () => {
          wx.vibrateShort({ type: 'heavy', fail: () => {} });
        }
      });
      return;
    }

    wx.vibrateShort({
      type: box.type === 'sound' ? 'heavy' : 'medium',
      fail: () => {}
    });
  },

  loadHistory() {
    try {
      const history = wx.getStorageSync(STORAGE_KEY) || [];
      if (Array.isArray(history)) {
        this.setData({
          history,
          currentBox: history[0] || null
        });
      }
    } catch (err) {
      console.warn('Load shake history failed:', err);
    }
  },

  persistHistory(history) {
    try {
      wx.setStorageSync(STORAGE_KEY, history);
    } catch (err) {
      console.warn('Save shake history failed:', err);
    }
  },

  clearHistory() {
    try {
      wx.removeStorageSync(STORAGE_KEY);
    } catch (err) {
      console.warn('Clear shake history failed:', err);
    }
    this.setData({
      currentBox: null,
      history: []
    });
  }
});
