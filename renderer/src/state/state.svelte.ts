import { PersistedStateObjectAdvanced } from "./persistedStoreAdvanced.svelte";

interface oneRow {
  [key: string]: string;
}

export const state: {
  currentIDKeyName: string;
  IDKeyPositionInData: number;
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
  IDKeyPositionInData: 0,
  currentCopyingID: "Texas A&M",
  currentCopyingVar: null,

  currentClipboard: "",
  copiedData: {},

  isAlwaysOnTop: true,
  showMainWindow: true,
  showMainWindowLock: true,
  currentPreviewView: "DataPreview",

  currentPreset: "Default",
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
  IDKeyPositionInData: number;
}

export const settings: {
  thingsToCopyRaw: string;
  UIScale: number;
  autoStartNextItem: boolean;
} = $state({
  thingsToCopyRaw: "",
  UIScale: 1.1,
  autoStartNextItem: false,
});

const defaultSavedData: {
  presets: PresetObject[];
  currentPreset: string;
  defaultPresetOnLoad: string;
  UIShortenPx: number;
  capsLockNavigation: boolean;
} = {
  presets: [
    {
      name: "Default",
      currentIDKeyName: "ID",
      currentID: "",
      itemsToCopy: ["Col1", "Col2", "Col3"],
      IDKeyPositionInData: 0,
    },
  ],
  currentPreset: "Default",
  defaultPresetOnLoad: "Default",
  UIShortenPx: 0,
  capsLockNavigation: true,
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
      IDKeyPositionInData: state.IDKeyPositionInData,
    });
  },

  updatePreset: () => {
    const index = SavedData.v.presets.findIndex((p) => p.name === state.currentPreset);
    if (index !== -1) {
      SavedData.v.presets[index] = {
        name: state.currentPreset,
        currentIDKeyName: state.currentIDKeyName,
        currentID: state.currentCopyingID,
        itemsToCopy: state.itemsToCopy,
        IDKeyPositionInData: state.IDKeyPositionInData,
      };
    }
  },

  loadPreset: (preset: PresetObject) => {
    state.currentIDKeyName = preset.currentIDKeyName;
    state.currentCopyingID = preset.currentID;
    state.itemsToCopy = preset.itemsToCopy;
    state.IDKeyPositionInData = preset.IDKeyPositionInData;
    settings.thingsToCopyRaw = preset.itemsToCopy.join("\n");
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

  resetPresets: () => {
    SavedData.v.presets = defaultSavedData.presets;
  },

  resetCollectedData: () => {
    state.copiedData = {};
  },
};
