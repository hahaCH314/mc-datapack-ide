// MC Datapack IDE - チーム協業用の中継サーバー
//
// 各ルーム(プロジェクトセッション)ごとに Yjs のドキュメントと awareness を
// メモリ上に保持し、接続しているクライアント間でメッセージを中継するだけの
// 薄いWebSocketサーバーです。実際のデータ(ファイル内容・チャット履歴・
// カーソル位置など)は全てクライアント側のYjsドキュメントとして同期され、
// このサーバーはCRDTの中身を解釈しません。
//
// 起動方法:
//   node server/index.mjs
//   PORT=47391 node server/index.mjs
//
// 誰か1人がこのサーバーを起動し、他のメンバーは
// ws://<そのPCのアドレス>:<ポート> に接続することでチーム編集に参加できます。

import http from 'http'
import { WebSocketServer } from 'ws'
import * as Y from 'yjs'
import * as syncProtocol from 'y-protocols/sync.js'
import * as awarenessProtocol from 'y-protocols/awareness.js'
import * as encoding from 'lib0/encoding.js'
import * as decoding from 'lib0/decoding.js'

const PORT = Number(process.env.PORT) || 47391
const MESSAGE_SYNC = 0
const MESSAGE_AWARENESS = 1
const PING_INTERVAL_MS = 30000

/** @type {Map<string, { doc: Y.Doc, awareness: awarenessProtocol.Awareness, conns: Map<import('ws').WebSocket, Set<number>> }>} */
const rooms = new Map()

function getRoom(roomName) {
  let room = rooms.get(roomName)
  if (room) return room

  const doc = new Y.Doc()
  const awareness = new awarenessProtocol.Awareness(doc)
  const conns = new Map()
  room = { doc, awareness, conns }
  rooms.set(roomName, room)

  doc.on('update', (update, _origin) => {
    const encoder = encoding.createEncoder()
    encoding.writeVarUint(encoder, MESSAGE_SYNC)
    syncProtocol.writeUpdate(encoder, update)
    broadcast(room, encoding.toUint8Array(encoder), null)
  })

  awareness.on('update', ({ added, updated, removed }, origin) => {
    const changed = added.concat(updated, removed)
    if (origin && room.conns.has(origin)) {
      const owned = room.conns.get(origin)
      added.forEach((id) => owned.add(id))
      removed.forEach((id) => owned.delete(id))
    }
    const encoder = encoding.createEncoder()
    encoding.writeVarUint(encoder, MESSAGE_AWARENESS)
    encoding.writeVarUint8Array(
      encoder,
      awarenessProtocol.encodeAwarenessUpdate(awareness, changed)
    )
    broadcast(room, encoding.toUint8Array(encoder), null)
  })

  return room
}

function broadcast(room, message, exceptConn) {
  room.conns.forEach((_clientIds, conn) => {
    if (conn === exceptConn) return
    send(conn, message)
  })
}

function send(conn, message) {
  if (conn.readyState !== conn.OPEN && conn.readyState !== conn.CONNECTING) {
    closeConn(conn)
    return
  }
  try {
    conn.send(message, (err) => {
      if (err) closeConn(conn)
    })
  } catch {
    closeConn(conn)
  }
}

function closeConn(conn) {
  const room = conn._room
  if (room && room.conns.has(conn)) {
    const clientIds = room.conns.get(conn)
    room.conns.delete(conn)
    awarenessProtocol.removeAwarenessStates(room.awareness, Array.from(clientIds), null)
    if (room.conns.size === 0) {
      // 全員退出してもドキュメントはメモリ上に残す (再接続に備える)
    }
  }
  try {
    conn.close()
  } catch {
    /* noop */
  }
}

function setupConnection(conn, roomName) {
  const room = getRoom(roomName)
  conn._room = room
  conn.binaryType = 'arraybuffer'
  room.conns.set(conn, new Set())

  conn.on('message', (data) => {
    try {
      const message = new Uint8Array(data)
      const decoder = decoding.createDecoder(message)
      const messageType = decoding.readVarUint(decoder)

      if (messageType === MESSAGE_SYNC) {
        const encoder = encoding.createEncoder()
        encoding.writeVarUint(encoder, MESSAGE_SYNC)
        syncProtocol.readSyncMessage(decoder, encoder, room.doc, conn)
        if (encoding.length(encoder) > 1) {
          send(conn, encoding.toUint8Array(encoder))
        }
      } else if (messageType === MESSAGE_AWARENESS) {
        const update = decoding.readVarUint8Array(decoder)
        awarenessProtocol.applyAwarenessUpdate(room.awareness, update, conn)
      }
    } catch (e) {
      console.error('メッセージ処理エラー:', e)
    }
  })

  conn.on('close', () => closeConn(conn))
  conn.on('error', () => closeConn(conn))

  // 接続直後: 既存ドキュメント状態をこのクライアントに送る (sync step 1)
  {
    const encoder = encoding.createEncoder()
    encoding.writeVarUint(encoder, MESSAGE_SYNC)
    syncProtocol.writeSyncStep1(encoder, room.doc)
    send(conn, encoding.toUint8Array(encoder))
  }
  // 既存のawareness状態も送る
  const states = room.awareness.getStates()
  if (states.size > 0) {
    const encoder = encoding.createEncoder()
    encoding.writeVarUint(encoder, MESSAGE_AWARENESS)
    encoding.writeVarUint8Array(
      encoder,
      awarenessProtocol.encodeAwarenessUpdate(room.awareness, Array.from(states.keys()))
    )
    send(conn, encoding.toUint8Array(encoder))
  }

  const pingInterval = setInterval(() => {
    if (conn.readyState !== conn.OPEN) {
      clearInterval(pingInterval)
      closeConn(conn)
      return
    }
    try {
      conn.ping()
    } catch {
      clearInterval(pingInterval)
      closeConn(conn)
    }
  }, PING_INTERVAL_MS)
  conn.on('close', () => clearInterval(pingInterval))
}

const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'text/plain' })
    res.end('ok')
    return
  }
  res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' })
  res.end('MC Datapack IDE 中継サーバーは起動しています。\n')
})

const wss = new WebSocketServer({ server })

wss.on('connection', (conn, req) => {
  const roomName = decodeURIComponent((req.url || '/').slice(1).split('?')[0]) || 'default'
  setupConnection(conn, roomName)
})

server.listen(PORT, () => {
  console.log(`MC Datapack IDE 中継サーバー起動: ws://0.0.0.0:${PORT}`)
  console.log('他のメンバーはこのPCのIPアドレスとポート番号を使って接続してください。')
})
