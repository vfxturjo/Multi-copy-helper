import { app, BrowserWindow, globalShortcut, ipcMain, IpcMainEvent, shell } from "electron";
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
    title: "SmartCopy",
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
  mainWindow.setTitle("SmartCopy");
  // mainWindow.webContents.openDevTools();
}

ipcMain.handle("get-version", (_, key: "electron" | "node") => {
  return String(process.versions[key]);
});

// Conditionally ignore mouse events outside the window
ipcMain.on("set-ignore-mouse-events", (event, ignore, options) => {
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
ipcMain.on("globalShortcutToCancel", (_: any, eventType?: "stop" | "start") => {
  console.log("globalShortcutToCancel", eventType ?? "waiting");

  if (!eventType || eventType == "start") {
    globalShortcut.register("Escape", () => {
      mainWindow.webContents.send("cancel-copy");
      unregisterEscKey();
    });
  } else {
    unregisterEscKey();
  }
});

function unregisterEscKey() {
  globalShortcut.unregister("Escape");
  console.log("Unregistered global shortcut", "Escape");
}

let keysStringStored: string;
let NumKeysNavigationOnState = false;
function SetNumKeysNavigationState(state: boolean) {
  if (state) {
    resetCapsLockNavigationShortcuts(keysStringStored);
  } else {
    resetCapsLockNavigationShortcuts();
  }
  mainWindow.webContents.send("NumKeysNavigationOn", state);
  NumKeysNavigationOnState = state;
}

// managing global shortcut for CapsLock Navigation
ipcMain.on("SetNumKeysNavigation", (_, keysString?: string) => {
  console.log("IM TRIGGERED");

  console.log("SetNumKeysNavigation: ", keysString ?? "disabled");

  keysStringStored = keysString;

  if (keysString) {
    globalShortcut.register("CommandOrControl+Home", () => {
      SetNumKeysNavigationState(true);
    });

    globalShortcut.register("CommandOrControl+End", () => {
      SetNumKeysNavigationState(false);
    });

    // CapsLock to toggle
    globalShortcut.register("CapsLock", () => {
      if (NumKeysNavigationOnState) {
        SetNumKeysNavigationState(false);
      } else {
        SetNumKeysNavigationState(true);
      }
    });
  } else {
    globalShortcut.unregister("CommandOrControl+Home");
    globalShortcut.unregister("CommandOrControl+End");
    globalShortcut.unregister("CapsLock");
    SetNumKeysNavigationState(false);
  }
});

function resetCapsLockNavigationShortcuts(keysString?: string) {
  console.log("enabling CapsLock Nav for: ", keysString);

  //  unregister all if registered
  globalShortcut.unregister("`");
  for (let i = 0; i < 10; i++) {
    if (globalShortcut.isRegistered(String(i))) {
      globalShortcut.unregister(String(i));
    }
  }

  // parse keys using json
  const keys = keysString ? JSON.parse(keysString) : [];

  // if keys argument is provided, enable navigation
  if (keys) {
    globalShortcut.register("`", () => {
      console.log("CapsLockNavigationPressed", "IDkey");
      mainWindow.webContents.send("CapsLockNavigationPressed", "###ID###");
    });
    for (let i = 0; i < keys.length; i++) {
      globalShortcut.register((i + 1).toString(), () => {
        console.log("CapsLockNavigationPressed", keys[i]);
        mainWindow.webContents.send("CapsLockNavigationPressed", keys[i]);
      });
    }
  }
}

// get current clipboard
ipcMain.handle("get-clipboard", () => {
  globalShortcut.unregister("Escape");
  console.log("Unregistered global shortcut", "Escape");
  return clipboard.readText();
});
// get current clipboard
ipcMain.handle("press-ctrlC", () => {
  console.log("doing this");

  mainWindow.sendInputEvent({
    type: "keyDown",
    keyCode: "c",
    modifiers: ["control"],
  });
});

// set current clipboard
ipcMain.handle("set-clipboard", (_, text: string) => {
  clipboard.clear();
  clipboard.writeText(text);
});

// handle always on top toggle
ipcMain.on("ToggleAlwaysOnTop", () => {
  mainWindow.setAlwaysOnTop(!mainWindow.isAlwaysOnTop());
});

// open-app-data-folder
ipcMain.on("open-app-data-folder", () => {
  shell.openPath(app.getPath("userData"));
});

function getAutoSaveFile() {
  const logPath = join(app.getPath("userData"), "clipboard-logs");
  const maxSessions = 5;

  // Create logs directory if it doesn't exist
  if (!require("fs").existsSync(logPath)) {
    require("fs").mkdirSync(logPath);
  }

  // Get existing log files
  const files = require("fs")
    .readdirSync(logPath)
    .filter((f: string) => f.startsWith("clipboard-log-"))
    .sort();

  // Remove oldest file if we exceed maxSessions
  if (files.length >= maxSessions) {
    require("fs").unlinkSync(join(logPath, files[0]));
  }

  // Create new log file with timestamp
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const logFile = join(logPath, `clipboard-log-${timestamp}.txt`);

  return logFile;
}

let logFile = getAutoSaveFile();
// in 1 min interval, save all copied data to a log file in the app data folder
ipcMain.on("autosave", (_: any, text: string) => {
  // Save current copiedData
  require("fs").writeFileSync(logFile, text);
  // console.log("autosaved: ", text);
});
