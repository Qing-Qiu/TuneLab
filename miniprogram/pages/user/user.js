Page({
  data: {
    labs: [
      {
        title: '此刻留声',
        desc: '在真实位置公开留一首歌和一句话。',
        icon: 'map-route-planning',
        accent: 'teal',
        url: '/pages/lab-nearby/lab-nearby'
      },
      {
        title: '一起听',
        desc: '创建房间，同步和好友听同一首歌。',
        icon: 'sound',
        accent: 'teal',
        url: '/pages/lab-listen-room/lab-listen-room'
      },
      {
        title: '旋律复刻',
        desc: '听一段旋律，再用琴键复现。',
        icon: 'piano',
        accent: 'warm',
        url: '/pages/lab-piano/lab-piano'
      },
      {
        title: '舒尔特方格',
        desc: '按顺序找数字，训练专注。',
        icon: 'grid-view',
        accent: 'yellow',
        url: '/pages/lab-schulte/lab-schulte'
      },
      {
        title: '摇一摇盲盒',
        desc: '摇出歌、灵感和小惊喜。',
        icon: 'sound',
        accent: 'red',
        url: '/pages/lab-shake/lab-shake'
      }
    ]
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({
        value: 'pages/user/user'
      });
    }
  },

  openLab(e) {
    const url = e.currentTarget.dataset.url;
    if (!url) return;

    wx.navigateTo({ url });
  }
});
