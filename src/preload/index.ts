import { contextBridge, ipcRenderer } from 'electron'
import type { FileNode, NewDatapackOptions } from '../shared/types'

export interface ExportResult {
  fileCount: number
  zipBytes: number
}

export interface BackupEntry {
  timestamp: number
}

const api = {
  chooseParentDir: (): Promise<string | null> => ipcRenderer.invoke('dialog:chooseParentDir'),
  openDirectory: (): Promise<string | null> => ipcRenderer.invoke('dialog:openDirectory'),
  saveZipDialog: (defaultName: string, defaultDir?: string): Promise<string | null> =>
    ipcRenderer.invoke('dialog:saveZip', defaultName, defaultDir),
  openZipDialog: (): Promise<string | null> => ipcRenderer.invoke('dialog:openZip'),

  readDirTree: (rootPath: string): Promise<FileNode> => ipcRenderer.invoke('fs:readDirTree', rootPath),
  readFile: (filePath: string): Promise<string> => ipcRenderer.invoke('fs:readFile', filePath),
  writeFile: (filePath: string, content: string): Promise<void> =>
    ipcRenderer.invoke('fs:writeFile', filePath, content),
  deletePath: (targetPath: string): Promise<void> => ipcRenderer.invoke('fs:deletePath', targetPath),
  renamePath: (oldPath: string, newPath: string): Promise<void> =>
    ipcRenderer.invoke('fs:renamePath', oldPath, newPath),
  createDirectory: (dirPath: string): Promise<void> =>
    ipcRenderer.invoke('fs:createDirectory', dirPath),
  pathExists: (p: string): Promise<boolean> => ipcRenderer.invoke('fs:pathExists', p),
  createNewDatapack: (options: NewDatapackOptions): Promise<string> =>
    ipcRenderer.invoke('fs:createNewDatapack', options),
  exportToZip: (rootPath: string, destZipPath: string): Promise<ExportResult> =>
    ipcRenderer.invoke('fs:exportToZip', rootPath, destZipPath),
  importFromZip: (zipPath: string, destDir: string): Promise<string> =>
    ipcRenderer.invoke('fs:importFromZip', zipPath, destDir),

  writeFileWithBackup: (rootPath: string, relPath: string, content: string): Promise<void> =>
    ipcRenderer.invoke('fs:writeFileWithBackup', rootPath, relPath, content),
  listBackups: (rootPath: string, relPath: string): Promise<BackupEntry[]> =>
    ipcRenderer.invoke('fs:listBackups', rootPath, relPath),
  readBackup: (rootPath: string, relPath: string, timestamp: number): Promise<string> =>
    ipcRenderer.invoke('fs:readBackup', rootPath, relPath, timestamp),

  showItemInFolder: (targetPath: string): Promise<void> =>
    ipcRenderer.invoke('shell:showItemInFolder', targetPath),

  chooseMinecraftJar: (): Promise<string | null> => ipcRenderer.invoke('dialog:chooseMinecraftJar'),
  extractIcon: (jarPath: string, kind: 'item' | 'block', id: string): Promise<string | null> =>
    ipcRenderer.invoke('texture:extractIcon', jarPath, kind, id)
}

contextBridge.exposeInMainWorld('api', api)

export type Api = typeof api
