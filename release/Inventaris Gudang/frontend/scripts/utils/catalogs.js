import { listCategories, listLocations, listUnits } from "../api/settings-api.js";
import { appState } from "../state/app-state.js";
import { getCollection } from "./data.js";

let catalogPromise = null;

export async function loadCatalogs(options = {}) {
  const existingCategories = appState.get("categories");
  const existingLocations = appState.get("locations");
  const existingUnits = appState.get("units");
  if (
    !options.force &&
    Array.isArray(existingCategories) &&
    Array.isArray(existingLocations) &&
    Array.isArray(existingUnits) &&
    (existingCategories.length > 0 ||
      existingLocations.length > 0 ||
      existingUnits.length > 0)
  ) {
    return {
      categories: existingCategories,
      locations: existingLocations,
      units: existingUnits,
    };
  }

  if (catalogPromise && !options.force) {
    return catalogPromise;
  }

  catalogPromise = Promise.all([
    listCategories({ signal: options.signal }),
    listLocations({ signal: options.signal }),
    listUnits({ signal: options.signal }),
  ])
    .then(([categoryData, locationData, unitData]) => {
      const categories = getCollection(categoryData, ["categories", "items"]);
      const locations = getCollection(locationData, ["locations", "items"]);
      const units = getCollection(unitData, ["units", "items"]);
      appState.patch({ categories, locations, units });
      return { categories, locations, units };
    })
    .finally(() => {
      catalogPromise = null;
    });

  return catalogPromise;
}

export function invalidateCatalogs() {
  appState.patch({ categories: [], locations: [], units: [] });
}
