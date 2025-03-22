import Papa from "papaparse";
import fs from "node:fs";

const { data, errors, meta } = Papa.parse(
  fs.readFileSync("All_cards_Warfighter_SW.csv", "utf8"),
  { header: true }
);

const db = {};

function getIdentifiers(record) {
  if (!record.Module) {
    return null;
  }
  if (record.Module === "") {
  }
  switch (record.Module) {
    case undefined:
      return null;
    case "The Modern Night Combat Card Game – Shadow War":
      return {
        id: "shadow_base",
        name: "Shadow War (base game)",
        ruleset: "shadow",
        baseGame: true,
      };
    default: {
      const module = record.Module.replaceAll("–", "-");
      const match = module.match(/Expansion #(\d+)\s?- (.*)$/);
      if (!match) return null;
      return { id: `shadow_${match[1]}`, name: match[2], ruleset: "shadow" };
    }
  }
}
data.forEach((record) => {
  const identifier = getIdentifiers(record);
  if (!identifier) return;
  db[identifier.id] ??= identifier;

  switch (true) {
    case record.Type.startsWith("Mission"): {
      const region = record.Type.substring(record.Type.indexOf(" ") + 1);
      console.log("region", region, "orig:", record.Type);
      db[identifier.id].regions ??= {};
      db[identifier.id].regions[region] ??= { name: region };
      db[identifier.id].missions ??= [];
      db[identifier.id].missions.push({
        name: record.Name,
        rp: Number.parseInt(record.Stats.match(/R:(\d+)/)[1], 10),
        distance: Number.parseInt(record.Stats.match(/OB:#(\d+)/)[1], 10),
        region,
      });
      break;
    }
    case record.Type.startsWith("Objective") &&
      !record.Type.startsWith("Objective Embedded"): {
      const region = record.Type.substring(record.Type.indexOf(" ") + 1);
      console.log("region", region, "orig:", record.Type);
      db[identifier.id].regions ??= {};
      db[identifier.id].regions[region] ??= { name: region };
      db[identifier.id].objectives ??= [];
      db[identifier.id].objectives.push({
        name: record.Name,
        region,
      });
      break;
    }
    case record.Type.startsWith("Hostile"): {
      const region = record.Type.substring(record.Type.indexOf(" ") + 1);
      // ignore Reaction Force
      if (region === "Reaction Force") break;
      console.log("region", region, "orig:", record.Type);
      db[identifier.id].regions ??= {};
      db[identifier.id].regions[region] ??= { name: region };
      db[identifier.id].regions[region].hostiles ??= {};
      db[identifier.id].regions[region].hostiles[region] ??= true;
      break;
    }
    case record.Type.includes("Soldier"): {
      db[identifier.id].factions ??= {};
      db[identifier.id].factions[record.Nations] ??= { name: record.Nations };
      break;
    }
    case record.Type.startsWith("Night Extraction"): {
      db[identifier.id].extractions ??= [];
      db[identifier.id].extractions.push(record.Name);
      break;
    }
    case record.Type.startsWith("Night Insertion"): {
      db[identifier.id].insertions ??= [];
      db[identifier.id].insertions.push(record.Name);
      break;
    }

    default:
  }
});

//post-processing (overrides)
db.shadow_20.name = "Yongbyon Nuclear Facility";
db.shadow_57.insertions = ["Helo (UH-60 BLACKHAWK) [General Soleimani]"];
db.shadow_57.extractions = ["Helo (MH-6) [General Soleimani]"];

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
});
// console.log(JSON.stringify(db, null, 2));
fs.writeFileSync("shadow.json", JSON.stringify(db, null, 2));
