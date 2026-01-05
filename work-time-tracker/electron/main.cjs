const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

function createWindow() {
    const win = new BrowserWindow({
        width: 1400,
        height: 900,
        webPreferences: {
            preload: path.join(__dirname, 'preload.cjs'),
            contextIsolation: true,
            nodeIntegration: false,
        },
        autoHideMenuBar: true,
        titleBarStyle: 'hiddenInset',
        backgroundColor: '#f1f5f9'
    });

    if (process.env.VITE_DEV_SERVER_URL) {
        win.loadURL(process.env.VITE_DEV_SERVER_URL);
    } else {
        win.loadFile(path.join(__dirname, '../dist/index.html'));
    }
}

ipcMain.handle('save-data', async (event, { key, data, isRaw }) => {
    try {
        const dataDir = path.join(app.getPath('userData'), 'data');
        if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

        const fileName = key.includes('.') ? key : `${key}.json`;
        const filePath = path.join(dataDir, fileName);

        const content = isRaw ? data : JSON.stringify(data, null, 2);
        fs.writeFileSync(filePath, content, 'utf-8');
        return { success: true };
    } catch (err) {
        return { success: false, error: err.message };
    }
});

ipcMain.handle('load-data', async (event, key) => {
    try {
        const dataDir = path.join(app.getPath('userData'), 'data');
        const fileName = key.includes('.') ? key : `${key}.json`;
        const filePath = path.join(dataDir, fileName);

        if (fs.existsSync(filePath)) {
            const data = fs.readFileSync(filePath, 'utf-8');
            return key.includes('.csv') ? data : JSON.parse(data);
        }
        return null;
    } catch (err) {
        return null;
    }
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});
