import { CONFIG } from "./config.js";

const PLACEHOLDER_IMAGE = "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><rect width="96" height="96" fill="#858b94"/><circle cx="48" cy="35" r="17" fill="#c3c7cd"/><path d="M15 94c2-22 15-34 33-34s31 12 33 34" fill="#c3c7cd"/></svg>'
);

export function colorOf(netWorth) {
  if (netWorth > CONFIG.THRESHOLDS.green) return CONFIG.COLORS.green;
  if (netWorth > CONFIG.THRESHOLDS.orange) return CONFIG.COLORS.orange;
  return CONFIG.COLORS.red;
}

function appendText(parent, tagName, className, value) {
  const element = document.createElement(tagName);
  element.className = className;
  element.textContent = value;
  parent.append(element);
  return element;
}

export function createCard(person) {
  const card = document.createElement("div");
  card.className = "element";
  const color = colorOf(person.netWorth);
  card.style.setProperty("--rgb", `${parseInt(color.slice(1, 3), 16)}, ${parseInt(color.slice(3, 5), 16)}, ${parseInt(color.slice(5, 7), 16)}`);

  const top = document.createElement("div");
  top.className = "element-top";
  appendText(top, "span", "element-country", person.country);
  appendText(top, "span", "element-age", person.age);
  card.append(top);

  const photo = document.createElement("img");
  photo.className = "element-photo";
  photo.alt = "";
  photo.loading = "lazy";
  photo.referrerPolicy = "no-referrer";
  photo.src = person.photo || PLACEHOLDER_IMAGE;
  photo.addEventListener("error", () => {
    if (photo.src !== PLACEHOLDER_IMAGE) photo.src = PLACEHOLDER_IMAGE;
  }, { once: true });
  card.append(photo);

  appendText(card, "div", "element-name", person.name);
  appendText(card, "div", "element-interest", person.interest);
  card.title = `${person.name}: $${person.netWorth.toLocaleString("en-US")}`;
  return card;
}
