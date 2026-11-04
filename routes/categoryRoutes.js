const express = require('express');
const categoryController = require('../controllers/categoryController');

const router = express.Router();

/**
 * @openapi
 * components:
 *   schemas:
 *     RecipeCategoryInput:
 *       type: object
 *       required:
 *         - categoryName
 *       properties:
 *         categoryName:
 *           type: string
 *           maxLength: 100
 *           example: อาหารจานเดียว
 */

/**
 * @openapi
 * /api/categories:
 *   get:
 *     summary: ดึงหมวดหมู่สูตรอาหารทั้งหมด
 *     responses:
 *       200:
 *         description: ดึงหมวดหมู่สำเร็จ
 *   post:
 *     summary: สร้างหมวดหมู่สูตรอาหาร
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RecipeCategoryInput'
 *     responses:
 *       201:
 *         description: สร้างหมวดหมู่สำเร็จ
 *       409:
 *         description: ชื่อหมวดหมู่ซ้ำ
 */
router.get('/', categoryController.getAllCategories);
router.post('/', categoryController.createCategory);

/**
 * @openapi
 * /api/categories/{id}:
 *   get:
 *     summary: ดึงหมวดหมู่ตาม ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: ดึงหมวดหมู่สำเร็จ
 *       404:
 *         description: ไม่พบหมวดหมู่
 *   put:
 *     summary: แก้ไขชื่อหมวดหมู่
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
 *             $ref: '#/components/schemas/RecipeCategoryInput'
 *     responses:
 *       200:
 *         description: แก้ไขหมวดหมู่สำเร็จ
 *   delete:
 *     summary: ลบหมวดหมู่
 *     description: ลบความสัมพันธ์ของหมวดหมู่กับสูตรอาหารที่เกี่ยวข้องด้วย
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: ลบหมวดหมู่สำเร็จ
 *       404:
 *         description: ไม่พบหมวดหมู่
 */
router.get('/:id', categoryController.getCategoryById);
router.put('/:id', categoryController.updateCategory);
router.delete('/:id', categoryController.deleteCategory);

module.exports = router;
