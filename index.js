

const express = require('express');
const cors = require('cors');
require('dotenv').config();

// 1. นำเข้าไฟล์ Routes ที่เราเพิ่งสร้าง
const itemRoutes = require('./routes/itemRouters');
const recipeRoutes = require('./routes/recipeRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const unitRoutes = require('./routes/unitRoutes');
const authRoutes = require('./routes/authRoutes');
const authenticateToken = require('./middleware/authenticateToken');
const { swaggerUi, swaggerSpec } = require('./config/swagger');

const app = express();
const PORT = process.env.PORT || 3000;
app.set('etag', false);
const allowedOrigins = new Set(
	[process.env.CORS_ORIGINS, process.env.CORS_ORIGIN, process.env.cors_origin]
		.flatMap((origins) => typeof origins === 'string' ? origins.split(',') : [])
		.map((origin) => origin.trim())
		.filter(Boolean)
);
const corsOptions = {
	origin(origin, callback) {
		callback(null, origin && allowedOrigins.has(origin) ? origin : false);
	},
	methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
	allowedHeaders: ['Content-Type', 'Authorization'],
	maxAge: 86400,
	optionsSuccessStatus: 204
};

// 2. Middleware สำหรับทำให้ Express อ่านข้อมูลแบบ JSON ที่ส่งมาใน HTTP Body ได้
app.use(express.json());
app.use(cors(corsOptions));
app.options(/^\/api\/.*/, cors(corsOptions));
app.use('/api', (req, res, next) => {
	res.set('Cache-Control', 'no-store');
	next();
});


try {
	// 3. เรียกใช้งาน Route โดยกำหนด Path เริ่มต้น (Prefix)
	app.get('/api', (req, res) => {
		res.json({ message: 'BHouse API is running' });
	});
	app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
	app.use('/api/auth', authRoutes);
	app.use('/api/recipes', authenticateToken, recipeRoutes);
	app.use('/api/categories', authenticateToken, categoryRoutes);
	app.use('/api/units', authenticateToken, unitRoutes);
	// ทุกๆ เส้นทางใน itemRoutes จะเริ่มต้นด้วย /api/items
	app.use('/api/ingredient', authenticateToken, itemRoutes);

	// 4. หน้าแรกสำหรับเช็กสถานะเซิร์ฟเวอร์ทั่วไป
	app.get('/', (req, res) => {
		res.send(`<!DOCTYPE html>
<html lang="th">
	<head>
		<meta charset="UTF-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1.0" />
		<title>BHouse API</title> 
		<style>
			body { font-family: system-ui, sans-serif; margin: 0; min-height: 100vh; display: grid; place-items: center; background: #f4f7fb; color: #1f2937; }
			main { max-width: 560px; margin: 24px; padding: 40px; text-align: center; background: #fff; border-radius: 16px; box-shadow: 0 12px 32px #17255414; }
			h1 { margin-top: 0; color: #2563eb; }
			p { line-height: 1.6; }
			code { padding: 3px 7px; border-radius: 5px; background: #eff6ff; }
		</style>
	</head>
	<body>
		<main>
			<h1>ยินดีต้อนรับสู่ BHouse API</h1>
			<p>เซิร์ฟเวอร์ Express ทำงานแล้ว</p>
			<p>เริ่มต้นใช้งาน API ได้ที่ <code>/api</code></p>
		</main>
	</body>
</html>`);
	});

	// 5. เปิดรัน Server บน Port ที่กำหนด
	app.listen(PORT, () => {
		console.log(`Server is running at http://localhost:${PORT}`);
		console.log(`📄 API Documentation available at http://localhost:${PORT}/api-docs`);
	});

} catch (error) {
	console.error('เกิดข้อผิดพลาดในการเริ่มต้นแอปพลิเคชัน:', error);
}
