const SAMPLE_RATE = 22050;
const TONE_DURATION = 1.8;
const SCORE_TICKS_PER_BEAT = 480;
const CHALLENGE_PROGRESS_KEY = 'piano_challenge_progress_v1';
const DAILY_CHALLENGE_KEY = 'piano_daily_challenge_v1';
const TONE_CACHE_DIR = 'piano-lab-tones-v3';
const SEMITONE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

const OCTAVE_MODES = [
  { id: 'low', label: '低八度', baseOctave: 3 },
  { id: 'middle', label: '中八度', baseOctave: 4 },
  { id: 'high', label: '高八度', baseOctave: 5 }
];

const WHITE_DEFS = [
  { name: 'C', label: 'Do', semitone: 0 },
  { name: 'D', label: 'Re', semitone: 2 },
  { name: 'E', label: 'Mi', semitone: 4 },
  { name: 'F', label: 'Fa', semitone: 5 },
  { name: 'G', label: 'Sol', semitone: 7 },
  { name: 'A', label: 'La', semitone: 9 },
  { name: 'B', label: 'Si', semitone: 11 },
  { name: 'C', label: 'Do', semitone: 12 }
];

const BLACK_DEFS = [
  { name: 'C#', label: 'C#', semitone: 1, left: 12.5 },
  { name: 'D#', label: 'D#', semitone: 3, left: 25 },
  { name: 'F#', label: 'F#', semitone: 6, left: 50 },
  { name: 'G#', label: 'G#', semitone: 8, left: 62.5 },
  { name: 'A#', label: 'A#', semitone: 10, left: 75 }
];

const CHORDS = [
  { id: 'c', label: 'C', semitones: [0, 4, 7] },
  { id: 'f', label: 'F', semitones: [5, 9, 12] },
  { id: 'g', label: 'G', semitones: [7, 11, 14] },
  { id: 'am', label: 'Am', semitones: [9, 12, 16] },
  { id: 'dm', label: 'Dm', semitones: [2, 5, 9] },
  { id: 'em', label: 'Em', semitones: [4, 7, 11] }
];

const MELODY_CHALLENGES = [
  {
    id: 'warmup',
    title: '三音热身',
    desc: '短句来回走，适合开局找手感。',
    level: '入门',
    interval: 420,
    semitones: [0, 2, 4, 2, 0]
  },
  {
    id: 'fifth',
    title: '五度跳跃',
    desc: '从根音跳到高处，再稳稳落下。',
    level: '入门',
    interval: 430,
    semitones: [0, 7, 5, 4, 2, 0]
  },
  {
    id: 'steps-up',
    title: '上行阶梯',
    desc: '完整爬升一组音阶，练连续触键。',
    level: '基础',
    interval: 360,
    semitones: [0, 2, 4, 5, 7, 9, 11, 12]
  },
  {
    id: 'steps-down',
    title: '下行阶梯',
    desc: '反向回落，注意每一步别抢拍。',
    level: '基础',
    interval: 360,
    semitones: [12, 11, 9, 7, 5, 4, 2, 0]
  },
  {
    id: 'black-answer',
    title: '黑键问答',
    desc: '混入半音，挑战黑白键切换。',
    level: '进阶',
    interval: 410,
    semitones: [0, 3, 5, 6, 7, 6, 5]
  },
  {
    id: 'minor-loop',
    title: '小调回旋',
    desc: '小调色彩更明显，听准第三个音。',
    level: '进阶',
    interval: 420,
    semitones: [0, 3, 7, 8, 7, 3, 0]
  },
  {
    id: 'coffee',
    title: '咖啡节奏',
    desc: '三和弦拆开弹，像轻轻点桌面。',
    level: '基础',
    interval: 390,
    semitones: [0, 4, 7, 4, 9, 7, 4]
  },
  {
    id: 'night-flight',
    title: '夜航',
    desc: '跨度稍大，旋律线会绕一圈。',
    level: '进阶',
    interval: 430,
    semitones: [0, 5, 8, 7, 3, 5, 0]
  },
  {
    id: 'echo',
    title: '回声练习',
    desc: '前后互相回应，重点记住重复点。',
    level: '基础',
    interval: 400,
    semitones: [0, 2, 0, 4, 2, 7, 4]
  },
  {
    id: 'home',
    title: '终点回家',
    desc: '先冲到高音，再回到起点。',
    level: '进阶',
    interval: 400,
    semitones: [7, 9, 11, 12, 7, 4, 0]
  },
  {
    id: 'spark',
    title: '火花短句',
    desc: '包含连续黑键，适合横屏挑战。',
    level: '困难',
    interval: 350,
    semitones: [0, 1, 3, 6, 8, 7, 3, 1]
  },
  {
    id: 'wide-turn',
    title: '大转身',
    desc: '最高音和最低音来回切，别被跨度带跑。',
    level: '困难',
    interval: 390,
    semitones: [0, 12, 10, 7, 3, 5, 9, 4]
  },
  {
    id: 'ode-joy',
    title: '欢乐颂片段',
    desc: '公版古典旋律，练习连续级进。',
    level: '经典',
    interval: 360,
    semitones: [4, 4, 5, 7, 7, 5, 4, 2, 0, 0, 2, 4, 4, 2, 2]
  },
  {
    id: 'twinkle',
    title: '小星星片段',
    desc: '公版童谣，跨度清楚，适合听辨。',
    level: '经典',
    interval: 380,
    semitones: [0, 0, 7, 7, 9, 9, 7, 5, 5, 4, 4, 2, 2, 0]
  },
  {
    id: 'frere',
    title: '两只老虎片段',
    desc: '公版儿歌，重复句很适合复刻。',
    level: '经典',
    interval: 340,
    semitones: [0, 2, 4, 0, 0, 2, 4, 0, 4, 5, 7]
  },
  {
    id: 'jingle',
    title: '铃儿响叮当',
    desc: '公版节日旋律，按主句重排。',
    level: '经典',
    interval: 320,
    tempo: 116,
    unitBeat: 1,
    semitones: [4, 4, 4, 4, 4, 4, 4, 7, 0, 2, 4],
    scoreRows: [
      '3 3 3 - | 3 3 3 -',
      '3 5 1 2 | 3 - - -'
    ],
    notationRows: [
      '3 3 3 - | 3 3 3 -',
      '3 5 1 2 | 3 - - -'
    ]
  },
  {
    id: 'birthday',
    title: '生日歌片段',
    desc: '按常见 3/4 弱起写法重排。',
    level: '经典',
    interval: 390,
    tempo: 88,
    unitBeat: 1,
    semitones: [7, 7, 9, 7, 12, 11, 7, 7, 9, 7, 14, 12],
    scoreRows: [
      '5_ 5_ | 6 5 1. | 7 - 5_ 5_',
      '6 5 2. | 1. - -'
    ],
    notationRows: [
      '5_ 5_ | 6 5 1. | 7 - 5_ 5_',
      '6 5 2. | 1. - -'
    ]
  }
];

const CHALLENGE_FILTERS = [
  { id: 'all', label: '全部' },
  { id: 'basic', label: '基础' },
  { id: 'advanced', label: '进阶' },
  { id: 'classic', label: '经典' }
];

