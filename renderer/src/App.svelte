<script lang="ts">
  import ipc, { ipcr } from "./ipc";
  import ClipboardIcon from "./assets/MainLogo.svelte";
  import DragLogo from "./assets/DragLogo.svelte";

  import { itemsToCopyDefault } from "./itemsToCopy";
  import {
    SavedData,
    settings,
    settingsMethods,
    state as st,
    type PresetObject,
  } from "./state/state.svelte";
  import { applyFadeOutTransition } from "./myCustomStyles";
  import { onMount } from "svelte";
  import KeyboardLogo from "./assets/keyboardLogo.svelte";

  st.itemsToCopy = itemsToCopyDefault;
  st.currentCopyingVar = null;

  $effect(() => {
    document.documentElement.style.setProperty("--UISCALE", SavedData.v.UIScale.toString());
  });

  //
  // handling mouse events outside the window
  //
  // initally ignore mouse events
  // ipc.setIgnoreMouseEvents(true, { forward: true });
  function ignoreMouseEvents(ignore = true) {
    if (ignore === true) {
      ipc.setIgnoreMouseEvents(true, { forward: true });
    } else {
      ipc.setIgnoreMouseEvents(false);
    }
  }

  // // handle new things
  // console.log("ipcr", ipcr);
  // console.log("ipc", ipc);

  // register global shortcut
  function registerGlobalShortcutForListeningToCancel() {
    ipc.registerGlobalShortcutForListeningToCancel();
  }

  function unregisterGlobalShortcutForListeningToCancel() {
    ipc.unregisterGlobalShortcutForListeningToCancel();
  }

  function SetNumKeysNavigation(keys: string[]) {
    ipc.SetNumKeysNavigation(JSON.stringify(keys));
  }

  function disableCapsLockNavigation() {
    // sending an empty array to disable
    ipc.SetNumKeysNavigation();
  }

  ipc.on("cancel-copy", () => {
    st.currentCopyingVar = null;
  });

  ipc.on("clipboard-changed", (_: any, value: string) => {
    // set current clipboard
    st.currentClipboard = value;
    setClipboardValueToData(value);
  });

  function startWaitingForClipboard(item: string) {
    st.currentCopyingVar = item;
    st.highlightNotCopied = false;
    registerGlobalShortcutForListeningToCancel();
  }

  function setClipboardValueToData(value: string) {
    // reformat value to be more readable
    value = value.replace(/^\s+|\s+$/g, "");

    if (st.currentCopyingID !== null && st.currentCopyingVar !== null) {
      if (st.currentCopyingVar === "###ID###") {
        st.currentCopyingID = value.trim();
      }

      if (st.copiedData[st.currentCopyingID] === undefined) {
        st.copiedData[st.currentCopyingID] = {};
      }

      if (st.currentCopyingVar !== "###ID###") {
        st.copiedData[st.currentCopyingID][st.currentCopyingVar] = value.trim();
      }

      // do animation
      let element: NodeListOf<Element>;
      if (st.currentCopyingVar !== "###ID###") {
        element = document.querySelectorAll("#itemsToCopy-" + st.currentCopyingVar);
      } else {
        element = document.querySelectorAll("#itemsToCopy-IDIDIDIDID___");
      }

      element.forEach((e) => {
        applyFadeOutTransition(e as HTMLButtonElement, {
          stylingClass: "btn-success",
          startDelay: 1,
          removeClass: ["btn-success", "btn-soft", "opacity-60"],
        });
      });

      // reset currently selecting thing
      if (!SavedData.v.autoStartNextItem) {
        // auto start OFF
        stopWaitingForClipboard();
      } else {
        // auto start ON
        getNextEmptyVarAndStartWaitingForIt();
      }
    }
  }

  function stopWaitingForClipboard() {
    st.currentCopyingVar = null;
    unregisterGlobalShortcutForListeningToCancel();
  }

  function getNextEmptyVarAndStartWaitingForIt() {
    const currentIndex = st.itemsToCopy.indexOf(st.currentCopyingVar!);
    let nextItem: string | null = null;

    // find the next index that has uncopied data
    for (let i = currentIndex + 1; i < st.itemsToCopy.length; i++) {
      const thisID = st.itemsToCopy[i];
      if (st.copiedData[st.currentCopyingID]?.[st.itemsToCopy[i]] === undefined) {
        nextItem = st.itemsToCopy[i];
        break;
      }
    }
    // if next item not found in this way, start from the beginning to search for an uncopied item
    if (nextItem === null) {
      for (let i = 0; i < st.itemsToCopy.length; i++) {
        const thisID = st.itemsToCopy[i];
        if (st.copiedData[st.currentCopyingID]?.[st.itemsToCopy[i]] === undefined) {
          nextItem = st.itemsToCopy[i];
          break;
        }
      }
    }

    if (nextItem) {
      startWaitingForClipboard(nextItem);
    } else {
      // st.highlightNotCopied = true;
    }

    return nextItem;
  }

  // get current clipboard
  function getCurrentClipboardAndSave(toCopy: string) {
    ipcr.invoke("get-clipboard").then((value: string) => {
      st.currentClipboard = value;
      setClipboardValueToData(value);
      unregisterGlobalShortcutForListeningToCancel();
    });
  }

  // for each thing with class INTERACTIVE, set onmouseenter to unignore mouse events
  document.querySelectorAll(".INTERACTIVE").forEach((el) => {
    el.addEventListener("mouseenter", () => {
      ignoreMouseEvents(false);
    });
  });

  function clearState() {
    st.copiedData = {};
    st.currentCopyingID = "";
    st.currentCopyingVar = null;

    settingsMethods.loadPreset(
      SavedData.v.presets.find((p) => p.name === st.currentPreset) as PresetObject,
    );
  }

  function copyFormattedData() {
    const defaultDelimiter = "\t";
    let formattedData = "";

    let copiedDataObj = Object.assign({}, st.copiedData);
    let copiedDataArray = [];

    for (const [key, value] of Object.entries(copiedDataObj)) {
      // create arrays of arrays from the entries
      // add also the main key or ID into the formatted data, specified by st.IDKeyPositionInData
      let row = Object.values(value);

      // Insert ID at specified position
      if (st.IDKeyPositionInData >= 0) {
        if (st.IDKeyPositionInData === 0) {
          row.unshift(key);
        } else if (st.IDKeyPositionInData <= row.length) {
          row.splice(st.IDKeyPositionInData, 0, key);
        } else {
          row.push(key);
        }
      }

      copiedDataArray.push(row);
    }

    // join each row array with delimiter and then join all rows with newline
    formattedData = copiedDataArray.map((row) => row.join(defaultDelimiter)).join("\n");
    navigator.clipboard.writeText(formattedData);
  }

  let draggable = $state(false);
  let draggableTimerHandle: NodeJS.Timeout;

  onMount(() => {
    const foundPreset = SavedData.v.presets.find((p) => p.name === SavedData.v.defaultPresetOnLoad);
    if (foundPreset) {
      st.currentPreset = foundPreset.name;
      settingsMethods.loadPreset(foundPreset);
    } else {
      settingsMethods.loadPreset(SavedData.v.presets[0]);
    }

    // enable numkeys navigations if enabled
    if (SavedData.v.capsLockNavigation) {
      console.log("enabling caps lock navigation");
      SetNumKeysNavigation(st.itemsToCopy);
    } else {
      disableCapsLockNavigation();
    }
  });

  $effect(() => {
    if (SavedData.v.capsLockNavigation) {
      console.log("enabling caps lock navigation");
      SetNumKeysNavigation(st.itemsToCopy);
    } else {
      disableCapsLockNavigation();
    }
  });

  let CapsLockNavigationTimerData: {
    key: string;
    timerHandle: NodeJS.Timeout | null;
    lastKeyTime: number | null;
    dblClickThreshldTime: number;
  } = $state({
    key: "",
    timerHandle: null,
    lastKeyTime: null,
    dblClickThreshldTime: 500,
  });

  ipc.on("CapsLockNavigationPressed", (_: any, key: string) => {
    console.log("CapsLockNavigationPressed", key);

    // single click happened
    console.log("assuming singleClick");
    startWaitingForClipboard(key);
    // CapsLockNavigationTimerData.timerHandle = setTimeout(() => {
    //   // ipcr.send("globalShortcutToCancel", "stop");
    // }, 500);

    if (CapsLockNavigationTimerData.key === key) {
      if (
        Date.now() - CapsLockNavigationTimerData.lastKeyTime! <
        CapsLockNavigationTimerData.dblClickThreshldTime
      ) {
        // double click happened
        console.log("dblClick");
        // setClipboardValueToData(key);
        getCurrentClipboardAndSave(key);
      }
    }

    // set last click things
    if (CapsLockNavigationTimerData.key !== key) {
      CapsLockNavigationTimerData.key = key;
    }
    CapsLockNavigationTimerData.lastKeyTime = Date.now();
  });

  ipc.on("NumKeysNavigationOn", (_: any, bool: boolean) => {
    console.log("NumKeysNavigationOn", _, bool);
    st.numKeysNavigationState = bool;
  });
