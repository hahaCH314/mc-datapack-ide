import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import * as fsService from './fsService'
import * as textureService from './textureService'
import type { NewDatapackOptions } from '../shared/types'

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.on('render-process-gone', (_e, details) => {
    dialog.showErrorBox(
      '画面が予期せず終了しました',
      `アプリの表示部分が異常終了しました (理由: ${details.reason})。\nウィンドウを再度開いてください。`
    )
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

function registerIpc(): void {
  ipcMain.handle('dialog:openDirectory', async () => {
    const result = await dialog.showOpenDialog({ properties: ['openDirectory'] })
    if (result.canceled || result.filePaths.length === 0) return null
    return result.filePaths[0]
  })

  ipcMain.handle('dialog:chooseParentDir', async () => {
    const result = await dialog.showOpenDialog({ properties: ['openDirectory', 'createDirectory'] })
    if (result.canceled || result.filePaths.length === 0) return null
    return result.filePaths[0]
  })

  ipcMain.handle('dialog:saveZip', async (_e, defaultName: string, defaultDir?: string) => {
    const result = await dialog.showSaveDialog({
      defaultPath: defaultDir ? join(defaultDir, defaultName) : defaultName,
      filters: [{ name: 'Zip archive', extensions: ['zip'] }]
    })
    if (result.canceled || !result.filePath) return null
    return result.filePath
  })

  ipcMain.handle('dialog:openZip', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [{ name: 'Zip archive', extensions: ['zip'] }]
    })
    if (result.canceled || result.filePaths.length === 0) return null
    return result.filePaths[0]
  })

  ipcMain.handle('fs:readDirTree', async (_e, rootPath: string) => fsService.readDirTree(rootPath))
  ipcMain.handle('fs:readFile', async (_e, filePath: string) => fsService.readFile(filePath))
  ipcMain.handle('fs:writeFile', async (_e, filePath: string, content: string) =>
    fsService.writeFile(filePath, content)
  )
  ipcMain.handle('fs:deletePath', async (_e, targetPath: string) => fsService.deletePath(targetPath))
  ipcMain.handle('fs:renamePath', async (_e, oldPath: string, newPath: string) =>
    fsService.renamePath(oldPath, newPath)
  )
  ipcMain.handle('fs:createDirectory', async (_e, dirPath: string) =>
    fsService.createDirectory(dirPath)
  )
  ipcMain.handle('fs:pathExists', async (_e, p: string) => fsService.pathExists(p))
  ipcMain.handle('fs:createNewDatapack', async (_e, options: NewDatapackOptions) =>
    fsService.createNewDatapack(options)
  )
  ipcMain.handle('fs:exportToZip', async (_e, rootPath: string, destZipPath: string) =>
    fsService.exportToZip(rootPath, destZipPath)
  )
  ipcMain.handle('fs:importFromZip', async (_e, zipPath: string, destDir: string) =>
    fsService.importFromZip(zipPath, destDir)
  )

  ipcMain.handle('fs:writeFileWithBackup', async (_e, rootPath: string, relPath: string, content: string) =>
    fsService.writeFileWithBackup(rootPath, relPath, content)
  )
  ipcMain.handle('fs:listBackups', async (_e, rootPath: string, relPath: string) =>
    fsService.listBackups(rootPath, relPath)
  )
  ipcMain.handle('fs:readBackup', async (_e, rootPath: string, relPath: string, timestamp: number) =>
    fsService.readBackup(rootPath, relPath, timestamp)
  )

  ipcMain.handle('shell:showItemInFolder', async (_e, targetPath: string) => {
    shell.showItemInFolder(targetPath)
  })

  ipcMain.handle('dialog:chooseMinecraftJar', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [{ name: 'Minecraft version jar', extensions: ['jar'] }]
    })
    if (result.canceled || result.filePaths.length === 0) return null
    return result.filePaths[0]
  })

  ipcMain.handle('texture:extractIcon', async (_e, jarPath: string, kind: 'item' | 'block', id: string) =>
    textureService.extractIcon(jarPath, kind, id)
  )
}

app.whenReady().then(() => {
  registerIpc()
  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

process.on('uncaughtException', (error) => {
  console.error('未処理の例外:', error)
  dialog.showErrorBox('予期しないエラーが発生しました', `${error.message}\n\n${error.stack ?? ''}`)
})

process.on('unhandledRejection', (reason) => {
  console.error('未処理のPromiseエラー:', reason)
  dialog.showErrorBox('予期しないエラーが発生しました', String(reason))
})
