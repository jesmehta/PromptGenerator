(function () {
  function $(id) { return document.getElementById(id); }

  const STORAGE_KEY = "tp_lists_v1";

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
      "children's park playthings",
      "stuffed toy",
      "weapon",
      "game board"
    ],
    audiences: ["mouse", "duck", "angel", "werewolf", "alien", "robot", "eagle", "snake", "your pipelamp animal"],
    transformations: [
      "shrink", "enlarge", "bend", "twist", "stretch", "flatten",
      "inflate", "deflate", "sharpen", "round off", "melt", "crystallize"
    ]
  };

  function linesToList(text) {
    return (text || "")
      .split("\n")
      .map(s => s.trim())
      .filter(Boolean);
  }

  function listToLines(list) {
    return (list || []).join("\n");
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

  let grammar = null;
  let streak = 0;

  function buildGrammar(lists) {
    if (typeof window.tracery === "undefined") {
      throw new Error("Tracery not loaded.");
    }
    const g = tracery.createGrammar({
      object: lists.objects,
      audience: lists.audiences,
      transformation: lists.transformations,
      // NOTE: .a is the modifier (works reliably)
      prompt: [
        "#transformation.capitalize# your tool to make #object.a#.",
        "#transformation.capitalize# your tool to make #object.a# for #audience.a#."
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

  function generatePrompt(promptTextEl, modalEl) {
    if (!grammar) return;
    const text = grammar.flatten("#prompt#");
    promptTextEl.textContent = text;

    streak += 1;
    if (streak === 8 && modalEl) modalEl.classList.add("show");
  }

  function boot() {
    const promptTextEl = $("promptText");
    const toastEl = $("toast");
    const modalEl = $("modalOverlay");

    const objectsTA = $("objectsTA");
    const audiencesTA = $("audiencesTA");
    const transformationsTA = $("transformationsTA");

    const applyBtn = $("applyListsBtn");
    const resetBtn = $("resetListsBtn");

    if (!promptTextEl) return;

    // Populate editor from storage/defaults
    const lists = loadLists();
    if (objectsTA) objectsTA.value = listToLines(lists.objects);
    if (audiencesTA) audiencesTA.value = listToLines(lists.audiences);
    if (transformationsTA) transformationsTA.value = listToLines(lists.transformations);

    // Build initial grammar
    try {
      grammar = buildGrammar(lists);
      setHint("Lists loaded. Edit and click “Apply lists”.");
    } catch (e) {
      promptTextEl.textContent = `Error: ${e.message}`;
      return;
    }

    // Buttons
    const newBtn = $("newBtn");
    const copyBtn = $("copyBtn");
    const modalCloseBtn = $("modalCloseBtn");
    const mainSiteLink = $("mainSiteLink");

    if (newBtn) newBtn.addEventListener("click", () => generatePrompt(promptTextEl, modalEl));

    if (copyBtn) {
      copyBtn.addEventListener("click", async () => {
        const text = promptTextEl.textContent.trim();
        if (!text || text.includes("Click “New prompt”")) return;

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

    if (modalCloseBtn && modalEl) {
      modalCloseBtn.addEventListener("click", () => modalEl.classList.remove("show"));
      modalEl.addEventListener("click", (e) => {
        if (e.target === modalEl) modalEl.classList.remove("show");
      });
    }

    if (mainSiteLink) {
      mainSiteLink.addEventListener("click", (e) => {
        e.preventDefault();
        window.location.href = "https://en.wikipedia.org/wiki/Special:Random";
      });
    }

    if (applyBtn) {
      applyBtn.addEventListener("click", () => {
        const next = {
          objects: linesToList(objectsTA?.value),
          audiences: linesToList(audiencesTA?.value),
          transformations: linesToList(transformationsTA?.value)
        };

        // Basic validation
        if (next.objects.length === 0) return setHint("Objects list is empty.");
        if (next.transformations.length === 0) return setHint("Transformations list is empty.");
        if (next.audiences.length === 0) return setHint("Audiences list is empty (that’s okay only if you also remove the ‘for audience’ prompt).");

        try {
          grammar = buildGrammar(next);
          saveLists(next);
          setHint(`Applied. Objects: ${next.objects.length}, Audiences: ${next.audiences.length}, Transformations: ${next.transformations.length}.`);
          streak = 0;
          generatePrompt(promptTextEl, modalEl);
        } catch (e) {
          setHint(`Could not apply lists: ${e.message}`);
        }
      });
    }

    if (resetBtn) {
      resetBtn.addEventListener("click", () => {
        if (objectsTA) objectsTA.value = listToLines(DEFAULTS.objects);
        if (audiencesTA) audiencesTA.value = listToLines(DEFAULTS.audiences);
        if (transformationsTA) transformationsTA.value = listToLines(DEFAULTS.transformations);
        localStorage.removeItem(STORAGE_KEY);
        setHint("Reset to defaults. Click “Apply lists”.");
      });
    }

    // First prompt
    generatePrompt(promptTextEl, modalEl);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
