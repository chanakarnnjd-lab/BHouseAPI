const { createHash } = require('node:crypto');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');

const isValidJwtSecret = (secret) => typeof secret === 'string' && secret.length >= 32;

const getTokenHash = (token) =>
  createHash('sha256').update(token).digest('hex');

module.exports = async (req, res, next) => {
  const authorization = req.get('authorization');
  const match = typeof authorization === 'string'
    ? authorization.match(/^Bearer\s+(\S+)$/i)
    : null;

  if (!match) {
    return res.status(401).json({ success: false, message: 'กรุณาระบุ access token' });
  }

  const jwtSecret = process.env.JWT_SECRET;
  if (!isValidJwtSecret(jwtSecret)) {
    console.error('Authentication is unavailable: JWT_SECRET must contain at least 32 characters.');
    return res.status(500).json({
      success: false,
      message: 'ระบบยืนยันตัวตนยังไม่ได้ตั้งค่า'
    });
  }

  const token = match[1];
  let claims;
  try {
    claims = jwt.verify(token, jwtSecret);
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError || error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ success: false, message: 'access token ไม่ถูกต้องหรือหมดอายุ' });
    }
    console.error('Unable to verify access token:', error);
    return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการยืนยันตัวตน' });
  }

  try {
    const [revokedTokens] = await pool.query(
      'SELECT tokenHash FROM revoked_tokens WHERE tokenHash = ? AND expiresAt > UTC_TIMESTAMP() LIMIT 1',
      [getTokenHash(token)]
    );
    if (revokedTokens.length > 0) {
      return res.status(401).json({ success: false, message: 'access token ถูกยกเลิกแล้ว' });
    }

    req.auth = claims;
    req.accessToken = token;
    return next();
  } catch (error) {
    console.error('Unable to check access token revocation:', error);
    return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการยืนยันตัวตน' });
  }
};
