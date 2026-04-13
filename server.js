const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const MIN_TABLE_SIZE = 3;
const MAX_TABLE_SIZE = 15;
const DEFAULT_TABLE_SIZE = 13;

function isPrime(value) {
  if (value < 2) return false;
  for (let i = 2; i * i <= value; i += 1) {
    if (value % i === 0) return false;
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

function getProbeStep(key, tableSize, secondaryPrime) {
  if (tableSize <= 2) {
    return 1;
  }

  let step = secondaryPrime - normalizeIndex(key, secondaryPrime);
  if (step <= 0) {
    step = 1;
  }

  while (gcd(step, tableSize) !== 1) {
    step = (step % (tableSize - 1)) + 1;
  }

  return step;
}

function normalizeIndex(value, modulus) {
  return ((value % modulus) + modulus) % modulus;
}

function sanitizeTable(table, tableSize) {
  const safeTable = Array.isArray(table) ? table.slice(0, tableSize) : [];

  while (safeTable.length < tableSize) {
    safeTable.push(null);
  }

  return safeTable.map((slot) => {
    if (!slot || typeof slot !== "object") {
      return null;
    }

    const key = Number(slot.key);
    if (!Number.isInteger(key)) {
      return null;
    }

    return { key };
  });
}

function resolveTableSize(body) {
  const requestedTableSize = Number.parseInt(body?.tableSize, 10);
  if (Number.isInteger(requestedTableSize) && requestedTableSize >= MIN_TABLE_SIZE && requestedTableSize <= MAX_TABLE_SIZE) {
    return requestedTableSize;
  }

  const inferredTableSize = Array.isArray(body?.table) ? body.table.length : NaN;
  if (Number.isInteger(inferredTableSize) && inferredTableSize >= MIN_TABLE_SIZE && inferredTableSize <= MAX_TABLE_SIZE) {
    return inferredTableSize;
  }

  return DEFAULT_TABLE_SIZE;
}

function buildSnapshot(table, activeIndex = null, finalIndex = null) {
  return table.map((slot, index) => ({
    index,
    state: slot ? "occupied" : "empty",
    key: slot ? slot.key : null,
    active: index === activeIndex,
    final: index === finalIndex
  }));
}

function analyzeInsert(table, key, tableSize, secondaryPrime) {
  const h1 = normalizeIndex(key, tableSize);
  const h2 = getProbeStep(key, tableSize, secondaryPrime);
  const probes = [];
  const nextTable = table.map((slot) => (slot ? { ...slot } : null));

  for (let step = 0; step < tableSize; step += 1) {
    const index = (h1 + step * h2) % tableSize;
    const slot = nextTable[index];
    const collision = Boolean(slot);

    probes.push({
      step,
      index,
      collision,
      formula: `(${h1} + ${step} x ${h2}) mod ${tableSize} = ${index}`,
      detail: collision
        ? `Slot ${index} already contains ${slot.key}, so the pulse jumps by h2 = ${h2}.`
        : `Slot ${index} is empty, so key ${key} lands here.`,
      snapshot: buildSnapshot(nextTable, index)
    });

    if (!collision) {
      nextTable[index] = { key };
      return {
        ok: true,
        key,
        constants: {
          m: tableSize,
          r: secondaryPrime,
          h1,
          h2
        },
        insertedAt: index,
        probes,
        table: buildSnapshot(nextTable, index, index),
        summary: `Inserted ${key} at slot ${index} after ${step + 1} probe${step === 0 ? "" : "s"}.`
      };
    }
  }

  return {
    ok: false,
    key,
    constants: {
      m: tableSize,
      r: secondaryPrime,
      h1,
      h2
    },
    insertedAt: -1,
    probes,
    table: buildSnapshot(nextTable),
    summary: `The table is full for key ${key}; no empty slot was found in the probe cycle.`
  };
}

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.get("/api/health", (_request, response) => {
  response.json({
    ok: true,
    app: "HashMatrix: The Double Hashing Lab",
    tableSize: DEFAULT_TABLE_SIZE,
    secondaryPrime: getSecondaryPrime(DEFAULT_TABLE_SIZE),
    minTableSize: MIN_TABLE_SIZE,
    maxTableSize: MAX_TABLE_SIZE
  });
});

app.post("/analyze", (request, response) => {
  const key = Number(request.body?.key);
  const tableSize = resolveTableSize(request.body);
  const secondaryPrime = getSecondaryPrime(tableSize);
  const table = sanitizeTable(request.body?.table, tableSize);

  if (!Number.isInteger(key) || key < 0 || key > 9999) {
    response.status(400).json({
      ok: false,
      error: "Key must be an integer between 0 and 9999."
    });
    return;
  }

  const existingIndex = table.findIndex((slot) => slot && slot.key === key);
  if (existingIndex >= 0) {
    response.json({
      ok: true,
      key,
      duplicate: true,
      insertedAt: existingIndex,
      constants: {
        m: tableSize,
        r: secondaryPrime,
        h1: normalizeIndex(key, tableSize),
        h2: getProbeStep(key, tableSize, secondaryPrime)
      },
      probes: [
        {
          step: 0,
          index: existingIndex,
          collision: false,
          formula: `Duplicate found at slot ${existingIndex}`,
          detail: `Key ${key} already exists, so no new insertion is performed.`,
          snapshot: buildSnapshot(table, existingIndex, existingIndex)
        }
      ],
      table: buildSnapshot(table, existingIndex, existingIndex),
      summary: `Key ${key} is already present at slot ${existingIndex}.`
    });
    return;
  }

  response.json(analyzeInsert(table, key, tableSize, secondaryPrime));
});

app.get("*", (_request, response) => {
  response.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`HashMatrix running on http://localhost:${PORT}`);
});
