const express = require('express');
const authController = require('../controllers/authController');
const authenticateToken = require('../middleware/authenticateToken');

const router = express.Router();

/**
 * @openapi
 * /api/auth/register:
 *   post:
 *     summary: สร้างบัญชีผู้ใช้
 *     description: สร้างบัญชีใหม่และจัดเก็บรหัสผ่านเป็น bcrypt hash
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *                 maxLength: 100
 *                 example: Somchai
 *               email:
 *                 type: string
 *                 format: email
 *                 maxLength: 100
 *                 example: user@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 minLength: 8
 *                 example: securePassword123
 *     responses:
 *       201:
 *         description: สร้างบัญชีสำเร็จ
 *       400:
 *         description: ข้อมูลไม่ถูกต้อง
 *       409:
 *         description: อีเมลถูกใช้งานแล้ว
 *       500:
 *         description: เกิดข้อผิดพลาดจากเซิร์ฟเวอร์
 */
router.post('/register', authController.register);

/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     summary: เข้าสู่ระบบ
 *     description: ตรวจสอบ email และ password แล้วคืน JWT ที่มีอายุ 1 ชั่วโมง
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: password123
 *     responses:
 *       200:
 *         description: เข้าสู่ระบบสำเร็จ
 *       400:
 *         description: ข้อมูลไม่ครบหรือไม่ถูกต้อง
 *       401:
 *         description: อีเมลหรือรหัสผ่านไม่ถูกต้อง
 *       500:
 *         description: ระบบยืนยันตัวตนหรือฐานข้อมูลขัดข้อง
 */
router.post('/login', authController.login);

/**
 * @openapi
 * /api/auth/logout:
 *   post:
 *     summary: ออกจากระบบและยกเลิก access token
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: ออกจากระบบสำเร็จและ token ใช้งานต่อไม่ได้
 *       401:
 *         description: ไม่มี token, token ไม่ถูกต้อง หรือถูกยกเลิกแล้ว
 *       500:
 *         description: เกิดข้อผิดพลาดในการยกเลิก token
 */
router.post('/logout', authenticateToken, authController.logout);

module.exports = router;
