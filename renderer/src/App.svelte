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
  import TickLogo from "./assets/TickLogo.svelte";
  import { fade } from "svelte/transition";

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

      currentItemAnimate();
      currentItemDone();
    }
  }

  function miniPreviewEditingEnd() {
    st.miniPreview = "";
    st.miniPreviewEditing = false;
    currentItemAnimate();
    currentItemDone();
  }

  function currentItemAnimate() {
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
  }

  function currentItemDone() {
    // reset currently selecting thing
    if (!SavedData.v.autoStartNextItem) {
      // auto start OFF
      stopWaitingForClipboard();
    } else {
      // auto start ON
      getNextEmptyVarAndStartWaitingForIt();
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
      stopWaitingForClipboard();
      // st.highlightNotCopied = true;
    }

    return nextItem;
  }

  // get current clipboard
  function getCurrentClipboardAndSave(toCopy: string) {
    if (SavedData.v.capsLockNavigationDirect) {
      //  if direct getting is enabled, press ctrl C to get the info then assign
      ipcr.invoke("press-ctrlC").then(() => {
        ipcr.invoke("get-clipboard").then((value: string) => {
          st.currentClipboard = value;
          setClipboardValueToData(value);
          unregisterGlobalShortcutForListeningToCancel();
        });
      });
    } else {
      // else jst get value and assign. same as above
      ipcr.invoke("get-clipboard").then((value: string) => {
        st.currentClipboard = value;
        setClipboardValueToData(value);
        unregisterGlobalShortcutForListeningToCancel();
      });
    }
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

    resetNumkeysNavigation();
  }

  function copyFormattedData() {
    const defaultDelimiter = "\t";
    let formattedData = "";

    let copiedDataObj = Object.assign({}, st.copiedData);
    let copiedDataArray = [];

    for (const [key, value] of Object.entries(copiedDataObj)) {
      // create arrays of arrays from the entries
      // add also the main key or ID into the formatted data, specified by st.IDKeyPositionInData

      // for every value object, create an array that comes from st.itemsToCopy (filling in gaps)
      for (let i = 0; i < st.itemsToCopy.length; i++) {
        if (value[st.itemsToCopy[i]] === undefined) {
          value[st.itemsToCopy[i]] = "";
        } else {
          value[st.itemsToCopy[i]] = value[st.itemsToCopy[i]].trim();
        }
      }

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

    // empty clipboard and then write formatted data
    ipcr.invoke("set-clipboard", formattedData);

    st.showCopiedSuccessLogo = true;

    setTimeout(() => {
      st.showCopiedSuccessLogo = false;
    }, 1000);
  }

  let draggable = $state(false);
  let draggableTimerHandle: NodeJS.Timeout;

  function resetNumkeysNavigation() {
    if (SavedData.v.capsLockNavigation) {
      SetNumKeysNavigation(st.itemsToCopy);
    } else {
      disableCapsLockNavigation();
    }
  }

  let mainWindow_width = 0;
  onMount(() => {
    const foundPreset = SavedData.v.presets.find((p) => p.name === SavedData.v.defaultPresetOnLoad);
    if (foundPreset) {
      st.currentPreset = foundPreset.name;
      settingsMethods.loadPreset(foundPreset);
    } else {
      settingsMethods.loadPreset(SavedData.v.presets[0]);
    }

    // if sidebar, make it sidebar
    ipcr.invoke("get-width").then((width) => {
      mainWindow_width = width;
    });
  });

  $effect(() => {
    SavedData.v.UI_asSideBar && ipcr.send("Sidebar-window", SavedData.v.UI_asSideBar);
  });

  $effect(() => {
    SavedData.v.capsLockNavigation;
    resetNumkeysNavigation();
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

  // auto backup code
  // in 1 min interval, send all copied data to the main process
  setInterval(() => {
    if (st.copiedData) {
      ipcr.send("autosave", JSON.stringify(st.copiedData, null, 2));
    }
  }, 60000);
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
      {#if st.showCopiedSuccessLogo}
        <TickLogo width={24} height={24} />
      {:else}
        <ClipboardIcon width={48} height={48} />
      {/if}

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
          class="btn btn-neutral btn-sm
           {st.currentCopyingVar === '###ID###'
            ? 'btn-primary'
            : st.currentCopyingID == ''
              ? 'bg-red-800'
              : Object.keys(st.copiedData[st.currentCopyingID] || {}).length ===
                  st.itemsToCopy.length
                ? 'btn-warning animate-pulse'
                : 'btn-neutral'}"
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
            class="btn btn-sm {(() => {
              // If this item is currently being copied
              if (st.currentCopyingVar === item) {
                return 'btn-primary btn-active animate-[pulse_1s_ease-out_infinite]';
              }
              // not currently copying
              // If this item does not exist or exists but empty
              if (
                st.copiedData[st.currentCopyingID]?.[item] === undefined ||
                st.copiedData[st.currentCopyingID]?.[item] === ''
              ) {
                // not copied and empty
                return 'btn-outline';
              }
              // not copied
              // If highlighting uncopied items
              if (st.highlightNotCopied) {
                return 'btn-warning';
              }
              // Successfully copied
              return 'btn-success btn-soft opacity-60';
            })()}
            }"
            onclick={() => {
              startWaitingForClipboard(item);
            }}
            onauxclick={() => {
              st.miniPreviewEditing = true;
              const focusEl = document.querySelector("#miniPreviewEditing") as HTMLInputElement;
              if (focusEl) {
                focusEl.focus();
              }
            }}
            ondblclick={() => {
              getCurrentClipboardAndSave(item);
            }}
            oncontextmenu={(e) => {
              e.preventDefault();
              st.currentCopyingVar = "";
              unregisterGlobalShortcutForListeningToCancel();
            }}
            onmouseenter={() => {
              if (st.miniPreviewEditing == true) return;
              st.miniPreview = item;
            }}
            onmouseleave={() => {
              if (st.miniPreviewEditing == true) return;
              st.miniPreview = "";
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
            SavedData.v.UI_showTransparentPreview_mini =
              !SavedData.v.UI_showTransparentPreview_mini;
          }}
        >
          <!-- circle indicator to show always on top status -->
          {#if SavedData.v.UI_showTransparentPreview_mini}
            <div aria-label="status" class="status status-sm status-success"></div>
          {:else}
            <div aria-label="status" class="status status-sm status-neutral"></div>
          {/if}
          APrevOn
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
      <div class="min-h-64 grow flex flex-col items-end p-2 bg-gray-800 prose max-w-full">
        {#if st.currentPreviewView === "DataPreview"}
          {@render DataPreview()}
        {:else if st.currentPreviewView === "presets"}
          {@render PresetsPane()}
        {:else if st.currentPreviewView === "settings"}
          {@render SettingsPane()}
        {/if}
      </div>
    </div>
  {:else if st.miniPreview !== "" || st.miniPreviewEditing == true}
    {@render DataPreviewMini(st.miniPreview)}
  {:else if SavedData.v.UI_showTransparentPreview_mini}
    {@render showTransparentPreview_mini()}
  {/if}
</div>

{#snippet showTransparentPreview_mini()}
  <div class="flex flex-col items-end w-full text-sm">
    {#each st.itemsToCopy as item}
      <p>
        <span class="opacity-70 {SavedData.v.UI_showTransparentPreview_mini_textSize}"
          >{st.copiedData[st.currentCopyingID]?.[item]} :</span
        >
        <span class="opacity-70 {SavedData.v.UI_showTransparentPreview_mini_textSize}">{item}</span>
      </p>
    {/each}
  </div>
{/snippet}

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
          class="input input-ghost input-sm w-full"
          value={st.currentCopyingID}
          oninput={(e) => {
            st.currentCopyingID = e.currentTarget.value;
          }}
        />
        <button
          class="btn btn-sm hover:btn-error"
          onclick={(e) => {
            // delete id and data
            delete st.copiedData[st.currentCopyingID];
            st.currentCopyingID = "";
          }}
        >
          ✕
        </button>
      </p>

      <!-- all variables -->
      {#each st.itemsToCopy as item}
        <p class="flex items-center">
          <span class="opacity-50">{item}:</span>
          <input
            type="text"
            placeholder=""
            class="input input-ghost input-sm w-full"
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

{#snippet DataPreviewMini(item: string)}
  <div class="prose w-full h-full bg-gray-800">
    <span class="m-2 mb-0 pb-0">{item}:</span>
    <p class="flex items-center p-2 m-0 mt-0">
      <textarea
        id="miniPreviewEditing"
        class="textarea h-min w-full"
        value={st.copiedData[st.currentCopyingID]?.[item]}
        onchange={(e) => {
          if (!st.copiedData[st.currentCopyingID]) st.copiedData[st.currentCopyingID] = {};
          st.copiedData[st.currentCopyingID][item] = e.currentTarget.value;

          miniPreviewEditingEnd();
        }}
        onfocusout={() => {
          miniPreviewEditingEnd();
        }}
        onkeyup={(e) => {
          if (e.key == "Escape") {
            miniPreviewEditingEnd();
          }
          if (e.key == "Enter") {
            if (!st.copiedData[st.currentCopyingID]) st.copiedData[st.currentCopyingID] = {};
            st.copiedData[st.currentCopyingID][item] = e.currentTarget.value;
            miniPreviewEditingEnd();
          }
        }}
      ></textarea>
      <!-- {st.copiedData[st.currentCopyingID]?.[item]} -->
    </p>
  </div>
{/snippet}

{#snippet PresetsPane()}
  <div class="flex gap-2 w-full">
    <!-- preset manager -->
    <div class="prose w-3/5">
      <h3 class="opacity-30 mb-0">Presets</h3>
      {@render PresetManager()}
    </div>

    <div class="divider divider-horizontal m-0"></div>

    <!-- This preset settings -->
    <div class="prose min-w-36 w-2/5">
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
          class="textarea h-64"
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
          class="btn btn-sm w-full {st.itemsToCopy.join('\n') !== settings.thingsToCopyRaw
            ? !st.thingsToCopyLinesOk
              ? 'btn-disabled'
              : 'btn-primary'
            : 'btn-neutral'}"
          onclick={() => {
            settings.thingsToCopyRaw = settings.thingsToCopyRaw.trim();
            settings.thingsToCopyRaw.split("\n");
            st.itemsToCopy = settings.thingsToCopyRaw.split("\n").map((item) => item.trim());

            resetNumkeysNavigation();
            stopWaitingForClipboard();
          }}
        >
          {!st.thingsToCopyLinesOk ? "Dupes not allowed!" : "Save"}
        </button>
      </fieldset>

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
    </div>
  </div>
{/snippet}

{#snippet PresetManager()}
  <div class="flex flex-col h-full">
    <!-- current preset name -->
    <fieldset class="fieldset h-min">
      <legend class="fieldset-legend">Current preset name</legend>
      <div class="join">
        <input
          type="text"
          class="input w-full input-sm"
          placeholder="current preset"
          bind:value={st.currentPreset}
        />
        <button
          class="btn btn-sm hover:btn-error"
          onclick={(e) => {
            // delete preset
            settingsMethods.deletePreset(
              SavedData.v.presets.find((preset) => preset.name == st.currentPreset)!,
            );
          }}
        >
          ✕
        </button>
      </div>
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

    <div class="w-full flex flex-row content-start overflow-y-auto p-2 gap-1 flex-wrap h-48">
      {#each SavedData.v.presets as preset}
        <button
          class="btn btn-sm w-fit {preset.name === st.currentPreset
            ? 'btn-primary'
            : 'btn-neutral'}"
          onclick={(e) => {
            st.currentPreset = preset.name;
            settingsMethods.loadPreset(preset);
          }}
          oncontextmenu={(e) => {
            // e.preventDefault();
            // settingsMethods.deletePreset(preset);
          }}
        >
          {preset.name}
          {#if preset.name === SavedData.v.defaultPresetOnLoad}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              xmlns:xlink="http://www.w3.org/1999/xlink"
              height="10px"
              width="10px"
              viewBox="0 0 47.94 47.94"
            >
              <path
                style="fill:#ED8A19;"
                d="M26.285,2.486l5.407,10.956c0.376,0.762,1.103,1.29,1.944,1.412l12.091,1.757  c2.118,0.308,2.963,2.91,1.431,4.403l-8.749,8.528c-0.608,0.593-0.886,1.448-0.742,2.285l2.065,12.042  c0.362,2.109-1.852,3.717-3.746,2.722l-10.814-5.685c-0.752-0.395-1.651-0.395-2.403,0l-10.814,5.685  c-1.894,0.996-4.108-0.613-3.746-2.722l2.065-12.042c0.144-0.837-0.134-1.692-0.742-2.285l-8.749-8.528  c-1.532-1.494-0.687-4.096,1.431-4.403l12.091-1.757c0.841-0.122,1.568-0.65,1.944-1.412l5.407-10.956  C22.602,0.567,25.338,0.567,26.285,2.486z"
              />
            </svg>
          {/if}
        </button>
      {/each}
    </div>

    <div class="divider m-0"></div>

    <!-- Presets Import-Export -->
    <div class="flex flex-col w-full h-36">
      <button
        class="btn btn-sm"
        onclick={(e) => {
          settingsMethods.exportPresets();
        }}>Export Presets</button
      >

      <fieldset class="fieldset w-full">
        <legend class="fieldset-legend">Import Presets</legend>
        <input
          type="file"
          class="file-input file-input-sm w-full"
          accept="text/json"
          id="importPresetsInput"
        />
        <div class="join w-full h-8">
          <button
            class="join-item w-1/2 btn btn-soft btn-accent btn-sm"
            onclick={(e) => {
              settingsMethods.importPresets("Append");
            }}
          >
            Append
          </button>
          <button
            class="join-item w-1/2 btn btn-soft btn-accent btn-sm"
            onclick={(e) => {
              settingsMethods.importPresets("Replace");
            }}
          >
            Replace
          </button>
        </div>
      </fieldset>
    </div>
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
        <option disabled>1.1 is the default UI Scale</option>
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

    <div class=" w-full fieldset flex justify-between">
      <legend class="fieldset-legend">Always On Preview text size</legend>
      <select
        bind:value={SavedData.v.UI_showTransparentPreview_mini_textSize}
        placeholder="UI Scale"
        class="select w-1/2"
      >
        <option disabled>text-base is default</option>
        {#each ["text-xs", "text-sm", "text-base", "text-lg", "text-xl"] as name, i}
          <option value={name}>{name}</option>
        {/each}
      </select>
    </div>

    <div class="w-full fieldset flex justify-between">
      <legend class="fieldset-legend">Show as Sidebar Window [WIP]</legend>
      <label class="swap btn w-1/2">
        <input type="checkbox" bind:checked={SavedData.v.UI_asSideBar} />
        <div class="swap-on">ON</div>
        <div class="swap-off">OFF</div>
      </label>
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

    <div class="fieldset flex gap-0 pb-0 mb-0 justify-between">
      <div class="w-1/2">
        <legend class="fieldset-legend pb-1">
          &nbsp;&nbsp;&nbsp;&nbsp; ⬑ Apply directly <br />
        </legend>
        <span class="opacity-60"
          >The buttons will trigger Ctrl+C and<br /> assign the copied value</span
        >
      </div>
      <label class="swap btn w-1/2">
        <input type="checkbox" bind:checked={SavedData.v.capsLockNavigationDirect} />
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
