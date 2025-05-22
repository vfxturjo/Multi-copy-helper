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
  miniPreview: string;
  miniPreviewEditing: boolean;
  isAlwaysOnTop: boolean;
  currentPreset: string;
  thingsToCopyLinesOk: boolean;
  showMainWindow: boolean;
  showMainWindowLock: boolean;
  numKeysNavigationState: boolean;
  highlightNotCopied: boolean;
  showCopiedSuccessLogo: boolean;
} = $state({
  itemsToCopy: [],

  currentIDKeyName: "ID",
  IDKeyPositionInData: 0,
  currentCopyingID: "Texas A&M",
  currentCopyingVar: null,

  showCopiedSuccessLogo: false,

  currentClipboard: "",
  copiedData: {},

  highlightNotCopied: false,

  isAlwaysOnTop: true,
  showMainWindow: true,
  showMainWindowLock: true,
  currentPreviewView: "DataPreview",
  miniPreview: "",
  miniPreviewEditing: false,

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
} = $state({
  thingsToCopyRaw: "",
});

const defaultSavedData: {
  presets: PresetObject[];
  currentPreset: string;
  defaultPresetOnLoad: string;
  UIShortenPx: number;
  capsLockNavigation: boolean;
  capsLockNavigationDirect: boolean;
  UIScale: number;
  autoStartNextItem: boolean;
  UI_asSideBar: boolean;
  UI_showTransparentPreview_mini: boolean;
  UI_showTransparentPreview_mini_textSize:
    | "text-xs"
    | "text-sm"
    | "text-base"
    | "text-lg"
    | "text-xl";
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
  capsLockNavigationDirect: true,
  UIScale: 1.1,
  autoStartNextItem: false,
  UI_asSideBar: true,
  UI_showTransparentPreview_mini: true,
  UI_showTransparentPreview_mini_textSize: "text-xs",
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

  exportPresets: () => {
    const presetsJSON = JSON.stringify(SavedData.v.presets, null, 2);
    const blob = new Blob([presetsJSON], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "presets.json";
    a.click();
    URL.revokeObjectURL(url);
  },

  importPresets: (importType: "Append" | "Replace") => {
    const inputEl = document.querySelector("#importPresetsInput") as HTMLInputElement;
    if (inputEl) {
      const file = inputEl.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const data = e.target?.result as string;
          const presets = JSON.parse(data) as PresetObject[];
          if (importType === "Append") {
            presets.forEach((p) => {
              if (SavedData.v.presets.find((preset) => preset.name === p.name)) {
                p.name += " (2)";
                let i = 2;
                while (SavedData.v.presets.find((preset) => preset.name === p.name)) {
                  p.name = p.name.replace(" (" + (i - 1) + ")", " (" + i + ")");
                  i++;
                }
              }
            });

            SavedData.v.presets = [...SavedData.v.presets, ...presets];
          } else if (importType === "Replace") {
            SavedData.v.presets = presets;
          }
        };
        reader.readAsText(file);
      }
    }
  },
};
