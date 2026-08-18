// main.cjs
const { app, BrowserWindow, screen } = require('electron');
const path = require('path');

function createWindow() {
  // 1. Detecta a resolução do monitor principal
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;

  // 2. Define o zoom ideal: 85% para telas menores que 900px de altura, 100% para 1080p+
  const isLowRes = height < 900;
  const defaultZoom = isLowRes ? 0.85 : 1.0;

  const win = new BrowserWindow({
    title: "Checkout Egaplast",
    icon: path.join(__dirname, 'build', 'icon.ico'),
    width: width,
    height: height,
    fullscreen: true,
    kiosk: true,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      devTools: false
    }
  });

  // Aplica o zoom proporcional ao terminar o carregamento da página
  win.webContents.on('did-finish-load', () => {
    win.webContents.setZoomFactor(defaultZoom);
  });

  win.loadURL('https://checkoutegaplast-beta.web.app');
  win.setMenuBarVisibility(false);

  // 3. Mantém os atalhos manuais para ajuste fino pelo operador se necessário
  win.webContents.on('before-input-event', (event, input) => {
    if (input.control && (input.key === '=' || input.key === '+')) {
      const currentZoom = win.webContents.getZoomFactor();
      win.webContents.setZoomFactor(Math.min(currentZoom + 0.05, 1.5));
      event.preventDefault();
    } else if (input.control && input.key === '-') {
      const currentZoom = win.webContents.getZoomFactor();
      win.webContents.setZoomFactor(Math.max(currentZoom - 0.05, 0.5));
      event.preventDefault();
    } else if (input.control && input.key === '0') {
      win.webContents.setZoomFactor(defaultZoom);
      event.preventDefault();
    }
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});