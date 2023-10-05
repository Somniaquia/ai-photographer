const { app, BrowserWindow, session } = require('electron')
const { spawn } = require('child_process');
const path = require('node:path')

let mainWindow;

function createWindow () {
  mainWindow = new BrowserWindow({
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

  const pythonProcess = spawn('C:\\Users\\Somni\\anaconda3\\envs\\torch\\python.exe', ['processor.py']);

  pythonProcess.stdout.on('data', (data) => {
    console.log(`Python Output: ${data}`);
  });

  pythonProcess.stderr.on('data', (data) => {
    console.error(`Python Error: ${data}`);
  });

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit()
})