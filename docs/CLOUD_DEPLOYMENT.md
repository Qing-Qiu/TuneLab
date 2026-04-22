# Cloud Deployment

This checklist keeps cloud-backed TuneLab features testable after code changes.

## Before Deploying

1. Confirm the active WeChat cloud environment in WeChat DevTools.
2. Keep `project.private.config.json` local; it is intentionally ignored by Git.
3. Do not upload or commit `node_modules/` folders directly.
4. For every changed cloud function, run dependency install inside that function folder if dependencies are missing.

## Required Database Collections

Create or verify these collections in the WeChat Cloud database:

| Collection | Used By | Notes |
| --- | --- | --- |
| `listen_rooms` | `listen-room-functions` | Room state, members, playback sync, reactions, close state. The function currently attempts to create it automatically on room creation. |
| `place_songs` | `place-song-functions` | One public song note per user-created location point, with owner deletion and likes. |
| `schulte_records` | `schulte-functions` | Schulte personal and global ranking records. |

Recommended permission stance for these collections: keep direct client writes closed and access them through cloud functions.

## Function Checklist

Deploy these functions when the related feature changes:

| Function | Deploy When | Smoke Test |
| --- | --- | --- |
| `songs-functions` | Search API or request throttling changes | Search for a song from the Mini Program. |
| `music-functions` | Playback URL handling changes | Start one song and verify audio begins. |
| `lyric-functions` | Lyric parsing or provider changes | Open lyrics and verify synced lines load. |
| `listen-room-functions` | Together listening, room closing, sync, reactions | Create a room, choose a song, drag progress, close the room. |
| `place-song-functions` | Location song note publishing, likes, deletion | Publish a note, like it from another account, delete it as owner. |
| `schulte-functions` | Schulte record submission or leaderboard changes | Finish a grid and open the leaderboard. |
| `game-functions` | Melody challenge or game backend changes | Complete one challenge flow. |
| `file-functions` | File helper changes | Run the feature that depends on uploaded file parsing. |

## Together Listening Notes

`listen-room-functions` is stateful. After deployment, verify:

1. Creating a room creates or writes `listen_rooms`.
2. Host song selection writes `playback.song`.
3. Play/pause and progress dragging update `playback.currentTime`, `playback.updatedAtMs`, and `playback.version`.
4. Members follow the host after polling.
5. Closing a room sets `state` to `closed`, pauses playback, marks members offline, and prevents new joins.

## Common Pitfalls

- If the Mini Program says a function is missing, upload and deploy that function from WeChat DevTools.
- If a room can be created but playback sync fails, redeploy `listen-room-functions`.
- If leaderboard or likes fail, check database permissions first, then redeploy the related function.
- If search or playback calls become unstable, check provider rate limits and keep client-side throttling enabled.
