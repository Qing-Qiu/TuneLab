# TuneLab

TuneLab is a WeChat Mini Program for playful music experiments. It combines a compact music home page, synchronized listening rooms, location-based song notes, melody replay challenges, shake-to-open surprises, and Schulte grid focus training.

## Features

- Music home page with search, playback, lyrics, playlist-style entry points, and built-in player interactions.
- Together listening room: create a room, invite friends, choose songs inside the room, sync play/pause/progress, react with quick messages, and close the room when finished.
- Moment song notes: users can choose a location, attach one song and one sentence, then make it visible to everyone.
- Melody replay challenge: piano keyboard, guided melodies, auto-play demos, and landscape piano layout.
- Shake surprise box: shake the phone to reveal a random song, fact, or playful prompt.
- Schulte grid: 4x4, 5x5, and 6x6 training modes with personal and global leaderboard support.

## Project Structure

```text
miniprogram/                  Mini Program pages, components, styles, and assets
cloudfunctions/               WeChat Cloud Functions
cloudfunctions/*/package.json Function-level dependencies
docs/                         Deployment notes and operational checklists
project.config.json           WeChat DevTools project config
package.json                  Root package metadata and Mini Program dependency
```

Ignored generated or local-only files include `node_modules/`, function-level `node_modules/`, `miniprogram_npm/`, and `project.private.config.json`.

## Cloud Functions

The app currently uses these cloud functions:

- `songs-functions`: song search.
- `music-functions`: playable song URL lookup.
- `lyric-functions`: lyrics lookup.
- `game-functions`: game/challenge support.
- `listen-room-functions`: together listening room state, sync, reactions, room closing.
- `place-song-functions`: location song notes and likes.
- `schulte-functions`: Schulte grid records and leaderboard.
- `file-functions`: file/spreadsheet helper retained from the original project.

See [Cloud Deployment](docs/CLOUD_DEPLOYMENT.md) before testing cloud-backed features.

## Local Setup

1. Open this directory in WeChat DevTools.
2. Install Mini Program dependencies from WeChat DevTools if `miniprogram_npm/` is missing.
3. For each cloud function that you need to test, install its dependencies in that function folder.
4. Upload and deploy the required cloud functions from WeChat DevTools.
5. Create or verify required database collections and permissions.

## Development Notes

- The GitHub branch `main` is the clean development branch.
- Do not commit generated dependency folders.
- After changing a cloud function, redeploy that function before testing in the Mini Program.
- Some cloud functions use `db.createCollection` as a convenience fallback; if you want manual-only database setup, remove the collection auto-create call and create collections in the cloud console.
