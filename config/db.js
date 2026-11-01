const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

try {
  // 1. อ่านไฟล์ CA Certificate สำหรับการเชื่อมต่อแบบปลอดภัย SSL
  // ใช้ path.join และ .. เพื่อถอยหลัง 1 ก้าวออกไปหาไฟล์ ca.pem ที่อยู่ด้านนอกโฟลเดอร์ config
  const caCert = fs.readFileSync(path.join(__dirname, '../ca.pem'));

  // 2. สร้าง Connection Pool
  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    ssl: {
      ca: caCert
    }
  });

  console.log('📦 สร้าง MySQL Connection Pool สำเร็จ!');

  // 3. Export ตัว pool ออกไปให้ไฟล์อื่นๆ (เช่น Controller) เรียกใช้งาน
  module.exports = pool;

} catch (error) {
  console.error('❌ ไม่สามารถอ่านไฟล์ CA Certificate หรือสร้าง Pool ได้:', error.message);
  process.exit(1); // ปิดแอปพลิเคชันทันทีหากการตั้งค่าฐานข้อมูลเริ่มต้นผิดพลาด
}
