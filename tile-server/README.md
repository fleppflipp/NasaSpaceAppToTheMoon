# Tile server

A plain nginx container that serves the fire PMTiles files from `data/` with HTTP
range requests and CORS for any origin. No code, no database.

## Run

Needs Docker (Docker Desktop must be running).

```sh
cd tile-server
docker compose up -d     # start (port 8080, restarts with Docker)
docker compose logs -f   # see requests
docker compose down      # stop
```

Put the `fires_<year>_<MM>.pmtiles` files into `tile-server/data/` (the build
script `tiles/build_fire_tiles.py --out tile-server/data` writes them there). The
folder is git-ignored. Other settings (environment variables): `TILE_PORT`
(default 8080) and `TILE_DATA_DIR` (default `./data`).

Put `fire_pixels_<year>.csv` (all countries, the file the tiles are built from)
in the same folder: the fire cause service (`cause-service/`, setting
`FIRE_DATA_URL`) downloads it here, so the panel shows the same fires as the map.

## Use from the app

The app reads `VITE_TILE_BASE_URL` (default `http://localhost:8080/tiles`; see
`space-app/.env.example`). A teammate on the same network:

1. You find your address with `ipconfig` (for example `192.168.1.20`) and allow
   TCP port 8080 for private networks in the Windows firewall.
2. They write `VITE_TILE_BASE_URL=http://192.168.1.20:8080/tiles` into
   `space-app/.env.local` and start `npm run dev` as usual.

## Check it

```sh
curl http://localhost:8080/health
curl -sI -H "Range: bytes=0-16383" http://localhost:8080/tiles/fires_2012_07.pmtiles
```

The second one must answer `206 Partial Content` with `Content-Range`,
`Accept-Ranges: bytes` and `Access-Control-Allow-Origin: *`. `http://localhost:8080/tiles/`
lists the files as JSON: the app reads this list to know which months exist.

## Notes

- Files are never compressed by nginx (`gzip off`): a PMTiles client addresses bytes
  inside the file.
- CORS is open to everybody, which is fine for public fire data on a local network;
  restrict `Access-Control-Allow-Origin` in `nginx.conf` before exposing it publicly.
