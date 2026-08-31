// Syncs each page's <span class="release-date-value"> with Steam's appdetails API.
import { readFile, writeFile } from "node:fs/promises";

const targets = [
  { file: "games/dunhero.html", appid: 2270210 },
  { file: "games/emojis-vs-zombies.html", appid: 2422470 },
];

async function fetchReleaseDate(appid) {
  const url = `https://store.steampowered.com/api/appdetails?appids=${appid}&cc=us&l=english`;
  const res = await fetch(url, { headers: { "Accept-Language": "en" } });
  if (!res.ok) throw new Error(`Steam API request failed for ${appid}: ${res.status}`);
  const json = await res.json();
  const entry = json[String(appid)];
  if (!entry?.success) throw new Error(`Steam API returned no data for ${appid}`);
  return entry.data.release_date.date;
}

async function updateFile(file, appid) {
  const date = await fetchReleaseDate(appid);
  const contents = await readFile(file, "utf8");
  const pattern = new RegExp(
    `(<p class="release-date" data-steam-appid="${appid}"><strong>Release date:</strong> <span class="release-date-value">)([^<]*)(</span></p>)`
  );

  if (!pattern.test(contents)) {
    console.warn(`No release-date marker found for appid ${appid} in ${file}`);
    return false;
  }

  const updated = contents.replace(pattern, (_match, before, current, after) =>
    current === date ? _match : `${before}${date}${after}`
  );

  if (updated === contents) {
    console.log(`${file}: release date already up to date (${date})`);
    return false;
  }

  await writeFile(file, updated, "utf8");
  console.log(`${file}: release date updated to "${date}"`);
  return true;
}

let changed = false;
for (const { file, appid } of targets) {
  changed = (await updateFile(file, appid)) || changed;
}

process.exitCode = 0;
if (changed) console.log("Release dates changed.");