</script>

<div
  class="fixed left-0 right-0 top-0 bottom-0 isolate"
  role="none"
  onmouseenter={() => ignoreMouseEvents()}
  onmouseleave={() => ignoreMouseEvents(false)}
></div>

<div
  id="main-window"
  style="max-width: calc(calc(100vw / var(--UISCALE)) - {SavedData.v.UIShortenPx}px);"
  class="INTERACTIVE absolute bottom-0 right-0 overflow-hidden flex flex-col-reverse flex-wrap-reverse items-start"
>
  <!-- Bottom part -->
  <div class="flex flex-row-reverse">
    <!-- Main LOGO -->
    <div
      role="none"
      class="w-24 h-24 inline-flex justify-center items-center overflow-hidden shrink-0 bg-green-900"
      id="main-logo"
      ondblclick={() => {
        copyFormattedData();
      }}
      onclick={() => {
        if (st.showMainWindowLock) {
          st.showMainWindowLock = false;
          st.currentPreviewView = "DataPreview";
        } else {
          st.showMainWindowLock = true;
        }
      }}
      onmouseenter={() => {
        st.showMainWindow = true;

        clearTimeout(draggableTimerHandle);
        draggable = true;
        // draggableTimerHandleLogoEnter = setTimeout(() => {
        // }, 1000);
      }}
      onmouseleave={() => {
        st.showMainWindow = false;

        // clearTimeout(draggableTimerHandleLogoEnter);
        clearTimeout(draggableTimerHandle);
        draggableTimerHandle = setTimeout(() => {
          draggable = false;
        }, 2000);
      }}
    >
      <ClipboardIcon width={48} height={48} />

      <!-- Dragging icon -->
      {#if draggable}
        <button
          class="absolute bg-accent bottom-0 right-0 w-8 h-8 flex justify-center items-center WinDraggable"
        >
          <DragLogo width={10} height={10} />
        </button>
      {/if}

      <!-- global keyboard shortcuts indicator -->
      {#if st.numKeysNavigationState}
        <div
          class="absolute select-none fill-yellow-300 bottom-0 right-0 w-4 h-4 flex justify-center items-center -translate-x-19 -translate-y-1"
        >
          <KeyboardLogo width={16} height={16} />
        </div>
      {/if}
    </div>

    <!-- LEFT BOTTOM SIDE -->
    <div class="flex flex-col overflow-hidden max-h-24">
      <div class="text-right w-full px-3">
        <span class="text-sm opacity-50">{st.currentIDKeyName}:</span>
        <button
          id="itemsToCopy-IDIDIDIDID___"
          class="btn btn-neutral btn-sm {st.currentCopyingVar === '###ID###'
            ? 'btn-primary'
            : st.currentCopyingID == ''
              ? 'bg-red-800'
              : 'btn-neutral'}
            {Object.keys(st.copiedData[st.currentCopyingID] || {}).length === st.itemsToCopy.length
            ? 'btn-warning animate-pulse'
            : ''}"
          onclick={() => {
            startWaitingForClipboard("###ID###");
          }}
          ondblclick={() => {
            getCurrentClipboardAndSave("###ID###");
          }}
          oncontextmenu={(e) => {
            e.preventDefault();
            st.currentCopyingVar = "";
            unregisterGlobalShortcutForListeningToCancel();
          }}
        >
          {st.currentCopyingID == "" ? "...Set ID First..." : st.currentCopyingID}
        </button>
      </div>
      <div
        style="scrollbar-width: thin; scrollbar-color: f1f1f1; "
        class=" flex flex-row justify-end items-center overflow-hidden p-2 gap-1 flex-wrap overflow-y-auto w-full"
      >
        {#each st.itemsToCopy as item}
          <button
            id="itemsToCopy-{item}"
            class="btn btn-sm {st.currentCopyingVar === item
              ? 'btn-primary btn-active'
              : st.copiedData[st.currentCopyingID]?.[item] !== undefined
                ? 'btn-success btn-soft opacity-60' // CHANGE LATER
                : st.highlightNotCopied
                  ? 'btn-warning animate-pulse'
                  : 'btn-outline'}"
            onclick={() => {
              startWaitingForClipboard(item);
            }}
            ondblclick={() => {
              getCurrentClipboardAndSave(item);
            }}
            oncontextmenu={(e) => {
              e.preventDefault();
              st.currentCopyingVar = "";
              unregisterGlobalShortcutForListeningToCancel();
            }}
          >
            {item}
          </button>
        {/each}
      </div>
    </div>
  </div>

  <!-- RIGHT TOP SIDE -->
  {#if st.showMainWindowLock || st.showMainWindow}
    <div class="w-full h-full flex flex-row-reverse items-end overflow-hidden">
      <div
        class="shrink-0 flex flex-col gap-1 w-24 p-2 {st.showMainWindowLock ? '' : 'opacity-30'}"
      >
        <button
          class="btn btn-sm"
          onclick={() => {
            ipc.ToggleAlwaysOnTop();
            st.isAlwaysOnTop = !st.isAlwaysOnTop;
          }}
        >
          <!-- circle indicator to show always on top status -->
          {#if st.isAlwaysOnTop}
            <div aria-label="status" class="status status-sm status-success"></div>
          {:else}
            <div aria-label="status" class="status status-sm status-neutral"></div>
          {/if}
          AOnTop
        </button>

        <button
          class="btn btn-sm {st.currentPreviewView === 'settings' ? 'btn-success' : ''}"
          onclick={() => {
            st.currentPreviewView =
              st.currentPreviewView === "settings" ? "DataPreview" : "settings";
          }}
        >
          Settings
        </button>

        <button
          class="btn btn-sm {st.currentPreviewView === 'presets' ? 'btn-success' : ''}"
          onclick={() => {
            st.currentPreviewView = st.currentPreviewView === "presets" ? "DataPreview" : "presets";
          }}
        >
          Presets
        </button>

        <!-- list of copied IDs -->
        <select
          class="select"
          bind:value={st.currentCopyingID}
          onwheel={(e) => {
            const keys = Object.keys(st.copiedData);
            const currentIndex = keys.findIndex((id) => id === st.currentCopyingID);
            const len = keys.length;

            if (e.deltaY > 0) {
              st.currentCopyingID = keys[currentIndex > 0 ? currentIndex - 1 : len - 1];
            } else {
              st.currentCopyingID = keys[currentIndex < len - 1 ? currentIndex + 1 : 0];
            }
          }}
        >
          {#each Object.keys(st.copiedData) as entry}
            <option>{entry}</option>
          {/each}
        </select>
      </div>

      <!-- PREVIEW THINGS -->
      <div class="min-h-64 grow flex flex-col items-end p-2 bg-gray-800 prose">
        {#if st.currentPreviewView === "DataPreview"}
          {@render DataPreview()}
        {:else if st.currentPreviewView === "presets"}
          {@render PresetsPane()}
        {:else if st.currentPreviewView === "settings"}
          {@render SettingsPane()}
        {/if}
      </div>
    </div>
  {/if}
</div>

{#snippet DataPreview()}
  <div class="prose w-full">
    <h3 class="opacity-30 mb-0">
      Current State ({Object.keys(st.copiedData).findIndex((id) => id === st.currentCopyingID) +
        1}/{Object.keys(st.copiedData).length})
    </h3>
    <p class="opacity-30 text-xs">Preset: {st.currentPreset}</p>
    <div class="text-sm">
      <!-- one for id -->
      <p class="flex items-center">
        <span class="opacity-50">ID:</span>
        <input
          type="text"
          placeholder=""
          class="input input-ghost input-sm"
          value={st.currentCopyingID}
          oninput={(e) => {
            st.currentCopyingID = e.currentTarget.value;
          }}
        />
      </p>

      <!-- all variables -->
      {#each st.itemsToCopy as item}
        <p class="flex items-center">
          <span class="opacity-50">{item}:</span>
          <input
            type="text"
            placeholder=""
            class="input input-ghost input-sm"
            value={st.copiedData[st.currentCopyingID]?.[item] || ""}
            oninput={(e) => {
              if (!st.copiedData[st.currentCopyingID]) st.copiedData[st.currentCopyingID] = {};
              st.copiedData[st.currentCopyingID][item] = e.currentTarget.value;
            }}
            onchange={(e) => {
              // if was waiting for current thing to copy, then start waiting for next thing to copy if auto start next is on
              // else stop waiting for current thing to copy
              if (st.currentCopyingVar === item) {
                if (SavedData.v.autoStartNextItem) {
                  getNextEmptyVarAndStartWaitingForIt();
                } else {
                  stopWaitingForClipboard();
                }
              }
            }}
          />
          <!-- {st.copiedData[st.currentCopyingID]?.[item]} -->
        </p>
      {/each}
      <div class="divider"></div>

      <!-- show current clipboard -->
      <p class="opacity-50 text-xs">
        Clipboard:
        {st.currentClipboard.length > 100
          ? st.currentClipboard.slice(0, 100) + "..."
          : st.currentClipboard}
      </p>
    </div>
  </div>
{/snippet}

{#snippet PresetsPane()}
  <div class="flex gap-2 w-full">
    <!-- preset manager -->
    <div class="prose max-w-3/5">
      <h3 class="opacity-30 mb-0">Presets</h3>
      {@render PresetManager()}
    </div>

    <div class="divider divider-horizontal m-0"></div>

    <!-- This preset settings -->
    <div class="prose min-w-36 w-full">
      <h3 class="opacity-30 mb-0">Current Preset</h3>

      <fieldset class="fieldset">
        <legend class="fieldset-legend">ID Key Name</legend>
        <input
          type="text"
          class="input input-sm"
          placeholder="ID Key Name"
          bind:value={st.currentIDKeyName}
        />
      </fieldset>

      <fieldset class="fieldset">
        <legend class="fieldset-legend">Things to Copy</legend>
        <textarea
          class="textarea h-52"
          placeholder="columns to copy"
          bind:value={settings.thingsToCopyRaw}
          onpaste={(event) => {
            event.preventDefault();
            settings.thingsToCopyRaw = event
              .clipboardData!.getData("Text")
              .trim()
              .replace(/\t/g, "\n");
          }}
          onkeyup={(event) => {
            // check if any two lines are equal
            const lines = settings.thingsToCopyRaw.trim().split("\n");
            const uniqueLines = new Set(lines);

            if (uniqueLines.size !== lines.length) {
              st.thingsToCopyLinesOk = false;
            } else {
              st.thingsToCopyLinesOk = true;
            }
          }}
        ></textarea>

        <fieldset class="fieldset">
          <legend class="fieldset-legend">ID Key position when exporting</legend>
          <select class="select" bind:value={st.IDKeyPositionInData}>
            <option value={-1}>Don't export (not recommended)</option>
            <option value={0}>First</option>
            {#each st.itemsToCopy as _, i}
              <option value={i + 1}>After {st.itemsToCopy[i]}</option>
            {/each}
          </select>
        </fieldset>

        <button
          class="btn btn-sm {st.itemsToCopy.join('\n') !== settings.thingsToCopyRaw
            ? !st.thingsToCopyLinesOk
              ? 'btn-disabled'
              : 'btn-primary'
            : 'btn-neutral'}"
          onclick={() => {
            settings.thingsToCopyRaw = settings.thingsToCopyRaw.trim();
            settings.thingsToCopyRaw.split("\n");
            st.itemsToCopy = settings.thingsToCopyRaw.split("\n").map((item) => item.trim());
          }}
        >
          {!st.thingsToCopyLinesOk ? "Dupes not allowed!" : "Save"}
        </button>
      </fieldset>
    </div>
  </div>
{/snippet}

{#snippet PresetManager()}
  <!-- current preset name -->
  <fieldset class="fieldset">
    <legend class="fieldset-legend">Current preset name</legend>
    <input type="text" class="input" placeholder="current preset" bind:value={st.currentPreset} />

    <!-- add new preset button -->
    <button
      class="btn btn-sm {SavedData.v.presets
        .find((preset) => preset.name == st.currentPreset)
        ?.itemsToCopy.toString() != st.itemsToCopy.toString()
        ? 'btn-primary'
        : 'btn-neutral'}"
      onclick={(e) => {
        if (SavedData.v.presets.find((preset) => preset.name === st.currentPreset)) {
          settingsMethods.updatePreset();
        } else {
          settingsMethods.addPreset();
        }

        applyFadeOutTransition(e.target as HTMLButtonElement, {
          stylingClass: "btn-success",
          startDelay: 1,
        });
      }}
    >
      <!-- show "Add New" if there is no preset with the same name -->
      {#if !SavedData.v.presets.find((preset) => preset.name == st.currentPreset)}
        Add New
      {:else}
        {SavedData.v.presets
          .find((preset) => preset.name == st.currentPreset)
          ?.itemsToCopy.toString() != st.itemsToCopy.toString()
          ? "Update"
          : "Saved"}
      {/if}
    </button>
  </fieldset>

  <div class="divider m-0"></div>
  <!-- preset list -->
  <div class="w-full flex flex-row justify-end items-center overflow-hidden p-2 gap-1 flex-wrap">
    {#each SavedData.v.presets as preset}
      <button
        class="btn btn-sm w-fit {preset.name === st.currentPreset ? 'btn-primary' : 'btn-neutral'}"
        onclick={(e) => {
          st.currentPreset = preset.name;
          settingsMethods.loadPreset(preset);
        }}
        oncontextmenu={(e) => {
          e.preventDefault();
          settingsMethods.deletePreset(preset);
        }}
      >
        {preset.name}
      </button>
    {/each}
  </div>
{/snippet}

{#snippet SettingsPane()}
  <div
    class="flex flex-col prose"
    style="width: calc(calc(calc(calc(100vw / var(--UISCALE)) - {SavedData.v
      .UIShortenPx}px) - calc(var(--spacing) * 24)) - 16px);"
  >
    <h3>Settings</h3>
    <p class="text-sm p-0 !mt-0 w-full text-center">
      Created By <a href="https://github.com/vfxturjo">vfxTurjo</a>.
    </p>

    <!-- reset all button -->
    <div class="flex flex-row gap-2 justify-center w-full">
      <button
        class="btn btn-sm"
        onclick={(e) => {
          settingsMethods.resetSettings();
          applyFadeOutTransition(e.target as HTMLButtonElement, {
            stylingClass: "btn-success",
            startDelay: 1,
          });
        }}
      >
        Reset All
      </button>

      <button
        class="btn btn-sm"
        onclick={(e) => {
          settingsMethods.resetPresets();
          applyFadeOutTransition(e.target as HTMLButtonElement, {
            stylingClass: "btn-success",
            startDelay: 1,
          });
        }}
      >
        Reset Presets only
      </button>

      <button
        class="btn btn-sm"
        onclick={(e) => {
          ipc.openAppDataFolder();
          applyFadeOutTransition(e.target as HTMLButtonElement, {
            stylingClass: "btn-success",
            startDelay: 1,
          });
        }}
      >
        Open AppData Folder
      </button>

      <button
        class="btn btn-sm"
        onclick={() => {
          ipc.openDevTools();
        }}
      >
        Open DevTools
      </button>
    </div>
    <div class="divider">App</div>

    <div class=" w-full fieldset flex justify-between">
      <legend class="fieldset-legend">UI Scale: {SavedData.v.UIScale}</legend>
      <select bind:value={SavedData.v.UIScale} placeholder="UI Scale" class="select w-1/2">
        <option disabled selected>UI Scale</option>
        {#each Array(11) as _, i}
          <option value={(0.9 + i * 0.1).toFixed(1)}>{(0.9 + i * 0.1).toFixed(1)}</option>
        {/each}
      </select>
    </div>

    <div class="w-full fieldset flex justify-between">
      <legend class="fieldset-legend">Reduce Max width</legend>
      <input
        type="range"
        min="0"
        max="500"
        class="range w-1/2"
        value={SavedData.v.UIShortenPx}
        onchange={(e) => {
          SavedData.v.UIShortenPx = parseInt((e.target as HTMLInputElement).value);
        }}
      />
    </div>

    <div class="fieldset flex gap-0 pb-0 mb-0 justify-between">
      <legend class="fieldset-legend pb-1"> Auto select next variable </legend>

      <label class="swap btn w-1/2">
        <input type="checkbox" bind:checked={SavedData.v.autoStartNextItem} />
        <div class="swap-on">ON</div>
        <div class="swap-off">OFF</div>
      </label>
    </div>

    <div class="fieldset flex gap-0 pb-0 mb-0 justify-between">
      <div class="w-1/2">
        <legend class="fieldset-legend pb-1">
          Choose Variables using Number keys <br />
        </legend>
        <span class="opacity-60">Ctrl+Home=>start, Ctrl+End=>end. CapsLock=>Toggle</span>
      </div>
      <label class="swap btn w-1/2">
        <input type="checkbox" bind:checked={SavedData.v.capsLockNavigation} />
        <div class="swap-on">ON</div>
        <div class="swap-off">OFF</div>
      </label>
    </div>

    <div class="fieldset flex justify-between p-0">
      <legend class="fieldset-legend">Default Preset on Start</legend>
      <select
        bind:value={SavedData.v.defaultPresetOnLoad}
        placeholder="Default Preset"
        class="select w-1/2"
      >
        {#each SavedData.v.presets as preset}
          <option value={preset.name}>{preset.name}</option>
        {/each}
      </select>
    </div>

    <div class="divider">Session</div>

    <button
      class="btn btn-sm"
      onclick={(e) => {
        clearState();
        applyFadeOutTransition(e.target as HTMLButtonElement);
      }}
    >
      Clear All Collected Data
    </button>
  </div>
{/snippet}
