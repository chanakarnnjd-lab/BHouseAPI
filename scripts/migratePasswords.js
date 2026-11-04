const bcrypt = require('bcryptjs');
const pool = require('../config/db');

const BCRYPT_HASH_PATTERN = /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/;
const HASH_LENGTH = 60;
const applyChanges = process.argv.includes('--apply');
const unexpectedArgs = process.argv.slice(2).filter((arg) => arg !== '--apply');

const migratePasswords = async () => {
  if (unexpectedArgs.length > 0) {
    throw new Error('Usage: npm run migrate:passwords [-- --apply]');
  }

  const connection = await pool.getConnection();
  let transactionStarted = false;

  try {
    const [columns] = await connection.query(
      `SELECT DATA_TYPE AS dataType, CHARACTER_MAXIMUM_LENGTH AS maxLength
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND COLUMN_NAME = 'password'`,
      [process.env.DB_NAME]
    );
    const column = columns[0];

    if (!column) {
      throw new Error('ไม่พบคอลัมน์ users.password ในฐานข้อมูลที่ตั้งค่าไว้');
    }

    if (column.maxLength !== null && column.maxLength < HASH_LENGTH) {
      throw new Error('คอลัมน์ users.password ต้องรองรับอย่างน้อย 60 ตัวอักษร');
    }

    await connection.beginTransaction();
    transactionStarted = true;

    const [users] = await connection.query(
      'SELECT userId, password FROM users FOR UPDATE'
    );
    const pendingUsers = users.filter(
      (user) => !BCRYPT_HASH_PATTERN.test(user.password)
    );

    for (const user of pendingUsers) {
      if (typeof user.password !== 'string' || !user.password) {
        throw new Error(`พบรหัสผ่านว่างหรือรูปแบบไม่ถูกต้องของ userId ${user.userId}`);
      }
    }

    if (!applyChanges) {
      await connection.rollback();
      transactionStarted = false;
      console.log(`พบรหัสผ่านที่ยังไม่เป็น bcrypt ${pendingUsers.length} รายการ (dry-run; ไม่มีการเปลี่ยนแปลง)`);
      console.log('ตรวจสอบข้อมูลและสำรองฐานข้อมูลก่อนสั่ง npm run migrate:passwords -- --apply');
      return;
    }

    for (const user of pendingUsers) {
      const passwordHash = await bcrypt.hash(user.password, 12);
      const [result] = await connection.query(
        'UPDATE users SET password = ? WHERE userId = ?',
        [passwordHash, user.userId]
      );

      if (result.affectedRows !== 1) {
        throw new Error(`ไม่สามารถอัปเดตรหัสผ่านของ userId ${user.userId}`);
      }
    }

    await connection.commit();
    transactionStarted = false;
    console.log(`แปลงรหัสผ่านเป็น bcrypt สำเร็จ ${pendingUsers.length} รายการ`);
  } catch (error) {
    if (transactionStarted) {
      await connection.rollback();
    }
    throw error;
  } finally {
    connection.release();
  }
};

migratePasswords()
  .catch((error) => {
    console.error('Password migration failed:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
