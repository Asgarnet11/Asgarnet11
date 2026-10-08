import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

export const ACTIVITY_START = "<!-- AUTO:ACTIVITY:START -->";
export const ACTIVITY_END = "<!-- AUTO:ACTIVITY:END -->";

function escapeCell(value) {
  return String(value).replaceAll("|", "\\|").replaceAll("\n", " ");
}

function badgeSegment(value) {
  return encodeURIComponent(String(value).replaceAll("-", "--").replaceAll("_", "__").replaceAll(" ", "_"));
}

function renderLinks(links) {
  return links.map((link) => {
    const logo = link.logo ? `&logo=${encodeURIComponent(link.logo)}&logoColor=white` : "";
    const image = `https://img.shields.io/badge/${badgeSegment(link.label)}-${badgeSegment(link.value)}-${link.color}?style=for-the-badge${logo}`;
    return `  <a href="${link.url}"><img alt="${link.label}" src="${image}"></a>`;
  }).join("\n");
}

function renderFocus(focus) {
  return [
    "| Area | What I am exploring |",
    "| :--- | :--- |",
    ...focus.map((item) => `| 🟢 **${escapeCell(item.name)}** | ${escapeCell(item.description)} |`)
  ].join("\n");
}

const THEME_PALETTES = {
  matrix: {
    bg: "0d1117",
    title: "00FF66",
    text: "c9d1d9",
    icon: "00FF66",
    border: "238636"
  }
};

function renderProjectCards(projects, palette = THEME_PALETTES.matrix) {
  const cards = [];
  for (const project of projects) {
    try {
      const url = new URL(project.url);
      if (url.hostname === "github.com") {
        const parts = url.pathname.split("/").filter(Boolean);
        if (parts.length >= 2) {
          const owner = parts[0];
          const repo = parts[1];
          cards.push(`  <a href="${project.url}"><img src="https://github-readme-stats.vercel.app/api/pin/?username=${owner}&repo=${repo}&bg_color=${palette.bg}&title_color=${palette.title}&text_color=${palette.text}&icon_color=${palette.icon}&border_color=${palette.border}" alt="${escapeCell(project.name)}" /></a>`);
        }
      }
    } catch {
      // ignore
    }
  }
  if (!cards.length) return "";
  return `<p align="center">\n${cards.join("\n")}\n</p>\n`;
}

function renderProjects(projects) {
  const projectCards = renderProjectCards(projects);
  const table = [
    "| Project | Focus | Why it matters |",
    "| :--- | :--- | :--- |",
    ...projects.map((project) => {
      const homepage = project.homepage ? ` [Live](${project.homepage})` : "";
      return `| [**${escapeCell(project.name)}**](${project.url}) | ${escapeCell(project.focus)} | ${escapeCell(project.summary)}${homepage} |`;
    })
  ].join("\n");

  return `${projectCards}\n${table}`;
}

const SKILL_MAP = {
  go: "go",
  golang: "go",
  "vue.js": "vue",
  vue: "vue",
  react: "react",
  "react.js": "react",
  laravel: "laravel",
  python: "python",
  mysql: "mysql",
  git: "git",
  docker: "docker",
  linux: "linux",
  javascript: "js",
  js: "js",
  typescript: "ts",
  ts: "ts",
  html: "html",
  css: "css",
  tailwind: "tailwind",
  tailwindcss: "tailwind",
  postgres: "postgres",
  postgresql: "postgres",
  redis: "redis",
  nodejs: "nodejs",
  node: "nodejs",
  postman: "postman"
};

function renderTechStack(techStack) {
  const matchedSlugs = techStack
    .map((tech) => SKILL_MAP[tech.toLowerCase()])
    .filter(Boolean)
    .filter((slug, idx, arr) => arr.indexOf(slug) === idx);

  const iconUrl = matchedSlugs.length
    ? `https://skillicons.dev/icons?i=${matchedSlugs.join(",")}&theme=dark`
    : "";

  const textBadges = techStack.map((item) => `\`${item}\``).join(" · ");

  if (iconUrl) {
    return `<p align="center">\n  <a href="https://skillicons.dev">\n    <img src="${iconUrl}" alt="Tech Stack Icons" />\n  </a>\n</p>\n\n<p align="center">\n  ${textBadges}\n</p>`;
  }

  return textBadges;
}

