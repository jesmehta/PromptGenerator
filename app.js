(function () {
  function $(id) { return document.getElementById(id); }

  // ---- Storage keys ----
  const STORAGE_KEY = "tp_lists_v2";
  const MODE_KEY = "tp_mode_v1"; // "default" | "editable"

  // ---- Defaults (your updated lists) ----
  const DEFAULTS = {
    objects: [
      "rocket ship",
      "submarine",
      "vehicle",
      "footwear item",
      "furniture",
      "jewellery",
      "chair",
      "table",
      "children's park plaything",
      "stuffed toy",
      "weapon",
      "game board"
    ],
    audiences: [
      "mouse",
      "duck",
      "angel",
      "werewolf",
      "alien",
      "robot",
      "eagle",
      "snake",
      "your pipelamp animal"
    ],
    transformations: [
      "shrink", "enlarge", "bend", "twist", "stretch", "flatten",
      "inflate", "deflate", "sharpen", "round off", "melt", "crystallize"
    ],
    elementals: [
        "FIRE", "WATER", "EARTH", "WIND", "RUN", "JUMP", "SLEEP", "GO WASH YOUR FACE"
    ]
  };

  // ---- Helpers ----
  function linesToList(text) {
    return (text || "")
      .split("\n")
      .map(s => s.trim())
      .filter(Boolean);
  }

  function listToLines(list) {
    return (list || []).join("\n");
  }

  function getMode() {
    const v = localStorage.getItem(MODE_KEY);
    return (v === "editable" || v === "default") ? v : "default";
  }

  function setMode(mode) {
    localStorage.setItem(MODE_KEY, mode);
  }

  function loadLists() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return structuredClone(DEFAULTS);
      const parsed = JSON.parse(raw);
      return {
        objects: Array.isArray(parsed.objects) ? parsed.objects : structuredClone(DEFAULTS.objects),
        audiences: Array.isArray(parsed.audiences) ? parsed.audiences : structuredClone(DEFAULTS.audiences),
        transformations: Array.isArray(parsed.transformations) ? parsed.transformations : structuredClone(DEFAULTS.transformations)
      };
    } catch {
      return structuredClone(DEFAULTS);
    }
  }

  function saveLists(lists) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lists));
  }

  function buildGrammar(lists) {
    if (typeof window.tracery === "undefined") {
      throw new Error("Tracery library didn't load (CDN blocked/offline).");
    }
    const g = tracery.createGrammar({
      object: lists.objects,
      audience: lists.audiences,
      transformation: lists.transformations,
      elementals: lists.elementals,
      prompt: [
        "#transformation.capitalize# your chosen object to make #object.a#.",
        "#transformation.capitalize# your chosen object to make #object.a# for #audience.a#.",
        "#transformation.capitalize# your chosen object to make #object.a#.",
        "#transformation.capitalize# your chosen object to make #object.a# for #audience.a#.",
        "#transformation.capitalize# your chosen object to make #object.a#.",
        "#transformation.capitalize# your chosen object to make #object.a# for #audience.a#.",
        "#transformation.capitalize# your chosen object to make #object.a#.",
        "#transformation.capitalize# your chosen object to make #object.a# for #audience.a#.",
        "#transformation.capitalize# your chosen object to make #object.a#.",
        "#transformation.capitalize# your chosen object to make #object.a# for #audience.a#.",
        "#elementals#"
      ]
    });
    g.addModifiers(tracery.baseEngModifiers);
    return g;
  }

  function showToast(toastEl, msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    window.clearTimeout(showToast._t);
    showToast._t = window.setTimeout(() => toastEl.classList.remove("show"), 1200);
  }

  function setHint(msg) {
    const hintEl = $("editorHint");
    if (hintEl) hintEl.textContent = msg || "";
  }

  // ---- App state ----
  let grammar = null;
  let streak = 0;

  function generatePrompt(promptTextEl, modalEl) {
    if (!grammar) return;
    const text = grammar.flatten("#prompt#");
    promptTextEl.textContent = text;

    streak += 1;
    if (streak === 8 && modalEl) modalEl.classList.add("show");
  }

  // ---- Boot ----
  function boot() {
    const promptTextEl = $("promptText");
    const toastEl = $("toast");
    const modalEl = $("modalOverlay");

    const objectsTA = $("objectsTA");
    const audiencesTA = $("audiencesTA");
    const transformationsTA = $("transformationsTA");

    const applyBtn = $("applyListsBtn");
    const resetBtn = $("resetListsBtn");
    const newBtn = $("newBtn");
    const copyBtn = $("copyBtn");
    const modalCloseBtn = $("modalCloseBtn");
    const mainSiteLink = $("mainSiteLink");
    const editableToggle = $("editableToggle");

    const editorCard = document.querySelector(".editorCard");

    if (!promptTextEl) {
      console.error("Missing #promptText in HTML.");
      return;
    }

    // Mode
    let mode = getMode(); // "default" | "editable"
    if (editableToggle) editableToggle.checked = (mode === "editable");

    function applyModeUI() {
      if (!editorCard) return;
      if (mode === "default") {
        editorCard.classList.add("isLocked");
        setHint("Default lists are active.");
      } else {
        editorCard.classList.remove("isLocked");
        setHint("Editable lists are active. Edit lists and click “Apply lists”.");
      }
    }

    // Populate textareas from saved lists (always)
    const savedLists = loadLists();
    if (objectsTA) objectsTA.value = listToLines(savedLists.objects);
    if (audiencesTA) audiencesTA.value = listToLines(savedLists.audiences);
    if (transformationsTA) transformationsTA.value = listToLines(savedLists.transformations);

    // Build initial grammar
    try {
      const initialLists = (mode === "default") ? structuredClone(DEFAULTS) : savedLists;
      grammar = buildGrammar(initialLists);
    } catch (e) {
      promptTextEl.textContent = `Error: ${e.message}`;
      console.error(e);
      return;
    }

    applyModeUI();

    // Generate button
    if (newBtn) {
      newBtn.addEventListener("click", () => generatePrompt(promptTextEl, modalEl));
    } else {
      console.warn("Missing #newBtn in HTML.");
    }

    // Copy button
    if (copyBtn) {
      copyBtn.addEventListener("click", async () => {
        const text = promptTextEl.textContent.trim();
        if (!text || text.toLowerCase().includes("click")) return;

        try {
          await navigator.clipboard.writeText(text);
          showToast(toastEl, "Copied");
        } catch {
          const ta = document.createElement("textarea");
          ta.value = text;
          document.body.appendChild(ta);
          ta.select();
          document.execCommand("copy");
          document.body.removeChild(ta);
          showToast(toastEl, "Copied");
        }

        streak = 0; // copy breaks streak
      });
    }

    // Modal close
    if (modalCloseBtn && modalEl) {
      modalCloseBtn.addEventListener("click", () => modalEl.classList.remove("show"));
      modalEl.addEventListener("click", (e) => {
        if (e.target === modalEl) modalEl.classList.remove("show");
      });
    }

    // Main site -> random Wikipedia
    if (mainSiteLink) {
      mainSiteLink.addEventListener("click", (e) => {
        e.preventDefault();
        window.location.href = "https://en.wikipedia.org/wiki/Special:Random";
      });
    }

    // Toggle mode
    if (editableToggle) {
      editableToggle.addEventListener("change", () => {
        mode = editableToggle.checked ? "editable" : "default";
        setMode(mode);

        try {
          const listsToUse = (mode === "default") ? structuredClone(DEFAULTS) : loadLists();
          grammar = buildGrammar(listsToUse);
          streak = 0;
          applyModeUI();
          generatePrompt(promptTextEl, modalEl);
        } catch (e) {
          setHint(`Could not switch mode: ${e.message}`);
          console.error(e);
        }
      });
    }

    // Apply lists (editable mode only)
    if (applyBtn) {
      applyBtn.addEventListener("click", () => {
        if (mode !== "editable") return;

        const next = {
          objects: linesToList(objectsTA?.value),
          audiences: linesToList(audiencesTA?.value),
          transformations: linesToList(transformationsTA?.value)
        };

        if (!next.objects.length) return setHint("Objects list is empty.");
        if (!next.audiences.length) return setHint("Audiences list is empty.");
        if (!next.transformations.length) return setHint("Transformations list is empty.");

        try {
          grammar = buildGrammar(next);
          saveLists(next);
          setHint(`Applied. Objects: ${next.objects.length}, Audiences: ${next.audiences.length}, Transformations: ${next.transformations.length}.`);
          streak = 0;
          generatePrompt(promptTextEl, modalEl);
        } catch (e) {
          setHint(`Could not apply lists: ${e.message}`);
          console.error(e);
        }
      });
    }

    // Reset defaults (in editable mode)
    if (resetBtn) {
      resetBtn.addEventListener("click", () => {
        if (mode === "default") {
          setHint("Default mode is active. Nothing to reset.");
          return;
        }

        if (objectsTA) objectsTA.value = listToLines(DEFAULTS.objects);
        if (audiencesTA) audiencesTA.value = listToLines(DEFAULTS.audiences);
        if (transformationsTA) transformationsTA.value = listToLines(DEFAULTS.transformations);

        localStorage.removeItem(STORAGE_KEY);
        setHint("Reset to defaults. Click “Apply lists”.");
      });
    }

    // First prompt on load
    generatePrompt(promptTextEl, modalEl);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
