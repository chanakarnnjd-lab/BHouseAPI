const pool = require('../config/db');
const { calculateRecipeIngredientCost } = require('../utils/recipeIngredientCost');

const MAX_MYSQL_INT = 2147483647;
const isPositiveInteger = (value) =>
  Number.isSafeInteger(value) && value > 0 && value <= MAX_MYSQL_INT;
const isValidRecipeQuantity = (value) =>
  typeof value === 'number' &&
  Number.isFinite(value) &&
  value > 0 &&
  value <= 99999999.99 &&
  Math.round(value * 100) / 100 === value;
const isNonNegativeInteger = (value) =>
  Number.isSafeInteger(value) && value >= 0 && value <= MAX_MYSQL_INT;
const isPositiveNumber = (value) =>
  typeof value === 'number' &&
  Number.isFinite(value) &&
  value > 0 &&
  value <= 99999999.99;

const validateRecipe = (body, userId) => {
  const {
    menu,
    margin,
    actualPrice,
    serve,
    picUrl,
    ingredients,
    categoryIds = []
  } = body || {};

  if (
    typeof menu !== 'string' ||
    !menu.trim() ||
    menu.trim().length > 100 ||
    !isNonNegativeInteger(margin) ||
    !isPositiveInteger(serve) ||
    typeof userId !== 'string' ||
    !userId.trim() ||
    !(picUrl === undefined || picUrl === null || (typeof picUrl === 'string' && picUrl.length <= 100)) ||
    !Array.isArray(ingredients) ||
    !Array.isArray(categoryIds)
  ) {
    return null;
  }

  const normalizedIngredients = [];
  const itemIds = new Set();
  for (const ingredient of ingredients) {
    const quantity = ingredient?.qty ?? ingredient?.quantity;
    if (
      !ingredient ||
      !isPositiveInteger(ingredient.itemId) ||
      !isValidRecipeQuantity(quantity) ||
      (ingredient.unitId !== undefined && !isPositiveInteger(ingredient.unitId)) ||
      itemIds.has(ingredient.itemId)
    ) {
      return null;
    }

    itemIds.add(ingredient.itemId);
    normalizedIngredients.push({
      itemId: ingredient.itemId,
      unitId: ingredient.unitId ?? null,
      qty: quantity
    });
  }

  const normalizedCategoryIds = [];
  const categoryIdSet = new Set();
  for (const categoryId of categoryIds) {
    if (!isPositiveInteger(categoryId) || categoryIdSet.has(categoryId)) {
      return null;
    }

    categoryIdSet.add(categoryId);
    normalizedCategoryIds.push(categoryId);
  }

  return {
    menu: menu.trim(),
    margin,
    actualPrice,
    serve,
    userId,
    picUrl: picUrl ?? null,
    ingredients: normalizedIngredients,
    categoryIds: normalizedCategoryIds
  };
};

