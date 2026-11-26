"use strict";

const canvas = document.querySelector("#track");
const ctx = canvas.getContext("2d");
const hint = document.querySelector("#hint");
const stats = document.querySelector("#stats");
const dialog = document.querySelector("#result");
const title = document.querySelector("#title");
const message = document.querySelector("#message");
const retry = document.querySelector("#retry");
const binding = document.querySelector("#binding");
const remap = document.querySelector("#remap");
const stage = document.querySelector("#stage");
const progress = document.querySelector("#progress");
const restart = document.querySelector("#restart");
const keyLabels = {F4: "F4", Space: "Space", KeyJ: "J", KeyZ: "Z"};
const gameKeys = new Set(["KeyA", "KeyD", "AltLeft", "AltRight", ...Object.keys(keyLabels)]);
const checkpointKey = "rage-cart-checkpoint";
const keys = new Set();
const floor = 312;
const platforms = [[0, 450], [536, 780], [875, 1180], [1425, 1750]];
const cart = {x: 65, y: floor, vx: 0, vy: 0, grounded: true};
const finalCheckpoint = 960;
let attempts = 0;
let checkpoint = 65;
let jumpKey = "F4";
let sawPrank = false;
let finished = false;
let jumpBuffer = 0;
let coyoteTime = 0;
let camera = 0;

try { sawPrank = localStorage.getItem(checkpointKey) === "reached"; } catch {}

function reset(x) {
  keys.clear();
  jumpBuffer = coyoteTime = 0;
  camera = Math.max(0, Math.min(x - 275, 790));
  Object.assign(cart, {x, y: floor, vx: 0, vy: 0, grounded: true});
}

function showResult(won) {
  keys.clear();
  jumpBuffer = 0;
  finished = true;
  title.textContent = won ? "Cart returned." : "noob, you quit lol";
  message.textContent = won ? `You survived the parking lot. Wipeouts: ${attempts}.` : "Pick a new jump key and take another run at the gap.";
  remap.hidden = won;
  retry.textContent = won ? "Race again" : "Reopen at checkpoint";
  dialog.showModal();
}

function restartRun() {
  attempts = 0;
  checkpoint = 65;
  jumpKey = "F4";
  try { localStorage.removeItem(checkpointKey); } catch {}
  document.querySelector("#jump-key").textContent = keyLabels[jumpKey];
  reset(checkpoint);
  finished = false;
}

restart.addEventListener("click", () => {
  restartRun();
  restart.blur();
});

retry.addEventListener("click", () => {
  if (cart.x >= 1650) {
    restartRun();
  } else {
    jumpKey = binding.value;
    document.querySelector("#jump-key").textContent = keyLabels[jumpKey];
    reset(checkpoint);
    finished = false;
  }
  dialog.close();
});
dialog.addEventListener("cancel", event => event.preventDefault());

window.addEventListener("keydown", event => {
  if (finished || !gameKeys.has(event.code)) return;
  const sprinting = event.altKey || keys.has("AltLeft") || keys.has("AltRight");
  if (jumpKey === "F4" && event.code === "F4" && sprinting && checkpoint === finalCheckpoint) {
    // Leave the native shortcut available. Where it is unhandled, try closing the game window.
    if (!event.repeat) {
      window.close();
      if (!window.closed) showResult(false);
    }
    return;
  }
  event.preventDefault();
  keys.add(event.code);
  if (!event.repeat && event.code === jumpKey) jumpBuffer = 7;
});
window.addEventListener("keyup", event => keys.delete(event.code));
window.addEventListener("blur", () => { keys.clear(); jumpBuffer = 0; });

function step() {
  if (finished) return;
  const direction = Number(keys.has("KeyD")) - Number(keys.has("KeyA"));
  const speed = keys.has("AltLeft") || keys.has("AltRight") ? 11 : 4.8;
  cart.vx += (direction * speed - cart.vx) * (cart.grounded ? .27 : .13);
  coyoteTime = cart.grounded ? 5 : Math.max(0, coyoteTime - 1);
  if (coyoteTime && jumpBuffer) {
    cart.vy = -11;
    jumpBuffer = coyoteTime = 0;
  }
  jumpBuffer = Math.max(0, jumpBuffer - 1);
  const previousY = cart.y;
  cart.x = Math.max(18, cart.x + cart.vx);
  cart.vy += .72;
  cart.y += cart.vy;
  cart.grounded = previousY <= floor && cart.y >= floor &&
    platforms.some(([start, end]) => cart.x >= start && cart.x <= end);
  if (cart.grounded) {
    cart.y = floor;
    cart.vy = 0;
    if (cart.x >= 560 && checkpoint === 65) checkpoint = 570;
    if (cart.x >= 935 && cart.x < 1180 && checkpoint !== finalCheckpoint) {
      checkpoint = finalCheckpoint;
      try { localStorage.setItem(checkpointKey, "reached"); } catch {}
    }
  }
  if (cart.y > 440) {
    attempts++;
    reset(checkpoint);
  }
  if (cart.x >= 1650 && cart.grounded) showResult(true);
}

if (sawPrank) {
  checkpoint = finalCheckpoint;
  reset(checkpoint);
  showResult(false);
}

const ink = "#171526";
const wall = "#29233c";
const steel = "#504269";
const violet = "#806b9d";
const amber = "#ffc665";
const cream = "#fff0ba";