const SONG_LIBRARY = [
  {
    id: 'song-qingtian-practice',
    title: '晴天（主歌）',
    desc: '按你给的简谱重排，补了下划线时值和整段主歌到尾声的自动弹奏。',
    level: '歌曲',
    category: 'song',
    interval: 420,
    tempo: 67,
    unitBeat: 1,
    rootOffset: 7,
    scoreRows: [
      '1=G  4/4  ♩=67',
      '(.6_.1_ .5_.1_ .4_.5_.6_ .5_.1_ | .1_.5_ .5_.1_ .1_.5_ .7_.5_ | .6_.1_ .5_.6_ .4_.5_.6_ .5_.1_ | .1_.5_ .5_.1_ .1_.5_ .7_.1_.5_)',
      '.6_.1_ .5_.1_ .4_.5_.6_ .5_.1_ | .1_.5_ .5_.1_ .1_.5_ .7_.5_ | .6_.1_ .5_.6_ .4_.5_.6_ .5_.1_ | .1_.5_ .5_.1_ .1_.5_ .7_.1_.5_',
      '0_ 5_ 5_ 1_ 1_ 2_ 3_ | 0_ 5_ 5_ 1_ 1_ 2_ 3_ 2_ 1_ 5_ | 0_ 5_ 5_ 1_ 1_ 2_ 3_',
      '0_ 3_ 3_ 2_ 3_ 4_ 3_ 2_ 4_ 3_ 2_ 1_ | 5_ 1_ 1_ 3_ 4_ 3_ 2_ 1_ 2_',
      '3_ 3_ 3_ 3_ 2_ 3_ 2_ 1_ | 5_ 1_ 1_ 3_ 4_ 3_ 2_ 1_ 2_ | 3_ 3_ 3_ 3_ 2_ 3_ 2_ 1_ .7',
      '1_ 1_ 1_ 1_ 7_ 1_ 1_ | 1_ 1_ 1_ 1_ 7_ 1_ 1_ | 1_ 1_ 1_ 1_ 7_ 1_ 1_ | 1_ 1_ 1_ 5_ 5_ 5_',
      '0_ 5_ 5_ 5_ | 5_ 5_ 5_ 5_ 5_ 5_ 5_ 5_ | 5_ 4_ 3_ 3 | 3 - 0_ 1_ 1_ 1_ 1_',
      '.6_ .7_ 1_ 5_ 4_ 3_ 1_ 1_ | 1 0_ 1_ 1_ 1_ 1_ 1_ 3_ 1_ | .6_ .7_ 1_ 5_ 4_ 3_ 1_ 2_',
      '2 - 0 0 | 3_ 2_ 4_ 3_ 1_ 5_ 7_ | 1. 7_ 5_ 1_ 1_ 6_ 6_ | 0_ 6_ 5_ 5_ 5_ 4_ 3_',
      '2_ 3_ 4_ 3_ 3 - | 3_ #4_ #5_ 3_ 4_ 5_ 7_ | 2. 7_ 1. 1. 0_ 1.',
      '1. 5_ 5_ 6_ 5_ 4_ 2_ 3_ | 4_ 5_ 6_ 1_ 6. 7_ 7_ | 3_ 2_ 4_ 3_ 1_ 5_ 7_',
      '1. 7_ 5_ 1_ 1_ 6_ 6_ | 0_ 6_ 5_ 5_ 5_ 4_ 3_ | 2_ 3_ 4_ 3_ 3 -',
      '3_ #4_ #5_ 3_ 4_ 5_ 7_ | 2. 7_ 1. 1. 0_ 1. | 1. 5_ 5_ 6_ 5_ 4_ 6. 7_',
      '1 2 3 2. 3 1 | 1 - 0 0 | 0 0 0 0 | 0 0 0 0 .7'
    ],
    notationRows: [
      '.6_.1_ .5_.1_ .4_.5_.6_ .5_.1_ | .1_.5_ .5_.1_ .1_.5_ .7_.5_ | .6_.1_ .5_.6_ .4_.5_.6_ .5_.1_ | .1_.5_ .5_.1_ .1_.5_ .7_.1_.5_',
      '.6_.1_ .5_.1_ .4_.5_.6_ .5_.1_ | .1_.5_ .5_.1_ .1_.5_ .7_.5_ | .6_.1_ .5_.6_ .4_.5_.6_ .5_.1_ | .1_.5_ .5_.1_ .1_.5_ .7_.1_.5_',
      '0_ 5_ 5_ 1_ 1_ 2_ 3_ | 0_ 5_ 5_ 1_ 1_ 2_ 3_ 2_ 1_ 5_ | 0_ 5_ 5_ 1_ 1_ 2_ 3_',
      '0_ 3_ 3_ 2_ 3_ 4_ 3_ 2_ 4_ 3_ 2_ 1_ | 5_ 1_ 1_ 3_ 4_ 3_ 2_ 1_ 2_',
      '3_ 3_ 3_ 3_ 2_ 3_ 2_ 1_ | 5_ 1_ 1_ 3_ 4_ 3_ 2_ 1_ 2_ | 3_ 3_ 3_ 3_ 2_ 3_ 2_ 1_ .7',
      '1_ 1_ 1_ 1_ 7_ 1_ 1_ | 1_ 1_ 1_ 1_ 7_ 1_ 1_ | 1_ 1_ 1_ 1_ 7_ 1_ 1_ | 1_ 1_ 1_ 5_ 5_ 5_',
      '0_ 5_ 5_ 5_ | 5_ 5_ 5_ 5_ 5_ 5_ 5_ 5_ | 5_ 4_ 3_ 3 | 3 - 0_ 1_ 1_ 1_ 1_',
      '.6_ .7_ 1_ 5_ 4_ 3_ 1_ 1_ | 1 0_ 1_ 1_ 1_ 1_ 1_ 3_ 1_ | .6_ .7_ 1_ 5_ 4_ 3_ 1_ 2_',
      '2 - 0 0 | 3_ 2_ 4_ 3_ 1_ 5_ 7_ | 1. 7_ 5_ 1_ 1_ 6_ 6_ | 0_ 6_ 5_ 5_ 5_ 4_ 3_',
      '2_ 3_ 4_ 3_ 3 - | 3_ #4_ #5_ 3_ 4_ 5_ 7_ | 2. 7_ 1. 1. 0_ 1.',
      '1. 5_ 5_ 6_ 5_ 4_ 2_ 3_ | 4_ 5_ 6_ 1_ 6. 7_ 7_ | 3_ 2_ 4_ 3_ 1_ 5_ 7_',
      '1. 7_ 5_ 1_ 1_ 6_ 6_ | 0_ 6_ 5_ 5_ 5_ 4_ 3_ | 2_ 3_ 4_ 3_ 3 -',
      '3_ #4_ #5_ 3_ 4_ 5_ 7_ | 2. 7_ 1. 1. 0_ 1. | 1. 5_ 5_ 6_ 5_ 4_ 6. 7_',
      '1 2 3 2. 3 1 | 1 - 0 0 | 0 0 0 0 | 0 0 0 0 .7'
    ],
    notice: '前导点表示低八度，尾点表示高八度；单下划线是半拍，双下划线是四分之一拍；换行会继续接前一小节。'
  },
  {
    id: 'song-twinkle-full',
    title: '小星星',
    desc: '公版儿歌，完整短曲，适合测试自动弹奏。',
    level: '歌曲',
    category: 'song',
    interval: 380,
    tempo: 88,
    unitBeat: 1,
    semitones: [0, 0, 7, 7, 9, 9, 7, 5, 5, 4, 4, 2, 2, 0, 7, 7, 5, 5, 4, 4, 2, 7, 7, 5, 5, 4, 4, 2, 0, 0, 7, 7, 9, 9, 7, 5, 5, 4, 4, 2, 2, 0],
    scoreRows: [
      '1 1 5 5 | 6 6 5 -',
      '4 4 3 3 | 2 2 1 -',
      '5 5 4 4 | 3 3 2 -',
      '1 1 5 5 | 6 6 5 - | 4 4 3 3 | 2 2 1 -'
    ],
    notationRows: [
      '1 1 5 5 | 6 6 5 -',
      '4 4 3 3 | 2 2 1 -',
      '5 5 4 4 | 3 3 2 -',
      '1 1 5 5 | 6 6 5 - | 4 4 3 3 | 2 2 1 -'
    ],
    notice: '公版旋律，可作为完整歌谱和自动弹奏的参考样例。'
  },
  {
    id: 'song-ode-joy',
    title: '欢乐颂',
    desc: '公版古典片段，节奏稳定。',
    level: '歌曲',
    category: 'song',
    interval: 360,
    tempo: 96,
    unitBeat: 1,
    semitones: [4, 4, 5, 7, 7, 5, 4, 2, 0, 0, 2, 4, 4, 2, 2, 4, 4, 5, 7, 7, 5, 4, 2, 0, 0, 2, 4, 2, 0, 0],
    scoreRows: [
      '3 3 4 5 | 5 4 3 2 | 1 1 2 3 | 3 2 2 -',
      '3 3 4 5 | 5 4 3 2 | 1 1 2 3 | 2 1 1 -'
    ],
    notationRows: [
      '3 3 4 5 | 5 4 3 2 | 1 1 2 3 | 3 2 2 -',
      '3 3 4 5 | 5 4 3 2 | 1 1 2 3 | 2 1 1 -'
    ],
    notice: '公版旋律，适合横屏多八度练手。'
  },
  {
    id: 'song-frere-jacques',
    title: '两只老虎',
    desc: '公版儿歌，重复句清楚，适合自动演奏和跟弹。',
    level: '歌曲',
    category: 'song',
    tempo: 96,
    unitBeat: 1,
    scoreRows: [
      '1 2 3 1 | 1 2 3 1',
      '3 4 5 - | 3 4 5 -',
      '5_ 6_ 5_ 4_ 3 1 | 5_ 6_ 5_ 4_ 3 1',
      '2 .5 1 - | 2 .5 1 -'
    ],
    notationRows: [
      '1 2 3 1 | 1 2 3 1',
      '3 4 5 - | 3 4 5 -',
      '5_ 6_ 5_ 4_ 3 1 | 5_ 6_ 5_ 4_ 3 1',
      '2 .5 1 - | 2 .5 1 -'
    ],
    notice: '前导点表示低八度，连音 - 会延长前一个音。'
  },
  {
    id: 'song-birthday',
    title: '生日快乐',
    desc: '常见祝福旋律，按 3/4 弱起重排。',
    level: '歌曲',
    category: 'song',
    tempo: 88,
    unitBeat: 1,
    scoreRows: [
      '5_ 5_ | 6 5 1. | 7 - 5_ 5_',
      '6 5 2. | 1. - 5_ 5_',
      '5. 3. 1. | 7 6 4._ 4._',
      '3. 1. 2. | 1. - -'
    ],
    notationRows: [
      '5_ 5_ | 6 5 1. | 7 - 5_ 5_',
      '6 5 2. | 1. - 5_ 5_',
      '5. 3. 1. | 7 6 4._ 4._',
      '3. 1. 2. | 1. - -'
    ],
    notice: '按 3/4 弱起写法整理；尾点表示高八度，单下划线是半拍。'
  },
  {
    id: 'song-jingle-bells',
    title: '铃儿响叮当',
    desc: '经典节日旋律，按主句重排重复音和长音。',
    level: '歌曲',
    category: 'song',
    tempo: 116,
    unitBeat: 1,
    scoreRows: [
      '3 3 3 - | 3 3 3 -',
      '3 5 1 2 | 3 - - -',
      '4 4 4_ 4_ 4 | 3 3 3_ 3_ 3',
      '2 2 3 2 | 5 - - -'
    ],
    notationRows: [
      '3 3 3 - | 3 3 3 -',
      '3 5 1 2 | 3 - - -',
      '4 4 4_ 4_ 4 | 3 3 3_ 3_ 3',
      '2 2 3 2 | 5 - - -'
    ],
    notice: '按常见主句旋律整理；连续 - 会继续延长前一个音。'
  }
];

function getMode(modeId) {
  return OCTAVE_MODES.find((item) => item.id === modeId) || OCTAVE_MODES[1];
}

