import Papa from "papaparse";
import fs from "node:fs";

const { data, errors, meta } = Papa.parse(
  fs.readFileSync("All_Cards_Warfighter_WW2.csv", "utf8"),
  { header: true }
);

const db = {};

const rulesetMapping = {
  pacific: [
    "13",
    "14",
    "15",
    "16",
    "17",
    "18",
    "19",
    "22",
    "23",
    "35",
    "51",
    "53",
    "56",
    "60",
    "61",
    "64",
    "65",
    "66",
  ],
  mediterranean: [
    "67",
    "68",
    "70",
    "71",
    "72",
    "73",
    "74",
    "75",
    "76",
    "77",
    "78",
    "80",
    "81",
    "82",
    "83",
    "87",
    "88",
  ],
  europe: [
    "Core Europe",
    "01",
    "02",
    "03",
    "06",
    "07",
    "08",
    "09",
    "10",
    "11",
    "12",
    "20",
    "21",
    "24",
    "25",
    "32",
    "33",
    "34",
    "40",
    "42",
    "46",
    "47",
    "48",
    "49",
    "50",
    "52",
    "54",
    "55",
    "57",
    "59",
    "62",
    "63",
  ],
};
const rulesetLookup = {};
Object.entries(rulesetMapping).forEach(([k, v]) => {
  v.forEach((id) => (rulesetLookup[id] = k));
});

