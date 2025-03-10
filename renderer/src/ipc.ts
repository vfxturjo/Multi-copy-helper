import type { ipcRenderer } from "electron";
import type { CONTEXT_BRIDGE } from "../../electron/preload";

declare global {
  interface Window {
    bridge: typeof CONTEXT_BRIDGE;
    ipcr: typeof ipcRenderer;
  }
}

const ipc = window.bridge;
export const ipcr = window.ipcr;
export default ipc;