function getChallenge(challengeId) {
  return MELODY_CHALLENGES.find((item) => item.id === challengeId)
    || SONG_LIBRARY.find((item) => item.id === challengeId)
    || MELODY_CHALLENGES[0];
}

function getChallengeIndex(challengeId) {
  return MELODY_CHALLENGES.findIndex((item) => item.id === challengeId);
}

function getDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getYesterdayKey() {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  return getDateKey(date);
}

function getDailyChallengeId(dateKey = getDateKey()) {
  let hash = 0;
  for (let i = 0; i < dateKey.length; i += 1) {
    hash = (hash * 31 + dateKey.charCodeAt(i)) % 9973;
  }
  return MELODY_CHALLENGES[hash % MELODY_CHALLENGES.length].id;
}

function normalizeDailyChallengeState(state = {}) {
  return {
    lastCompletedDate: state.lastCompletedDate || '',
    streak: Math.max(0, Number(state.streak) || 0),
    bestScore: Math.max(0, Number(state.bestScore) || 0),
    rewardText: state.rewardText || ''
  };
}

function normalizeRankItem(item = {}) {
  const matchedChallenge = MELODY_CHALLENGES.find((challenge) => challenge.id === item.challengeId || challenge.title === item.title);
  return {
    id: item.id || `rank-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    challengeId: item.challengeId || (matchedChallenge && matchedChallenge.id) || '',
    title: item.title || (matchedChallenge && matchedChallenge.title) || '旋律挑战',
    score: Number(item.score) || 0,
    correctText: item.correctText || '--',
    createdAt: item.createdAt || ''
  };
}

function normalizeChallengeProgress(progress = {}) {
  const completedIds = Array.isArray(progress.completedIds) ? progress.completedIds : [];
  const bestScores = progress.bestScores && typeof progress.bestScores === 'object' ? progress.bestScores : {};
  const leaderboard = Array.isArray(progress.leaderboard) ? progress.leaderboard.map(normalizeRankItem) : [];
  const unlockedCount = MELODY_CHALLENGES.length;

  return {
    unlockedCount,
    completedIds,
    bestScores,
    leaderboard: leaderboard.slice(0, 30)
  };
}

function getChallengeCategory(item = {}) {
  if (item.category) return item.category;
  if (item.level === '经典') return 'classic';
  if (item.level === '进阶' || item.level === '困难') return 'advanced';
  return 'basic';
}

function buildChallengeListView(progress, activeChallengeId) {
  const completedSet = new Set(progress.completedIds || []);
  return MELODY_CHALLENGES.map((item, index) => ({
    ...item,
    category: getChallengeCategory(item),
    index,
    levelNo: index + 1,
    locked: false,
    completed: completedSet.has(item.id),
    active: item.id === activeChallengeId,
    bestScore: progress.bestScores && progress.bestScores[item.id] ? progress.bestScores[item.id] : 0
  }));
}

function filterChallengeList(list, filterId = 'all') {
  if (!filterId || filterId === 'all') return list;
  return list.filter((item) => item.category === filterId);
}

function buildSongListView(activeSongId = '') {
  return SONG_LIBRARY.map((item) => ({
    ...item,
    active: item.id === activeSongId
  }));
}

function getNoteName(baseOctave, semitone) {
  const normalized = ((semitone % 12) + 12) % 12;
  const octave = baseOctave + Math.floor(semitone / 12);
  return `${SEMITONE_NAMES[normalized]}${octave}`;
}

function getFrequency(baseOctave, semitone) {
  const midi = (baseOctave + 1) * 12 + semitone;
  return Number((440 * Math.pow(2, (midi - 69) / 12)).toFixed(2));
}

function getScoreRows(challenge) {
  if (challenge && Array.isArray(challenge.scoreRows) && challenge.scoreRows.length) {
    return challenge.scoreRows;
  }

  const noteText = (challenge.semitones || []).map((semitone) => {
    const normalized = ((semitone % 12) + 12) % 12;
    const degreeMap = {
      0: '1',
      2: '2',
      4: '3',
      5: '4',
      7: '5',
      9: '6',
      11: '7'
    };
    const degree = degreeMap[normalized] || '*';
    if (semitone >= 12) return `${degree}.`;
    if (semitone < 0) return `.${degree}`;
    return degree;
  });

  const rows = [];
  for (let i = 0; i < noteText.length; i += 8) {
    rows.push(noteText.slice(i, i + 8).join(' '));
  }
  return rows.length ? rows : ['暂无谱面提示'];
}

function getDegreeSemitone(token) {
  const match = /^([#b]?)([1-7])$/.exec(token);
  if (!match) return null;
  const accidental = match[1];
  const degree = Number(match[2]);
  const degreeMap = {
    1: 0,
    2: 2,
    3: 4,
    4: 5,
    5: 7,
    6: 9,
    7: 11
  };
  let semitone = degreeMap[degree];
  if (accidental === '#') semitone += 1;
  if (accidental === 'b') semitone -= 1;
  return semitone;
}

function getBeatDurationMs(challenge, beat) {
  const tempo = Number(challenge.tempo || 72);
  return Math.round((60000 / tempo) * beat);
}

function parseTokenDuration(token, defaultBeat) {
  const match = /^(.*?)(_{1,4})?(?:\/([\d.]+))?$/.exec(token);
  if (!match) {
    return {
      token,
      beat: defaultBeat
    };
  }

  const explicitBeat = Number(match[3]);
  const underlineCount = match[2] ? match[2].length : 0;
  let beat = defaultBeat;
  if (Number.isFinite(explicitBeat) && explicitBeat > 0) {
    beat = explicitBeat;
  } else if (underlineCount > 0) {
    beat = defaultBeat / Math.pow(2, underlineCount);
  }

  return {
    token: match[1],
    beat
  };
}

function tokenizeNotationRow(row = '') {
  const raw = String(row)
    .replace(/[（(]/g, ' ')
    .replace(/[）)]/g, ' ')
    .replace(/,/g, ' ')
    .replace(/[，。；：]/g, ' ');
  const tokens = [];
  let index = 0;

  while (index < raw.length) {
    const char = raw[index];
    if (/\s/.test(char)) {
      index += 1;
      continue;
    }
    if (char === '|') {
      tokens.push('|');
      index += 1;
      continue;
    }
    if (char === '-') {
      let token = '-';
      index += 1;
      while (raw[index] === '_') {
        token += raw[index];
        index += 1;
      }
      if (raw[index] === '/') {
        token += raw[index];
        index += 1;
        while (index < raw.length && /[\d.]/.test(raw[index])) {
          token += raw[index];
          index += 1;
        }
      }
      tokens.push(token);
      continue;
    }

    let token = '';
    while (index < raw.length && raw[index] === '.') {
      token += '.';
      index += 1;
    }
    if (raw[index] === '#' || raw[index] === 'b') {
      token += raw[index];
      index += 1;
    }
    if (/[0-7]/.test(raw[index])) {
      token += raw[index];
      index += 1;
      while (index < raw.length && raw[index] === '.') {
        token += '.';
        index += 1;
      }
      while (index < raw.length && raw[index] === '_') {
        token += '_';
        index += 1;
      }
      if (raw[index] === '/') {
        token += raw[index];
        index += 1;
        while (index < raw.length && /[\d.]/.test(raw[index])) {
          token += raw[index];
          index += 1;
        }
      }
      tokens.push(token);
      continue;
    }

    index += 1;
  }

  return tokens;
}

function getDefaultBeat(challenge) {
  return Number(challenge.unitBeat || 1);
}

function getTicksPerBeat(challenge) {
  return Number(challenge.ticksPerBeat || SCORE_TICKS_PER_BEAT);
}

function beatToTicks(challenge, beat) {
  return Math.max(1, Math.round(Number(beat || 0) * getTicksPerBeat(challenge)));
}

function ticksToDurationMs(challenge, ticks) {
  const beat = Number(ticks || 0) / getTicksPerBeat(challenge);
  return getBeatDurationMs(challenge, beat);
}

function parsePitchToken(token) {
  if (token === '0') {
    return {
      rest: true,
      raw: token
    };
  }

  let normalized = token;
  let lowerOctave = 0;
  let upperOctave = 0;

  while (normalized.startsWith('.')) {
    lowerOctave += 1;
    normalized = normalized.slice(1);
  }
  while (normalized.endsWith('.')) {
    upperOctave += 1;
    normalized = normalized.slice(0, -1);
  }

  const match = /^([#b]?)([1-7])$/.exec(normalized);
  if (!match) return null;

  return {
    rest: false,
    raw: token,
    accidental: match[1] || '',
    degree: Number(match[2]),
    octaveShift: upperOctave - lowerOctave
  };
}

function getPitchSemitone(pitch, rootOffset = 0) {
  if (!pitch || pitch.rest) return null;
  const token = `${pitch.accidental || ''}${pitch.degree}`;
  const relativeSemitone = getDegreeSemitone(token);
  if (relativeSemitone === null) return null;
  return rootOffset + relativeSemitone + Number(pitch.octaveShift || 0) * 12;
}

function createScoreEventFromToken(challenge, token, eventIndex, startTick) {
  const parsed = parseTokenDuration(token, getDefaultBeat(challenge));
  const pitch = parsePitchToken(parsed.token);
  if (!pitch) return null;

  return {
    id: `${challenge.id}-event-${eventIndex}`,
    type: pitch.rest ? 'rest' : 'note',
    raw: token,
    degree: pitch.degree || 0,
    accidental: pitch.accidental || '',
    octaveShift: Number(pitch.octaveShift || 0),
    rest: !!pitch.rest,
    startTick,
    durationTicks: beatToTicks(challenge, parsed.beat),
    tiedFromPrevious: false,
    tiedToNext: false
  };
}

function normalizeScoreEvent(challenge, rawEvent, eventIndex, startTick) {
  const durationTicks = Number(rawEvent.durationTicks)
    || beatToTicks(challenge, Number(rawEvent.beat || getDefaultBeat(challenge)));
  const rest = !!rawEvent.rest || rawEvent.type === 'rest';
  return {
    id: rawEvent.id || `${challenge.id}-event-${eventIndex}`,
    type: rest ? 'rest' : 'note',
    raw: rawEvent.raw || '',
    degree: Number(rawEvent.degree || 0),
    accidental: rawEvent.accidental || '',
    octaveShift: Number(rawEvent.octaveShift || 0),
    rest,
    startTick: Number(rawEvent.startTick || startTick),
    durationTicks,
    tiedFromPrevious: !!rawEvent.tiedFromPrevious,
    tiedToNext: !!rawEvent.tiedToNext,
    lyric: rawEvent.lyric || ''
  };
}

function buildScoreModel(challenge) {
  const events = [];
  let startTick = 0;

  if (Array.isArray(challenge.scoreEvents) && challenge.scoreEvents.length) {
    challenge.scoreEvents.forEach((rawEvent, index) => {
      const event = normalizeScoreEvent(challenge, rawEvent, index, startTick);
      events.push(event);
      startTick = event.startTick + event.durationTicks;
    });
    return events;
  }

  const tokens = [];
  (challenge.notationRows || []).forEach((row) => {
    tokenizeNotationRow(row).forEach((token) => {
      if (token) tokens.push(token.trim());
    });
  });

  tokens.forEach((token) => {
    if (!token || token === '|') return;
    if (token.startsWith('-')) {
      if (events.length) {
        const parsed = parseTokenDuration(token, getDefaultBeat(challenge));
        const extraTicks = beatToTicks(challenge, parsed.beat);
        const previous = events[events.length - 1];
        previous.durationTicks += extraTicks;
        previous.tiedToNext = true;
        startTick = previous.startTick + previous.durationTicks;
      }
      return;
    }

    const event = createScoreEventFromToken(challenge, token, events.length, startTick);
    if (!event) return;
    events.push(event);
    startTick += event.durationTicks;
  });

  return events;
}

function createSequenceItemFromEvent(challenge, mode, event, index, previousDurationMs) {
  const rootOffset = Number(challenge.rootOffset || 0);
  const durationMs = ticksToDurationMs(challenge, event.durationTicks);
  const delay = index === 0 ? 0 : previousDurationMs;

  if (event.rest) {
    return {
      id: event.id || `${challenge.id}-rest-${index}`,
      rest: true,
      durationMs,
      delay,
      startTick: event.startTick,
      durationTicks: event.durationTicks
    };
  }

  const semitone = getPitchSemitone(event, rootOffset);
  if (semitone === null) return null;
  return {
    id: event.id || `${challenge.id}-${index}`,
    rest: false,
    note: getNoteName(mode.baseOctave, semitone),
    semitone,
    frequency: getFrequency(mode.baseOctave, semitone),
    durationMs,
    delay,
    startTick: event.startTick,
    durationTicks: event.durationTicks,
    degree: event.degree,
    octaveShift: event.octaveShift,
    tiedToNext: !!event.tiedToNext
  };
}

function createSequenceItem(challenge, mode, token, index, previousDurationMs) {
  const unitBeat = Number(challenge.unitBeat || 1);
  const rootOffset = Number(challenge.rootOffset || 0);
  const parsed = parseTokenDuration(token, unitBeat);
  const durationMs = getBeatDurationMs(challenge, parsed.beat);
  const delay = index === 0 ? 0 : previousDurationMs;

  if (parsed.token === '0') {
    return {
      id: `${challenge.id}-rest-${index}`,
      rest: true,
      durationMs,
      delay
    };
  }

  let normalized = parsed.token;
  let lowerOctave = 0;
  let upperOctave = 0;

  while (normalized.startsWith('.')) {
    lowerOctave += 1;
    normalized = normalized.slice(1);
  }
  while (normalized.endsWith('.')) {
    upperOctave += 1;
    normalized = normalized.slice(0, -1);
  }

  const relativeSemitone = getDegreeSemitone(normalized);
  if (relativeSemitone === null) return null;

  const semitone = rootOffset + relativeSemitone + upperOctave * 12 - lowerOctave * 12;
  return {
    id: `${challenge.id}-${index}`,
    rest: false,
    note: getNoteName(mode.baseOctave, semitone),
    semitone,
    frequency: getFrequency(mode.baseOctave, semitone),
    durationMs,
    delay
  };
}

function buildNotationSequence(challenge, modeId) {
  const mode = getMode(modeId);
  const scoreModel = buildScoreModel(challenge);
  let previousDurationMs = 0;

  return scoreModel.map((event, index) => {
    const item = createSequenceItemFromEvent(challenge, mode, event, index, previousDurationMs);
    if (!item) return;
    previousDurationMs = item.durationMs;
    return item;
  }).filter(Boolean);
}

function buildKeys(modeId, wide = false) {
  const mode = getMode(modeId);
  if (!wide) {
    const whiteKeys = WHITE_DEFS.map((item) => ({
      ...item,
      note: getNoteName(mode.baseOctave, item.semitone),
      frequency: getFrequency(mode.baseOctave, item.semitone)
    }));
    const blackKeys = BLACK_DEFS.map((item) => ({
      ...item,
      note: getNoteName(mode.baseOctave, item.semitone),
      frequency: getFrequency(mode.baseOctave, item.semitone),
      width: 9.6
    }));

    return {
      whiteKeys,
      blackKeys,
      whiteKeyCount: whiteKeys.length,
      blackKeyWidth: 9.6,
      keyboardRangeText: `${whiteKeys[0].note} - ${whiteKeys[whiteKeys.length - 1].note}`
    };
  }

  const baseOctave = Math.max(2, mode.baseOctave - 1);
  const whitePattern = [
    { name: 'C', label: 'Do', semitone: 0 },
    { name: 'D', label: 'Re', semitone: 2 },
    { name: 'E', label: 'Mi', semitone: 4 },
    { name: 'F', label: 'Fa', semitone: 5 },
    { name: 'G', label: 'Sol', semitone: 7 },
    { name: 'A', label: 'La', semitone: 9 },
    { name: 'B', label: 'Si', semitone: 11 }
  ];
  const blackPattern = [
    { name: 'C#', label: 'C#', semitone: 1, whiteIndexOffset: 1 },
    { name: 'D#', label: 'D#', semitone: 3, whiteIndexOffset: 2 },
    { name: 'F#', label: 'F#', semitone: 6, whiteIndexOffset: 4 },
    { name: 'G#', label: 'G#', semitone: 8, whiteIndexOffset: 5 },
    { name: 'A#', label: 'A#', semitone: 10, whiteIndexOffset: 6 }
  ];
  const octaveCount = 3;
  const whiteKeys = [];
  const blackKeys = [];

  for (let octaveIndex = 0; octaveIndex < octaveCount; octaveIndex += 1) {
    whitePattern.forEach((item) => {
      const semitone = octaveIndex * 12 + item.semitone;
      whiteKeys.push({
        ...item,
        semitone,
        note: getNoteName(baseOctave, semitone),
        frequency: getFrequency(baseOctave, semitone)
      });
    });
  }
  whiteKeys.push({
    name: 'C',
    label: 'Do',
    semitone: octaveCount * 12,
    note: getNoteName(baseOctave, octaveCount * 12),
    frequency: getFrequency(baseOctave, octaveCount * 12)
  });

  const whiteKeyCount = whiteKeys.length;
  blackPattern.forEach((pattern) => {
    for (let octaveIndex = 0; octaveIndex < octaveCount; octaveIndex += 1) {
      const semitone = octaveIndex * 12 + pattern.semitone;
      const leftIndex = octaveIndex * 7 + pattern.whiteIndexOffset;
      blackKeys.push({
        ...pattern,
        semitone,
        left: Number(((leftIndex / whiteKeyCount) * 100).toFixed(3)),
        width: 3.75,
        note: getNoteName(baseOctave, semitone),
        frequency: getFrequency(baseOctave, semitone)
      });
    }
  });

  return {
    whiteKeys,
    blackKeys,
    whiteKeyCount,
    blackKeyWidth: 3.75,
    keyboardRangeText: `${whiteKeys[0].note} - ${whiteKeys[whiteKeys.length - 1].note}`
  };
}

function buildChallengeNotes(challengeId, modeId) {
  const challenge = getChallenge(challengeId);
  if ((Array.isArray(challenge.notationRows) && challenge.notationRows.length)
    || (Array.isArray(challenge.scoreEvents) && challenge.scoreEvents.length)) {
    return buildNotationSequence(challenge, modeId)
      .filter((item) => !item.rest)
      .map((item, index, list) => ({
        ...item,
        delay: index === 0 ? 0 : list[index - 1].durationMs
      }));
  }

  const mode = getMode(modeId);
  const rootOffset = Number(challenge.rootOffset || 0);

  return challenge.semitones.map((semitone, index) => ({
    id: `${challenge.id}-${index}`,
    note: getNoteName(mode.baseOctave, rootOffset + semitone),
    semitone,
    frequency: getFrequency(mode.baseOctave, rootOffset + semitone),
    delay: index === 0 ? 0 : challenge.interval
  }));
}

function buildPlaybackNotes(challengeId, modeId) {
  const challenge = getChallenge(challengeId);
  if ((Array.isArray(challenge.notationRows) && challenge.notationRows.length)
    || (Array.isArray(challenge.scoreEvents) && challenge.scoreEvents.length)) {
    return buildNotationSequence(challenge, modeId);
  }
  return buildChallengeNotes(challengeId, modeId);
}

function writeString(view, offset, value) {
  for (let i = 0; i < value.length; i += 1) {
    view.setUint8(offset + i, value.charCodeAt(i));
  }
}

function createToneBuffer(frequency) {
  const sampleCount = Math.floor(SAMPLE_RATE * TONE_DURATION);
  const buffer = new ArrayBuffer(44 + sampleCount * 2);
  const view = new DataView(buffer);

  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + sampleCount * 2, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, SAMPLE_RATE, true);
  view.setUint32(28, SAMPLE_RATE * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, 'data');
  view.setUint32(40, sampleCount * 2, true);

  for (let i = 0; i < sampleCount; i += 1) {
    const t = i / SAMPLE_RATE;
    const progress = i / sampleCount;
    const attack = Math.min(t / 0.018, 1);
    const release = Math.pow(1 - progress, 2.35);
    const envelope = Math.min(attack, release);
    const fundamental = Math.sin(2 * Math.PI * frequency * t);
    const second = 0.32 * Math.sin(2 * Math.PI * frequency * 2 * t);
    const third = 0.11 * Math.sin(2 * Math.PI * frequency * 3 * t);
    const sample = Math.max(-1, Math.min(1, (fundamental + second + third) * envelope * 0.38));

    view.setInt16(44 + i * 2, sample * 32767, true);
  }

  return buffer;
}

function getSafeNoteName(note) {
  return note.replace('#', 's');
}

Page({
  data: {
    octaveModes: OCTAVE_MODES,
    chordButtons: CHORDS,
    challengeFilters: CHALLENGE_FILTERS,
    songList: SONG_LIBRARY,
    challengeList: MELODY_CHALLENGES,
    filteredChallengeList: [],
    challengeFilter: 'all',
    activeSongId: SONG_LIBRARY[0].id,
    activeSongTitle: SONG_LIBRARY[0].title,
    activeScoreRows: SONG_LIBRARY[0].scoreRows,
    activeScoreNotice: SONG_LIBRARY[0].notice,
    activeMode: 'middle',
    whiteKeys: [],
    blackKeys: [],
    whiteKeyCount: 8,
    blackKeyWidth: 9.6,
    keyboardRangeText: '',
    activeNotes: {},
    sustainEnabled: true,
    volume: 76,
    toneReady: false,
    preparingAudio: false,
    audioMessage: '准备音频',
    lastNote: '--',
    playedCount: 0,
    activeChallengeId: 'warmup',
    activeChallengeTitle: '三音热身',
    activeChallengeLevel: '入门',
    challengeNotes: [],
    playbackNotes: [],
    challengeDisplay: [],
    challengeInput: [],
    challengeStep: 0,
    challengeScore: '--',
    challengeMessage: '先听一遍，再照着弹',
    challengeRevealed: false,
    challengeCombo: 0,
    bestScore: 0,
    perfectCount: 0,
    isChallengePlaying: false,
    isLandscape: false,
    forceLandscapeLayout: false,
    compactUi: false,
    orientationButtonText: '横屏',
    settingsVisible: false,
    rankModalVisible: false,
    unlockedCount: 4,
    completedChallengeIds: [],
    bestScores: {},
    levelProgressText: '0/18',
    levelProgressPercent: 0,
    leaderboard: [],
    filteredLeaderboard: [],
    rankFilterChallengeId: 'all',
    dailyChallengeId: '',
    dailyChallengeTitle: '',
    dailyChallengeLevel: '',
    dailyChallengeDate: '',
    dailyStatusText: '今日题待挑战',
    dailyRewardText: '完成今日题可累计打卡',
    dailyStreak: 0,
    dailyCompletedToday: false,
    passAnimationVisible: false,
    passAnimationTitle: '',
    passAnimationSubtitle: ''
  },

  onLoad() {
    const keys = buildKeys(this.data.activeMode);
    const challengeNotes = buildChallengeNotes(this.data.activeChallengeId, this.data.activeMode);
    const playbackNotes = buildPlaybackNotes(this.data.activeChallengeId, this.data.activeMode);
    const challenge = getChallenge(this.data.activeChallengeId);
    const progress = this.loadChallengeProgress();
    const dailyState = this.loadDailyChallengeState();
    const todayKey = getDateKey();
    const dailyChallengeId = getDailyChallengeId(todayKey);
    const dailyChallenge = getChallenge(dailyChallengeId);
    const dailyCompletedToday = dailyState.lastCompletedDate === todayKey;
    const challengeList = buildChallengeListView(progress, this.data.activeChallengeId);

    this.setData({
      ...keys,
      activeChallengeTitle: challenge.title,
      activeChallengeLevel: challenge.level,
      activeScoreRows: getScoreRows(challenge),
      activeScoreNotice: challenge.notice || '当前旋律已生成简谱提示。',
      challengeNotes,
      playbackNotes,
      challengeDisplay: this.buildChallengeDisplay([], challengeNotes, false),
      unlockedCount: progress.unlockedCount,
      completedChallengeIds: progress.completedIds,
      bestScores: progress.bestScores,
      leaderboard: progress.leaderboard,
      filteredLeaderboard: this.getFilteredLeaderboard(progress.leaderboard, 'all'),
      bestScore: Math.max(0, ...Object.keys(progress.bestScores).map((key) => Number(progress.bestScores[key]) || 0)),
      perfectCount: Object.keys(progress.bestScores).filter((key) => Number(progress.bestScores[key]) >= 100).length,
      challengeList,
      filteredChallengeList: filterChallengeList(challengeList, this.data.challengeFilter),
      songList: buildSongListView(this.data.activeSongId),
      dailyChallengeId,
      dailyChallengeTitle: dailyChallenge.title,
      dailyChallengeLevel: dailyChallenge.level,
      dailyChallengeDate: todayKey.slice(5).replace('-', '/'),
      dailyStreak: dailyState.streak,
      dailyCompletedToday,
      dailyStatusText: dailyCompletedToday ? `今日已完成，连续 ${dailyState.streak} 天` : '今日题待挑战',
      dailyRewardText: dailyCompletedToday ? (dailyState.rewardText || '今日已打卡') : '完成今日题可累计打卡'
    }, () => {
      this.refreshChallengeProgress();
    });

    this.handleWindowResize = (res) => {
      const size = res && res.size ? res.size : res;
      this.updateOrientation(size);
    };
    this.updateOrientation();
    this.pauseBackgroundAudio();
    if (wx.onWindowResize) {
      wx.onWindowResize(this.handleWindowResize);
    }

    this.preparePiano();
  },

  onShow() {
    this.pauseBackgroundAudio();
  },

  onUnload() {
    this.clearChallengeTimers();
    if (wx.offWindowResize && this.handleWindowResize) {
      wx.offWindowResize(this.handleWindowResize);
    }
    if (wx.setPageOrientation) {
      wx.setPageOrientation({
        orientation: 'auto',
        fail: () => {}
      });
    }
    this.destroyAudio();
  },

  updateOrientation(size) {
    let windowSize = size;
    if (!windowSize) {
      try {
        windowSize = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
      } catch (err) {
        windowSize = {
          windowWidth: 0,
          windowHeight: 1
        };
      }
    }

    const width = windowSize.windowWidth || windowSize.width || 0;
    const height = windowSize.windowHeight || windowSize.height || 1;
    const isLandscape = width > height;
    const isWideKeyboard = isLandscape || this.data.forceLandscapeLayout;
    this.setData({
      isLandscape,
      compactUi: isWideKeyboard,
      orientationButtonText: isWideKeyboard ? '竖屏' : '横屏',
      ...buildKeys(this.data.activeMode, isWideKeyboard)
    });
  },

  pauseBackgroundAudio() {
    try {
      const app = getApp();
      const bgm = app && app.globalData && app.globalData.currentSong;
      if (bgm && !bgm.paused) {
        bgm.pause();
      }
    } catch (err) {
      console.warn('暂停背景音乐失败', err);
    }
  },

  toggleLandscapeMode() {
    const nextLandscape = !(this.data.isLandscape || this.data.forceLandscapeLayout);
    const nextOrientation = nextLandscape ? 'landscape' : 'portrait';
    this.setData({
      forceLandscapeLayout: nextLandscape,
      compactUi: nextLandscape || this.data.isLandscape,
      orientationButtonText: nextLandscape ? '竖屏' : '横屏',
      ...buildKeys(this.data.activeMode, nextLandscape)
    });

    if (!wx.setPageOrientation) {
      wx.showToast({
        title: nextLandscape ? '已切换宽屏键盘' : '已恢复竖屏布局',
        icon: 'none'
      });
      return;
    }

    wx.setPageOrientation({
      orientation: nextOrientation,
      success: () => {
        this.updateOrientation();
      },
      fail: () => {
        wx.showToast({
          title: nextLandscape ? '已切换宽屏键盘' : '已恢复竖屏布局',
          icon: 'none'
        });
      }
    });
  },

  openPianoSettings() {
    this.setData({
      settingsVisible: true
    });
  },

  closePianoSettings() {
    this.setData({
      settingsVisible: false
    });
  },

  openRankModal() {
    this.setData({
      settingsVisible: false,
      rankModalVisible: true
    });
  },

  closeRankModal() {
    this.setData({
      rankModalVisible: false
    });
  },

  loadChallengeProgress() {
    let progress = {};
    try {
      progress = wx.getStorageSync(CHALLENGE_PROGRESS_KEY) || {};
    } catch (err) {
      console.warn('读取挑战进度失败', err);
    }
    return normalizeChallengeProgress(progress);
  },

  persistChallengeProgress(progress) {
    try {
      wx.setStorageSync(CHALLENGE_PROGRESS_KEY, progress);
    } catch (err) {
      console.error('保存挑战进度失败', err);
    }
  },

  loadDailyChallengeState() {
    let state = {};
    try {
      state = wx.getStorageSync(DAILY_CHALLENGE_KEY) || {};
    } catch (err) {
      console.warn('读取每日挑战失败', err);
    }
    return normalizeDailyChallengeState(state);
  },

  persistDailyChallengeState(state) {
    try {
      wx.setStorageSync(DAILY_CHALLENGE_KEY, state);
    } catch (err) {
      console.error('保存每日挑战失败', err);
    }
  },

  startDailyChallenge() {
    if (!this.data.dailyChallengeId) return;
    this.resetChallengeState(this.data.dailyChallengeId, '今日挑战已装载，先听一遍再复刻');
  },

  completeDailyChallenge(challengeId, score) {
    if (challengeId !== this.data.dailyChallengeId) return null;

    const todayKey = getDateKey();
    const state = this.loadDailyChallengeState();
    const alreadyCompletedToday = state.lastCompletedDate === todayKey;
    const streak = alreadyCompletedToday
      ? Math.max(1, state.streak)
      : (state.lastCompletedDate === getYesterdayKey() ? state.streak + 1 : 1);
    const rewardText = streak >= 7
      ? '7日连击 · 手感稳定'
      : (streak >= 3 ? `连续 ${streak} 天 · 解锁热手奖励` : `连续 ${streak} 天 · 今日打卡完成`);
    const nextState = {
      lastCompletedDate: todayKey,
      streak,
      bestScore: Math.max(state.bestScore, score),
      rewardText
    };

    this.persistDailyChallengeState(nextState);
    this.setData({
      dailyStreak: streak,
      dailyCompletedToday: true,
      dailyStatusText: `今日已完成，连续 ${streak} 天`,
      dailyRewardText: rewardText
    });

    return alreadyCompletedToday ? null : rewardText;
  },

  getFilteredLeaderboard(leaderboard = this.data.leaderboard, challengeId = this.data.rankFilterChallengeId) {
    const list = Array.isArray(leaderboard) ? leaderboard.map(normalizeRankItem) : [];
    if (!challengeId || challengeId === 'all') return list.slice(0, 10);
    return list.filter((item) => item.challengeId === challengeId).slice(0, 10);
  },

  refreshLeaderboardFilter() {
    this.setData({
      filteredLeaderboard: this.getFilteredLeaderboard()
    });
  },

  selectRankFilter(e) {
    const challengeId = e.currentTarget.dataset.challengeId || 'all';
    this.setData({
      rankFilterChallengeId: challengeId
    }, () => {
      this.refreshLeaderboardFilter();
    });
  },

  selectChallengeFilter(e) {
    const filter = e.currentTarget.dataset.filter || 'all';
    this.setData({
      challengeFilter: filter,
      filteredChallengeList: filterChallengeList(this.data.challengeList, filter)
    });
  },

  selectSong(e) {
    const songId = e.currentTarget.dataset.songId;
    if (!songId) return;
    const song = getChallenge(songId);
    this.setData({
      activeSongId: song.id,
      activeSongTitle: song.title,
      activeScoreRows: getScoreRows(song),
      activeScoreNotice: song.notice || '当前歌曲已生成简谱提示。',
      songList: buildSongListView(song.id)
    });
  },

  autoPlaySelectedSong() {
    this.setData({
      settingsVisible: false
    }, () => {
      this.playSelectedSongSequence();
    });
  },

  playSelectedSongSequence() {
    const songId = this.data.activeSongId;
    const song = getChallenge(songId);
    if (!this.audioReady) {
      this.preparePiano().then(() => {
        this.playSelectedSongSequence();
      }).catch(() => {});
      return;
    }

    const playbackNotes = buildPlaybackNotes(songId, this.data.activeMode);
    if (!playbackNotes.length) return;

    this.clearChallengeTimers();
    this.setData({
      isChallengePlaying: true,
      challengeMessage: `正在自动演奏：${song.title}`
    });

    let elapsed = 0;
    playbackNotes.forEach((item) => {
      elapsed += item.delay;
      this.challengeTimers.push(setTimeout(() => {
        if (!item.rest) {
          this.playNote(item.note, {
            record: false,
            count: false,
            durationMs: item.durationMs
          });
        }
      }, elapsed));
    });

    const tailDuration = playbackNotes.length
      ? Math.max(220, Math.round(Number(playbackNotes[playbackNotes.length - 1].durationMs) || 0))
      : 220;
    this.challengeTimers.push(setTimeout(() => {
      this.setData({
        isChallengePlaying: false,
        challengeMessage: '自动演奏结束，可以继续闯关'
      });
    }, elapsed + tailDuration + 160));
  },

  refreshChallengeProgress(activeChallengeId = this.data.activeChallengeId) {
    const progress = normalizeChallengeProgress({
      unlockedCount: this.data.unlockedCount,
      completedIds: this.data.completedChallengeIds,
      bestScores: this.data.bestScores,
      leaderboard: this.data.leaderboard
    });
    const completedCount = progress.completedIds.length;
    const total = MELODY_CHALLENGES.length;

    const challengeList = buildChallengeListView(progress, activeChallengeId);
    this.setData({
      challengeList,
      filteredChallengeList: filterChallengeList(challengeList, this.data.challengeFilter),
      songList: buildSongListView(this.data.activeSongId),
      levelProgressText: `${completedCount}/${total}`,
      levelProgressPercent: Math.round((completedCount / total) * 100)
    }, () => {
      this.refreshLeaderboardFilter();
    });
  },

  closePassAnimation() {
    this.setData({
      passAnimationVisible: false
    });
  },

  noop() {},

  preparePiano() {
    if (this.audioReady) return Promise.resolve();
    if (this.preparing && this.pianoReadyPromise) return this.pianoReadyPromise;

    this.preparing = true;
    this.audioPools = this.audioPools || {};
    this.audioCursor = this.audioCursor || {};
    this.noteFiles = this.noteFiles || {};
    this.noteFrequencies = this.noteFrequencies || {};
    this.releaseTimers = this.releaseTimers || {};

    this.setData({
      preparingAudio: true,
      audioMessage: '正在准备音频'
    });

    this.pianoReadyPromise = new Promise((resolve, reject) => {
      try {
        this.configureInnerAudioOption();
        const notes = this.collectAllNotes();
        notes.forEach((item) => {
          this.noteFrequencies[item.note] = item.frequency;
        });

        if (this.prepareWebAudioEngine()) {
          this.audioReady = true;
          this.preparing = false;
          this.setData({
            toneReady: true,
            preparingAudio: false,
            audioMessage: 'WebAudio 合成器已就绪'
          });
          resolve();
          return;
        }

        const fs = wx.getFileSystemManager();
        const dir = `${wx.env.USER_DATA_PATH}/${TONE_CACHE_DIR}`;
        this.ensureDirectory(fs, dir);

        notes.forEach((item) => {
          const filePath = `${dir}/${getSafeNoteName(item.note)}.wav`;
          this.ensureToneFile(fs, filePath, item.frequency);
          this.noteFiles[item.note] = filePath;
        });

        this.audioReady = true;
        this.preparing = false;
        this.setData({
          toneReady: true,
          preparingAudio: false,
          audioMessage: '音频已就绪'
        });
        resolve();
      } catch (err) {
        console.error('准备钢琴音频失败', err);
        this.preparing = false;
        this.pianoReadyPromise = null;
        this.setData({
          preparingAudio: false,
          audioMessage: '音频准备失败'
        });
        wx.showToast({
          title: '音频准备失败',
          icon: 'none'
        });
        reject(err);
      }
    });

    return this.pianoReadyPromise;
  },

  configureInnerAudioOption() {
    if (this.innerAudioOptionConfigured || !wx.setInnerAudioOption) return;
    this.innerAudioOptionConfigured = true;
    wx.setInnerAudioOption({
      mixWithOther: true,
      obeyMuteSwitch: false,
      fail: (err) => {
        console.warn('设置音频选项失败', err);
      }
    });
  },

  prepareWebAudioEngine() {
    if (!wx.createWebAudioContext) return false;

    try {
      if (this.webAudioContext && this.webAudioContext.close) {
        this.webAudioContext.close();
      }
      const context = wx.createWebAudioContext();
      if (!context || !context.createOscillator || !context.createGain || !context.destination) {
        return false;
      }

      const masterGain = context.createGain();
      this.setAudioParam(masterGain.gain, 1, context.currentTime || 0);
      masterGain.connect(context.destination);
      this.webAudioContext = context;
      this.webAudioMasterGain = masterGain;
      this.audioBackend = 'webAudio';
      return true;
    } catch (err) {
      console.warn('WebAudio 合成器不可用，降级到 InnerAudioContext', err);
      this.webAudioContext = null;
      this.webAudioMasterGain = null;
      return false;
    }
  },

  setAudioParam(param, value, time) {
    if (!param) return;
    if (param.setValueAtTime) {
      param.setValueAtTime(value, time);
    } else {
      param.value = value;
    }
  },

  rampAudioParam(param, value, time) {
    if (!param) return;
    if (param.exponentialRampToValueAtTime) {
      param.exponentialRampToValueAtTime(Math.max(0.0001, value), time);
    } else if (param.linearRampToValueAtTime) {
      param.linearRampToValueAtTime(value, time);
    } else {
      param.value = value;
    }
  },

  playWebAudioNote(note, durationMs) {
    const context = this.webAudioContext;
    const frequency = this.noteFrequencies && this.noteFrequencies[note];
    if (!context || !frequency) return false;

    try {
      if (context.state === 'suspended' && context.resume) {
        context.resume();
      }

      const now = context.currentTime || 0;
      const oscillator = context.createOscillator();
      const noteGain = context.createGain();
      const volume = Math.max(0.001, this.data.volume / 100);
      const requestedDuration = Math.max(
        this.data.sustainEnabled ? 520 : 240,
        Math.round(Number(durationMs) || 0)
      );
      const holdSeconds = requestedDuration / 1000;
      const attackEnd = now + 0.012;
      const decayEnd = now + Math.min(0.16, holdSeconds * 0.5);
      const releaseStart = now + holdSeconds;
      const stopAt = releaseStart + 0.1;
      const sustainLevel = volume * 0.24;

      oscillator.type = 'triangle';
      this.setAudioParam(oscillator.frequency, frequency, now);
      this.setAudioParam(noteGain.gain, 0.0001, now);
      this.rampAudioParam(noteGain.gain, volume * 0.78, attackEnd);
      this.rampAudioParam(noteGain.gain, sustainLevel, decayEnd);
      this.setAudioParam(noteGain.gain, sustainLevel, releaseStart);
      this.rampAudioParam(noteGain.gain, 0.0001, stopAt);

      oscillator.connect(noteGain);
      noteGain.connect(this.webAudioMasterGain || context.destination);
      oscillator.start(now);
      oscillator.stop(stopAt + 0.02);

      const cleanup = () => {
        try {
          oscillator.disconnect();
          noteGain.disconnect();
        } catch (err) {}
      };
      if ('onended' in oscillator) {
        oscillator.onended = cleanup;
      } else {
        setTimeout(cleanup, Math.ceil((stopAt - now + 0.1) * 1000));
      }
      return true;
    } catch (err) {
      console.error('WebAudio 播放失败', err);
      return false;
    }
  },

  ensureDirectory(fs, dir) {
    try {
      fs.accessSync(dir);
    } catch (err) {
      fs.mkdirSync(dir, true);
    }
  },

  ensureToneFile(fs, filePath, frequency) {
    try {
      fs.accessSync(filePath);
    } catch (err) {
      fs.writeFileSync(filePath, createToneBuffer(frequency));
    }
  },

  ensureFallbackNoteFile(note) {
    const frequency = this.noteFrequencies && this.noteFrequencies[note];
    if (!note || !frequency) return false;

    try {
      const fs = wx.getFileSystemManager();
      const dir = `${wx.env.USER_DATA_PATH}/${TONE_CACHE_DIR}`;
      this.ensureDirectory(fs, dir);
      const filePath = `${dir}/${getSafeNoteName(note)}.wav`;
      this.ensureToneFile(fs, filePath, frequency);
      this.noteFiles[note] = filePath;
      return true;
    } catch (err) {
      console.error('准备兼容音频失败', err);
      return false;
    }
  },

  collectAllNotes() {
    const noteMap = {};

    for (let octave = 2; octave <= 7; octave += 1) {
      for (let semitone = 0; semitone < 12; semitone += 1) {
        const note = getNoteName(octave, semitone);
        noteMap[note] = {
          note,
          frequency: getFrequency(octave, semitone)
        };
      }
    }

    return Object.keys(noteMap).map((note) => noteMap[note]);
  },

  createAudioPool(filePath) {
    const pool = [];

    for (let i = 0; i < 2; i += 1) {
      const audio = wx.createInnerAudioContext();
      audio.src = filePath;
      audio.volume = this.data.volume / 100;
      audio.obeyMuteSwitch = false;
      audio.autoplay = false;
      audio.startTime = 0;
      audio.onError((err) => {
        console.error('钢琴音频播放失败', err);
      });
      pool.push(audio);
    }

    return pool;
  },

  destroyAudio() {
    if (this.releaseTimers) {
      Object.keys(this.releaseTimers).forEach((note) => {
        clearTimeout(this.releaseTimers[note]);
      });
    }

    if (this.webAudioContext) {
      try {
        if (this.webAudioContext.close) {
          this.webAudioContext.close();
        }
      } catch (err) {}
      this.webAudioContext = null;
      this.webAudioMasterGain = null;
    }

    if (!this.audioPools) return;

    Object.keys(this.audioPools).forEach((note) => {
      this.audioPools[note].forEach((audio) => {
        audio.destroy();
      });
    });

    this.audioPools = {};
  },

  clearChallengeTimers() {
    if (this.challengeTimers) {
      this.challengeTimers.forEach((timer) => clearTimeout(timer));
    }
    this.challengeTimers = [];
  },

  resetChallengeState(challengeId, message) {
    const challenge = getChallenge(challengeId);
    const challengeNotes = buildChallengeNotes(challengeId, this.data.activeMode);
    const playbackNotes = buildPlaybackNotes(challengeId, this.data.activeMode);
    const isSongMelody = SONG_LIBRARY.some((item) => item.id === challenge.id);
    const nextData = {
      activeChallengeTitle: challenge.title,
      activeChallengeLevel: challenge.level,
      challengeNotes,
      playbackNotes,
      challengeInput: [],
      challengeStep: 0,
      challengeScore: '--',
      challengeMessage: message,
      challengeRevealed: false,
      challengeCombo: 0,
      isChallengePlaying: false,
      challengeDisplay: this.buildChallengeDisplay([], challengeNotes, false)
    };

    if (isSongMelody) {
      nextData.activeSongId = challenge.id;
      nextData.activeSongTitle = challenge.title;
      nextData.activeScoreRows = getScoreRows(challenge);
      nextData.activeScoreNotice = challenge.notice || '当前歌曲已生成简谱提示。';
      nextData.songList = buildSongListView(challenge.id);
    } else {
      nextData.activeChallengeId = challenge.id;
    }

    this.clearChallengeTimers();
    this.setData(nextData, () => {
      this.refreshChallengeProgress(isSongMelody ? this.data.activeChallengeId : challenge.id);
    });
  },

  onModeTap(e) {
    const mode = e.currentTarget.dataset.mode;
    if (!mode || mode === this.data.activeMode) return;

    const keys = buildKeys(mode, this.data.isLandscape || this.data.forceLandscapeLayout);
    const activeId = this.data.activeChallengeId;
    const challengeNotes = buildChallengeNotes(activeId, mode);
    const playbackNotes = buildPlaybackNotes(activeId, mode);
    this.clearChallengeTimers();
    this.setData({
      activeMode: mode,
      activeNotes: {},
      lastNote: '--',
      ...keys,
      challengeNotes,
      playbackNotes,
      challengeInput: [],
      challengeStep: 0,
      challengeScore: '--',
      challengeMessage: '音区已切换，先听一遍',
      challengeRevealed: false,
      challengeCombo: 0,
      isChallengePlaying: false,
      challengeDisplay: this.buildChallengeDisplay([], challengeNotes, false)
    }, () => {
      this.refreshChallengeProgress();
    });
  },

  onSustainChange(e) {
    this.setData({
      sustainEnabled: e.detail.value
    });
  },

  onVolumeChanging(e) {
    this.setVolume(e.detail.value);
  },

  onVolumeChange(e) {
    this.setVolume(e.detail.value);
  },

  setVolume(value) {
    const nextVolume = Number(value);
    this.setData({
      volume: nextVolume
    });

    if (!this.audioPools) return;

    Object.keys(this.audioPools).forEach((note) => {
      this.audioPools[note].forEach((audio) => {
        audio.volume = nextVolume / 100;
      });
    });
  },

  onKeyTouchStart(e) {
    const note = e.currentTarget.dataset.note;
    this.lastKeyTouchAt = Date.now();
    this.lastKeyTouchNote = note;
    this.playNote(note, { record: true });
  },

  onKeyTap(e) {
    const note = e.currentTarget.dataset.note;
    const now = Date.now();
    if (note && this.lastKeyTouchNote === note && now - (this.lastKeyTouchAt || 0) < 260) {
      return;
    }
    this.playNote(note, { record: true });
  },

  onKeyTouchEnd(e) {
    const note = e.currentTarget.dataset.note;
    if (!note || this.data.sustainEnabled) return;

    clearTimeout(this.releaseTimers[note]);
    this.releaseTimers[note] = setTimeout(() => {
      this.releaseNote(note);
    }, 90);
  },

  playChord(e) {
    const chordId = e.currentTarget.dataset.chord;
    const chord = CHORDS.find((item) => item.id === chordId);
    if (!chord) return;

    const mode = getMode(this.data.activeMode);
    chord.semitones.forEach((semitone, index) => {
      const note = getNoteName(mode.baseOctave, semitone);
      setTimeout(() => {
        this.playNote(note, { record: false });
      }, index * 36);
    });
  },

  playNote(note, options = {}) {
    if (!note) return;
    if (!this.audioReady) {
      this.preparePiano().then(() => {
        if (!options.retried) {
          this.playNote(note, {
            ...options,
            retried: true
          });
        }
      }).catch(() => {});
      return;
    }

    if (this.audioBackend === 'webAudio') {
      let played = this.playWebAudioNote(note, options.durationMs);
      if (!played && !options.webAudioRetried && this.prepareWebAudioEngine()) {
        played = this.playWebAudioNote(note, options.durationMs);
      }
      if (played) {
        this.markNoteActive(note, {
          count: options.count !== false,
          durationMs: options.durationMs
        });
        if (options.record !== false && !this.data.isChallengePlaying) {
          this.recordChallengeNote(note);
        }
        return;
      }

      this.audioBackend = 'innerAudioFallback';
      this.setData({
        audioMessage: '兼容音频播放中'
      });
    }

    let pool = this.audioPools && this.audioPools[note];
    if ((!pool || !pool.length) && (!this.noteFiles || !this.noteFiles[note])) {
      this.ensureFallbackNoteFile(note);
    }
    if ((!pool || !pool.length) && this.noteFiles && this.noteFiles[note]) {
      pool = this.createAudioPool(this.noteFiles[note]);
      this.audioPools[note] = pool;
    }
    if (!pool || !pool.length) {
      if (!options.retried) {
        this.preparePiano().then(() => {
          this.playNote(note, {
            ...options,
            retried: true
          });
        }).catch(() => {});
      }
      return;
    }

    const cursor = this.audioCursor[note] || 0;
    const audio = pool[cursor];
    this.audioCursor[note] = (cursor + 1) % pool.length;

    try {
      audio.stop();
    } catch (err) {
      console.warn('停止钢琴音频失败', err);
    }

    audio.startTime = 0;
    audio.volume = this.data.volume / 100;
    try {
      audio.play();
    } catch (err) {
      console.error('钢琴音频播放失败', err);
      if (!options.retried) {
        setTimeout(() => {
          this.playNote(note, {
            ...options,
            retried: true
          });
        }, 80);
      }
      return;
    }
    this.markNoteActive(note, {
      count: options.count !== false,
      durationMs: options.durationMs
    });

    if (options.record !== false && !this.data.isChallengePlaying) {
      this.recordChallengeNote(note);
    }
  },

  markNoteActive(note, options = {}) {
    clearTimeout(this.releaseTimers[note]);

    const nextData = {
      activeNotes: {
        ...this.data.activeNotes,
        [note]: true
      },
      lastNote: note
    };

    if (options.count !== false) {
      nextData.playedCount = this.data.playedCount + 1;
    }

    this.setData(nextData);

    const releaseDelay = Math.max(
      this.data.sustainEnabled ? 620 : 210,
      Math.round(Number(options.durationMs) || 0)
    );
    this.releaseTimers[note] = setTimeout(() => {
      this.releaseNote(note);
    }, releaseDelay);
  },

  releaseNote(note) {
    const activeNotes = {
      ...this.data.activeNotes
    };
    delete activeNotes[note];

    this.setData({
      activeNotes
    });
  },

  selectChallenge(e) {
    const challengeId = e.currentTarget.dataset.challengeId;
    if (!challengeId || challengeId === this.data.activeChallengeId) return;

    this.resetChallengeState(challengeId, '换了一段新旋律，先听一遍');
  },

  playChallenge() {
    if (this.data.isChallengePlaying) return;
    if (!this.audioReady) {
      this.preparePiano().then(() => {
        this.playChallenge();
      }).catch(() => {});
      return;
    }

    const playbackNotes = (this.data.playbackNotes && this.data.playbackNotes.length)
      ? this.data.playbackNotes
      : this.data.challengeNotes;
    const displayNotes = this.data.challengeNotes;
    if (!playbackNotes.length) return;

    this.clearChallengeTimers();
    this.setData({
      challengeInput: [],
      challengeStep: 0,
      challengeScore: '--',
      challengeMessage: '正在播放目标旋律',
      challengeRevealed: false,
      challengeCombo: 0,
      isChallengePlaying: true,
      challengeDisplay: this.buildChallengeDisplay([], displayNotes, false)
    });

    let elapsed = 0;
    playbackNotes.forEach((item) => {
      elapsed += item.delay;
      this.challengeTimers.push(setTimeout(() => {
        if (!item.rest) {
          this.playNote(item.note, {
            record: false,
            count: false,
            durationMs: item.durationMs
          });
        }
      }, elapsed));
    });

    const tailDuration = playbackNotes.length
      ? Math.max(220, Math.round(Number(playbackNotes[playbackNotes.length - 1].durationMs) || 0))
      : 220;
    this.challengeTimers.push(setTimeout(() => {
      this.setData({
        isChallengePlaying: false,
        challengeMessage: '轮到你了，照着刚才的顺序弹'
      });
    }, elapsed + tailDuration + 160));
  },

  resetChallenge() {
    const notes = this.data.challengeNotes;
    this.clearChallengeTimers();
    this.setData({
      challengeInput: [],
      challengeStep: 0,
      challengeScore: '--',
      challengeMessage: '已清空，可以重新听或直接弹',
      challengeRevealed: false,
      challengeCombo: 0,
      isChallengePlaying: false,
      challengeDisplay: this.buildChallengeDisplay([], notes, false)
    });
  },

  revealChallenge() {
    this.setData({
      challengeRevealed: true,
      challengeDisplay: this.buildChallengeDisplay(this.data.challengeInput, this.data.challengeNotes, true)
    });
  },

  randomChallenge() {
    const candidates = MELODY_CHALLENGES
      .filter((item) => item.id !== this.data.activeChallengeId);
    const next = candidates[Math.floor(Math.random() * candidates.length)] || MELODY_CHALLENGES[0];
    this.resetChallengeState(next.id, '随机到一段新旋律');
  },

  nextChallenge() {
    const currentIndex = MELODY_CHALLENGES.findIndex((item) => item.id === this.data.activeChallengeId);
    const next = MELODY_CHALLENGES[(currentIndex + 1 + MELODY_CHALLENGES.length) % MELODY_CHALLENGES.length];
    this.resetChallengeState(next.id, '下一题已准备好');
  },

  handleChallengeCompleted(score, correctCount, totalCount) {
    const challenge = getChallenge(this.data.activeChallengeId);
    const passed = score >= 80;
    const completedSet = new Set(this.data.completedChallengeIds);
    const bestScores = {
      ...this.data.bestScores,
      [challenge.id]: Math.max(Number(this.data.bestScores[challenge.id]) || 0, score)
    };
    const unlockedCount = MELODY_CHALLENGES.length;

    if (passed) {
      completedSet.add(challenge.id);
    }

    const dailyReward = passed ? this.completeDailyChallenge(challenge.id, score) : null;
    const leaderboard = [{
      id: `rank-${Date.now()}`,
      challengeId: challenge.id,
      title: challenge.title,
      score,
      correctText: `${correctCount}/${totalCount}`,
      createdAt: this.getRankTimeText()
    }]
      .concat(this.data.leaderboard || [])
      .sort((a, b) => b.score - a.score)
      .slice(0, 30);

    const completedIds = Array.from(completedSet);
    const progress = {
      unlockedCount,
      completedIds,
      bestScores,
      leaderboard
    };
    this.persistChallengeProgress(progress);

    this.setData({
      unlockedCount,
      completedChallengeIds: completedIds,
      bestScores,
      leaderboard,
      filteredLeaderboard: this.getFilteredLeaderboard(leaderboard, this.data.rankFilterChallengeId),
      bestScore: Math.max(0, ...Object.keys(bestScores).map((key) => Number(bestScores[key]) || 0)),
      perfectCount: Object.keys(bestScores).filter((key) => Number(bestScores[key]) >= 100).length,
      passAnimationVisible: passed,
      passAnimationTitle: passed ? (score === 100 ? '满分通关' : '通关成功') : '',
      passAnimationSubtitle: passed
        ? (dailyReward || `本关最佳 ${bestScores[challenge.id]}`)
        : ''
    }, () => {
      this.refreshChallengeProgress();
    });

    if (passed) {
      wx.vibrateShort({ type: 'medium' });
    }
  },

  getRankTimeText() {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hour = String(now.getHours()).padStart(2, '0');
    const minute = String(now.getMinutes()).padStart(2, '0');
    return `${month}-${day} ${hour}:${minute}`;
  },

  recordChallengeNote(note) {
    const notes = this.data.challengeNotes;
    if (!notes.length || this.data.isChallengePlaying) return;

    if (this.data.challengeInput.length >= notes.length) {
      wx.showToast({
        title: '先重置挑战',
        icon: 'none'
      });
      return;
    }

    const step = this.data.challengeInput.length;
    const expected = notes[step];
    const correct = expected && expected.note === note;
    const challengeInput = this.data.challengeInput.concat([{
      note,
      correct
    }]);
    const completed = challengeInput.length === notes.length;
    const correctCount = challengeInput.filter((item) => item.correct).length;
    const score = completed ? Math.round((correctCount / notes.length) * 100) : this.data.challengeScore;
    const combo = correct ? this.data.challengeCombo + 1 : 0;
    const bestScore = completed ? Math.max(this.data.bestScore, score) : this.data.bestScore;
    const perfectCount = completed && score === 100 ? this.data.perfectCount + 1 : this.data.perfectCount;
    const message = completed
      ? (score === 100 ? '满分复刻！可以换一道更难的。' : `完成了，正确 ${correctCount}/${notes.length}`)
      : (correct ? `对，连对 ${combo}` : `偏了，目标是 ${expected.note}`);

    this.setData({
      challengeInput,
      challengeStep: challengeInput.length,
      challengeScore: completed ? score : this.data.challengeScore,
      challengeMessage: message,
      challengeCombo: combo,
      bestScore,
      perfectCount,
      challengeDisplay: this.buildChallengeDisplay(challengeInput, notes, this.data.challengeRevealed)
    }, () => {
      if (completed) {
        this.handleChallengeCompleted(score, correctCount, notes.length);
      }
    });
  },

  buildChallengeDisplay(input, notes, revealed) {
    return notes.map((item, index) => {
      const answer = input[index];
      if (answer) {
        return {
          id: item.id,
          text: answer.note,
          state: answer.correct ? 'hit' : 'miss'
        };
      }

      return {
        id: item.id,
        text: revealed ? item.note : String(index + 1),
        state: index === input.length ? 'current' : 'pending'
      };
    });
  }
});
