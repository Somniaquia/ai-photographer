const { app, BrowserWindow, session } = require('electron')
const path = require('node:path')

function createWindow () {
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    fullscreen: true,
    frame: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: true,
      contextIsolation: false
    },
  })

  mainWindow.loadFile('index.html')

  session
    .fromPartition('default')
    .setPermissionRequestHandler((webContents, permission, callback) => {
      const allowedPermissions = ['camera', 'microphone']; // adjust per your needs
      if (allowedPermissions.includes(permission)) {
        callback(true); // Approve permission request
      } else {
        callback(false); // Deny
      }
    });
 
  mainWindow.on('closed', function () {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit()
})