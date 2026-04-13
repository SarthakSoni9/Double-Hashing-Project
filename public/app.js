const DEFAULT_TABLE_SIZE = 13;
const MIN_TABLE_SIZE = 3;
const MAX_TABLE_SIZE = 15;
const DEMO_KEYS = [18, 31, 44, 57];

const codeSnippets = {
  python: `class DoubleHashTable:
    def __init__(self, size: int, prime: int) -> None:
        self.size = size
        self.prime = prime
        self.table = [None] * size

    def insert(self, key: int) -> int:
        h1 = key % self.size
        h2 = self.prime - (key % self.prime)
        for i in range(self.size):
            index = (h1 + i * h2) % self.size
            if self.table[index] is None:
                self.table[index] = key
                return index
        return -1`,
  cpp: `#include <iostream>
#include <vector>

class DoubleHashTable {
 public:
  DoubleHashTable(int size, int prime) : size_(size), prime_(prime), table_(size, -1) {}

  int insert(int key) {
    int h1 = key % size_;
    int h2 = prime_ - (key % prime_);
    for (int i = 0; i < size_; ++i) {
      int index = (h1 + i * h2) % size_;
      if (table_[index] == -1) {
        table_[index] = key;
        return index;
      }
    }
    return -1;
  }

 private:
  int size_;
  int prime_;
  std::vector<int> table_;
};`,
  java: `public final class DoubleHashTable {
    private final int[] table;
    private final int size;
    private final int prime;

    public DoubleHashTable(int size, int prime) {
        this.size = size;
        this.prime = prime;
        this.table = new int[size];
        java.util.Arrays.fill(this.table, Integer.MIN_VALUE);
    }

    public int insert(int key) {
        int h1 = key % size;
        int h2 = prime - (key % prime);
        for (int i = 0; i < size; i++) {
            int index = (h1 + i * h2) % size;
            if (table[index] == Integer.MIN_VALUE) {
                table[index] = key;
                return index;
            }
        }
        return -1;
    }
}`,
  rust: `struct DoubleHashTable {
    size: usize,
    prime: i32,
    table: Vec<Option<i32>>,
}

impl DoubleHashTable {
    fn new(size: usize, prime: i32) -> Self {
        Self { size, prime, table: vec![None; size] }
    }

    fn insert(&mut self, key: i32) -> Option<usize> {
        let h1 = key.rem_euclid(self.size as i32) as usize;
        let h2 = self.prime - key.rem_euclid(self.prime);
        for i in 0..self.size {
            let index = (h1 + i * h2 as usize) % self.size;
            if self.table[index].is_none() {
                self.table[index] = Some(key);
                return Some(index);
            }
        }
        None
    }
}`
};

const state = {
  tableSize: DEFAULT_TABLE_SIZE,
  secondaryPrime: 11,
  table: Array.from({ length: DEFAULT_TABLE_SIZE }, () => null),
  animating: false,
  route: "home",
  routeTransitioning: false,
  lastInsertedAt: null,
  activeLanguage: "python"
};

const elements = {
  navLinks: [...document.querySelectorAll(".nav-link")],
  sections: [...document.querySelectorAll(".spa-section")],
  heroLaunchBtn: document.getElementById("heroLaunchBtn"),
  heroDemoBtn: document.getElementById("heroDemoBtn"),
  presetButtons: [...document.querySelectorAll("[data-preset]")],
  tableSizeSelect: document.getElementById("tableSizeSelect"),
  keyInput: document.getElementById("keyInput"),
  analyzeBtn: document.getElementById("analyzeBtn"),
  seedBtn: document.getElementById("seedBtn"),
  resetBtn: document.getElementById("resetBtn"),
  occupiedCount: document.getElementById("occupiedCount"),
  lastStepValue: document.getElementById("lastStepValue"),
  probeCount: document.getElementById("probeCount"),
  insightList: document.getElementById("insightList"),
  tableMiniMap: document.getElementById("tableMiniMap"),
  analyzerSummary: document.getElementById("analyzerSummary"),
  globalStatus: document.getElementById("globalStatus"),
  heroPrimary: document.getElementById("heroPrimary"),
  heroSecondary: document.getElementById("heroSecondary"),
  heroProbe: document.getElementById("heroProbe"),
  heroTableSizeStat: document.getElementById("heroTableSizeStat"),
  heroStepPrimeStat: document.getElementById("heroStepPrimeStat"),
  hashGrid: document.getElementById("hashGrid"),
  probeRail: document.getElementById("probeRail"),
  logList: document.getElementById("logList"),
  pathOverlay: document.getElementById("pathOverlay"),
  scannerBeam: document.getElementById("scannerBeam"),
  tooltip: document.getElementById("tooltip"),
  tooltipValue: document.getElementById("tooltipValue"),
  burst: document.getElementById("burst"),
  codeTabs: [...document.querySelectorAll(".code-tab")],
  codeTabsWrap: document.getElementById("codeTabs"),
  tabGlider: document.getElementById("tabGlider"),
  codeContent: document.getElementById("codeContent")
};

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