const readRecipes = async (connection, userId, recipeId) => {
  const whereClause = recipeId === undefined
    ? 'WHERE r.userId = ?'
    : 'WHERE r.userId = ? AND r.recipesId = ?';
  const params = recipeId === undefined ? [userId] : [userId, recipeId];
  const [rows] = await connection.query(
    `SELECT r.recipesId, r.menu, r.margin, r.actualPrice, r.serve, r.userId, r.picUrl,
            g.ingredientId, g.itemId, COALESCE(g.unitId, i.unitId) AS recipeUnitId,
            g.qty AS ingredientQty, i.itemName, i.qty AS stockQuantity,
            i.unitId AS inventoryUnitId, i.price,
            recipeUnit.unitName AS recipeUnitName
     FROM recipes r
     LEFT JOIN ingredients g ON g.recipesId = r.recipesId
     LEFT JOIN items i ON i.itemId = g.itemId AND i.userId = r.userId
     LEFT JOIN units recipeUnit ON recipeUnit.unitId = COALESCE(g.unitId, i.unitId)
     ${whereClause}
     ORDER BY r.recipesId, g.ingredientId`,
    params
  );

  const recipes = new Map();
  for (const row of rows) {
    let recipe = recipes.get(row.recipesId);
    if (!recipe) {
      recipe = {
        recipesId: row.recipesId,
        menu: row.menu,
        margin: row.margin,
        actualPrice: row.actualPrice,
        serve: row.serve,
        userId: row.userId,
        picUrl: row.picUrl,
        ingredients: [],
        categories: []
      };
      recipes.set(row.recipesId, recipe);
    }

    if (row.ingredientId !== null && row.itemName !== null) {
      recipe.ingredients.push({
        ingredientId: row.ingredientId,
        itemId: row.itemId,
        itemName: row.itemName,
        qty: row.ingredientQty,
        quantity: row.ingredientQty,
        unitId: row.recipeUnitId ?? row.unitId,
        unitName: row.recipeUnitName,
        stockQuantity: row.stockQuantity,
        inventoryUnitId: row.inventoryUnitId,
        price: row.price
      });
    }
  }

  const recipeIds = [...recipes.keys()];
  if (recipeIds.length > 0) {
    const [categoryRows] = await connection.query(
      `SELECT rc.recipesId, c.categoryId, c.categoryName
       FROM recipes_categories rc
       INNER JOIN categories c ON c.categoryId = rc.categoryId
       WHERE rc.recipesId IN (?) AND c.userId = ?
       ORDER BY c.categoryName, c.categoryId`,
      [recipeIds, userId]
    );

    for (const row of categoryRows) {
      recipes.get(row.recipesId).categories.push({
        categoryId: row.categoryId,
        categoryName: row.categoryName
      });
    }
  }

  return [...recipes.values()];
};

const insertIngredients = async (connection, recipesId, userId, ingredients) => {
  if (ingredients.length === 0) {
    return;
  }

  const [items] = await connection.query(
    'SELECT itemId, unitId FROM items WHERE itemId IN (?) AND userId = ? FOR UPDATE',
    [ingredients.map(({ itemId }) => itemId), userId]
  );
  if (items.length !== ingredients.length) {
    const error = new Error('ไม่พบวัตถุดิบบางรายการ');
    error.statusCode = 400;
    throw error;
  }

  const [unitRows] = await connection.query('SELECT unitId, parentId FROM units');
  const units = new Map(unitRows.map((unit) => [unit.unitId, unit.parentId]));
  const itemUnits = new Map(items.map((item) => [item.itemId, item.unitId]));
  const rootUnitId = (unitId) => {
    const visited = new Set();
    let currentId = unitId;
    while (units.has(currentId) && !visited.has(currentId)) {
      visited.add(currentId);
      const parentId = units.get(currentId);
      if (parentId === null) return currentId;
      currentId = parentId;
    }
    return null;
  };

  const normalizedIngredients = ingredients.map((ingredient) => {
    const inventoryUnitId = itemUnits.get(ingredient.itemId);
    const unitId = ingredient.unitId ?? inventoryUnitId;
    if (
      !units.has(unitId) ||
      rootUnitId(unitId) === null ||
      rootUnitId(unitId) !== rootUnitId(inventoryUnitId)
    ) {
      const error = new Error('หน่วยที่เลือกต้องอยู่ในลำดับหน่วยเดียวกับวัตถุดิบ');
      error.statusCode = 400;
      throw error;
    }
    return { ...ingredient, unitId };
  });

  const placeholders = normalizedIngredients.map(() => '(?, ?, ?, ?)').join(', ');
  const values = normalizedIngredients.flatMap(({ itemId, unitId, qty }) => [recipesId, itemId, unitId, qty]);
  await connection.query(
    `INSERT INTO ingredients (recipesId, itemId, unitId, qty) VALUES ${placeholders}`,
    values
  );
};

const insertRecipeCategories = async (connection, recipesId, userId, categoryIds) => {
  if (categoryIds.length === 0) {
    return;
  }

  const [categories] = await connection.query(
    'SELECT categoryId FROM categories WHERE categoryId IN (?) AND userId = ? FOR UPDATE',
    [categoryIds, userId]
  );
  if (categories.length !== categoryIds.length) {
    const error = new Error('ไม่พบหมวดหมู่บางรายการ');
    error.statusCode = 400;
    throw error;
  }

  const placeholders = categoryIds.map(() => '(?, ?)').join(', ');
  const values = categoryIds.flatMap((categoryId) => [recipesId, categoryId]);
  await connection.query(
    `INSERT INTO recipes_categories (recipesId, categoryId) VALUES ${placeholders}`,
    values
  );
};

