<script lang="ts">
  import ipc, { ipcr } from "../ipc";
  import ClipboardIcon from "../assets/MainLogo.svelte";

  //
  // handling mouse events outside the window
  //
  // initally ignore mouse events
  ipc.setIgnoreMouseEvents(true, { forward: true });
  function ignoreMouseEvents(ignore = true) {
    if (ignore === true) {
      ipc.setIgnoreMouseEvents(true, { forward: true });
    } else {
      ipc.setIgnoreMouseEvents(false);
    }
  }

  // handle new things
  console.log("ipcr", ipcr);
  console.log("ipc", ipc);

  let clipboardHistory: HTMLDivElement;

  ipc.on("clipboard-changed", (_: any, value: string) => {
    // reformat value to be more readable
    value = value.replace(/\n/g, "<br />");
    clipboardHistory.innerHTML += "<pre>" + value + "/<pre><br />";
  });
</script>

<div
  class="fixed left-0 right-0 top-0 bottom-0 isolate"
  role="none"
  onmouseenter={() => ignoreMouseEvents()}
  onmouseleave={() => ignoreMouseEvents(false)}
></div>

<div
  role="none"
  onmouseenter={() => {
    ignoreMouseEvents(false);
  }}
  class="grid-container absolute bottom-0 right-0 p-4 grid grid-cols-5 grid-rows-5 gap-2 w-full h-full bg-amber-900"
>
  <div
    role="none"
    class="flex w-24 h-24 justify-center items-center bg-emerald-600 pointer-events-auto WinDraggable col-span-2 row-span-2 col-start-4 row-start-4"
    onmouseenter={() => {
      ignoreMouseEvents(false);
    }}
  >
    <ClipboardIcon width={48} height={48} />
  </div>

  <button
    class="btn btn-primary col-span-1 row-start-5 col-start-3"
    onclick={() => {
      ipc.openDevTools();
    }}
  >
    Open DevTools
  </button>

  <div class="text-center" bind:this={clipboardHistory}></div>
</div>

<style>
  .grid-container > * {
    border: 1px solid #000;
  }
</style>
