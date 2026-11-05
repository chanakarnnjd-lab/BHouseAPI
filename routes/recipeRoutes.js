const express = require('express');
const recipeController = require('../controllers/recipeController');

const router = express.Router();

/**
 * @openapi
 * components:
 *   schemas:
 *     RecipeInput:
 *       type: object
 *       required:
 *         - menu
 *         - margin
 *         - acc_unit
 *         - serve
 *         - ingredients
 *       properties:
 *         menu:
 *           type: string
 *           maxLength: 100
 *           example: ข้าวผัด
 *         margin:
 *           type: integer
 *           minimum: 0
 *           example: 30
 *         acc_unit:
 *           type: number
 *           exclusiveMinimum: 0
 *           example: 1
 *         serve:
 *           type: integer
 *           minimum: 1
 *           example: 2
 *         picUrl:
 *           type: string
 *           nullable: true
 *           maxLength: 100
 *           example: https://example.com/fried-rice.jpg
 *         ingredients:
 *           type: array
 *           items:
 *             type: object
 *             required:
 *               - itemId
 *               - qty
 *             properties:
 *               itemId:
 *                 type: integer
 *                 minimum: 1
 *                 example: 1
 *               qty:
 *                 type: integer
 *                 minimum: 1
 *                 example: 2
 *         categoryIds:
 *           type: array
 *           description: ID ของหมวดหมู่ (ไม่ระบุได้)
 *           items:
 *             type: integer
 *             minimum: 1
 *           example: [1, 2]
 */

/**
 * @openapi
 * /api/recipes:
 *   get:
 *     tags:
 *       - Recipes
 *     summary: ดึงสูตรอาหารทั้งหมดพร้อมรายการวัตถุดิบ
 *     responses:
 *       200:
 *         description: ดึงสูตรอาหารสำเร็จ
 *       500:
 *         description: เกิดข้อผิดพลาดจากเซิร์ฟเวอร์
 *   post:
 *     tags:
 *       - Recipes
 *     summary: สร้างสูตรอาหารพร้อมรายการวัตถุดิบ
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RecipeInput'
 *     responses:
 *       201:
 *         description: สร้างสูตรอาหารสำเร็จ
 *       400:
 *         description: ข้อมูลไม่ถูกต้องหรือไม่พบผู้ใช้/วัตถุดิบ
 */
router.get('/', recipeController.getAllRecipes);
router.post('/', recipeController.createRecipe);

/**
 * @openapi
 * /api/recipes/{id}:
 *   get:
 *     tags:
 *       - Recipes
 *     summary: ดึงสูตรอาหารตาม ID พร้อมรายการวัตถุดิบ
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: ดึงสูตรอาหารสำเร็จ
 *       404:
 *         description: ไม่พบสูตรอาหาร
 *   put:
 *     tags:
 *       - Recipes
 *     summary: แทนที่ข้อมูลสูตรอาหารและรายการวัตถุดิบทั้งหมด
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RecipeInput'
 *     responses:
 *       200:
 *         description: อัปเดตสูตรอาหารสำเร็จ
 *       404:
 *         description: ไม่พบสูตรอาหาร
 *   delete:
 *     tags:
 *       - Recipes
 *     summary: ลบสูตรอาหารและรายการวัตถุดิบ
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: ลบสูตรอาหารสำเร็จ
 *       404:
 *         description: ไม่พบสูตรอาหาร
 */
/**
 * @openapi
 * /api/recipes/{id}/ingredients:
 *   get:
 *     tags:
 *       - Recipes
 *     summary: ดึงรายการวัตถุดิบของสูตรอาหาร
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: ดึงรายการวัตถุดิบสำเร็จ (คืน array ว่างได้เมื่อสูตรไม่มีวัตถุดิบ)
 *       404:
 *         description: ไม่พบสูตรอาหาร
 */
router.get('/:id', recipeController.getRecipeById);
router.put('/:id', recipeController.updateRecipe);
router.delete('/:id', recipeController.deleteRecipe);
router.get('/:id/ingredients', recipeController.getRecipeIngredients);

module.exports = router;