const validateUser = async (connection, userId) => {
  const [users] = await connection.query(
    'SELECT userId FROM users WHERE userId = ? LIMIT 1',
    [userId]
  );
  if (users.length === 0) {
    const error = new Error('ไม่พบผู้ใช้งาน');
    error.statusCode = 400;
    throw error;
  }
};

exports.getAllRecipes = async (req, res) => {
  try {
    const recipes = await readRecipes(pool, req.auth.userId);
    return res.status(200).json({ success: true, data: recipes });
  } catch (error) {
    console.error('Unable to fetch recipes:', error);
    return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการดึงข้อมูลสูตรอาหาร' });
  }
};

exports.getRecipeById = async (req, res) => {
  const recipesId = Number(req.params.id);
  if (!isPositiveInteger(recipesId)) {
    return res.status(400).json({ success: false, message: 'recipesId ไม่ถูกต้อง' });
  }

  try {
    const [recipe] = await readRecipes(pool, req.auth.userId, recipesId);
    if (!recipe) {
      return res.status(404).json({ success: false, message: 'ไม่พบสูตรอาหาร' });
    }
    return res.status(200).json({ success: true, data: recipe });
  } catch (error) {
    console.error('Unable to fetch recipe:', error);
    return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการดึงข้อมูลสูตรอาหาร' });
  }
};

exports.getRecipeIngredients = async (req, res) => {
  const recipesId = Number(req.params.id);
  if (!isPositiveInteger(recipesId)) {
    return res.status(400).json({ success: false, message: 'recipesId ไม่ถูกต้อง' });
  }

  try {
    const [rows] = await pool.query(
      `SELECT g.ingredientId, g.itemId, i.itemName, i.qty AS stockQuantity,
              i.unitId AS inventoryUnitId, i.price, g.qty,
              COALESCE(g.unitId, i.unitId) AS unitId, unit.unitName
       FROM recipes r
       LEFT JOIN ingredients g ON g.recipesId = r.recipesId
       LEFT JOIN items i ON i.itemId = g.itemId AND i.userId = r.userId
       LEFT JOIN units unit ON unit.unitId = COALESCE(g.unitId, i.unitId)
       WHERE r.recipesId = ? AND r.userId = ?
       ORDER BY g.ingredientId`,
      [recipesId, req.auth.userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'ไม่พบสูตรอาหาร' });
    }

    const ingredients = rows
      .filter((row) => row.ingredientId !== null && row.itemName !== null)
      .map((row) => ({
        ingredientId: row.ingredientId,
        itemId: row.itemId,
        itemName: row.itemName,
        qty: row.qty,
        quantity: row.qty,
        unitId: row.unitId,
        unitName: row.unitName,
        stockQuantity: row.stockQuantity,
        inventoryUnitId: row.inventoryUnitId,
        price: row.price
      }));

    return res.status(200).json({ success: true, data: ingredients });
  } catch (error) {
    console.error('Unable to fetch recipe ingredients:', error);
    return res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงรายการวัตถุดิบ'
    });
  }
};