function renderStats(username, palette = THEME_PALETTES.matrix) {
  const statsUrl = `https://github-readme-stats.vercel.app/api?username=${username}&show_icons=true&bg_color=${palette.bg}&title_color=${palette.title}&text_color=${palette.text}&icon_color=${palette.icon}&border_color=${palette.border}&hide_border=false`;
  const streakUrl = `https://streak-stats.demolab.com/?user=${username}&theme=dark&background=${palette.bg.toUpperCase()}&border=${palette.border}&stroke=${palette.border}&ring=${palette.title}&fire=${palette.title}&currStreakLabel=${palette.title}`;
  const topLangsUrl = `https://github-readme-stats.vercel.app/api/top-langs/?username=${username}&layout=compact&bg_color=${palette.bg}&title_color=${palette.title}&text_color=${palette.text}&border_color=${palette.border}&hide_border=false`;

  return `<p align="center">
  <img src="${statsUrl}" alt="${username}'s GitHub Stats" />
  <img src="${streakUrl}" alt="${username}'s GitHub Streak" />
</p>
<p align="center">
  <img src="${topLangsUrl}" alt="Top Languages" />
</p>`;
}

function renderSnake(username) {
  return `<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/${username}/${username}/output/github-contribution-grid-snake-dark.svg">
    <source media="(prefers-color-scheme: light)" srcset="https://raw.githubusercontent.com/${username}/${username}/output/github-contribution-grid-snake.svg">
    <img alt="GitHub Contribution Grid Snake Animation" src="https://raw.githubusercontent.com/${username}/${username}/output/github-contribution-grid-snake-dark.svg" width="100%">
  </picture>
</p>`;
}

function extractActivity(readme) {
  const startIndex = readme.indexOf(ACTIVITY_START);
  const endIndex = readme.indexOf(ACTIVITY_END);
  if (startIndex === -1 || endIndex === -1 || endIndex <= startIndex) return null;
  return readme.slice(startIndex + ACTIVITY_START.length, endIndex).trim();
}

async function readExistingActivity(readmePath) {
  try {
    const existing = await readFile(readmePath, "utf8");
    return extractActivity(existing);
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

export async function generateProfileReadme({ config, manifest, readmePath }) {
  const existingActivity = await readExistingActivity(readmePath);
  const activity = existingActivity || "_Recent public activity will appear here after the workflow runs._";
  const activitySection = config.activity.enabled
    ? `\n## ⚡ Recent Activity\n\n${ACTIVITY_START}\n${activity}\n${ACTIVITY_END}\n`
    : "";
  const techStack = renderTechStack(config.techStack);
  const about = config.profile.about.join("\n\n");
  const statsSection = renderStats(config.profile.username);
  const snakeSection = renderSnake(config.profile.username);

  const readme = `<!-- Generated by GitHub Profile Agent Console. Edit profile.config.json, then run npm run generate. -->
<p align="center">
  <picture>
    <source media="(max-width: 760px) and (prefers-color-scheme: dark)" srcset="./assets/hero/${manifest.assets.mobileDark}">
    <source media="(max-width: 760px)" srcset="./assets/hero/${manifest.assets.mobileLight}">
    <source media="(prefers-color-scheme: dark)" srcset="./assets/hero/${manifest.assets.desktopDark}">
    <source media="(prefers-color-scheme: light)" srcset="./assets/hero/${manifest.assets.desktopLight}">
    <img src="./assets/hero/${manifest.assets.desktopDark}" alt="${config.profile.name} - ${config.profile.headline}" width="100%">
  </picture>
</p>

<p align="center">
${renderLinks(config.links)}
</p>

## 👨‍💻 About Me

${about}

## 🎯 Current Focus

${renderFocus(config.focus)}

## 🚀 Featured Work

${renderProjects(config.projects)}

## 🔭 Research & Product Direction

${config.research.narrative}

## 🛠️ Tech Stack

${techStack}

## 📊 GitHub Analytics

${statsSection}

## 🐍 Contribution Graph

${snakeSection}
${activitySection}
---

<p align="center">
  ${config.footer}
</p>
`;

  await writeFile(resolve(readmePath), readme);
  return readme;
}
