export const state: {
  currentIDKeyName: string;
  currentID: string;
  itemsToCopy: string[];
  currentCopying: string | null;
  currentClipboard: string;
  copiedData: { [key: string]: string };
  currentPreviewView: "DataPreview" | "settings";
  isAlwaysOnTop: boolean;
  currentPreset: string;
} = $state({
  currentIDKeyName: "ID",
  currentID: "Texas A&M",
  itemsToCopy: [],
  currentCopying: null,
  currentClipboard: "",
  copiedData: {},
  currentPreviewView: "DataPreview",
  isAlwaysOnTop: true,
  currentPreset: "default",
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
  presetsData: PresetObject[];
} = $state({
  thingsToCopyRaw: "",
  currentPreset: "default",
  presetsData: [
    {
      name: "Default",
      currentIDKeyName: "ID",
      currentID: "ID NAME",
      itemsToCopy: ["Col1", "Col2", "Col3"],
    },
  ],
});

export const settingsMethods = {
  addPreset: () => {
    settings.presetsData.push({
      name: state.currentPreset,
      currentIDKeyName: state.currentIDKeyName,
      currentID: state.currentID,
      itemsToCopy: state.itemsToCopy,
    });
    settings.currentPreset = state.currentPreset;

    // Save the presets to local storage
    // localStorage.setItem("presets", JSON.stringify(settings.presetsData));
  },

  loadPreset: (preset: PresetObject) => {
    state.currentIDKeyName = preset.currentIDKeyName;
    state.currentID = preset.currentID;
    state.itemsToCopy = preset.itemsToCopy;
    settings.thingsToCopyRaw = preset.itemsToCopy.join("\n");

    settings.currentPreset = preset.name;
  },
};