function isPrime(value) {
  if (value < 2) return false;
  for (let divisor = 2; divisor * divisor <= value; divisor += 1) {
    if (value % divisor === 0) return false;
  }
  return true;
}

function getSecondaryPrime(tableSize) {
  for (let candidate = tableSize - 1; candidate >= 2; candidate -= 1) {
    if (isPrime(candidate)) {
      return candidate;
    }
  }
  return 2;
}

function gcd(a, b) {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y !== 0) {
    const temp = y;
    y = x % y;
    x = temp;
  }
  return x;
}

function setStatus(message) {
  elements.globalStatus.textContent = message;
}

function canAnimate() {
  return Boolean(window.gsap) && !prefersReducedMotion.matches;
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function occupancy() {
  return state.table.filter(Boolean).length;
}

function getStep(key) {
  if (state.tableSize <= 2) {
    return 1;
  }

  let step = state.secondaryPrime - (key % state.secondaryPrime);
  if (step <= 0) {
    step = 1;
  }

  while (gcd(step, state.tableSize) !== 1) {
    step = (step % (state.tableSize - 1)) + 1;
  }

  return step;
}

function syncTableConfig() {
  state.secondaryPrime = getSecondaryPrime(state.tableSize);

  if (elements.tableSizeSelect) {
    elements.tableSizeSelect.value = String(state.tableSize);
  }

  if (elements.heroTableSizeStat) {
    elements.heroTableSizeStat.textContent = `${state.tableSize} slots`;
  }

  if (elements.heroStepPrimeStat) {
    elements.heroStepPrimeStat.textContent = String(state.secondaryPrime);
  }
}

function buildInsights(key = null, probes = []) {
  const loadFactor = (occupancy() / state.tableSize).toFixed(2);
  const projectedStep = key == null ? "-" : getStep(key);
  const collisions = probes.filter((probe) => probe.collision).length;

  return [
    {
      label: "Load Factor",
      value: loadFactor,
      copy: Number(loadFactor) > 0.69 ? "The table is getting dense, so probe paths will usually grow." : "There is still enough open space for short jumps."
    },
    {
      label: "Projected Step",
      value: projectedStep,
      copy: key == null ? "Pick a key to reveal its secondary jump distance." : `For key ${key}, the stride is h2(k) = ${projectedStep}.`
    },
    {
      label: "Collisions Seen",
      value: collisions,
      copy: collisions ? "This key had to reroute before landing." : "No collisions were needed for the current walkthrough."
    }
  ];
}

function renderInsights(key = null, probes = []) {
  elements.insightList.innerHTML = buildInsights(key, probes)
    .map(
      (item) => `
        <article class="insight-card">
          <span>${item.label}</span>
          <strong>${item.value}</strong>
          <p>${item.copy}</p>
        </article>
      `
    )
    .join("");
}

function renderMiniMap(activeIndex = null) {
  elements.tableMiniMap.innerHTML = state.table
    .map(
      (slot, index) => `
        <article class="mini-slot${slot ? " occupied" : ""}${activeIndex === index ? " active" : ""}">
          <span>Slot ${index}</span>
          <strong>${slot ? slot.key : "--"}</strong>
        </article>
      `
    )
    .join("");
}

function renderGrid(activeIndex = null, finalIndex = null, collisionIndices = []) {
  elements.hashGrid.innerHTML = state.table
    .map((slot, index) => {
      const classes = [
        "grid-slot",
        slot ? "occupied" : "",
        activeIndex === index ? "active" : "",
        finalIndex === index ? "final" : "",
        collisionIndices.includes(index) ? "collision" : ""
      ]
        .filter(Boolean)
        .join(" ");

      return `
        <article class="${classes}" data-slot-index="${index}">
          <span class="slot-top">Index ${index}</span>
          <div class="slot-core">${slot ? slot.key : "--"}</div>
          <span class="slot-bottom">${slot ? "Occupied" : "Empty"}</span>
        </article>
      `;
    })
    .join("");
}

function animateGridSurface() {
  if (!canAnimate()) return;

  gsap.fromTo(
    ".grid-slot",
    { opacity: 0, y: 18, scale: 0.96 },
    { opacity: 1, y: 0, scale: 1, duration: 0.42, ease: "power2.out", stagger: 0.02, overwrite: true }
  );

  gsap.fromTo(
    ".mini-slot",
    { opacity: 0, y: 10 },
    { opacity: 1, y: 0, duration: 0.28, ease: "power2.out", stagger: 0.012, overwrite: true }
  );
}

function renderMetrics(lastStep = "-") {
  elements.occupiedCount.textContent = `${occupancy()} / ${state.tableSize}`;
  elements.lastStepValue.textContent = String(lastStep);
}

function renderProbeRail(probes = [], insertedAt = null) {
  elements.probeCount.textContent = String(probes.length);
  elements.probeRail.innerHTML = probes
    .map((probe) => {
      const classes = ["probe-pill"];
      if (probe.collision) classes.push("collision");
      if (probe.index === insertedAt) classes.push("final");
      return `<span class="${classes.join(" ")}">i=${probe.step} -> ${probe.index}</span>`;
    })
    .join("");
}

function renderLog(probes = [], summary = "") {
  if (!probes.length) {
    elements.logList.innerHTML = `<p class="text-sm text-slate-400">${summary}</p>`;
    return;
  }

  elements.logList.innerHTML = probes
    .map(
      (probe) => `
        <article class="log-card ${probe.collision ? "collision" : "success"}">
          <p class="log-head">Probe ${probe.step + 1} · Slot ${probe.index}</p>
          <p class="log-formula">${probe.formula}</p>
          <p class="log-copy">${probe.detail}</p>
        </article>
      `
    )
    .join("");
}

function moveScanner(x, y, mode = "sky") {
  const palette =
    mode === "mint"
      ? { color: "var(--mint)", glow: "0 0 32px rgba(74, 244, 181, 0.85)" }
      : mode === "rose"
        ? { color: "var(--rose)", glow: "0 0 32px rgba(255, 109, 151, 0.85)" }
        : { color: "var(--sky)", glow: "0 0 30px rgba(94, 232, 255, 0.85)" };

  elements.scannerBeam.style.left = `${x}px`;
  elements.scannerBeam.style.top = `${y}px`;
  elements.scannerBeam.style.opacity = "1";
  elements.scannerBeam.style.transform = "translate(-50%, -50%) scale(1)";
  elements.scannerBeam.style.background = palette.color;
  elements.scannerBeam.style.boxShadow = palette.glow;
}

function hideScanner() {
  elements.scannerBeam.style.opacity = "0";
  elements.scannerBeam.style.transform = "translate(-50%, -50%) scale(0.7)";
}

function showTooltip(x, y, text) {
  elements.tooltipValue.textContent = text;
  elements.tooltip.style.left = `${x}px`;
  elements.tooltip.style.top = `${y - 10}px`;
  elements.tooltip.style.opacity = "1";
}

function hideTooltip() {
  elements.tooltip.style.opacity = "0";
}

function burstAt(x, y) {
  elements.burst.style.left = `${x}px`;
  elements.burst.style.top = `${y}px`;
  elements.burst.animate(
    [
      { opacity: 0, transform: "translate(-50%, -50%) scale(0.3)" },
      { opacity: 1, transform: "translate(-50%, -50%) scale(1)" },
      { opacity: 0, transform: "translate(-50%, -50%) scale(1.7)" }
    ],
    { duration: 480, easing: "ease-out" }
  );
}

function getSlotCenter(index) {
  const slot = elements.hashGrid.querySelector(`[data-slot-index="${index}"]`);
  const gridRect = elements.hashGrid.getBoundingClientRect();
  const slotRect = slot.getBoundingClientRect();
  return {
    x: slotRect.left - gridRect.left + slotRect.width / 2,
    y: slotRect.top - gridRect.top + slotRect.height / 2
  };
}

function drawPath(fromIndex, toIndex, collision = false) {
  const start = getSlotCenter(fromIndex);
  const end = getSlotCenter(toIndex);
  const apexY = Math.min(start.y, end.y) - 48;
  const stroke = collision ? "rgba(255,109,151,0.9)" : "rgba(94,232,255,0.9)";
  elements.pathOverlay.innerHTML = `
    <path d="M ${start.x} ${start.y} Q ${(start.x + end.x) / 2} ${apexY} ${end.x} ${end.y}"
      fill="none" stroke="${stroke}" stroke-width="2.4" stroke-dasharray="8 8" stroke-linecap="round"></path>
  `;
  return end;
}

function setHeroFormula(key, probeStep = null) {
  if (key == null) {
    elements.heroPrimary.textContent = `h1(k) = k mod ${state.tableSize}`;
    elements.heroSecondary.textContent = `h2(k) = adaptive step using base ${state.secondaryPrime}`;
    elements.heroProbe.textContent = `index(i) = (h1 + i * h2) mod ${state.tableSize}`;
    return;
  }

  const h1 = key % state.tableSize;
  const h2 = getStep(key);
  elements.heroPrimary.textContent = `h1(${key}) = ${h1}`;
  elements.heroSecondary.textContent = `h2(${key}) = ${h2}`;
  elements.heroProbe.textContent =
    probeStep == null
      ? `index(i) = (${h1} + i * ${h2}) mod ${state.tableSize}`
      : `index(${probeStep}) = (${h1} + ${probeStep} * ${h2}) mod ${state.tableSize}`;
}

function updateVisualizerLabels() {
  const visualizerHeading = document.querySelector('[data-section="visualizer"] h2');
  const miniPanelFormulas = document.querySelectorAll(".mini-panel strong");

  if (visualizerHeading) {
    visualizerHeading.textContent = `Drive a key through the ${state.tableSize}-slot collision grid`;
  }

  if (miniPanelFormulas[0]) {
    miniPanelFormulas[0].textContent = `h1(k) = k mod ${state.tableSize}`;
  }

  if (miniPanelFormulas[1]) {
    miniPanelFormulas[1].textContent = `h2(k) = adaptive step using base ${state.secondaryPrime}`;
  }
}

function setRoute(route) {
  if (state.routeTransitioning || state.route === route) {
    return;
  }

  const currentSection = elements.sections.find((section) => section.dataset.section === state.route);
  const nextSection = elements.sections.find((section) => section.dataset.section === route);

  state.route = route;
  elements.navLinks.forEach((link) => {
    link.classList.toggle("is-active", link.dataset.route === route);
  });

  if (!currentSection || !nextSection || !canAnimate()) {
    elements.sections.forEach((section) => {
      const active = section.dataset.section === route;
      section.classList.toggle("is-hidden", !active);
      section.classList.toggle("is-active", active);
    });
    return;
  }

  state.routeTransitioning = true;

  gsap.to(currentSection, {
    opacity: 0,
    y: 18,
    duration: 0.22,
    ease: "power2.in",
    onComplete: () => {
      currentSection.classList.add("is-hidden");
      currentSection.classList.remove("is-active");
      nextSection.classList.remove("is-hidden");
      nextSection.classList.add("is-active");

      gsap.fromTo(
        nextSection,
        { opacity: 0, y: 24 },
        {
          opacity: 1,
          y: 0,
          duration: 0.35,
          ease: "power2.out",
          onComplete: () => {
            state.routeTransitioning = false;
          }
        }
      );
    }
  });
}

function applyPreset(key) {
  elements.keyInput.value = key;
  setHeroFormula(key);
  renderInsights(key, []);
  elements.analyzerSummary.textContent = `Key ${key} is staged. Analyze it to watch the probe sequence.`;
  setStatus(`Key ${key} is staged in the lab.`);
}

function placeDemoKeys() {
  state.table = Array.from({ length: state.tableSize }, () => null);
  for (const key of DEMO_KEYS) {
    const h1 = key % state.tableSize;
    const h2 = getStep(key);
    for (let step = 0; step < state.tableSize; step += 1) {
      const index = (h1 + step * h2) % state.tableSize;
      if (!state.table[index]) {
        state.table[index] = { key };
        break;
      }
    }
  }
}

function seedDemo() {
  if (state.animating) return;
  placeDemoKeys();
  state.lastInsertedAt = null;
  renderGrid();
  renderMiniMap();
  renderMetrics("-");
  renderProbeRail([], null);
  renderLog([], "");
  renderInsights(70, []);
  setHeroFormula(70);
  elements.pathOverlay.innerHTML = "";
  hideScanner();
  hideTooltip();
  elements.analyzerSummary.textContent =
    "Collision demo loaded with 18, 31, 44, and 57. Insert 70 or 83 to watch the reroute sequence.";
  setStatus("Collision demo loaded. The visualizer is primed for a multi-step insertion.");
  animateGridSurface();
}

function resetGrid() {
  if (state.animating) return;
  state.table = Array.from({ length: state.tableSize }, () => null);
  state.lastInsertedAt = null;
  renderGrid();
  renderMiniMap();
  renderMetrics("-");
  renderProbeRail([], null);
  renderLog([], "The grid is empty.");
  renderInsights();
  setHeroFormula(null);
  elements.pathOverlay.innerHTML = "";
  hideScanner();
  hideTooltip();
  elements.analyzerSummary.textContent =
    "The grid is empty. Load the guided demo, then insert 70 for a cinematic collision walkthrough.";
  setStatus(`The ${state.tableSize}-slot grid has been reset.`);
  animateGridSurface();
}

function applyTableSize(tableSize) {
  if (state.animating) return;

  const nextSize = Math.min(MAX_TABLE_SIZE, Math.max(MIN_TABLE_SIZE, tableSize));
  if (!Number.isInteger(nextSize)) return;

  state.tableSize = nextSize;
  state.table = Array.from({ length: state.tableSize }, () => null);
  state.lastInsertedAt = null;
  syncTableConfig();
  updateVisualizerLabels();
  renderGrid();
  renderMiniMap();
  renderMetrics("-");
  renderProbeRail([], null);
  renderLog([], "The grid is empty.");
  renderInsights();
  setHeroFormula(null);
  elements.pathOverlay.innerHTML = "";
  hideScanner();
  hideTooltip();
  elements.analyzerSummary.textContent = `Table size set to ${state.tableSize}. The animation grid is ready for a fresh run.`;
  setStatus(`Table size changed to ${state.tableSize}. Secondary prime is ${state.secondaryPrime}.`);
  animateGridSurface();
}

async function animateSequence(payload) {
  state.animating = true;
  elements.analyzeBtn.disabled = true;
  elements.seedBtn.disabled = true;
  elements.resetBtn.disabled = true;

  const collisions = [];
  renderProbeRail(payload.probes, payload.insertedAt);
  renderLog(payload.probes, payload.summary);
  renderInsights(payload.key, payload.probes);
  renderMetrics(payload.constants.h2);
  setHeroFormula(payload.key);

  if (canAnimate()) {
    gsap.fromTo(
      ".probe-pill",
      { opacity: 0, y: 8 },
      { opacity: 1, y: 0, duration: 0.24, ease: "power2.out", stagger: 0.03 }
    );
  }

  for (let index = 0; index < payload.probes.length; index += 1) {
    const probe = payload.probes[index];
    if (probe.collision) {
      collisions.push(probe.index);
    }

    renderGrid(probe.index, null, collisions);
    renderMiniMap(probe.index);
    setHeroFormula(payload.key, probe.step);
    setStatus(probe.detail);
    elements.analyzerSummary.textContent = payload.summary;

    const target = index === 0 ? getSlotCenter(probe.index) : drawPath(payload.probes[index - 1].index, probe.index, probe.collision);
    moveScanner(target.x, target.y, probe.collision ? "rose" : "sky");

    if (probe.collision) {
      showTooltip(target.x, target.y, `h2(${payload.key}) = ${payload.constants.h2}`);
    } else {
      hideTooltip();
    }

    await wait(index === 0 ? 420 : 700);
  }

  state.table = payload.table.map((slot) => (slot.key == null ? null : { key: slot.key }));
  state.lastInsertedAt = payload.insertedAt >= 0 ? payload.insertedAt : null;
  renderGrid(payload.insertedAt, payload.insertedAt, collisions);
  renderMiniMap(state.lastInsertedAt);
  animateGridSurface();
  if (state.lastInsertedAt != null) {
    const finalPoint = getSlotCenter(state.lastInsertedAt);
    moveScanner(finalPoint.x, finalPoint.y, "mint");
    burstAt(finalPoint.x, finalPoint.y);
  }
  await wait(360);
  elements.pathOverlay.innerHTML = "";
  hideTooltip();
  hideScanner();

  state.animating = false;
  elements.analyzeBtn.disabled = false;
  elements.seedBtn.disabled = false;
  elements.resetBtn.disabled = false;
}

async function analyzeKey() {
  if (state.animating) return;

  const key = Number(elements.keyInput.value);
  if (!Number.isInteger(key) || key < 0 || key > 9999) {
    setStatus("Enter an integer key from 0 to 9999 before starting the analyzer.");
    elements.keyInput.focus();
    return;
  }

  try {
    setStatus(`Sending key ${key} to the analyzer...`);
    const response = await fetch("/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, table: state.table, tableSize: state.tableSize })
    });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || "Analyzer request failed.");
    }

    state.tableSize = payload.constants.m;
    syncTableConfig();
    updateVisualizerLabels();
    await animateSequence(payload);
    setStatus(payload.summary);
    elements.analyzerSummary.textContent = payload.summary;
  } catch (error) {
    setStatus(error.message);
    elements.analyzerSummary.textContent = error.message;
    state.animating = false;
    elements.analyzeBtn.disabled = false;
    elements.seedBtn.disabled = false;
    elements.resetBtn.disabled = false;
  }
}

