"""
pmtiles_points.py - read and write PMTiles v3 files of fire POINTS (Mapbox Vector Tiles inside),
in pure Python + numpy (no tippecanoe, no extra packages).

  read_points(path)   every point of one layer at one zoom, each point once (points in a tile's
                      buffer zone, which tippecanoe copies into the neighbour tile, are skipped)
  write_points(...)   zoom 0..max_zoom, one layer, integer/float properties; below max_zoom a tile
                      keeps at most `max_low_zoom` points (the strongest by one property), like
                      tippecanoe's --drop-densest-as-needed; at max_zoom every point is kept.

Format references: https://github.com/protomaps/PMTiles/blob/main/spec/v3/spec.md and
https://github.com/mapbox/vector-tile-spec/tree/master/2.1
"""
import gzip
import json
import math
import struct
from pathlib import Path

import numpy as np

EXTENT = 4096
HEADER_LEN = 127
ROOT_MAX = 16384 - HEADER_LEN  # the header and the root directory must fit in the first 16 KiB
MAX_LAT = 85.05112878  # web mercator limit


# ----------------------------------------------------------------------------- tile ids
def zoom_base(z: int) -> int:
    """Number of tiles of all zooms below z: the first tile id of zoom z."""
    return ((1 << (2 * z)) - 1) // 3


def zxy_to_id(z: int, x: int, y: int) -> int:
    """PMTiles tile id: tiles of lower zooms first, then the Hilbert curve index at zoom z."""
    d = 0
    s = (1 << z) >> 1
    while s > 0:
        rx = 1 if x & s else 0
        ry = 1 if y & s else 0
        d += s * s * ((3 * rx) ^ ry)
        x &= s - 1
        y &= s - 1
        if ry == 0:
            if rx == 1:
                x, y = s - 1 - x, s - 1 - y
            x, y = y, x
        s >>= 1
    return zoom_base(z) + d


