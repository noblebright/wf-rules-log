import fs from "node:fs";

const modern = JSON.parse(fs.readFileSync("modern.json", "utf8"));
const shadow = JSON.parse(fs.readFileSync("shadow.json", "utf8"));
const ww2 = JSON.parse(fs.readFileSync("ww2.json", "utf8"));
const expansions = Object.assign({}, modern, shadow, ww2);
const metadata = {
  baseGameNames: {
    modern: "Warfighter Modern",
    shadow: "Shadow War",
    europe: "WW II: Europe",
    pacific: "WW II: Asia",
    mediterranean: "WW II: Mediterranean",
  },
  factionMap: {
    US: ["US"],
    UK: ["UK"],
    Russia: ["Russian", "RU"],
    Poland: ["Poland", "PO"],
    France: ["France", "Free French"],
    China: ["China"],
    Finland: ["Finalnd"],
    Canada: ["Canada"],
    "New Zealand": ["New Zealand"],
    Greece: ["Greece"],
    Germany: ["German", "Vichy French"],
    Japan: ["Japan"],
    Italy: ["Italian"],
  },
  axis: ["Germany", "Japan", "Italy"],
  allies: [
    "US",
    "UK",
    "Russia",
    "Poland",
    "France",
    "China",
    "Finland",
    "Canada",
    "New Zealand",
    "Greece",
  ],
};
fs.writeFileSync("expansion-db.json", JSON.stringify({ expansions, metadata }));
