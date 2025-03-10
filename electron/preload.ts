import { contextBridge, ipcRenderer } from "electron";

export const CONTEXT_BRIDGE = {
  /**
   * Returns the version from process.versions of the supplied target.
   */
  getVersion: async (opt: "electron" | "node"): Promise<string> => {
    return await ipcRenderer.invoke(`get-version`, opt);
  },

  // conditionally ignore mouse events
  setIgnoreMouseEvents: (ignore, options?) => {
    ipcRenderer.send("set-ignore-mouse-events", ignore, options);
  },

  // open devtools
  openDevTools: (open?) => {
    ipcRenderer.send("open-devtools", open);
  },

  // // register global shortcut
  // registerGlobalShortcut: (key, fn) => {
  //   ipcRenderer.send("globalShortcut", "register", key, fn);
  // },

  // unregister global shortcut to cancel copy process
  globalShortcutToCancelCopy: () => {
    ipcRenderer.send("globalShortcutToCancel");
  },

  on: (event, callback) => {
    ipcRenderer.on(event, callback);
  },

  ToggleAlwaysOnTop: () => {
    ipcRenderer.send("ToggleAlwaysOnTop");
  },
};

contextBridge.exposeInMainWorld("bridge", CONTEXT_BRIDGE);
contextBridge.exposeInMainWorld("ipcr", ipcRenderer);

ipcRenderer.on("clipboard-changed", (_, value) => {
  console.log("clipboard changed");
  console.log(value);
});
