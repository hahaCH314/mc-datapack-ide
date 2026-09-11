import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'

export interface ChatMessage {
  id: string
  user: string
  color: string
  text: string
  ts: number
}

export interface PresenceUser {
  clientId: number
  name: string
  color: string
  file?: string
  isSelf: boolean
}

export type CollabRole = 'host' | 'guest' | null

interface CollabState {
  active: boolean
  connected: boolean
  role: CollabRole
  roomId: string | null
  serverUrl: string | null
  myName: string
  myColor: string
  presence: PresenceUser[]
  chat: ChatMessage[]
}

interface CollabApi extends CollabState {
  /** サーバーとの同期が完了した場合はtrue、タイムアウトした場合はfalseを返す */
  start: (serverUrl: string, roomId: string, role: CollabRole, myName: string) => Promise<boolean>
  leave: () => void
  sendChat: (text: string) => void
  setActiveFile: (relPath: string | null) => void
  getDoc: () => Y.Doc | null
  getFilesMap: () => Y.Map<Y.Text> | null
}

const CollabReactContext = createContext<CollabApi | null>(null)

const COLORS = ['#e05252', '#4a9eea', '#5cb85c', '#d9a441', '#b06fe0', '#e07ab0', '#4ac0c0']

function randomColor(): string {
  return COLORS[Math.floor(Math.random() * COLORS.length)]
}

export function CollabProvider({ children }: { children: React.ReactNode }): JSX.Element {
  const docRef = useRef<Y.Doc | null>(null)
  const providerRef = useRef<WebsocketProvider | null>(null)
  const [state, setState] = useState<CollabState>({
    active: false,
    connected: false,
    role: null,
    roomId: null,
    serverUrl: null,
    myName: 'プレイヤー',
    myColor: randomColor(),
    presence: [],
    chat: []
  })

  const leave = useCallback(() => {
    providerRef.current?.destroy()
    providerRef.current = null
    docRef.current?.destroy()
    docRef.current = null
    setState((s) => ({
      ...s,
      active: false,
      connected: false,
      role: null,
      roomId: null,
      serverUrl: null,
      presence: [],
      chat: []
    }))
  }, [])

  const start = useCallback(
    async (serverUrl: string, roomId: string, role: CollabRole, myName: string): Promise<boolean> => {
      leave()
      const doc = new Y.Doc()
      const provider = new WebsocketProvider(serverUrl, roomId, doc, { connect: true })
      docRef.current = doc
      providerRef.current = provider
      const myColor = randomColor()

      provider.awareness.setLocalStateField('user', { name: myName, color: myColor })

      setState((s) => ({
        ...s,
        active: true,
        connected: false,
        role,
        roomId,
        serverUrl,
        myName,
        myColor
      }))

      function refreshPresence(): void {
        const list: PresenceUser[] = []
        provider.awareness.getStates().forEach((value: any, clientId: number) => {
          if (!value?.user) return
          list.push({
            clientId,
            name: value.user.name ?? '(名無し)',
            color: value.user.color ?? '#888',
            file: value.user.file,
            isSelf: clientId === doc.clientID
          })
        })
        setState((s) => ({ ...s, presence: list }))
      }
      provider.awareness.on('change', refreshPresence)
      refreshPresence()

      provider.on('status', ({ status }: { status: string }) => {
        setState((s) => ({ ...s, connected: status === 'connected' }))
      })

      const chatArr = doc.getArray<ChatMessage>('chat')
      function refreshChat(): void {
        setState((s) => ({ ...s, chat: chatArr.toArray() }))
      }
      chatArr.observe(refreshChat)
      refreshChat()

      // サーバーに接続できない場合でも呼び出し元が無限に待たされないよう、
      // 一定時間で諦めて処理を先に進める (戻り値で成否を伝える)
      const synced = await new Promise<boolean>((resolve) => {
        if (provider.synced) return resolve(true)
        provider.once('sync', () => resolve(true))
        setTimeout(() => resolve(false), 8000)
      })
      return synced
    },
    [leave]
  )

  const sendChat = useCallback(
    (text: string) => {
      const doc = docRef.current
      if (!doc || !text.trim()) return
      const chatArr = doc.getArray<ChatMessage>('chat')
      chatArr.push([
        {
          id: `${doc.clientID}-${Date.now()}`,
          user: state.myName,
          color: state.myColor,
          text: text.trim(),
          ts: Date.now()
        }
      ])
    },
    [state.myName, state.myColor]
  )

  const setActiveFile = useCallback((relPath: string | null) => {
    providerRef.current?.awareness.setLocalStateField('user', {
      name: state.myName,
      color: state.myColor,
      file: relPath ?? undefined
    })
  }, [state.myName, state.myColor])

  const getDoc = useCallback(() => docRef.current, [])
  const getFilesMap = useCallback(() => docRef.current?.getMap<Y.Text>('files') ?? null, [])

  useEffect(() => {
    return () => {
      providerRef.current?.destroy()
      docRef.current?.destroy()
    }
  }, [])

  const value = useMemo<CollabApi>(
    () => ({ ...state, start, leave, sendChat, setActiveFile, getDoc, getFilesMap }),
    [state, start, leave, sendChat, setActiveFile, getDoc, getFilesMap]
  )

  return <CollabReactContext.Provider value={value}>{children}</CollabReactContext.Provider>
}

export function useCollab(): CollabApi {
  const ctx = useContext(CollabReactContext)
  if (!ctx) throw new Error('useCollab must be used within CollabProvider')
  return ctx
}

export function randomRoomCode(): string {
  // 紛らわしい文字 (I/O/0/1 など) を除いた32種類 x 8桁 = 32^8 通り (約1兆通り) で
  // 総当たりされにくくしている
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let out = ''
  for (let i = 0; i < 8; i++) out += chars[Math.floor(Math.random() * chars.length)]
  return out
}
