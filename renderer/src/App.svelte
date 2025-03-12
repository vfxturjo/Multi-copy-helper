<script lang="ts">
  import ipc, { ipcr } from "./ipc";
  import ClipboardIcon from "./assets/MainLogo.svelte";
  import DragLogo from "./assets/DragLogo.svelte";

  import { itemsToCopyDefault } from "./itemsToCopy";
  import { SavedData, settings, settingsMethods, state as st } from "./state/state.svelte";
  import { applyFadeOutTransition } from "./myCustomStyles";
  import { onMount } from "svelte";
  import KeyboardLogo from "./assets/keyboardLogo.svelte";

  st.itemsToCopy = itemsToCopyDefault;
  st.currentCopyingVar = null;

  $effect(() => {
    document.documentElement.style.setProperty("--UISCALE", settings.UIScale.toString());
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
    registerGlobalShortcutForListeningToCancel();
  }

  function setClipboardValueToData(value: string) {
    // reformat value to be more readable
    value = value.replace(/^\s+|\s+$/g, "");

    if (st.currentCopyingID !== null && st.currentCopyingVar !== null) {
      if (st.currentCopyingVar === "###ID###") {
        st.currentCopyingID = value.trim();
      } else {
        if (st.copiedData[st.currentCopyingID] === undefined) {
          st.copiedData[st.currentCopyingID] = {};
        }
        st.copiedData[st.currentCopyingID][st.currentCopyingVar] = value.trim();
      }

      // do animation
      const element = document
        .querySelectorAll("#itemsToCopy-" + st.currentCopyingVar)
        .forEach((e) => {
          applyFadeOutTransition(e as HTMLButtonElement, {
            stylingClass: "btn-success",
            startDelay: 1,
            removeClass: ["btn-success", "btn-soft", "opacity-60"],
          });
        });

      // reset currently selecting thing
      if (!settings.autoStartNextItem) {
        st.currentCopyingVar = null;
        unregisterGlobalShortcutForListeningToCancel();
      } else {
        startWaitingForClipboard(st.itemsToCopy[0]);
      }
    }
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
    st.currentClipboard = "";
    st.currentCopyingVar = null;
    st.itemsToCopy = itemsToCopyDefault;
  }

  function copyFormattedData() {
    const defaultDelimiter = "\t";
    let formattedData = "";

    // for each item in state.copiedData do this and then join with new line

    for (const [key, value] of Object.entries(st.copiedData)) {
      for (const [key2, value2] of Object.entries(value)) {
        formattedData += `${value2}${defaultDelimiter}`;
      }
      formattedData = formattedData.slice(0, -1);
      formattedData += "\n";
    }
    formattedData = formattedData.slice(0, -1);

    navigator.clipboard.writeText(formattedData);
  }

  let draggable = $state(false);
  let draggableTimerHandle: NodeJS.Timeout;
  let draggableTimerHandleLogoEnter: NodeJS.Timeout;

  onMount(() => {
    settingsMethods.loadPreset(SavedData.v.presets[0]);

    // if (settings.CapsLockNavigation) {
    //   SetNumKeysNavigation(state.itemsToCopy);
    // }
  });

  $effect(() => {
    if (settings.CapsLockNavigation) {
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
        setClipboardValueToData(key);
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
  style="max-width: calc(calc(100vw / var(--UISCALE)) - {settings.UIShortenPx}px);"
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
        <button
          class="absolute fill-yellow-300 bottom-0 right-0 w-4 h-4 flex justify-center items-center -translate-x-19 -translate-y-1"
        >
          <KeyboardLogo width={16} height={16} />
        </button>
      {/if}
    </div>

    <!-- LEFT BOTTOM SIDE -->
    <div class="flex flex-col overflow-hidden max-h-24">
      <div class="text-right w-full px-3">
        <span class="text-sm opacity-50">{st.currentIDKeyName}:</span>
        <button
          class="btn btn-neutral btn-sm {st.currentCopyingVar === '###ID###'
            ? 'btn-primary'
            : 'btn-neutral'}"
          onclick={() => {
            startWaitingForClipboard("###ID###");
          }}
          ondblclick={() => {
            getCurrentClipboardAndSave("###ID###");
          }}
        >
          {st.currentCopyingID == "" ? "Set ID" : st.currentCopyingID}
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
                : 'btn-outline'}"
            onclick={() => {
              startWaitingForClipboard(item);
            }}
            ondblclick={() => {
              getCurrentClipboardAndSave(item);
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
          class="btn btn-sm"
          onclick={() => {
            ipc.openDevTools();
          }}
        >
          DevTools
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
        <button
          class="btn btn-sm"
          onclick={(e) => {
            clearState();
            applyFadeOutTransition(e.target as HTMLButtonElement);
          }}
        >
          ClearAll
        </button>
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
    <h3 class="opacity-30 mb-0">Current State</h3>
    <div class="text-sm">
      {#each st.itemsToCopy as item}
        <p>
          <span class="opacity-50">{item}:</span>
          {st.copiedData[st.currentCopyingID]?.[item]}
        </p>
      {/each}
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
    <div class="prose">
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
    <legend class="fieldset-legend">current preset name</legend>
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
  <div class="flex flex-col prose w-full">
    <h3>Settings</h3>

    <!-- reset all button -->
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

    <fieldset class="fieldset">
      <legend class="fieldset-legend">UI Scale: {settings.UIScale}</legend>
      <select bind:value={settings.UIScale} placeholder="UI Scale" class="select">
        <option disabled selected>UI Scale</option>
        {#each Array(11) as _, i}
          <option value={(0.9 + i * 0.1).toFixed(1)}>{(0.9 + i * 0.1).toFixed(1)}</option>
        {/each}
      </select>
    </fieldset>

    <fieldset class="fieldset">
      <legend class="fieldset-legend">Reduce window size</legend>
      <input type="range" min="0" max="500" bind:value={settings.UIShortenPx} class="range" />
    </fieldset>

    <fieldset class="fieldset">
      <legend class="fieldset-legend">Auto next variable</legend>
      <label class="swap btn">
        <input type="checkbox" bind:checked={settings.autoStartNextItem} />
        <div class="swap-on">ON</div>
        <div class="swap-off">OFF</div>
      </label>
    </fieldset>

    <fieldset class="fieldset">
      <legend class="fieldset-legend">Choose Var with CapsLock</legend>
      <label class="swap btn">
        <input type="checkbox" bind:checked={settings.CapsLockNavigation} />
        <div class="swap-on">ON</div>
        <div class="swap-off">OFF</div>
      </label>
    </fieldset>
  </div>
{/snippet}