function getIdentifiers(record) {
  if (!record.Module) {
    return null;
  }
  if (record.Module === "") {
  }
  switch (record.Module) {
    case undefined:
      return null;
    case "Core Europe":
      return {
        id: "europe_base",
        name: "Europe (base game)",
        ruleset: "europe",
        baseGame: true,
      };
    default: {
      const module = record.Module.replaceAll("–", "-");
      const match = module.match(/Extension#(\d+)\s?- (.*)$/);
      if (!match || !rulesetLookup[match[1]]) return null;
      const key = rulesetLookup[match[1]];
      return { id: `${key}_${match[1]}`, name: match[2], ruleset: key };
    }
  }
}

function getType(record) {
  switch (true) {
    case !!record.Notes.match(/Holding Action/i):
      return "holdingAction";
    case !!record.Notes.match(/Hold the Line/i):
      return "holdTheLine";
    default:
      return undefined;
  }
}

function getMultiObjectiveCount(record) {
  const match = record.Stats.match(/OB:#\d+(,?\s?#\d+)+/);
  if (!match) {
    return undefined;
  }
  return [...match[0].matchAll("#")].length;
}

data.forEach((record) => {
  const identifier = getIdentifiers(record);
  if (!identifier) return;
  db[identifier.id] ??= identifier;

  switch (true) {
    case record.Type.startsWith("Mission"): {
      const region = record.Type.substring(record.Type.indexOf(" ") + 1);
      db[identifier.id].regions ??= {};
      db[identifier.id].regions[region] ??= { name: region };
      db[identifier.id].missions ??= [];
      db[identifier.id].missions.push({
        name: record.Name,
        rp: Number.parseInt(record.Stats.match(/R:(\d+)/)[1], 10),
        distance: Number.parseInt(record.Stats.match(/OB:#(\d+)/)[1], 10),
        region,
        type: getType(record),
        objectiveCount: getMultiObjectiveCount(record),
      });
      break;
    }
    case record.Type.startsWith("Airborne Mission"): {
      const region = record.Type.match(/^Airborne Mission (.*)$/)?.[1];
      if (!region)
        throw new Error(
          `No region on mission! ${JSON.stringify(record, null, 4)}`
        );
      db[identifier.id].regions ??= {};
      db[identifier.id].regions[region] ??= { name: region };
      db[identifier.id].missions ??= [];
      db[identifier.id].missions.push({
        name: record.Name,
        rp: Number.parseInt(record.Stats.match(/R:(\d+)/)[1], 10),

        distance: Number.parseInt(record.Stats.match(/OB:#(\d+)/)[1], 10),
        region,
        type: getType(record),
        airborne: true,
        objectiveCount: getMultiObjectiveCount(record),
      });
      break;
    }
    case record.Type.startsWith("Objective") &&
      !record.Type.startsWith("Objective Embedded"): {
      const region = record.Type.substring(record.Type.indexOf(" ") + 1);
      db[identifier.id].regions ??= {};
      db[identifier.id].regions[region] ??= { name: region };
      db[identifier.id].objectives ??= [];
      db[identifier.id].objectives.push({
        name: record.Name,
        region,
        type: getType(record),
      });
      break;
    }
    case record.Type.startsWith("Hostile Frontline"): {
      const region = record.Type.match(/^Hostile Frontline (.*)$/)?.[1];
      if (region && region !== "Undead") {
        db[identifier.id].regions ??= {};
        db[identifier.id].regions[region] ??= { name: region };
        db[identifier.id].regions[region].hostiles ??= {};
        db[identifier.id].regions[region].hostiles[
          `${region} (Frontline)${record.Nation ? ` [${record.Nation}]` : ""}`
        ] ??= true;
      } else {
        db[identifier.id].hostiles ??= {};
        db[identifier.id].hostiles[`${record.Nation} (Frontline)`] = true;
      }
      break;
    }
    case record.Type.startsWith("Hostile Elite"): {
      const region = record.Type.match(/^Hostile Elite (.*)$/)?.[1];
      if (region && region !== "Undead") {
        db[identifier.id].regions ??= {};
        db[identifier.id].regions[region] ??= { name: region };
        db[identifier.id].regions[region].hostiles ??= {};
        db[identifier.id].regions[region].hostiles[
          `${region} (Elite)${record.Nation ? ` [${record.Nation}]` : ""}`
        ] ??= true;
      } else {
        db[identifier.id].hostiles ??= {};
        db[identifier.id].hostiles[`${record.Nation} (Elite)`] = true;
      }
      break;
    }
    case record.Type.startsWith("Anti-Vehicle Elite"): {
      const region = record.Type.match(/^Anti-Vehicle Elite (.*)$/)?.[1];
      if (region && region !== "Undead") {
        db[identifier.id].regions ??= {};
        db[identifier.id].regions[region] ??= { name: region };
        db[identifier.id].regions[region].hostiles ??= {};
        db[identifier.id].regions[region].hostiles[
          `German (Frontline) with ${region} Anti-Vehicle Elite`
        ] ??= true;
        db[identifier.id].regions[region].hostiles[
          `German (Elite) with ${region} Anti-Vehicle Elite`
        ] ??= true;
      }
      break;
    }
    // Funky alt-history setting
    case record.Type.startsWith("Alternate Hostiles Elite"): {
      const region = "Castle Frankenstein";
      db[identifier.id].regions ??= {};
      db[identifier.id].regions[region] ??= { name: region };
      db[identifier.id].regions[region].hostiles ??= {};
      db[identifier.id].regions[region].hostiles[`${region} (Elite)`] ??= true;
      break;
    }
    case record.Type.includes("Soldier"): {
      db[identifier.id].factions ??= {};
      db[identifier.id].factions[record.Nation] ??= { name: record.Nation };
      if (record.Nation.includes("Airborne")) {
        db[identifier.id].factions[record.Nation].airborne = true;
      }
      break;
    }
  }
});

//post-processing (overrides)
["pacific_13", "mediterranean_67", "mediterranean_68"].forEach(
  (x) => (db[x].baseGame = true)
);

function factionRename(expansion1, expansion2, region1, region2) {
  console.log(db[expansion1]);
  const key1 = Object.keys(db[expansion1].regions)[0];
  const key2 = Object.keys(db[expansion2].regions)[0];
  db[expansion1].regions[key1].name = region1;
  db[expansion1].missions.forEach((x) => (x.region = region1));
  db[expansion1].objectives.forEach((x) => (x.region = region1));
  db[expansion2].regions[key2].name = region2;
  db[expansion2].missions.forEach((x) => (x.region = region2));
  db[expansion2].objectives.forEach((x) => (x.region = region2));
}

factionRename("europe_47", "europe_48", "Mokra [Poland]", "Mokra [Russia]");
factionRename("pacific_60", "pacific_61", "Attu [US]", "Attu [Japan]");
factionRename(
  "pacific_65",
  "pacific_66",
  "Guadalcanal [USMC]",
  "Guadalcanal [Japan]"
);

delete db.mediterranean_87.regions;
db.mediterranean_87.hostiles = {
  "UK Gurkhas (Elite)": true,
  "UK Gurkhas (Frontline)": true,
};

delete db.mediterranean_88.regions;
db.mediterranean_88.hostiles = {
  "UK Desert Rats (Elite)": true,
  "UK Desert Rats (Frontline)": true,
};

//post-processing (structure)
Object.values(db).forEach((expansion) => {
  if (expansion.regions) {
    expansion.regions = Object.values(expansion.regions);
    expansion.regions.forEach((region) => {
      if (region.hostiles) region.hostiles = Object.keys(region.hostiles);
    });
  }
  if (expansion.factions)
    expansion.factions = Object.values(expansion.factions);
  if (expansion.hostiles) expansion.hostiles = Object.keys(expansion.hostiles);
});
// console.log(JSON.stringify(db, null, 2));
fs.writeFileSync("ww2.json", JSON.stringify(db, null, 2));
