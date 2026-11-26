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
const keyLabels = {F4: "F4", Space: "Space", KeyJ: "J", KeyZ: "Z"};
const gameKeys = new Set(["KeyA", "KeyD", "AltLeft", "AltRight", ...Object.keys(keyLabels)]);
const checkpointKey = "rage-cart-checkpoint";
const keys = new Set();
const floor = 312;
const platforms = [[0, 450], [550, 780], [895, 1180], [1425, 1750]];
const cart = {x: 65, y: floor, vx: 0, vy: 0, grounded: true};
let attempts = 0;
let checkpoint = 65;
let jumpKey = "F4";
let sawPrank = false;
let finished = false;
let jump = false;

try { sawPrank = localStorage.getItem(checkpointKey) === "reached"; } catch {}

function reset(x) {
  keys.clear();
  jump = false;
  Object.assign(cart, {x, y: floor, vx: 0, vy: 0, grounded: true});
}

function showResult(won) {
  keys.clear();
  jump = false;
  finished = true;
  title.textContent = won ? "Cart returned." : "noob, you quit lol";
  message.textContent = won ? `You survived the parking lot. Wipeouts: ${attempts}.` : "Pick a new jump key and take another run at the gap.";
  remap.hidden = won;
  retry.textContent = won ? "Race again" : "Reopen at checkpoint";
  dialog.showModal();
}

retry.addEventListener("click", () => {
  if (cart.x >= 1650) {
    attempts = 0;
    checkpoint = 65;
    jumpKey = "F4";
    try { localStorage.removeItem(checkpointKey); } catch {}
  } else {
    jumpKey = binding.value;
  }
  document.querySelector("#jump-key").textContent = keyLabels[jumpKey];
  reset(checkpoint);
  finished = false;
  dialog.close();
});
dialog.addEventListener("cancel", event => event.preventDefault());

window.addEventListener("keydown", event => {
  if (finished || !gameKeys.has(event.code)) return;
  const sprinting = event.altKey || keys.has("AltLeft") || keys.has("AltRight");
  if (jumpKey === "F4" && event.code === "F4" && sprinting && checkpoint === 960) {
    // Leave the native shortcut available. Where it is unhandled, try closing the game window.
    if (!event.repeat) {
      window.close();
      if (!window.closed) showResult(false);
    }
    return;
  }
  event.preventDefault();
  if (event.repeat) return;
  keys.add(event.code);
  if (event.code === jumpKey) jump = true;
});
window.addEventListener("keyup", event => keys.delete(event.code));
window.addEventListener("blur", () => { keys.clear(); jump = false; });

function step() {
  if (finished) return;
  const direction = Number(keys.has("KeyD")) - Number(keys.has("KeyA"));
  const speed = keys.has("AltLeft") || keys.has("AltRight") ? 11 : 4.8;
  cart.vx += (direction * speed - cart.vx) * (cart.grounded ? .27 : .13);
  if (cart.grounded && jump) cart.vy = -11;
  jump = false;
  const previousY = cart.y;
  cart.x = Math.max(18, cart.x + cart.vx);
  cart.vy += .72;
  cart.y += cart.vy;
  cart.grounded = previousY <= floor && cart.y >= floor &&
    platforms.some(([start, end]) => cart.x >= start && cart.x <= end);
  if (cart.grounded) {
    cart.y = floor;
    cart.vy = 0;
    if (cart.x >= 935 && cart.x < 1180 && checkpoint !== 960) {
      checkpoint = 960;
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
  checkpoint = 960;
  reset(checkpoint);
  showResult(false);
}

function draw() {
  const camera = Math.max(0, Math.min(cart.x - 275, 830));
  ctx.fillStyle = "#30204f";
  ctx.fillRect(0, 0, 960, 400);
  ctx.fillStyle = "#fc6ea8";
  ctx.beginPath();
  ctx.arc(763 - camera * .16, 121, 65, 0, Math.PI * 2);
  ctx.fill();
  for (let i = 0; i < 18; i++) {
    const height = 32 + (i * 47) % 114;
    ctx.fillStyle = i % 2 ? "#422861" : "#52316e";
    ctx.fillRect(i * 75 - camera * .38, floor - height, 59, height);
  }
  ctx.save();
  ctx.translate(-camera, 0);
  for (const [start, end] of platforms) {
    ctx.fillStyle = "#151221";
    ctx.fillRect(start, floor, end - start, 88);
    ctx.fillStyle = "#e9ff61";
    ctx.fillRect(start, floor, end - start, 5);
    ctx.fillStyle = "#5e4771";
    for (let x = start + 9; x + 22 < end; x += 42) ctx.fillRect(x, floor + 21, 22, 3);
  }
  ctx.font = "bold 16px monospace";
  for (const [x, label] of [[200, "SPRINT TEST"], [418, "JUMP HERE"], [752, "AGAIN"], [1134, "LONG JUMP"], [1650, "CART RETURN"]]) {
    ctx.fillStyle = "#fff6d9";
    ctx.textAlign = "center";
    ctx.fillText(label, x, floor - 61);
    ctx.fillRect(x - 1, floor - 54, 2, 28);
  }
  ctx.translate(cart.x, cart.y - 15);
  ctx.rotate(cart.grounded ? 0 : Math.max(-.25, Math.min(.25, cart.vy * .024)));
  ctx.strokeStyle = "#fff6d9";
  ctx.fillStyle = "#fb569d";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-25, -16); ctx.lineTo(-18, -16); ctx.lineTo(-11, 5);
  ctx.lineTo(13, 5); ctx.lineTo(18, -13); ctx.lineTo(-17, -13);
  ctx.fill(); ctx.stroke();
  for (const x of [-9, 11]) {
    ctx.beginPath(); ctx.arc(x, 11, 4, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
  const instruction = cart.x < 150 ? "Hold D to roll. A backs up."
    : cart.x < 330 ? "Hold Alt while rolling to sprint. Release it before the first gap."
    : cart.x < 935 ? `Keep rolling and tap ${keyLabels[jumpKey]} at the edge to jump.`
    : `That gap is too wide. Hold Alt to sprint, then press ${keyLabels[jumpKey]} to jump farther.`;
  if (hint.textContent !== instruction) hint.textContent = instruction;
  const count = `Wipeouts · ${attempts}`;
  if (stats.textContent !== count) stats.textContent = count;
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
