const bcrypt = require('bcryptjs');
const { createHash, randomBytes } = require('node:crypto');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');

const isValidJwtSecret = (secret) => typeof secret === 'string' && secret.length >= 32;
const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

exports.register = async (req, res) => {
  const { name, email, password } = req.body || {};
  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

  if (
    typeof name !== 'string' ||
    !name.trim() ||
    name.trim().length > 100 ||
    !isValidEmail(normalizedEmail) ||
    normalizedEmail.length > 100 ||
    typeof password !== 'string' ||
    Array.from(password).length < 8 ||
    Buffer.byteLength(password, 'utf8') > 72
  ) {
    return res.status(400).json({
      success: false,
      message: 'กรุณาระบุชื่อ อีเมลที่ถูกต้อง และรหัสผ่าน 8-72 ไบต์'
    });
  }

  try {
    const [existingUsers] = await pool.query(
      'SELECT userId FROM users WHERE email = ? LIMIT 1',
      [normalizedEmail]
    );
    if (existingUsers.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'อีเมลนี้ถูกใช้งานแล้ว'
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const userId = randomBytes(15).toString('base64url');
      try {
        await pool.query(
          'INSERT INTO users (userId, email, password, name) VALUES (?, ?, ?, ?)',
          [userId, normalizedEmail, passwordHash, name.trim()]
        );
        return res.status(201).json({
          success: true,
          message: 'สร้างบัญชีสำเร็จ',
          data: {
            user: {
              userId,
              email: normalizedEmail,
              name: name.trim(),
              isAdmin: false
            }
          }
        });
      } catch (error) {
        if (error.code !== 'ER_DUP_ENTRY') {
          throw error;
        }

        const [usersWithEmail] = await pool.query(
          'SELECT userId FROM users WHERE email = ? LIMIT 1',
          [normalizedEmail]
        );
        if (usersWithEmail.length > 0) {
          return res.status(409).json({
            success: false,
            message: 'อีเมลนี้ถูกใช้งานแล้ว'
          });
        }
        if (attempt === 2) {
          throw error;
        }
      }
    }
  } catch (error) {
    console.error('Registration failed:', error);
    return res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการสร้างบัญชี'
    });
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body || {};
  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

  if (
    !normalizedEmail ||
    typeof password !== 'string' ||
    !password
  ) {
    return res.status(400).json({
      success: false,
      message: 'กรุณาระบุ email และ password'
    });
  }

  const jwtSecret = process.env.JWT_SECRET;
  if (!isValidJwtSecret(jwtSecret)) {
    console.error('Login is unavailable: JWT_SECRET must contain at least 32 characters.');
    return res.status(500).json({
      success: false,
      message: 'ระบบยืนยันตัวตนยังไม่ได้ตั้งค่า'
    });
  }

  try {
    const [users] = await pool.query(
      'SELECT userId, email, password, name, isAdmin FROM users WHERE email = ? LIMIT 1',
      [normalizedEmail]
    );
    const user = users[0];

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({
        success: false,
        message: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง'
      });
    }

    const token = jwt.sign(
      { userId: user.userId, email: user.email, isAdmin: Boolean(user.isAdmin) },
      jwtSecret,
      { expiresIn: '1h' }
    );

    return res.status(200).json({
      success: true,
      message: 'เข้าสู่ระบบสำเร็จ',
      data: {
        token,
        user: {
          userId: user.userId,
          email: user.email,
          name: user.name,
          isAdmin: Boolean(user.isAdmin)
        }
      }
    });
  } catch (error) {
    console.error('Login failed:', error);
    return res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ'
    });
  }
};

exports.logout = async (req, res) => {
  const token = req.accessToken;
  const expiresAt = req.auth?.exp;
  if (typeof token !== 'string' || !Number.isInteger(expiresAt)) {
    return res.status(401).json({ success: false, message: 'ไม่พบ access token ที่ถูกต้อง' });
  }

  const tokenHash = createHash('sha256').update(token).digest('hex');
  try {
    await pool.query(
      'INSERT INTO revoked_tokens (tokenHash, expiresAt) VALUES (?, FROM_UNIXTIME(?))',
      [tokenHash, expiresAt]
    );
    return res.status(200).json({ success: true, message: 'ออกจากระบบสำเร็จ' });
  } catch (error) {
    console.error('Logout failed:', error);
    return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการออกจากระบบ' });
  }
};
