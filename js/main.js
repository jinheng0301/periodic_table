import * as THREE from "three";
import { CSS3DObject, CSS3DRenderer } from "three/addons/renderers/CSS3DRenderer.js";
import { TrackballControls } from "three/addons/controls/TrackballControls.js";
import * as TWEEN from "three/addons/libs/tween.module.js";
import { CONFIG } from "./config.js";
import { describeAuthError, signIn, signOut, waitForGoogle } from "./auth.js";
import { describeSheetsError, fetchPeople } from "./sheets.js";
import { createCard } from "./card.js";
import { buildLayouts } from "./layouts.js";

const loginView = document.querySelector("#login-view");
const appView = document.querySelector("#app-view");
const signInButton = document.querySelector("#sign-in-button");
const signOutButton = document.querySelector("#sign-out-button");
const loginError = document.querySelector("#login-error");
const loginHint = document.querySelector("#login-hint");
const statusPanel = document.querySelector("#status-panel");
const statusText = document.querySelector("#status-text");
const statusAction = document.querySelector("#status-action");
const sceneContainer = document.querySelector("#scene-container");
const userName = document.querySelector("#user-name");
const userPicture = document.querySelector("#user-picture");
const layoutButtons = [...document.querySelectorAll("[data-layout]")];

let accessToken = "";
let currentLayout = "table";
let scene;
let camera;
let renderer;
let controls;
let cards = [];
let layouts;
let frameRequested = false;

function showStatus(message, { loading = false, action = "", onAction = null } = {}) {
  statusText.textContent = message;
  statusPanel.classList.toggle("is-loading", loading);
  statusPanel.hidden = false;
  statusAction.textContent = action;
  statusAction.hidden = !action;
  statusAction.onclick = onAction;
}

function hideStatus() {
  statusPanel.hidden = true;
  statusPanel.classList.remove("is-loading");
  statusAction.hidden = true;
  statusAction.onclick = null;
}

function setCurrentLayout(name) {
  currentLayout = name;
  for (const button of layoutButtons) {
    const active = button.dataset.layout === name;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  }
}

function startAnimation() {
  if (frameRequested) return;
  frameRequested = true;
  const animate = () => {
    if (!frameRequested) return;
    TWEEN.update();
    controls?.update();
    renderer?.render(scene, camera);
    requestAnimationFrame(animate);
  };
  requestAnimationFrame(animate);
}

function transitionTo(name) {
  const targets = layouts?.[name];
  if (!targets || cards.length !== targets.length) return;

  TWEEN.removeAll();
  setCurrentLayout(name);
  cards.forEach((object, index) => {
    const target = targets[index];
    const duration = 1500 + Math.random() * 1500;
    new TWEEN.Tween(object.position)
      .to({ x: target.position.x, y: target.position.y, z: target.position.z }, duration)
      .easing(TWEEN.Easing.Exponential.InOut)
      .start();
    new TWEEN.Tween(object.rotation)
      .to({ x: target.rotation.x, y: target.rotation.y, z: target.rotation.z }, duration)
      .easing(TWEEN.Easing.Exponential.InOut)
      .start();
  });
}

function resizeScene() {
  if (!renderer || !camera) return;
  const width = window.innerWidth;
  const height = window.innerHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
}

function buildScene(people) {
  if (people.length !== CONFIG.EXPECTED_PEOPLE) {
    throw new Error(`expected_${CONFIG.EXPECTED_PEOPLE}_people_received_${people.length}`);
  }

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05070b);
  camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 1, 10000);
  camera.position.z = 3200;
  renderer = new CSS3DRenderer();
  renderer.setSize(window.innerWidth, window.innerHeight);
  sceneContainer.replaceChildren(renderer.domElement);

  controls = new TrackballControls(camera, renderer.domElement);
  controls.minDistance = 500;
  controls.maxDistance = 6000;
  controls.rotateSpeed = 1.2;
  controls.zoomSpeed = 1.1;

  layouts = buildLayouts(people.length);
  cards = people.map((person, index) => {
    const object = new CSS3DObject(createCard(person));
    object.position.set((Math.random() - .5) * 4000, (Math.random() - .5) * 3000, (Math.random() - .5) * 3000);
    object.rotation.set(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1);
    scene.add(object);
    return object;
  });

  window.addEventListener("resize", resizeScene);
  startAnimation();
  transitionTo("table");
}

function clearScene() {
  TWEEN.removeAll();
  window.removeEventListener("resize", resizeScene);
  controls?.dispose();
  renderer?.domElement.remove();
  scene = undefined;
  camera = undefined;
  renderer = undefined;
  controls = undefined;
  layouts = undefined;
  cards = [];
  frameRequested = false;
}

async function loadPeople() {
  showStatus("Loading people from Google Sheets…", { loading: true });
  try {
    const people = await fetchPeople(accessToken);
    if (people.length !== CONFIG.EXPECTED_PEOPLE) {
      throw new Error(`expected_${CONFIG.EXPECTED_PEOPLE}_people_received_${people.length}`);
    }
    buildScene(people);
    hideStatus();
  } catch (error) {
    const errorInfo = error instanceof Error && error.message.startsWith("expected_")
      ? { text: `Expected ${CONFIG.EXPECTED_PEOPLE} people in the Sheet, but found ${peopleCountFromError(error.message)}. Check the source data.`, action: "" }
      : describeSheetsError(error);
    showStatus(errorInfo.text, {
      action: errorInfo.action,
      onAction: errorInfo.action === "Try again" ? loadPeople : errorInfo.action === "Sign out" ? handleSignOut : null
    });
  }
}

function peopleCountFromError(message) {
  const match = message.match(/received_(\d+)/);
  return match ? match[1] : "an unexpected number of";
}

async function handleSignOut() {
  signOutButton.disabled = true;
  try {
    await signOut(accessToken);
  } finally {
    accessToken = "";
    clearScene();
    window.location.reload();
  }
}

async function handleSignIn() {
  loginError.hidden = true;
  loginError.textContent = "";
  signInButton.disabled = true;
  loginHint.textContent = "Complete the Google sign-in to continue.";

  try {
    const result = await signIn();
    accessToken = result.token;
    userName.textContent = result.user.name;
    if (result.user.picture) {
      userPicture.src = result.user.picture;
      userPicture.hidden = false;
    } else {
      userPicture.hidden = true;
    }
    loginView.hidden = true;
    appView.hidden = false;
    await loadPeople();
  } catch (error) {
    loginError.textContent = describeAuthError(error);
    loginError.hidden = false;
    loginHint.textContent = "";
  } finally {
    signInButton.disabled = false;
  }
}

signInButton.addEventListener("click", handleSignIn);
signOutButton.addEventListener("click", handleSignOut);
for (const button of layoutButtons) {
  button.addEventListener("click", () => transitionTo(button.dataset.layout));
}

try {
  await waitForGoogle();
  signInButton.disabled = false;
  loginHint.textContent = "";
} catch (error) {
  loginHint.textContent = "Google sign-in is unavailable. Refresh this page to try again.";
  loginError.textContent = describeAuthError(error);
  loginError.hidden = false;
}
