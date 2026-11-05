const getUnitFactorToRoot = (unitId, units) => {
  const visited = new Set();
  let currentId = unitId;
  let factor = 1;

  while (!visited.has(currentId)) {
    visited.add(currentId);
    const unit = units.get(currentId);
    if (!unit) return null;
    if (unit.parentId === null) return { rootId: currentId, factor };
    if (!Number.isFinite(unit.factor) || unit.factor <= 0) return null;
    factor *= unit.factor;
    currentId = unit.parentId;
  }

  return null;
};

const calculateRecipeIngredientCost = (ingredient, inventory, units) => {
  if (
    !Number.isFinite(ingredient.quantity) || ingredient.quantity <= 0 ||
    !Number.isFinite(inventory.quantity) || inventory.quantity <= 0 ||
    !Number.isFinite(inventory.price) || inventory.price < 0
  ) {
    return null;
  }

  const recipeUnit = getUnitFactorToRoot(ingredient.unitId, units);
  const inventoryUnit = getUnitFactorToRoot(inventory.unitId, units);
  if (
    recipeUnit === null || inventoryUnit === null ||
    recipeUnit.rootId !== inventoryUnit.rootId
  ) return null;

  const inventoryQuantityUsed = ingredient.quantity * recipeUnit.factor / inventoryUnit.factor;
  const costPerRecipeUnit = inventory.price * recipeUnit.factor /
    (inventory.quantity * inventoryUnit.factor);
  const totalCost = inventoryQuantityUsed * inventory.price / inventory.quantity;

  if (![inventoryQuantityUsed, costPerRecipeUnit, totalCost].every(Number.isFinite)) {
    return null;
  }

  return { costPerRecipeUnit, totalCost };
};

module.exports = { calculateRecipeIngredientCost };
