const pool = require('../config/db');

const isPositiveInteger = (value) => Number.isSafeInteger(value) && value > 0;
const parseCategoryName = (name) =>
  typeof name === 'string' && name.trim() && name.trim().length <= 100
    ? name.trim()
    : null;

exports.getAllCategories = async (req, res) => {
  try {
    const [categories] = await pool.query(
      'SELECT categoryId, categoryName FROM categories WHERE userId = ? ORDER BY categoryName, categoryId',
      [req.auth.userId]
    );
    return res.status(200).json({ success: true, data: categories });
  } catch (error) {
    console.error('Unable to fetch recipe categories:', error);
    return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการดึงหมวดหมู่' });
  }
};

exports.getCategoryById = async (req, res) => {
  const categoryId = Number(req.params.id);
  if (!isPositiveInteger(categoryId)) {
    return res.status(400).json({ success: false, message: 'categoryId ไม่ถูกต้อง' });
  }

  try {
    const [categories] = await pool.query(
      'SELECT categoryId, categoryName FROM categories WHERE categoryId = ? AND userId = ?',
      [categoryId, req.auth.userId]
    );
    if (categories.length === 0) {
      return res.status(404).json({ success: false, message: 'ไม่พบหมวดหมู่' });
    }
    return res.status(200).json({ success: true, data: categories[0] });
  } catch (error) {
    console.error('Unable to fetch recipe category:', error);
    return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการดึงหมวดหมู่' });
  }
};

exports.createCategory = async (req, res) => {
  const categoryName = parseCategoryName(req.body?.categoryName);
  if (!categoryName) {
    return res.status(400).json({
      success: false,
      message: 'กรุณาระบุ categoryName ความยาวไม่เกิน 100 ตัวอักษร'
    });
  }

  try {
    const [result] = await pool.query(
      'INSERT INTO categories (categoryName, userId) VALUES (?, ?)',
      [categoryName, req.auth.userId]
    );
    return res.status(201).json({
      success: true,
      message: 'สร้างหมวดหมู่สำเร็จ',
      data: { categoryId: result.insertId, categoryName }
    });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ success: false, message: 'ชื่อหมวดหมู่นี้ถูกใช้งานแล้ว' });
    }
    console.error('Unable to create recipe category:', error);
    return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการสร้างหมวดหมู่' });
  }
};

exports.updateCategory = async (req, res) => {
  const categoryId = Number(req.params.id);
  const categoryName = parseCategoryName(req.body?.categoryName);
  if (!isPositiveInteger(categoryId)) {
    return res.status(400).json({ success: false, message: 'categoryId ไม่ถูกต้อง' });
  }
  if (!categoryName) {
    return res.status(400).json({
      success: false,
      message: 'กรุณาระบุ categoryName ความยาวไม่เกิน 100 ตัวอักษร'
    });
  }

  try {
    const [result] = await pool.query(
      'UPDATE categories SET categoryName = ? WHERE categoryId = ? AND userId = ?',
      [categoryName, categoryId, req.auth.userId]
    );
    if (result.affectedRows === 0) {
      const [existing] = await pool.query(
        'SELECT categoryId FROM categories WHERE categoryId = ? AND userId = ?',
        [categoryId, req.auth.userId]
      );
      if (existing.length === 0) {
        return res.status(404).json({ success: false, message: 'ไม่พบหมวดหมู่' });
      }
    }
    return res.status(200).json({
      success: true,
      message: 'อัปเดตหมวดหมู่สำเร็จ',
      data: { categoryId, categoryName }
    });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ success: false, message: 'ชื่อหมวดหมู่นี้ถูกใช้งานแล้ว' });
    }
    console.error('Unable to update recipe category:', error);
    return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการอัปเดตหมวดหมู่' });
  }
};

exports.deleteCategory = async (req, res) => {
  const categoryId = Number(req.params.id);
  if (!isPositiveInteger(categoryId)) {
    return res.status(400).json({ success: false, message: 'categoryId ไม่ถูกต้อง' });
  }

  try {
    const [result] = await pool.query(
      'DELETE FROM categories WHERE categoryId = ? AND userId = ?',
      [categoryId, req.auth.userId]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'ไม่พบหมวดหมู่' });
    }
    return res.status(200).json({ success: true, message: 'ลบหมวดหมู่สำเร็จ' });
  } catch (error) {
    console.error('Unable to delete recipe category:', error);
    return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการลบหมวดหมู่' });
  }
};
