const express = require('express');
const router = express.Router();
const itemController = require('../controllers/itemController');



/**
 * @openapi
 * /api/ingredient:
 *   get:
 *     tags:
 *       - Items
 *     summary: ดึงรายการวัตถุดิบทั้งหมด
 *     description: เรียกดูข้อมูลวัตถุดิบทั้งหมดจากฐานข้อมูล
 *     responses:
 *       200:
 *         description: ดึงรายการวัตถุดิบสำเร็จ
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *       500:
 *         description: เกิดข้อผิดพลาดจากเซิร์ฟเวอร์
 */
router.get('/', itemController.getAllItems);



/**
 * @openapi
 * /api/ingredient/byId/{id}:
 *   get:
 *     tags:
 *       - Items
 *     summary: ดึงข้อมูลวัตถุดิบตาม ID
 *     description: เรียกดูข้อมูลวัตถุดิบรายการเดียวจากฐานข้อมูล
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID ของวัตถุดิบ
 *         schema:
 *           type: integer
 *         example: 1
 *     responses:
 *       200:
 *         description: ดึงข้อมูลสำเร็จ
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *       404:
 *         description: ไม่พบวัตถุดิบ
 */
router.get('/byId/:id', itemController.getItemById);

/**
 * @openapi
 * /api/ingredient:
 *   post:
 *     tags:
 *       - Items
 *     summary: เพิ่มวัตถุดิบใหม่
 *     description: ส่งข้อมูลเพื่อบันทึกวัตถุดิบใหม่ลงในฐานข้อมูล
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - price
 *               - unitId
 *               - qty
 *             properties:
 *               name:
 *                 type: string
 *                 example: "วัตถุดิบ A"
 *               price:
 *                 type: number
 *                 example: 2590
 *               qty:
 *                 type: integer
 *                 example: 10
 *               unitId:
 *                 type: integer
 *                 example: 1
 *     responses:
 *       201:
 *         description: เพิ่มวัตถุดิบสำเร็จ
 */
router.post('/', itemController.createItem);

/**
 * @openapi
 * /api/ingredient/{id}:
 *   put:
 *     tags:
 *       - Items
 *     summary: แก้ไขข้อมูลวัตถุดิบ
 *     description: อัปเดตข้อมูลวัตถุดิบตาม ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID ของวัตถุดิบ
 *         schema:
 *           type: integer
 *         example: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: "วัตถุดิบ A"
 *               price:
 *                 type: number
 *                 example: 2590
 *               qty:
 *                 type: integer
 *                 example: 10
 *               unitId:
 *                 type: integer
 *                 example: 1
 *     responses:
 *       200:
 *         description: แก้ไขข้อมูลวัตถุดิบสำเร็จ
 *       404:
 *         description: ไม่พบวัตถุดิบ
 *       500:
 *         description: เกิดข้อผิดพลาดจากเซิร์ฟเวอร์
 */
router.put('/:id', itemController.updateItemPut);

/**
 * @openapi
 * /api/ingredient/{id}:
 *   patch:
 *     tags:
 *       - Items
 *     summary: แก้ไขข้อมูลวัตถุดิบบางส่วน
 *     description: อัปเดตเฉพาะฟิลด์ที่ส่งมาในข้อมูลวัตถุดิบตาม ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID ของวัตถุดิบ
 *         schema:
 *           type: integer
 *         example: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: "วัตถุดิบ A"
 *               price:
 *                 type: number
 *                 example: 2590
 *               qty:
 *                 type: integer
 *                 example: 10
 *               unitId:
 *                 type: integer
 *                 example: 1
 *     responses:
 *       200:
 *         description: แก้ไขข้อมูลวัตถุดิบสำเร็จ
 *       404:
 *         description: ไม่พบวัตถุดิบ
 *       500:
 *         description: เกิดข้อผิดพลาดจากเซิร์ฟเวอร์
 */
router.patch('/:id', itemController.updateItemPatch);

/**
 * @openapi
 * /api/ingredient/{id}:
 *   delete:
 *     tags:
 *       - Items
 *     summary: ลบข้อมูลวัตถุดิบ
 *     description: ลบข้อมูลวัตถุดิบตาม ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID ของวัตถุดิบ
 *         schema:
 *           type: integer
 *         example: 1
 *     responses:
 *       200:
 *         description: ลบข้อมูลวัตถุดิบสำเร็จ
 *       404:
 *         description: ไม่พบวัตถุดิบ
 *       500:
 *         description: เกิดข้อผิดพลาดจากเซิร์ฟเวอร์
 */
router.delete('/:id', itemController.deleteItem);
// เส้นทางอื่นๆ เช่น get/export/excel, put, patch, delete...

module.exports = router;
