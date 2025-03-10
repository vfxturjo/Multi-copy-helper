import { app, BrowserWindow, globalShortcut, ipcMain, IpcMainEvent } from "electron";
import electronReload from "electron-reload";
import { join } from "path";

let mainWindow: BrowserWindow;

app.once("ready", main);

async function main() {
  mainWindow = new BrowserWindow({
    width: 810,
    height: 830,
    resizable: false,
    show: false,
    webPreferences: {
      devTools: true || !app.isPackaged,
      preload: join(__dirname, "preload.js"),
      // nodeIntegration: true,
    },

    frame: false,
    transparent: true,
  });

  if (app.isPackaged) {
    mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
  } else {
    electronReload(join(__dirname), {
      forceHardReset: true,
      hardResetMethod: "quit",
      electron: app.getPath("exe"),
    });

    await mainWindow.loadURL(`http://localhost:5173/`);
    mainWindow.setAlwaysOnTop(true, "floating");
  }

  mainWindow.once("ready-to-show", mainWindow.show);
  // mainWindow.webContents.openDevTools();
}

ipcMain.handle("get-version", (_, key: "electron" | "node") => {
  return String(process.versions[key]);
});

// Conditionally ignore mouse events outside the window
ipcMain.on("set-ignore-mouse-events", (event, ignore, options) => {
  // BYPASSING FOR NOW
  // return;
  mainWindow.setIgnoreMouseEvents(ignore, options);
});

ipcMain.on("open-devtools", (_, open?) => {
  if (open ?? mainWindow.webContents.isDevToolsOpened()) {
    mainWindow.webContents.closeDevTools();
  } else {
    mainWindow.webContents.openDevTools();
  }
});

// HANDLING CLIPBOARD
import { clipboard } from "electron";
import clipboardListener from "clipboard-event";

clipboardListener.startListening();

clipboardListener.on("change", () => {
  console.log("clipboard changed");
  mainWindow.webContents.send("clipboard-changed", clipboard.readText());
});

// creating and managing global shortcuts
ipcMain.on(
  "globalShortcut",
  (
    event: IpcMainEvent,
    type: "register" | "unregister" | "check",
    key: string,
    fn?: () => {},
  ): void | boolean => {
    console.log("globalShortcut", type, key, fn);

    switch (type) {
      case "register":
        globalShortcut.register(key, fn);
        console.log("Registered global shortcut", key, fn);

        break;
      case "unregister":
        globalShortcut.unregister(key);
        console.log("Unregistered global shortcut", key);
        break;
      case "check":
        return globalShortcut.isRegistered(key);

      default:
        console.log("Invalid type for globalShortcut");
    }
  },
);

// managing global shortcut for cancelling the copy process
ipcMain.on("globalShortcutToCancel", () => {
  console.log("globalShortcutToCancel", "Listening for Escape");
  globalShortcut.register("Escape", () => {
    mainWindow.webContents.send("cancel-copy");
    globalShortcut.unregister("Escape");
    console.log("Unregistered global shortcut", "Escape");
  });
});

// get current clipboard
ipcMain.handle("get-clipboard", () => {
  globalShortcut.unregister("Escape");
  console.log("Unregistered global shortcut", "Escape");
  return clipboard.readText();
});

// handle always on top toggle
ipcMain.on("ToggleAlwaysOnTop", () => {
  mainWindow.setAlwaysOnTop(!mainWindow.isAlwaysOnTop());
});
