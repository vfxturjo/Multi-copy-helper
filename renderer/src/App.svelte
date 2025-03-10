<script lang="ts">
  import ipc, { ipcr } from "./ipc";
  import ClipboardIcon from "./assets/MainLogo.svelte";
  import DragLogo from "./assets/DragLogo.svelte";

  import { itemsToCopyDefault } from "./itemsToCopy";
  import { SavedData, settings, settingsMethods, state } from "./state/state.svelte";
  import { applyFadeOutTransition } from "./myCustomStyles";
  import { onMount } from "svelte";

  state.itemsToCopy = itemsToCopyDefault;
  state.currentCopying = null;

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
    ipc.globalShortcutToCancelCopy();
  }

  ipc.on("cancel-copy", () => {
    state.currentCopying = null;
  });

  ipc.on("clipboard-changed", (_: any, value: string) => {
    // set current clipboard
    state.currentClipboard = value;

    setClipboardValueToData(value);
  });

  function setClipboardValueToData(value: string) {
    // reformat value to be more readable
    value = value.replace(/^\s+|\s+$/g, "");

    if (state.currentCopying !== null) {
      if (state.currentCopying === "###ID###") {
        state.currentID = value;
      } else {
        state.copiedData[state.currentCopying] = value.trim();
      }

      state.currentCopying = null;
    }
  }

  // get current clipboard
  function getCurrentClipboardAndSave(toCopy: string) {
    ipcr.invoke("get-clipboard").then((value: string) => {
      state.currentClipboard = value;

      setClipboardValueToData(value);
    });
  }

  // for each thing with class INTERACTIVE, set onmouseenter to unignore mouse events
  document.querySelectorAll(".INTERACTIVE").forEach((el) => {
    el.addEventListener("mouseenter", () => {
      ignoreMouseEvents(false);
    });
  });

  function clearState() {
    state.copiedData = {};
    state.currentID = "";
    state.currentClipboard = "";
    state.currentCopying = null;
    state.itemsToCopy = itemsToCopyDefault;
  }

  function copyFormattedData() {
    const defaultDelimiter = "\t";
    let formattedData = "";

    // get data values as rows as a string for a clipboard
    for (const [key, value] of Object.entries(state.copiedData)) {
      formattedData += `${value}${defaultDelimiter}`;
    }
    formattedData = formattedData.slice(0, -1);

    navigator.clipboard.writeText(formattedData);
  }

  let draggable = false;
  let draggableTimerHandle: NodeJS.Timeout;
  let draggableTimerHandleLogoEnter: NodeJS.Timeout;

  onMount(() => {
    settingsMethods.loadPreset(SavedData.v.presets[0]);
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
  class="INTERACTIVE max-w-[496px] absolute bottom-0 right-0 overflow-hidden flex flex-col-reverse flex-wrap-reverse items-start"
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
        if (state.showMainWindowLock) {
          state.showMainWindowLock = false;
          state.currentPreviewView = "DataPreview";
        } else {
          state.showMainWindowLock = true;
        }
      }}
      onmouseenter={() => {
        state.showMainWindow = true;

        clearTimeout(draggableTimerHandle);
        draggableTimerHandleLogoEnter = setTimeout(() => {
          draggable = true;
        }, 1000);
      }}
      onmouseleave={() => {
        state.showMainWindow = false;

        clearTimeout(draggableTimerHandleLogoEnter);
        clearTimeout(draggableTimerHandle);
        draggableTimerHandle = setTimeout(() => {
          draggable = false;
        }, 2000);
      }}
    >
      <ClipboardIcon width={48} height={48} />
      {#if draggable}
        <button
          class="absolute bg-accent bottom-0 right-0 w-8 h-8 flex justify-center items-center WinDraggable"
        >
          <DragLogo width={10} height={10} />
        </button>
      {/if}
    </div>

    <!-- LEFT BOTTOM SIDE -->
    <div class="flex flex-col overflow-hidden max-h-24">
      <div class="text-right w-full px-3">
        <span class="text-sm opacity-50">{state.currentIDKeyName}:</span>
        <span>{state.currentID}</span>
      </div>
      <div
        style="scrollbar-width: thin; scrollbar-color: f1f1f1; "
        class=" flex flex-row justify-end items-center overflow-hidden p-2 gap-1 flex-wrap overflow-y-auto w-full"
      >
        {#each state.itemsToCopy as item}
          <button
            class="btn btn-sm {state.currentCopying === item
              ? 'btn-primary'
              : state.copiedData[item] !== undefined
                ? 'btn-success' // CHANGE LATER
                : 'btn-neutral'}"
            onclick={() => {
              state.currentCopying = item;
              registerGlobalShortcutForListeningToCancel();
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
  {#if state.showMainWindowLock || state.showMainWindow}
    <div class="w-full h-full flex flex-row-reverse items-end overflow-hidden">
      <div
        class="shrink-0 flex flex-col gap-1 w-24 p-2 {state.showMainWindowLock ? '' : 'opacity-30'}"
      >
        <button
          class="btn btn-sm"
          onclick={() => {
            ipc.ToggleAlwaysOnTop();
            state.isAlwaysOnTop = !state.isAlwaysOnTop;
          }}
        >
          <!-- circle indicator to show always on top status -->
          {#if state.isAlwaysOnTop}
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
          class="btn btn-sm {state.currentPreviewView === 'settings' ? 'btn-success' : ''}"
          onclick={() => {
            state.currentPreviewView =
              state.currentPreviewView === "settings" ? "DataPreview" : "settings";
          }}
        >
          Settings
        </button>

        <button
          class="btn btn-sm {state.currentPreviewView === 'presets' ? 'btn-success' : ''}"
          onclick={() => {
            state.currentPreviewView =
              state.currentPreviewView === "presets" ? "DataPreview" : "presets";
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

        <button
          class="btn btn-neutral btn-sm {state.currentCopying === '###ID###'
            ? 'btn-primary'
            : 'btn-neutral'}"
          onclick={() => {
            state.currentCopying = "###ID###";
            registerGlobalShortcutForListeningToCancel();
          }}
          ondblclick={() => {
            getCurrentClipboardAndSave("###ID###");
          }}
        >
          SetVarID
        </button>
      </div>

      <!-- PREVIEW THINGS -->
      <div class="min-h-64 grow flex flex-col items-end p-2 bg-gray-800 prose">
        {#if state.currentPreviewView === "DataPreview"}
          {@render DataPreview()}
        {:else if state.currentPreviewView === "presets"}
          {@render PresetsPane()}
        {:else if state.currentPreviewView === "settings"}
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
      {#each state.itemsToCopy as item}
        <p>
          <span class="opacity-50">{item}:</span>
          {state.copiedData[item]}
        </p>
      {/each}
      <!-- show current clipboard -->
      <p class="opacity-50 text-xs">
        Clipboard:
        {state.currentClipboard.length > 100
          ? state.currentClipboard.slice(0, 100) + "..."
          : state.currentClipboard}
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
          bind:value={state.currentIDKeyName}
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
              state.thingsToCopyLinesOk = false;
            } else {
              state.thingsToCopyLinesOk = true;
            }
          }}
        ></textarea>
        <button
          class="btn btn-sm {state.itemsToCopy.join('\n') !== settings.thingsToCopyRaw
            ? !state.thingsToCopyLinesOk
              ? 'btn-disabled'
              : 'btn-primary'
            : 'btn-neutral'}"
          onclick={() => {
            settings.thingsToCopyRaw = settings.thingsToCopyRaw.trim();
            settings.thingsToCopyRaw.split("\n");
            state.itemsToCopy = settings.thingsToCopyRaw.split("\n").map((item) => item.trim());
          }}
        >
          {!state.thingsToCopyLinesOk ? "Dupes not allowed!" : "Save"}
        </button>
      </fieldset>
    </div>
  </div>
{/snippet}

{#snippet PresetManager()}
  <!-- current preset name -->
  <fieldset class="fieldset">
    <legend class="fieldset-legend">current preset name</legend>
    <input
      type="text"
      class="input"
      placeholder="current preset"
      bind:value={state.currentPreset}
    />

    <!-- add new preset button -->
    <button
      class="btn btn-sm {SavedData.v.presets
        .find((preset) => preset.name == state.currentPreset)
        ?.itemsToCopy.toString() != state.itemsToCopy.toString()
        ? 'btn-primary'
        : 'btn-neutral'}"
      onclick={(e) => {
        if (SavedData.v.presets.find((preset) => preset.name === state.currentPreset)) {
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
      {#if !SavedData.v.presets.find((preset) => preset.name == state.currentPreset)}
        Add New
      {:else}
        {SavedData.v.presets
          .find((preset) => preset.name == state.currentPreset)
          ?.itemsToCopy.toString() != state.itemsToCopy.toString()
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
        class="btn btn-sm w-fit {preset.name === state.currentPreset
          ? 'btn-primary'
          : 'btn-neutral'}"
        onclick={(e) => {
          state.currentPreset = preset.name;
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
  </div>
{/snippet}