exports.getRecipeIngredientCosts = async (req, res) => {
  const recipesId = Number(req.params.id);
  if (!isPositiveInteger(recipesId)) {
    return res.status(400).json({ success: false, message: 'recipesId ไม่ถูกต้อง' });
  }

  try {
    const [recipes] = await pool.query(
      'SELECT recipesId FROM recipes WHERE recipesId = ? AND userId = ? LIMIT 1',
      [recipesId, req.auth.userId]
    );
    if (recipes.length === 0) {
      return res.status(404).json({ success: false, message: 'ไม่พบสูตรอาหาร' });
    }

    const [rows] = await pool.query(
      `SELECT g.ingredientId, g.itemId, i.itemName,
              g.qty AS quantityUsed, COALESCE(g.unitId, i.unitId) AS unitId,
              usedUnit.unitName, i.qty AS inventoryQuantity,
              i.unitId AS inventoryUnitId, i.price AS inventoryPrice
       FROM ingredients g
       LEFT JOIN items i ON i.itemId = g.itemId AND i.userId = ?
       LEFT JOIN units usedUnit ON usedUnit.unitId = COALESCE(g.unitId, i.unitId)
       WHERE g.recipesId = ?
       ORDER BY g.ingredientId`,
      [req.auth.userId, recipesId]
    );
    const [unitRows] = await pool.query('SELECT unitId, parentId, N FROM units');
    const units = new Map(unitRows.map((unit) => [
      unit.unitId,
      { parentId: unit.parentId, factor: unit.N === null ? null : Number(unit.N) }
    ]));

    const ingredients = [];
    for (const row of rows) {
      if (
        row.quantityUsed === null || row.inventoryQuantity === null ||
        row.inventoryUnitId === null || row.inventoryPrice === null
      ) {
        console.error('Unable to calculate recipe ingredient cost:', {
          recipesId,
          ingredientId: row.ingredientId,
          itemId: row.itemId
        });
        return res.status(422).json({
          success: false,
          message: 'ไม่สามารถคำนวณต้นทุนวัตถุดิบได้ กรุณาตรวจสอบจำนวนคงเหลือและการแปลงหน่วย'
        });
      }

      const costs = calculateRecipeIngredientCost(
        { quantity: Number(row.quantityUsed), unitId: row.unitId },
        {
          quantity: Number(row.inventoryQuantity),
          unitId: row.inventoryUnitId,
          price: Number(row.inventoryPrice)
        },
        units
      );
      if (!costs || typeof row.itemName !== 'string' || typeof row.unitName !== 'string') {
        console.error('Unable to calculate recipe ingredient cost:', {
          recipesId,
          ingredientId: row.ingredientId,
          itemId: row.itemId
        });
        return res.status(422).json({
          success: false,
          message: 'ไม่สามารถคำนวณต้นทุนวัตถุดิบได้ กรุณาตรวจสอบจำนวนคงเหลือและการแปลงหน่วย'
        });
      }

      ingredients.push({
        ingredientId: row.ingredientId,
        itemId: row.itemId,
        itemName: row.itemName,
        quantity: Number(row.quantityUsed),
        qty: Number(row.quantityUsed),
        unitId: row.unitId,
        unitName: row.unitName,
        costPerUnit: costs.costPerRecipeUnit,
        totalCost: costs.totalCost
      });
    }

    return res.status(200).json({ success: true, data: ingredients });
  } catch (error) {
    console.error('Unable to calculate recipe ingredient costs:', error);
    return res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการคำนวณต้นทุนวัตถุดิบ'
    });
  }
};