function setCode(language) {
  state.activeLanguage = language;
  elements.codeTabs.forEach((tab) => {
    tab.classList.toggle("is-active", tab.dataset.lang === language);
  });
  elements.codeContent.textContent = codeSnippets[language];

  if (!elements.tabGlider) return;
  const activeTab = elements.codeTabs.find((tab) => tab.dataset.lang === language);
  if (!activeTab) return;
  const wrapRect = elements.codeTabsWrap.getBoundingClientRect();
  const tabRect = activeTab.getBoundingClientRect();
  elements.tabGlider.style.width = `${tabRect.width}px`;
  elements.tabGlider.style.transform = `translateX(${tabRect.left - wrapRect.left}px)`;

  if (canAnimate()) {
    gsap.fromTo(elements.codeContent, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.24, ease: "power2.out" });
  }
}

function runIntro() {
  if (!canAnimate()) return;

  gsap.fromTo(
    ".nav-pill, .hero-card, .glass-panel",
    { opacity: 0, y: 24 },
    { opacity: 1, y: 0, duration: 0.5, ease: "power2.out", stagger: 0.08 }
  );
}

function bindEvents() {
  elements.navLinks.forEach((link) => {
    link.addEventListener("click", () => setRoute(link.dataset.route));
  });

  elements.heroLaunchBtn.addEventListener("click", () => setRoute("visualizer"));
  elements.heroDemoBtn.addEventListener("click", () => {
    setRoute("visualizer");
    seedDemo();
  });

  elements.presetButtons.forEach((button) => {
    button.addEventListener("click", () => applyPreset(Number(button.dataset.preset)));
  });

  elements.tableSizeSelect.addEventListener("change", (event) => {
    applyTableSize(Number(event.target.value));
  });

  elements.analyzeBtn.addEventListener("click", analyzeKey);
  elements.seedBtn.addEventListener("click", seedDemo);
  elements.resetBtn.addEventListener("click", resetGrid);
  elements.keyInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      analyzeKey();
    }
  });

  elements.codeTabs.forEach((tab) => {
    tab.addEventListener("click", () => setCode(tab.dataset.lang));
  });

  window.addEventListener("resize", () => setCode(state.activeLanguage));
}

function init() {
  syncTableConfig();
  updateVisualizerLabels();
  renderGrid();
  renderMiniMap();
  renderMetrics("-");
  renderProbeRail([], null);
  renderLog([], "The grid is empty.");
  renderInsights();
  setCode("python");
  bindEvents();
  elements.sections.forEach((section) => {
    const active = section.dataset.section === "home";
    section.classList.toggle("is-hidden", !active);
    section.classList.toggle("is-active", active);
  });
  state.route = "home";
  setStatus("The lab is standing by. Launch the visualizer to trace a key through the collision grid.");
  animateGridSurface();
  runIntro();

  if (window.lucide?.createIcons) {
    window.lucide.createIcons();
  }
}

init();
