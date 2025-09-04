// main.js - Electron main process (Arabic GUI)
const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

let mainWindow;
let serverProc = null;
let ffmpegProcs = {};

// paths
const APP_ROOT = app.isPackaged ? process.resourcesPath : __dirname;
const SERVER_DIR = path.join(APP_ROOT, 'server');
const FFMPEG_PATH = path.join(APP_ROOT, 'ffmpeg', 'bin', process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg');

function createWindow(){
  mainWindow = new BrowserWindow({
    width: 1000, height: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true
    }
  });
  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  if (!app.isPackaged) mainWindow.webContents.openDevTools();
}

app.whenReady().then(createWindow);

ipcMain.handle('start-server', async ()=>{
  if (serverProc) return { ok: false, msg: 'الخادم قيد التشغيل بالفعل' };
  const nodeExe = process.execPath;
  const serverScript = path.join(SERVER_DIR, 'server.js');
  serverProc = spawn(nodeExe, [serverScript], { stdio: 'inherit' });
  return { ok: true };
});

ipcMain.handle('stop-server', async ()=>{
  if (!serverProc) return { ok: false, msg: 'الخادم غير متشغل' };
  try { serverProc.kill(); } catch(e) {}
  serverProc = null;
  return { ok: true };
});

ipcMain.handle('list-channels', async ()=>{
  const cfgFile = path.join(SERVER_DIR, 'config', 'channels.json');
  if (!fs.existsSync(cfgFile)) return {};
  try { return JSON.parse(fs.readFileSync(cfgFile,'utf8')); } catch(e){ return {}; }
});

ipcMain.handle('add-channel', async (event, key, obj)=>{
  const cfgFile = path.join(SERVER_DIR, 'config', 'channels.json');
  let cfg = {};
  if (fs.existsSync(cfgFile)) {
    try { cfg = JSON.parse(fs.readFileSync(cfgFile,'utf8')); } catch(e){ cfg = {}; }
  }
  cfg[key] = obj;
  fs.writeFileSync(cfgFile, JSON.stringify(cfg, null, 2), 'utf8');
  return { ok: true };
});

ipcMain.handle('remove-channel', async (event, key)=>{
  const cfgFile = path.join(SERVER_DIR, 'config', 'channels.json');
  if (!fs.existsSync(cfgFile)) return { ok: false };
  let cfg = JSON.parse(fs.readFileSync(cfgFile,'utf8'));
  if (cfg[key]) delete cfg[key];
  fs.writeFileSync(cfgFile, JSON.stringify(cfg, null, 2), 'utf8');
  // stop if running
  if (ffmpegProcs[key]) { try{ ffmpegProcs[key].kill(); }catch(e){} delete ffmpegProcs[key]; }
  return { ok: true };
});

ipcMain.handle('select-file', async ()=>{
  const r = await dialog.showOpenDialog(mainWindow, { properties:['openFile'], filters:[{name:'ملفات',extensions:['mp4','mkv','mov','mp3','aac','wav']}] });
  if (r.canceled) return null;
  return r.filePaths[0];
});

ipcMain.handle('select-logo', async ()=>{
  const r = await dialog.showOpenDialog(mainWindow, { properties:['openFile'], filters:[{name:'صور',extensions:['png','jpg','webp']}] });
  if (r.canceled) return null;
  const src = r.filePaths[0];
  const logosDir = path.join(SERVER_DIR, 'config', 'logos');
  if (!fs.existsSync(logosDir)) fs.mkdirSync(logosDir, { recursive: true });
  const dest = path.join(logosDir, path.basename(src));
  fs.copyFileSync(src, dest);
  return path.basename(src);
});

ipcMain.handle('start-channel', async (event, key)=>{
  if (ffmpegProcs[key]) return { ok: false, msg: 'القناة تعمل بالفعل' };
  const manage = path.join(SERVER_DIR, 'manage_channels.js');
  const nodeExe = process.execPath;
  const p = spawn(nodeExe, [manage, 'start', key], { stdio: 'inherit' });
  ffmpegProcs[key] = p;
  return { ok: true };
});

ipcMain.handle('stop-channel', async (event, key)=>{
  const p = ffmpegProcs[key];
  if (!p) return { ok: false, msg: 'القناة غير مشغلة' };
  try { p.kill(); } catch(e) {}
  delete ffmpegProcs[key];
  return { ok: true };
});

app.on('before-quit', ()=>{
  Object.keys(ffmpegProcs).forEach(k=>{ try{ ffmpegProcs[k].kill(); }catch(e){} });
  if (serverProc) try{ serverProc.kill(); }catch(e){};
});
