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

function drawBackdrop() {
  const sky = ctx.createLinearGradient(0, 0, 0, 350);
  sky.addColorStop(0, "#183032");
  sky.addColorStop(.58, "#385450");
  sky.addColorStop(1, "#a2926e");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, 960, 400);

  ctx.fillStyle = "#d9c799";
  ctx.beginPath();
  ctx.arc(768 - camera * .09, 105, 36, 0, Math.PI * 2);
  ctx.fill();

  for (let i = 0; i < 19; i++) {
    const x = i * 82 - camera * .28;
    const height = 25 + (i * 53) % 87;
    const y = 267 - height;
    ctx.fillStyle = i % 2 ? "#304a46" : "#39534d";
    ctx.fillRect(x, y, 74, height);
    ctx.fillStyle = "#a69b72";
    for (let window = 0; window < 4; window++) {
      if ((i + window) % 3 === 0) ctx.fillRect(x + 9 + window * 13, y + 11, 4, 2);
    }
  }

  ctx.fillStyle = "#263936";
  ctx.fillRect(0, 270, 960, 130);
  ctx.strokeStyle = "#587065";
  ctx.lineWidth = 1;
  for (let x = -(camera * .52 % 34); x < 960; x += 34) {
    ctx.beginPath();
    ctx.moveTo(x, 267);
    ctx.lineTo(x, 314);
    ctx.stroke();
  }
  ctx.fillRect(0, 308, 960, 92);
  for (let x = 130 - camera * .55; x < 960; x += 291) {
    const light = ctx.createRadialGradient(x + 17, 170, 1, x + 17, 170, 74);
    light.addColorStop(0, "#f9d99442");
    light.addColorStop(1, "#f9d99400");
    ctx.fillStyle = light;
    ctx.fillRect(x - 57, 96, 148, 148);
    ctx.fillStyle = "#172826";
    ctx.fillRect(x, 167, 4, 143);
    ctx.fillRect(x, 165, 28, 4);
    ctx.fillStyle = "#f9d994";
    ctx.fillRect(x + 10, 169, 18, 3);
  }
}

function drawPlatforms() {
  for (const [start, end] of platforms) {
    ctx.fillStyle = "#1b2826";
    ctx.fillRect(start, floor, end - start, 88);
    ctx.fillStyle = "#46564e";
    ctx.fillRect(start, floor, end - start, 18);
    ctx.fillStyle = "#819083";
    ctx.fillRect(start, floor, end - start, 2);
    ctx.fillStyle = "#2c3d37";
    ctx.fillRect(start, floor + 25, end - start, 2);
    for (let x = start + 15; x + 24 < end; x += 61) {
      ctx.fillRect(x, floor + 27, 2, 61);
      ctx.fillStyle = "#b6a46d";
      ctx.fillRect(x + 7, floor + 10, 23, 2);
      ctx.fillStyle = "#2c3d37";
    }
    for (const edge of [start, end - 25]) {
      ctx.fillStyle = "#e7b84d";
      ctx.fillRect(edge, floor, 25, 12);
      ctx.fillStyle = "#252c27";
      for (let stripe = 4; stripe < 24; stripe += 8) {
        ctx.beginPath();
        ctx.moveTo(edge + stripe, floor);
        ctx.lineTo(edge + stripe + 4, floor);
        ctx.lineTo(edge + stripe, floor + 12);
        ctx.lineTo(edge + stripe - 4, floor + 12);
        ctx.fill();
      }
    }
  }
}

function drawSigns() {
  ctx.font = "bold 13px monospace";
  ctx.textAlign = "center";
  for (const [x, label, color] of [
    [216, "SPRINT TEST", "#e8debd"], [418, "JUMP", "#f6cb57"],
    [570, "CHECKPOINT", "#a9dcc1"], [752, "JUMP", "#f6cb57"],
    [960, "CHECKPOINT", "#a9dcc1"], [1134, "LONG JUMP", "#f6cb57"],
    [1650, "CART RETURN", "#a9dcc1"]
  ]) {
    const width = ctx.measureText(label).width + 24;
    ctx.fillStyle = "#263431";
    ctx.fillRect(x - 2, floor - 57, 4, 57);
    ctx.fillStyle = "#172523";
    ctx.fillRect(x - width / 2, floor - 78, width, 26);
    ctx.strokeStyle = color;
    ctx.strokeRect(x - width / 2 + .5, floor - 77.5, width - 1, 25);
    ctx.fillStyle = color;
    ctx.fillText(label, x, floor - 60);
  }
}

function drawCart() {
  if (cart.grounded) {
    ctx.fillStyle = "#10171555";
    ctx.beginPath();
    ctx.ellipse(cart.x, floor - 1, 25, 4, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.translate(cart.x, cart.y - 15);
  ctx.rotate(Math.max(-.22, Math.min(.22, cart.vy * .022)));
  ctx.lineJoin = "round";
  ctx.fillStyle = "#3a4540";
  ctx.strokeStyle = "#ecede1";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-19, -19);
  ctx.lineTo(23, -19);
  ctx.lineTo(17, -4);
  ctx.lineTo(-13, -4);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-29, -23);
  ctx.lineTo(-22, -23);
  ctx.lineTo(-11, 5);
  ctx.lineTo(17, 5);
  ctx.moveTo(-15, -11);
  ctx.lineTo(20, -11);
  for (let x = -9; x < 20; x += 7) {
    ctx.moveTo(x, -18);
    ctx.lineTo(x - 1, -5);
  }
  ctx.stroke();
  ctx.fillStyle = "#f6cb57";
  ctx.fillRect(-31, -25, 10, 4);
  for (const x of [-10, 15]) {
    ctx.fillStyle = "#131817";
    ctx.beginPath();
    ctx.arc(x, 10, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#d8dacc";
    ctx.beginPath();
    ctx.arc(x, 10, 2, 0, Math.PI * 2);
    ctx.fill();
  }
}

function draw() {
  const target = Math.max(0, Math.min(cart.x - 275, 790));
  camera += (target - camera) * .16;
  drawBackdrop();
  ctx.save();
  ctx.translate(-camera, 0);
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

