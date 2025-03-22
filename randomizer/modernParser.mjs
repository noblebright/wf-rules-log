import Papa from "papaparse";
import fs from "node:fs";

const { data, errors, meta } = Papa.parse(
  fs.readFileSync("All_cards_Warfighter_Modern.csv", "utf8"),
  { header: true }
);

const db = {};

function getIdentifiers(record) {
  switch (record.Module) {
    case undefined:
      return null;
    case "The Tactical Special Forces Card Game":
      return {
        id: "modern_base",
        name: "Modern (base game)",
        ruleset: "modern",
        baseGame: true,
      };
    default: {
      const module = record.Module.replaceAll("–", "-");
      const match = module.match(/Expansion #(\d+)\s?- (.*)$/);
      if (!match) return null;
      return { id: `modern_${match[1]}`, name: match[2], ruleset: "modern" };
    }
  }
}

data.forEach((record) => {
  const identifier = getIdentifiers(record);
  // ignore list
  if (
    !identifier ||
    ["modern_15", "modern_18", "modern_31", "modern_55", "modern_58"].includes(
      identifier.id
    )
  )
    return;
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
        type: record.Notes.match(/Holding Action Mission/i)
          ? "holdingAction"
          : undefined,
      });
      break;
    }
    case record.Type.startsWith("Objective") &&
      !record.Type.startsWith("Objective Embedded"): {
      const region = record.Type.substring(
        record.Type.indexOf(" ") + 1
      ).replace(" (K9)", "");
      console.log("region", region, "orig:", record.Type);
      db[identifier.id].regions ??= {};
      db[identifier.id].regions[region] ??= { name: region };
      db[identifier.id].objectives ??= [];
      db[identifier.id].objectives.push({
        name: record.Name,
        region,
        type: record.Notes.match(/Holding Action Mission/i)
          ? "holdingAction"
          : undefined,
      });
      break;
    }
    case record.Type.startsWith("Hostile"): {
      const region = record.Type.substring(record.Type.indexOf(" ") + 1);
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

    default:
  }
});

//post-processing (overrides)
db.modern_14.name = "Israel #1 / #2";
db.modern_30.name = "Canada #1 / #2";
db.modern_19.objectives[0].region = "Jungle";
db.modern_19.objectives[1].region = "Jungle";
db.modern_19.regions = {
  Jungle: { name: "Jungle", hostiles: { "Jungle (Elite Drug War)": true } },
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
});
fs.writeFileSync("modern.json", JSON.stringify(db, null, 2));
