// main.cjs
const { app, BrowserWindow } = require('electron');

function createWindow() {
  const win = new BrowserWindow({
    title: "Checkout Egaplast", // Define o título nativo da janela
    width: 1920,
    height: 1080,
    fullscreen: true,
    kiosk: true,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      devTools: false
    }
  });

  win.loadURL('https://checkoutegaplast-beta.web.app');
  win.setMenuBarVisibility(false);
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});