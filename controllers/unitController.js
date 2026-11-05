const pool = require('../config/db');

const MAX_MYSQL_INT = 2147483647;
const isPositiveInteger = (value) =>
  Number.isSafeInteger(value) && value > 0 && value <= MAX_MYSQL_INT;
const parseUnit = (body) => {
  const { unitName, parentId = null, N = null } = body || {};

  if (
    typeof unitName !== 'string' ||
    !unitName.trim() ||
    unitName.trim().length > 100 ||
    !(parentId === null || isPositiveInteger(parentId)) ||
    !(N === null || isPositiveInteger(N))
  ) {
    return null;
  }

  return { unitName: unitName.trim(), parentId, N };
};

const wouldCreateCycle = (units, unitId, parentId) => {
  let currentId = parentId;
  const visited = new Set();
  while (currentId !== null) {
    if (currentId === unitId || visited.has(currentId)) {
      return true;
    }
    visited.add(currentId);
    currentId = units.get(currentId)?.parentId ?? null;
  }
  return false;
};

const getUnitId = (value) => {
  const unitId = Number(value);
  return isPositiveInteger(unitId) ? unitId : null;
};

exports.getAllUnits = async (req, res) => {
  try {
    const [units] = await pool.query(
      'SELECT unitId, parentId, unitName, N FROM units ORDER BY unitId'
    );
    return res.status(200).json({ success: true, data: units });
  } catch (error) {
    console.error('Unable to fetch units:', error);
    return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการดึงหน่วยนับ' });
  }
};

exports.getUnitById = async (req, res) => {
  const unitId = getUnitId(req.params.id);
  if (!unitId) {
    return res.status(400).json({ success: false, message: 'unitId ไม่ถูกต้อง' });
  }

  try {
    const [units] = await pool.query(
      'SELECT unitId, parentId, unitName, N FROM units WHERE unitId = ?',
      [unitId]
    );
    if (units.length === 0) {
      return res.status(404).json({ success: false, message: 'ไม่พบหน่วยนับ' });
    }
    return res.status(200).json({ success: true, data: units[0] });
  } catch (error) {
    console.error('Unable to fetch unit:', error);
    return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการดึงหน่วยนับ' });
  }
};

exports.createUnit = async (req, res) => {
  const unit = parseUnit(req.body);
  if (!unit) {
    return res.status(400).json({
      success: false,
      message: 'กรุณาระบุ unitName, parentId และ N ให้ถูกต้อง โดย parentId และ N เป็น null ได้'
    });
  }

  try {
    if (unit.parentId !== null) {
      const [parents] = await pool.query('SELECT unitId FROM units WHERE unitId = ?', [unit.parentId]);
      if (parents.length === 0) {
        return res.status(400).json({ success: false, message: 'ไม่พบหน่วยหลักที่ระบุ' });
      }
    }

    const [result] = await pool.query(
      'INSERT INTO units (parentId, unitName, N) VALUES (?, ?, ?)',
      [unit.parentId, unit.unitName, unit.N]
    );
    return res.status(201).json({
      success: true,
      message: 'สร้างหน่วยนับสำเร็จ',
      data: { unitId: result.insertId, ...unit }
    });
  } catch (error) {
    console.error('Unable to create unit:', error);
    return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการสร้างหน่วยนับ' });
  }
};

exports.updateUnit = async (req, res) => {
  const unitId = getUnitId(req.params.id);
  const unit = parseUnit(req.body);
  if (!unitId) {
    return res.status(400).json({ success: false, message: 'unitId ไม่ถูกต้อง' });
  }
  if (!unit) {
    return res.status(400).json({
      success: false,
      message: 'กรุณาระบุ unitName, parentId และ N ให้ถูกต้อง โดย parentId และ N เป็น null ได้'
    });
  }

  let connection;
  let transactionStarted = false;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();
    transactionStarted = true;

    const [rows] = await connection.query(
      'SELECT unitId, parentId FROM units FOR UPDATE'
    );
    const units = new Map(rows.map((row) => [row.unitId, row]));
    if (!units.has(unitId)) {
      await connection.rollback();
      transactionStarted = false;
      return res.status(404).json({ success: false, message: 'ไม่พบหน่วยนับ' });
    }
    if (unit.parentId !== null && !units.has(unit.parentId)) {
      await connection.rollback();
      transactionStarted = false;
      return res.status(400).json({ success: false, message: 'ไม่พบหน่วยหลักที่ระบุ' });
    }
    if (wouldCreateCycle(units, unitId, unit.parentId)) {
      await connection.rollback();
      transactionStarted = false;
      return res.status(400).json({ success: false, message: 'ไม่สามารถกำหนดหน่วยหลักที่ทำให้เกิดวงจรได้' });
    }

    await connection.query(
      'UPDATE units SET parentId = ?, unitName = ?, N = ? WHERE unitId = ?',
      [unit.parentId, unit.unitName, unit.N, unitId]
    );
    await connection.commit();
    transactionStarted = false;
    return res.status(200).json({
      success: true,
      message: 'อัปเดตหน่วยนับสำเร็จ',
      data: { unitId, ...unit }
    });
  } catch (error) {
    if (transactionStarted) {
      await connection.rollback();
    }
    console.error('Unable to update unit:', error);
    return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการอัปเดตหน่วยนับ' });
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

exports.deleteUnit = async (req, res) => {
  const unitId = getUnitId(req.params.id);
  if (!unitId) {
    return res.status(400).json({ success: false, message: 'unitId ไม่ถูกต้อง' });
  }

  try {
    const [result] = await pool.query('DELETE FROM units WHERE unitId = ?', [unitId]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'ไม่พบหน่วยนับ' });
    }
    return res.status(200).json({ success: true, message: 'ลบหน่วยนับสำเร็จ' });
  } catch (error) {
    if (error.code === 'ER_ROW_IS_REFERENCED_2' || error.code === 'ER_ROW_IS_REFERENCED') {
      return res.status(409).json({
        success: false,
        message: 'ไม่สามารถลบหน่วยนับที่ถูกใช้งานโดยวัตถุดิบหรือหน่วยย่อยได้'
      });
    }
    console.error('Unable to delete unit:', error);
    return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการลบหน่วยนับ' });
  }
};
