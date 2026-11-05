const pool = require('../config/db');
const isAdminValue = require('../utils/isAdminValue');

module.exports = async (req, res, next) => {
  const userId = req.auth?.userId;
  if (typeof userId !== 'string' || !userId.trim()) {
    return res.status(403).json({ success: false, message: 'ไม่มีสิทธิ์จัดการหน่วยนับ' });
  }

  try {
    const [users] = await pool.query(
      'SELECT isAdmin FROM users WHERE userId = ? LIMIT 1',
      [userId]
    );
    if (!users.length || !isAdminValue(users[0].isAdmin)) {
      return res.status(403).json({ success: false, message: 'ไม่มีสิทธิ์จัดการหน่วยนับ' });
    }
    return next();
  } catch (error) {
    console.error('Unable to verify unit administration access:', error);
    return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการตรวจสอบสิทธิ์' });
  }
};
