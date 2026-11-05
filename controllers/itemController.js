const pool = require('../config/db'); // ดึง Database Pool มาใช้งาน

// 1. ดึงข้อมูลสินค้าทั้งหมด (GET)
exports.getAllItems = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT i.*, u.unitName 
       FROM items i 
       LEFT JOIN units u ON i.unitId = u.unitId 
       WHERE i.userId = ?`,
      [req.auth.userId]
    );
    return res.status(200).json({
      success: true,
      message: 'ดึงข้อมูลสินค้าสำเร็จ',
      data: rows
    });
  } catch (error) {
    console.error('Unable to fetch items:', error);
    return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการดึงข้อมูลสินค้า' });
  }
};

// 2. ดึงข้อมูลสินค้าชิ้นเดียวตาม ID (GET)
exports.getItemById = async (req, res) => {
  const { id } = req.params; // รับค่า id จาก URL เช่น /api/items/5
  try {
    const [rows] = await pool.query(
      'SELECT * FROM items WHERE itemId = ? AND userId = ?',
      [id, req.auth.userId]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'ไม่พบสินค้าชิ้นนี้' });
    }

    return res.status(200).json({ success: true, data: rows[0] });
  } catch (error) {
    console.error('Unable to fetch item:', error);
    return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการดึงข้อมูลวัตถุดิบ' });
  }
};

// 3. เพิ่มสินค้าใหม่ (POST)
exports.createItem = async (req, res) => {
  const { name, price, qty, unitId } = req.body || {};
  
  // Validation เบื้องต้น
  if (!name || !price || qty === undefined || !unitId) {
    return res.status(400).json({ success: false, message: 'กรุณากรอกชื่อ ราคา จำนวน หน่วยสินค้า และผู้ใช้งาน' });
  }

  try {
    const [result] = await pool.query(
      'INSERT INTO items (itemName, qty, unitId, price, userId) VALUES (?, ?, ?, ?, ?)',
      [name, qty, unitId, price, req.auth.userId]
    );
    
    res.status(201).json({
      success: true,
      message: 'เพิ่มสินค้าสำเร็จ',
      itemId: result.insertId
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 4. อัปเดตข้อมูลสินค้าทั้งหมด (PUT - แทนที่ข้อมูลเดิมทั้งหมด)
exports.updateItemPut = async (req, res) => {
  const { id } = req.params;
  const { name, price, qty, unitId } = req.body || {};

  // PUT มักจะบังคับให้ส่งข้อมูลมาครบทุกฟิลด์ที่จำเป็น
  if (!name || !price || qty === undefined || !unitId) {
    return res.status(400).json({ success: false, message: 'กรุณากรอกข้อมูลให้ครบถ้วน (name, price, qty, unitId)' });
  }

  try {
    const [result] = await pool.query(
      'UPDATE items SET itemName = ?, price = ?, qty = ?, unitId = ? WHERE itemId = ? AND userId = ?',
      [name, price, qty, unitId, id, req.auth.userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'ไม่พบวัตถุดิบที่ต้องการอัปเดต' });
    }

    res.status(200).json({ success: true, message: 'อัปเดตวัตถุดิบสำเร็จ' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 5. อัปเดตข้อมูลบางส่วน (PATCH - เปลี่ยนแปลงเฉพาะฟิลด์ที่ส่งมา)
exports.updateItemPatch = async (req, res) => {
  const { id } = req.params;
  const fieldsToUpdate = req.body || {};

  const allowedFields = {
    name: 'itemName',
    itemName: 'itemName',
    price: 'price',
    qty: 'qty',
    unitId: 'unitId'
  };
  const entries = Object.entries(fieldsToUpdate);
  if (entries.length === 0) {
    return res.status(400).json({ success: false, message: 'กรุณาส่งฟิลด์ที่ต้องการอัปเดตอย่างน้อย 1 ฟิลด์' });
  }

  const updates = [];
  const columns = new Set();
  for (const [field, value] of entries) {
    const column = allowedFields[field];
    if (!column || columns.has(column)) {
      return res.status(400).json({ success: false, message: 'พบฟิลด์ที่ไม่รองรับหรือซ้ำกัน' });
    }
    columns.add(column);
    updates.push({ column, value });
  }

  try {
    const assignments = updates.map(({ column }) => `${column} = ?`);
    const values = updates.map(({ value }) => value);
    values.push(id, req.auth.userId);
    const [result] = await pool.query(
      `UPDATE items SET ${assignments.join(', ')} WHERE itemId = ? AND userId = ?`,
      values
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'ไม่พบวัตถุดิบที่ต้องการอัปเดต' });
    }

    res.status(200).json({ success: true, message: 'อัปเดตวัตถุดิบเฉพาะฟิลด์สำเร็จ' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 6. ลบข้อมูลสินค้า (DELETE)
exports.deleteItem = async (req, res) => {
  const { id } = req.params;

  try {
    const [result] = await pool.query(
      'DELETE FROM items WHERE itemId = ? AND userId = ?',
      [id, req.auth.userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'ไม่พบวัตถุดิบที่ต้องการลบ' });
    }

    res.status(200).json({ success: true, message: 'ลบวัตถุดิบสำเร็จ' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
