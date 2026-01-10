const objects = [
  "rocket ship",
  "submarine",
  "vehicle",
  "footwear item",
  "furniture",
  "jewellery",
  "chair",
  "table",
  "children's park play",
  "stuffed toy",
  "weapon",
  "game board"
];

const audiences = ["mouse", "duck", "angel", "werewolf", "alien", "robot", "eagle"];

const transformations = [
  "shrink", "enlarge", "bend", "twist", "stretch", "flatten",
  "inflate", "deflate", "sharpen", "round off", "melt", "crystallize"
];

const grammar = tracery.createGrammar({
  object: objects,
  audience: audiences,
  transformation: transformations,
prompt: [
  "#transformation.capitalize# your tool to make #object.a#.",
  "#transformation.capitalize# your tool to make #object.a# for #audience.a#."
]

});

grammar.addModifiers(tracery.baseEngModifiers);

const promptTextEl = document.getElementById("promptText");
const toastEl = document.getElementById("toast");
const modalEl = document.getElementById("modalOverlay");

let streak = 0;

function showToast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add("show");
  window.clearTimeout(showToast._t);
  showToast._t = window.setTimeout(() => toastEl.classList.remove("show"), 1200);
}

function generatePrompt() {
  // This is the only line that generates output text.
  // If you still see ((a))((.object)), it is coming from some OTHER file/version.
  const text = grammar.flatten("#prompt#");
  promptTextEl.textContent = text;

  streak += 1;
  if (streak === 8) modalEl.classList.add("show");
}

document.getElementById("newBtn").addEventListener("click", generatePrompt);

document.getElementById("copyBtn").addEventListener("click", async () => {
  const text = promptTextEl.textContent.trim();
  if (!text || text === "Click “New prompt” to begin.") return;

  try {
    await navigator.clipboard.writeText(text);
    showToast("Copied");
  } catch {
    // fallback
    const ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
    showToast("Copied");
  }

  // Copy breaks the streak (so it's "8 new prompts in a row")
  streak = 0;
});

document.getElementById("modalCloseBtn").addEventListener("click", () => {
  modalEl.classList.remove("show");
});

modalEl.addEventListener("click", (e) => {
  if (e.target === modalEl) modalEl.classList.remove("show");
});

document.getElementById("mainSiteLink").addEventListener("click", (e) => {
  e.preventDefault();
  window.location.href = "https://en.wikipedia.org/wiki/Special:Random";
});

// First prompt on load
generatePrompt();
