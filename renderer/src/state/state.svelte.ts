import { PersistedStateObjectAdvanced } from "./persistedStoreAdvanced.svelte";

interface oneRow {
  [key: string]: string;
}

export const state: {
  currentIDKeyName: string;
  currentCopyingID: string;
  currentCopyingVar: string | null;
  itemsToCopy: string[];
  currentClipboard: string;
  copiedData: { [key: string]: oneRow };
  currentPreviewView: "DataPreview" | "settings" | "presets";
  isAlwaysOnTop: boolean;
  currentPreset: string;
  thingsToCopyLinesOk: boolean;
  showMainWindow: boolean;
  showMainWindowLock: boolean;
  numKeysNavigationState: boolean;
} = $state({
  itemsToCopy: [],

  currentIDKeyName: "ID",
  currentCopyingID: "Texas A&M",
  currentCopyingVar: null,

  currentClipboard: "",
  copiedData: {},

  isAlwaysOnTop: true,
  showMainWindow: true,
  showMainWindowLock: true,
  currentPreviewView: "DataPreview",

  currentPreset: "New",
  thingsToCopyLinesOk: true,
  numKeysNavigationState: false,
});

export const draggingInfo = $state({
  mouseDown: false,
  dragging: false,
  threshold: 8,
  initX: 0,
  initY: 0,
  currentPreviewView: "preview",
});

export interface PresetObject {
  name: string;
  currentIDKeyName: string;
  currentID: string;
  itemsToCopy: string[];
}

export const settings: {
  thingsToCopyRaw: string;
  currentPreset: string;
  UIScale: number;
  UIShortenPx: number;
  autoStartNextItem: boolean;
  CapsLockNavigation: boolean;
} = $state({
  thingsToCopyRaw: "",
  currentPreset: "default",
  UIScale: 1.1,
  UIShortenPx: 0,
  autoStartNextItem: false,
  CapsLockNavigation: false,
});

const defaultSavedData: {
  presets: PresetObject[];
  currentPreset: string;
} = {
  presets: [
    {
      name: "Default",
      currentIDKeyName: "ID",
      currentID: "ID NAME",
      itemsToCopy: ["Col1", "Col2", "Col3"],
    },
  ],
  currentPreset: "Default",
};

export const SavedData = new PersistedStateObjectAdvanced("settings", defaultSavedData, {
  syncTabs: false,
});

export const settingsMethods = {
  addPreset: () => {
    SavedData.v.presets.push({
      name: state.currentPreset,
      currentIDKeyName: state.currentIDKeyName,
      currentID: state.currentCopyingID,
      itemsToCopy: state.itemsToCopy,
    });
    settings.currentPreset = state.currentPreset;
  },

  updatePreset: () => {
    const index = SavedData.v.presets.findIndex((p) => p.name === state.currentPreset);
    if (index !== -1) {
      SavedData.v.presets[index] = {
        name: state.currentPreset,
        currentIDKeyName: state.currentIDKeyName,
        currentID: state.currentCopyingID,
        itemsToCopy: state.itemsToCopy,
      };
    }
  },

  loadPreset: (preset: PresetObject) => {
    state.currentIDKeyName = preset.currentIDKeyName;
    state.currentCopyingID = preset.currentID;
    state.itemsToCopy = preset.itemsToCopy;
    settings.thingsToCopyRaw = preset.itemsToCopy.join("\n");

    settings.currentPreset = preset.name;
  },

  deletePreset: (preset: PresetObject) => {
    const index = SavedData.v.presets.findIndex((p) => p.name === preset.name);
    if (index !== -1) {
      SavedData.v.presets.splice(index, 1);
    }
  },

  resetSettings: () => {
    localStorage.clear();
    SavedData.v = defaultSavedData;
  },
};
