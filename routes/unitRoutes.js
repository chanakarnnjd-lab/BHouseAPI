const express = require('express');
const unitController = require('../controllers/unitController');
const requireAdmin = require('../middleware/requireAdmin');

const router = express.Router();

/**
 * @openapi
 * components:
 *   schemas:
 *     UnitInput:
 *       type: object
 *       required:
 *         - unitName
 *       properties:
 *         unitName:
 *           type: string
 *           maxLength: 100
 *           example: kg
 *         parentId:
 *           type: integer
 *           nullable: true
 *           example: 2
 *         N:
 *           type: integer
 *           nullable: true
 *           description: ตัวคูณแปลงหน่วย
 *           example: 1000
 */

/**
 * @openapi
 * /api/units:
 *   get:
 *     tags:
 *       - Units
 *     summary: ดึงหน่วยนับทั้งหมด
 *     description: ผู้ใช้ที่เข้าสู่ระบบสามารถอ่านรายการหน่วยนับได้
 *     responses:
 *       200:
 *         description: ดึงหน่วยนับสำเร็จ
 *   post:
 *     tags:
 *       - Units
 *     summary: สร้างหน่วยนับ
 *     description: ใช้ได้เฉพาะผู้ใช้ที่มีสิทธิ์ผู้ดูแลระบบ
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UnitInput'
 *     responses:
 *       201:
 *         description: สร้างหน่วยนับสำเร็จ
 *       400:
 *         description: ข้อมูลไม่ถูกต้องหรือไม่พบหน่วยหลัก
 */
router.get('/', unitController.getAllUnits);
router.post('/', requireAdmin, unitController.createUnit);

/**
 * @openapi
 * /api/units/{id}:
 *   get:
 *     tags:
 *       - Units
 *     summary: ดึงหน่วยนับตาม ID
 *     description: ผู้ใช้ที่เข้าสู่ระบบสามารถอ่านข้อมูลหน่วยนับได้
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: ดึงหน่วยนับสำเร็จ
 *       404:
 *         description: ไม่พบหน่วยนับ
 *   put:
 *     tags:
 *       - Units
 *     summary: แก้ไขหน่วยนับ
 *     description: ใช้ได้เฉพาะผู้ใช้ที่มีสิทธิ์ผู้ดูแลระบบ
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
 *             $ref: '#/components/schemas/UnitInput'
 *     responses:
 *       200:
 *         description: แก้ไขหน่วยนับสำเร็จ
 *       400:
 *         description: ข้อมูลไม่ถูกต้องหรือทำให้ hierarchy เกิดวงจร
 *       404:
 *         description: ไม่พบหน่วยนับ
 *   delete:
 *     tags:
 *       - Units
 *     summary: ลบหน่วยนับ
 *     description: ใช้ได้เฉพาะผู้ใช้ที่มีสิทธิ์ผู้ดูแลระบบ และลบไม่ได้หากหน่วยถูกอ้างอิงโดย item หรือหน่วยย่อย
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: ลบหน่วยนับสำเร็จ
 *       409:
 *         description: หน่วยนับยังถูกใช้งาน
 */
router.get('/:id', unitController.getUnitById);
router.put('/:id', requireAdmin, unitController.updateUnit);
router.delete('/:id', requireAdmin, unitController.deleteUnit);

module.exports = router;
