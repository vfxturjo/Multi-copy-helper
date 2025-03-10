import { PersistedStateObjectAdvanced } from "./persistedStoreAdvanced.svelte";

export const state: {
  currentIDKeyName: string;
  currentID: string;
  itemsToCopy: string[];
  currentCopying: string | null;
  currentClipboard: string;
  copiedData: { [key: string]: string };
  currentPreviewView: "DataPreview" | "settings" | "presets";
  isAlwaysOnTop: boolean;
  currentPreset: string;
  thingsToCopyLinesOk: boolean;
  showMainWindow: boolean;
  showMainWindowLock: boolean;
} = $state({
  showMainWindow: true,
  showMainWindowLock: true,
  currentIDKeyName: "ID",
  currentID: "Texas A&M",
  itemsToCopy: [],
  currentCopying: null,
  currentClipboard: "",
  copiedData: {},
  currentPreviewView: "DataPreview",
  isAlwaysOnTop: true,
  currentPreset: "New",
  thingsToCopyLinesOk: true,
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
} = $state({
  thingsToCopyRaw: "",
  currentPreset: "default",
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
      currentID: state.currentID,
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
        currentID: state.currentID,
        itemsToCopy: state.itemsToCopy,
      };
    }
  },

  loadPreset: (preset: PresetObject) => {
    state.currentIDKeyName = preset.currentIDKeyName;
    state.currentID = preset.currentID;
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