exports.createRecipe = async (req, res) => {
  const recipe = validateRecipe(req.body, req.auth.userId);
  if (!recipe) {
    return res.status(400).json({
      success: false,
      message: 'กรุณาระบุ menu, margin, actualPrice, serve และ ingredients ให้ถูกต้อง'
    });
  }

  let connection;
  let transactionStarted = false;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();
    transactionStarted = true;
    await validateUser(connection, recipe.userId);

    const [result] = await connection.query(
      'INSERT INTO recipes (menu, margin, actualPrice, serve, userId, picUrl) VALUES (?, ?, ?, ?, ?, ?)',
      [recipe.menu, recipe.margin, recipe.actualPrice, recipe.serve, recipe.userId, recipe.picUrl]
    );
    await insertIngredients(connection, result.insertId, recipe.userId, recipe.ingredients);
    await insertRecipeCategories(connection, result.insertId, recipe.userId, recipe.categoryIds);
    const [createdRecipe] = await readRecipes(connection, recipe.userId, result.insertId);
    await connection.commit();
    transactionStarted = false;

    return res.status(201).json({
      success: true,
      message: 'สร้างสูตรอาหารสำเร็จ',
      data: createdRecipe
    });
  } catch (error) {
    if (transactionStarted) {
      await connection.rollback();
    }
    if (error.statusCode === 400) {
      return res.status(400).json({ success: false, message: error.message });
    }
    console.error('Unable to create recipe:', error);
    return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการสร้างสูตรอาหาร' });
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

exports.updateRecipe = async (req, res) => {
  const recipesId = Number(req.params.id);
  const recipe = validateRecipe(req.body, req.auth.userId);
  if (!isPositiveInteger(recipesId)) {
    return res.status(400).json({ success: false, message: 'recipesId ไม่ถูกต้อง' });
  }
  if (!recipe) {
    return res.status(400).json({
      success: false,
      message: 'กรุณาระบุ menu, margin, actualPrice, serve และ ingredients ให้ถูกต้อง'
    });
  }

  let connection;
  let transactionStarted = false;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();
    transactionStarted = true;

    const [existingRecipes] = await connection.query(
      'SELECT recipesId FROM recipes WHERE recipesId = ? AND userId = ? FOR UPDATE',
      [recipesId, req.auth.userId]
    );
    if (existingRecipes.length === 0) {
      await connection.rollback();
      transactionStarted = false;
      return res.status(404).json({ success: false, message: 'ไม่พบสูตรอาหาร' });
    }

    await validateUser(connection, recipe.userId);
    await connection.query(
      'UPDATE recipes SET menu = ?, margin = ?, actualPrice = ?, serve = ?, picUrl = ? WHERE recipesId = ? AND userId = ?',
      [recipe.menu, recipe.margin, recipe.actualPrice, recipe.serve, recipe.picUrl, recipesId, req.auth.userId]
    );
    await connection.query('DELETE FROM ingredients WHERE recipesId = ?', [recipesId]);
    await connection.query('DELETE FROM recipes_categories WHERE recipesId = ?', [recipesId]);
    await insertIngredients(connection, recipesId, req.auth.userId, recipe.ingredients);
    await insertRecipeCategories(connection, recipesId, recipe.userId, recipe.categoryIds);
    const [updatedRecipe] = await readRecipes(connection, req.auth.userId, recipesId);
    await connection.commit();
    transactionStarted = false;

    return res.status(200).json({
      success: true,
      message: 'อัปเดตสูตรอาหารสำเร็จ',
      data: updatedRecipe
    });
  } catch (error) {
    if (transactionStarted) {
      await connection.rollback();
    }
    if (error.statusCode === 400) {
      return res.status(400).json({ success: false, message: error.message });
    }
    console.error('Unable to update recipe:', error);
    return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการอัปเดตสูตรอาหาร' });
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

exports.deleteRecipe = async (req, res) => {
  const recipesId = Number(req.params.id);
  if (!isPositiveInteger(recipesId)) {
    return res.status(400).json({ success: false, message: 'recipesId ไม่ถูกต้อง' });
  }

  let connection;
  let transactionStarted = false;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();
    transactionStarted = true;

    const [existingRecipes] = await connection.query(
      'SELECT recipesId FROM recipes WHERE recipesId = ? AND userId = ? FOR UPDATE',
      [recipesId, req.auth.userId]
    );
    if (existingRecipes.length === 0) {
      await connection.rollback();
      transactionStarted = false;
      return res.status(404).json({ success: false, message: 'ไม่พบสูตรอาหาร' });
    }

    await connection.query('DELETE FROM ingredients WHERE recipesId = ?', [recipesId]);
    await connection.query('DELETE FROM recipes_categories WHERE recipesId = ?', [recipesId]);
    await connection.query('DELETE FROM recipes WHERE recipesId = ?', [recipesId]);
    await connection.commit();
    transactionStarted = false;

    return res.status(200).json({ success: true, message: 'ลบสูตรอาหารสำเร็จ' });
  } catch (error) {
    if (transactionStarted) {
      await connection.rollback();
    }
    console.error('Unable to delete recipe:', error);
    return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการลบสูตรอาหาร' });
  } finally {
    if (connection) {
      connection.release();
    }
  }
};