def id_to_zxy(tid: int) -> tuple[int, int, int]:
    z = 0
    while zoom_base(z + 1) <= tid:
        z += 1
    d = tid - zoom_base(z)
    x = y = 0
    s = 1
    while s < (1 << z):
        rx = 1 & (d // 2)
        ry = 1 & (d ^ rx)
        if ry == 0:
            if rx == 1:
                x, y = s - 1 - x, s - 1 - y
            x, y = y, x
        x += s * rx
        y += s * ry
        d //= 4
        s *= 2
    return z, x, y


# ----------------------------------------------------------------------------- varints / protobuf
def read_varint(buf, pos):
    result = shift = 0
    while True:
        b = buf[pos]
        pos += 1
        result |= (b & 0x7F) << shift
        if b < 0x80:
            return result, pos
        shift += 7


def write_varint(out: bytearray, v: int) -> None:
    while v >= 0x80:
        out.append((v & 0x7F) | 0x80)
        v >>= 7
    out.append(v)


def write_bytes_field(out: bytearray, field: int, data: bytes) -> None:
    write_varint(out, (field << 3) | 2)
    write_varint(out, len(data))
    out += data


def fields(buf, start=0, end=None):
    """(field number, wire type, value) of a protobuf message; length-delimited values are (a, b)."""
    pos, end = start, len(buf) if end is None else end
    while pos < end:
        key, pos = read_varint(buf, pos)
        num, wt = key >> 3, key & 7
        if wt == 0:
            v, pos = read_varint(buf, pos)
            yield num, wt, v
        elif wt == 2:
            ln, pos = read_varint(buf, pos)
            yield num, wt, (pos, pos + ln)
            pos += ln
        elif wt == 5:
            yield num, wt, buf[pos:pos + 4]
            pos += 4
        elif wt == 1:
            yield num, wt, buf[pos:pos + 8]
            pos += 8
        else:
            raise ValueError(f"protobuf wire type {wt} not supported")


def decode_value(buf, a, b):
    for num, _, v in fields(buf, a, b):
        if num == 1:
            return buf[v[0]:v[1]].decode()
        if num == 2:
            return struct.unpack("<f", v)[0]
        if num == 3:
            return struct.unpack("<d", v)[0]
        if num in (4, 5):
            return v
        if num == 6:
            return (v >> 1) ^ -(v & 1)
        if num == 7:
            return bool(v)
    return None


# ----------------------------------------------------------------------------- reading
def _decompress(data: bytes, kind: int) -> bytes:
    if kind in (0, 1):
        return data
    if kind == 2:
        return gzip.decompress(data)
    raise ValueError(f"PMTiles compression {kind} not supported")


def read_header(f) -> dict:
    f.seek(0)
    h = f.read(HEADER_LEN)
    if h[:7] != b"PMTiles" or h[7] != 3:
        raise ValueError("not a PMTiles v3 file")
    keys = ["root_off", "root_len", "meta_off", "meta_len", "leaf_off", "leaf_len", "data_off",
            "data_len", "n_addressed", "n_entries", "n_contents"]
    hd = dict(zip(keys, struct.unpack_from("<11Q", h, 8)))
    hd.update(internal_comp=h[97], tile_comp=h[98], tile_type=h[99], min_zoom=h[100], max_zoom=h[101])
    return hd


def parse_directory(buf: bytes) -> list[tuple[int, int, int, int]]:
    """Entries (tile id, run length, offset, length) of one decompressed directory."""
    n, pos = read_varint(buf, 0)
    ids, runs, lens, offs = [], [], [], []
    last = 0
    for _ in range(n):
        d, pos = read_varint(buf, pos)
        last += d
        ids.append(last)
    for _ in range(n):
        v, pos = read_varint(buf, pos)
        runs.append(v)
    for _ in range(n):
        v, pos = read_varint(buf, pos)
        lens.append(v)
    for i in range(n):
        v, pos = read_varint(buf, pos)
        offs.append(offs[i - 1] + lens[i - 1] if v == 0 and i > 0 else v - 1)
    return list(zip(ids, runs, offs, lens))


def _tiles_at_zoom(f, hd, zoom):
    lo, hi = zoom_base(zoom), zoom_base(zoom + 1)

    def walk(off, length):
        f.seek(off)
        for tid, run, o, ln in parse_directory(_decompress(f.read(length), hd["internal_comp"])):
            if run == 0:  # a leaf directory
                if tid < hi:
                    yield from walk(hd["leaf_off"] + o, ln)
                continue
            for k in range(run):
                if lo <= tid + k < hi:
                    f.seek(hd["data_off"] + o)
                    _, x, y = id_to_zxy(tid + k)
                    yield x, y, _decompress(f.read(ln), hd["tile_comp"])

    yield from walk(hd["root_off"], hd["root_len"])


def _layer_points(tile: bytes, layer: str):
    for num, _, (a, b) in ((n, w, v) for n, w, v in fields(tile) if n == 3):
        name, feats, keys, vals, extent = None, [], [], [], EXTENT
        for n, _, v in fields(tile, a, b):
            if n == 1:
                name = tile[v[0]:v[1]].decode()
            elif n == 2:
                feats.append(v)
            elif n == 3:
                keys.append(tile[v[0]:v[1]].decode())
            elif n == 4:
                vals.append(decode_value(tile, *v))
            elif n == 5:
                extent = v
        if name != layer:
            continue
        for fa, fb in feats:
            tags, geom, gtype = [], [], 0
            for n, _, v in fields(tile, fa, fb):
                if n == 2:
                    pos, out = v[0], []
                    while pos < v[1]:
                        t, pos = read_varint(tile, pos)
                        out.append(t)
                    tags = out
                elif n == 3:
                    gtype = v
                elif n == 4:
                    pos, out = v[0], []
                    while pos < v[1]:
                        t, pos = read_varint(tile, pos)
                        out.append(t)
                    geom = out
            if gtype != 1:
                continue
            props = {keys[tags[i]]: vals[tags[i + 1]] for i in range(0, len(tags), 2)}
            x = y = i = 0
            while i < len(geom):
                count = geom[i] >> 3
                i += 1
                for _ in range(count):
                    dx, dy = geom[i], geom[i + 1]
                    i += 2
                    x += (dx >> 1) ^ -(dx & 1)
                    y += (dy >> 1) ^ -(dy & 1)
                    yield x, y, extent, props


def read_points(path: Path, zoom: int, layer: str, names: list[str]) -> dict[str, np.ndarray]:
    """Every point of `layer` at `zoom`: arrays lon, lat and one per property name (missing = NaN)."""
    lon, lat = [], []
    cols = {n: [] for n in names}
    n_tiles = 1 << zoom
    with open(path, "rb") as f:
        hd = read_header(f)
        for x, y, tile in _tiles_at_zoom(f, hd, zoom):
            for px, py, ext, props in _layer_points(tile, layer):
                if not (0 <= px < ext and 0 <= py < ext):
                    continue  # buffer zone: the same point is also in the neighbour tile
                lon.append((x + px / ext) / n_tiles * 360.0 - 180.0)
                lat.append(math.degrees(math.atan(math.sinh(math.pi * (1 - 2 * (y + py / ext) / n_tiles)))))
                for n in names:
                    v = props.get(n)
                    cols[n].append(float("nan") if v is None else v)
    out = {"lon": np.asarray(lon, dtype=np.float64), "lat": np.asarray(lat, dtype=np.float64)}
    out.update({n: np.asarray(v, dtype=np.float64) for n, v in cols.items()})
    return out


# ----------------------------------------------------------------------------- writing
def _varints(values: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    """Protobuf varints of non-negative integers, vectorized: (all bytes, bytes per value)."""
    v = values.astype(np.uint64).ravel()
    lengths = np.ones(len(v), dtype=np.int64)
    for k in range(1, 10):
        lengths += v >= np.uint64(1 << (7 * k))
    starts = np.cumsum(lengths) - lengths
    out = np.empty(int(lengths.sum()), dtype=np.uint8)
    for k in range(int(lengths.max(initial=1))):
        has = lengths > k
        byte = (v[has] >> np.uint64(7 * k)) & np.uint64(0x7F)
        more = (lengths[has] > k + 1).astype(np.uint64) << np.uint64(7)
        out[starts[has] + k] = (byte | more).astype(np.uint8)
    return out, lengths


def _place(out: np.ndarray, dest: np.ndarray, data: np.ndarray, lengths: np.ndarray) -> None:
    """Copies consecutive blocks of `data` (block i has lengths[i] bytes) to out[dest[i]:]."""
    if len(data) == 0:
        return
    block_start = np.cumsum(lengths) - lengths
    out[np.repeat(dest - block_start, lengths) + np.arange(len(data))] = data


def _concat_records(parts: list[tuple[np.ndarray, np.ndarray]]) -> tuple[np.ndarray, np.ndarray]:
    """Record i = parts[0] block i + parts[1] block i + ...; each part is (bytes, lengths per record).
    Returns (all records, record lengths)."""
    total = sum(lengths for _, lengths in parts)
    starts = np.cumsum(total) - total
    out = np.empty(int(total.sum()), dtype=np.uint8)
    offset = np.zeros(len(total), dtype=np.int64)
    for data, lengths in parts:
        _place(out, starts + offset, data, lengths)
        offset += lengths
    return out, total


def _const(byte_values: list[int], n: int) -> tuple[np.ndarray, np.ndarray]:
    """The same few bytes for each of n records."""
    return (np.tile(np.asarray(byte_values, dtype=np.uint8), n),
            np.full(n, len(byte_values), dtype=np.int64))


def _field(field: int, body: tuple[np.ndarray, np.ndarray]) -> list[tuple[np.ndarray, np.ndarray]]:
    """Length-delimited protobuf field around each record of `body`."""
    data, lengths = body
    n = len(lengths)
    return [_const([(field << 3) | 2], n), _varints(lengths), (data, lengths)]


def _block_ranges(lengths: np.ndarray, group_starts: np.ndarray) -> np.ndarray:
    """Byte offsets where each group of consecutive records starts (plus the end)."""
    ends = np.r_[0, np.cumsum(lengths)]
    return ends[np.r_[group_starts, len(lengths)]]


def _encode_zoom(layer: str, tile_of: np.ndarray, tile_starts: np.ndarray, px: np.ndarray,
                 py: np.ndarray, props: dict[str, np.ndarray]) -> list[bytes]:
    """Every tile of one zoom level, built with numpy for all points at once. Points are sorted by
    tile; tile_of[i] is the tile number (0..T-1) of point i, tile_starts its first point."""
    n, n_tiles = len(px), len(tile_starts)
    keys = list(props)
    # Value table of a tile: the distinct values of each property in that tile, property after
    # property. A (tile, value) pair is one table entry; a point's tag points at its pair.
    tag_cols, value_blobs = [], []
    col_offset = np.zeros(n_tiles, dtype=np.int64)  # table entries of earlier properties, per tile
    for col in props.values():
        order = np.lexsort((col, tile_of))
        t_sorted, v_sorted = tile_of[order], col[order]
        new_pair = np.r_[True, (t_sorted[1:] != t_sorted[:-1]) | (v_sorted[1:] != v_sorted[:-1])]
        pair_id = np.cumsum(new_pair) - 1
        pair_tile = t_sorted[new_pair]
        pair_value = v_sorted[new_pair]
        first_pair = np.searchsorted(pair_tile, np.arange(n_tiles))
        within = np.empty(n, dtype=np.int64)
        within[order] = pair_id - first_pair[t_sorted]
        tag_cols.append(within + col_offset[tile_of])
        col_offset += np.diff(np.r_[first_pair, len(pair_tile)])
        m = len(pair_value)
        if col.dtype.kind in "iu":
            if (pair_value < 0).any():
                raise ValueError("negative integer properties are not supported")
            body = _concat_records([_const([(5 << 3) | 0], m), _varints(pair_value)])  # uint_value
        else:
            doubles = pair_value.astype("<f8").view(np.uint8)
            body = _concat_records([_const([(3 << 3) | 1], m), (doubles, np.full(m, 8, dtype=np.int64))])
        data, lengths = _concat_records(_field(4, body))
        value_blobs.append((data, _block_ranges(lengths, first_pair)))
    # features: tags (key index, value index, ...), type POINT, geometry (MoveTo 1, x, y)
    tags = np.empty((n, 2 * len(keys)), dtype=np.int64)
    for k, col in enumerate(tag_cols):
        tags[:, 2 * k] = k
        tags[:, 2 * k + 1] = col
    tag_bytes, tag_len = _varints(tags)
    tag_len = tag_len.reshape(n, -1).sum(axis=1)
    zz = lambda a: (a.astype(np.int64) << 1) ^ (a.astype(np.int64) >> 63)  # noqa: E731
    geom = np.stack([np.full(n, (1 << 3) | 1, dtype=np.int64), zz(px), zz(py)], axis=1)
    geom_bytes, geom_len = _varints(geom)
    geom_len = geom_len.reshape(n, -1).sum(axis=1)
    feature = _concat_records(_field(2, (tag_bytes, tag_len)) + [_const([(3 << 3) | 0, 1], n)]
                              + _field(4, (geom_bytes, geom_len)))
    feat_data, feat_len = _concat_records(_field(2, feature))
    feat_ranges = _block_ranges(feat_len, tile_starts)

    head = bytearray()
    write_varint(head, (15 << 3) | 0)
    write_varint(head, 2)  # version
    write_bytes_field(head, 1, layer.encode())
    key_bytes = bytearray()
    for k in keys:
        write_bytes_field(key_bytes, 3, k.encode())
    tail = bytearray()
    write_varint(tail, (5 << 3) | 0)
    write_varint(tail, EXTENT)
    feat_raw = feat_data.tobytes()
    value_raw = [(data.tobytes(), ranges) for data, ranges in value_blobs]
    tiles = []
    for t in range(n_tiles):
        layer_buf = bytearray(head)
        layer_buf += feat_raw[feat_ranges[t]:feat_ranges[t + 1]]
        layer_buf += key_bytes
        for raw, ranges in value_raw:
            layer_buf += raw[ranges[t]:ranges[t + 1]]
        layer_buf += tail
        tile = bytearray()
        write_bytes_field(tile, 3, bytes(layer_buf))
        tiles.append(bytes(tile))
    return tiles


def _serialize_directory(entries: list[tuple[int, int, int, int]]) -> bytes:
    """entries (tile id, offset, length, run length), sorted by tile id -> compressed directory."""
    out = bytearray()
    write_varint(out, len(entries))
    last = 0
    for tid, _, _, _ in entries:
        write_varint(out, tid - last)
        last = tid
    for _, _, _, run in entries:
        write_varint(out, run)
    for _, _, length, _ in entries:
        write_varint(out, length)
    for i, (_, off, _, _) in enumerate(entries):
        prev = entries[i - 1] if i > 0 else None
        if prev is not None and off == prev[1] + prev[2]:
            write_varint(out, 0)
        else:
            write_varint(out, off + 1)
    return gzip.compress(bytes(out), mtime=0)


def _build_directories(entries):
    """Root directory, and leaf directories when the root alone would be too big."""
    root = _serialize_directory(entries)
    if len(root) <= ROOT_MAX:
        return root, b""
    leaf_size = 4096
    while True:
        leaves, root_entries = bytearray(), []
        for i in range(0, len(entries), leaf_size):
            chunk = entries[i:i + leaf_size]
            leaf = _serialize_directory(chunk)
            root_entries.append((chunk[0][0], len(leaves), len(leaf), 0))
            leaves += leaf
        root = _serialize_directory(root_entries)
        if len(root) <= ROOT_MAX:
            return root, bytes(leaves)
        leaf_size *= 2


def write_points(path: Path, lon: np.ndarray, lat: np.ndarray, props: dict[str, np.ndarray], *,
                 layer: str, max_zoom: int, max_low_zoom: int, rank: str, name: str,
                 description: str = "") -> int:
    """Writes the points as a PMTiles file (zoom 0..max_zoom). Below max_zoom a tile keeps at most
    `max_low_zoom` points, the ones with the largest `rank` property. Returns the number of tiles."""
    lat = np.clip(lat, -MAX_LAT, MAX_LAT)
    mx = (lon + 180.0) / 360.0
    my = (1.0 - np.log(np.tan(np.radians(lat)) + 1.0 / np.cos(np.radians(lat))) / math.pi) / 2.0
    mx, my = np.clip(mx, 0.0, 1.0 - 1e-12), np.clip(my, 0.0, 1.0 - 1e-12)
    order_rank = np.argsort(-props[rank], kind="stable")  # strongest first
    mx, my = mx[order_rank], my[order_rank]
    props_ranked = {p: col[order_rank] for p, col in props.items()}

    tiles: list[tuple[int, bytes]] = []
    for z in range(max_zoom + 1):
        n = 1 << z
        gx, gy = mx * n, my * n
        tx, ty = gx.astype(np.int64), gy.astype(np.int64)
        px = np.minimum(((gx - tx) * EXTENT).astype(np.int64), EXTENT - 1)
        py = np.minimum(((gy - ty) * EXTENT).astype(np.int64), EXTENT - 1)
        key = tx * n + ty
        grouping = np.argsort(key, kind="stable")  # keeps "strongest first" inside a tile
        key_sorted = key[grouping]
        new_tile = np.r_[True, key_sorted[1:] != key_sorted[:-1]]
        tile_index = np.cumsum(new_tile) - 1
        if z < max_zoom:  # a low-zoom tile keeps only its strongest points
            first = np.flatnonzero(new_tile)
            keep = np.arange(len(grouping)) - first[tile_index] < max_low_zoom
            grouping, key_sorted, tile_index = grouping[keep], key_sorted[keep], tile_index[keep]
        tile_starts = np.flatnonzero(np.r_[True, key_sorted[1:] != key_sorted[:-1]])
        encoded = _encode_zoom(layer, tile_index, tile_starts, px[grouping], py[grouping],
                               {p: col[grouping] for p, col in props_ranked.items()})
        for k, raw in zip(key_sorted[tile_starts].tolist(), encoded):
            data = gzip.compress(raw, compresslevel=6, mtime=0)
            tiles.append((zxy_to_id(z, k // n, k % n), data))

    tiles.sort(key=lambda t: t[0])
    entries, offset = [], 0
    for tid, data in tiles:
        entries.append((tid, offset, len(data), 1))
        offset += len(data)
    root, leaves = _build_directories(entries)
    fields_meta = {p: "Number" for p in props}
    meta = gzip.compress(json.dumps({
        "name": name, "description": description, "format": "pbf", "type": "overlay", "version": "2",
        "vector_layers": [{"id": layer, "description": "", "minzoom": 0, "maxzoom": max_zoom,
                           "fields": fields_meta}],
    }, separators=(",", ":")).encode(), mtime=0)

    root_off = HEADER_LEN
    meta_off = root_off + len(root)
    leaf_off = meta_off + len(meta)
    data_off = leaf_off + len(leaves)
    e7 = lambda v: int(round(v * 1e7))  # noqa: E731
    bounds = (float(lon.min()), float(lat.min()), float(lon.max()), float(lat.max())) if len(lon) \
        else (-180.0, -MAX_LAT, 180.0, MAX_LAT)
    header = b"PMTiles" + bytes([3]) + struct.pack(
        "<11Q", root_off, len(root), meta_off, len(meta), leaf_off, len(leaves), data_off, offset,
        len(tiles), len(tiles), len(tiles))
    header += bytes([1, 2, 2, 1, 0, max_zoom])  # clustered, gzip dirs, gzip tiles, MVT, zooms
    header += struct.pack("<4i", e7(bounds[0]), e7(bounds[1]), e7(bounds[2]), e7(bounds[3]))
    header += bytes([0]) + struct.pack("<2i", e7((bounds[0] + bounds[2]) / 2), e7((bounds[1] + bounds[3]) / 2))
    assert len(header) == HEADER_LEN
    with open(path, "wb") as f:
        f.write(header)
        f.write(root)
        f.write(meta)
        f.write(leaves)
        for _, data in tiles:
            f.write(data)
    return len(tiles)
