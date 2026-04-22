# listen-room-functions

一起听房间的云函数原型，集合名为 `listen_rooms`。

## Actions

- `createRoom`: 创建房间，参数 `{ userInfo, song, title }`
- `joinRoom`: 加入房间，参数 `{ roomId, userInfo }`
- `getRoom`: 读取房间，参数 `{ roomId }`
- `updatePlayback`: 房主同步播放状态，参数 `{ roomId, playback }`
- `sendReaction`: 发送表情或快捷语，参数 `{ roomId, type, text }`
- `heartbeat`: 更新在线状态，参数 `{ roomId, userInfo }`
- `leaveRoom`: 离开房间，参数 `{ roomId }`
- `closeRoom`: 关闭房间，参数 `{ roomId }`

`playback.updatedAtMs` 是客户端做进度校准的基准时间。客户端收到房间状态后，可以用：

```js
const drift = (Date.now() - playback.updatedAtMs) / 1000
const targetTime = playback.isPlaying ? playback.currentTime + drift : playback.currentTime
```

后续接 UI 时，用数据库 `watch` 监听 `listen_rooms` 里的单个房间即可。