function rect(color, x, y, width, height) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), width, height);
}

function drawBackdrop() {
  rect(ink, 0, 0, 960, 400);
  const offset = Math.round(camera * .32 / 4) * 4;
  rect(wall, 0, 168, 960, 232);
  for (let x = -offset % 124 - 124; x < 960; x += 124) {
    rect(steel, x + 8, 52, 8, 260);
    rect(wall, x + 16, 52, 8, 260);
    rect(ink, x + 42, 194, 64, 90);
    rect(steel, x + 48, 200, 52, 4);
    for (let y = 212; y < 276; y += 12) rect(wall, x + 48, y, 52, 4);
  }
  rect(steel, 0, 48, 960, 4);
  rect(wall, 0, 52, 960, 12);
  rect(ink, 0, 288, 960, 112);
  for (let x = 68 - offset % 248; x < 960; x += 248) {
    rect(steel, x, 96, 56, 8);
    rect("#9b7459", x + 4, 104, 48, 4);
    rect(amber, x + 8, 104, 40, 4);
  }
}

function drawPlatforms() {
  for (const [start, end] of platforms) {
    rect(wall, start, floor, end - start, 88);
    rect(steel, start, floor, end - start, 14);
    rect(violet, start, floor, end - start, 4);
    for (let y = floor + 16; y < 396; y += 18) {
      rect(ink, start, y, end - start, 2);
      for (let x = start + (y % 4 ? 12 : 32); x < end - 4; x += 42) rect(ink, x, y, 2, 18);
    }
    for (const edge of [start, end - 24]) {
      rect(amber, edge, floor, 24, 8);
      for (let x = edge + 4; x < edge + 24; x += 8) {
        rect(ink, x, floor, 4, 4);
        rect(ink, x - 4, floor + 4, 4, 4);
      }
    }
  }
}

function drawSigns() {
  ctx.font = "bold 16px monospace";
  ctx.textAlign = "center";
  for (const [x, label, color] of [
    [96, "A / D  MOVE", cream], [230, "ALT  SPRINT", cream],
    [418, `${keyLabels[jumpKey]}  JUMP`, amber], [570, "CHECKPOINT", "#a9dfbd"],
    [752, `${keyLabels[jumpKey]}  JUMP`, amber], [960, "CHECKPOINT", "#a9dfbd"],
    [1134, "LONG JUMP", amber], [1650, "CART RETURN", "#a9dfbd"]
  ]) {
    const width = Math.ceil(ctx.measureText(label).width / 4) * 4 + 24;
    rect(steel, x - 2, floor - 54, 4, 54);
    rect(color, x - width / 2, floor - 78, width, 28);
    rect(ink, x - width / 2 + 2, floor - 76, width - 4, 24);
    ctx.fillStyle = color;
    ctx.fillText(label, x, floor - 59);
  }
}

// Each cell maps to one palette color in the cart sprite.
const cartSprite = [
  "AA..........",
  ".C..........",
  "..CCCCCCCCCC",
  "..CVCVCVCVC.",
  "...CVCVCVC..",
  "...CCCCCCC..",
  "....C.......",
  "....CCCCCC..",
  "....I...I...",
  "....V...V..."
];
const spriteColors = {A: amber, C: cream, V: violet, I: ink};

function drawCart() {
  const left = Math.round((cart.x - 24) / 2) * 2;
  const top = Math.round((cart.y - 40) / 2) * 2;
  for (const [row, cells] of cartSprite.entries()) {
    for (const [column, cell] of [...cells].entries()) {
      if (spriteColors[cell]) rect(spriteColors[cell], left + column * 4, top + row * 4, 4, 4);
    }
  }
}

function draw() {
  const target = Math.max(0, Math.min(cart.x - 275, 790));
  camera += (target - camera) * .16;
  ctx.setTransform(.5, 0, 0, .5, 0, 0);
  drawBackdrop();
  ctx.save();
  ctx.translate(-Math.round(camera / 2) * 2, 0);
  drawPlatforms();
  drawSigns();
  drawCart();
  ctx.restore();

  const [label, instruction] = cart.x < 150
    ? ["01 / Loading bay", "Hold D to roll. A backs up."]
    : cart.x < 330
      ? ["01 / Loading bay", "Hold Alt while rolling to sprint. Release it before the first gap."]
      : cart.x < 935
        ? ["02 / Practice gaps", `Keep rolling and tap ${keyLabels[jumpKey]} at the jump sign.`]
        : cart.x < 1425
          ? ["03 / Long jump", `Build speed with Alt. Keep holding it and press ${keyLabels[jumpKey]} at the jump sign.`]
          : ["04 / Cart return", "Keep rolling to the cart return."];
  if (stage.textContent !== label) stage.textContent = label;
  if (hint.textContent !== instruction) hint.textContent = instruction;
  const count = String(attempts).padStart(2, "0");
  if (stats.textContent !== count) stats.textContent = count;
  const completion = Math.min(100, Math.max(0, Math.round((cart.x - 65) / 15.85)));
  if (progress.value !== completion) progress.value = completion;
}

let lastFrame;
let elapsed = 0;
function frame(now) {
  elapsed += Math.min(now - (lastFrame ?? now), 80);
  lastFrame = now;
  while (elapsed >= 1000 / 60) {
    step();
    elapsed -= 1000 / 60;
  }
  draw();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);


