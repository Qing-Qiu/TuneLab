Component({
  data: {
    currentTab: 0,
    value: 'pages/amusement/amusement',
    list: [
      {
        value: 'pages/amusement/amusement',
        label: '音乐',
        image: '/images/icons/music.png'
      },
      {
        value: 'pages/user/user',
        label: '我的',
        image: '/images/icons/user.png'
      }
    ]
  },

  methods: {
    onTap(e) {
      const path = e.currentTarget.dataset.path;
      if (!path || path === this.data.value) return;

      this.setData({
        value: path
      });

      wx.switchTab({
        url: '/' + path
      });
    }
  }
});
