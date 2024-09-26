const fs = require('fs'); // 추가
const express = require('express');
const router = express.Router();
const db = require('../db');  // MySQL 연결
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');

// 디렉토리 생성 코드
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadsDir);  // 파일이 저장될 경로 설정
    },
    filename: function (req, file, cb) {
        const ext = path.extname(file.originalname);  // 파일 확장자 추출
        cb(null, Date.now() + ext);  // 파일 이름을 고유하게 설정
    }
});
const upload = multer({ storage: storage });

router.get('/products', async (req, res) => {
    try {
        // Fetch product ID, name, price, and image from the database
        const [products] = await db.query('SELECT id, name, price, image FROM Products');

        // Render the EJS template with all product data
        res.render('productList', { products });
    } catch (err) {
        console.error('상품 목록 조회 중 오류:', err);
        res.status(500).json({ message: '상품 목록을 가져오는 중 오류가 발생했습니다.' });
    }
});




// 상품 등록 페이지 제공 (GET 요청)
router.get('/product/register', (req, res) => {
    const token = req.cookies.token;
    if (!token) {
        return res.redirect('/login');
    }

    try {
        const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
        if (decoded.role === 'admin' || decoded.isAdmin) {
            res.render('registerProduct');
        } else {
            res.status(403).send('접근 권한이 없습니다.');
        }
    } catch (err) {
        console.log('토큰 검증 실패:', err);
        return res.redirect('/login');
    }
});

// 상품 등록 처리 (POST 요청)
router.post('/product/register', upload.single('image'), async (req, res) => {
    const { name, price } = req.body;
    const image = req.file ? `/uploads/${req.file.filename}` : '파일없음'; // 이미지 경로 생성

    if (!name || !price) {
        return res.status(400).json({ message: '상품 이름과 가격은 필수 항목입니다.' });
    }

    try {
        // 이미지 경로 포함하여 DB에 저장
        await db.query('INSERT INTO Products (name, price, image) VALUES (?, ?, ?)', [name, price, image]);
        res.status(201).json({ message: '상품이 성공적으로 등록되었습니다.' });
    } catch (err) {
        console.error('상품 등록 중 오류 발생:', err);
        res.status(500).json({ message: '상품 등록 중 오류가 발생했습니다.' });.0
    }
});



// 상품 상세페이지 등록 (GET 요청)
router.get('/product/detail/register', async (req, res) => {
    // 로그인 및 관리자 여부 확인 후 처리
    const token = req.cookies.token;  // 쿠키에 저장된 토큰 확인

    if (!token) {
        return res.redirect('/login');  // 토큰 없으면 로그인 페이지로 리다이렉트
    }

    try {
        const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

        if (decoded.role === 'admin' || decoded.isAdmin) {
            // 관리자 권한이 있는 경우 상품 목록을 데이터베이스에서 가져옴
            const [products] = await db.query('SELECT id, name FROM Products');

            // 상품 목록과 함께 EJS 파일 렌더링
            res.render('registerProductDetail', { products });
        } else {
            return res.status(403).send('접근 권한이 없습니다.');
        }
    } catch (err) {
        return res.redirect('/login');
    }
});

// 상세페이지 GET 요청
router.get('/product/detail/:id', async (req, res) => {
    const productId = req.params.id;  // URL에서 상품 ID 가져오기

    try {
        const [productDetails] = await db.query('SELECT * FROM ProductDetails WHERE id = ?', [productId]);

        if (productDetails.length === 0) {
            return res.status(404).json({ message: '상품을 찾을 수 없습니다.' });
        }

        res.render('productDetail', { product: productDetails[0] });  // 상세페이지로 데이터 전달
    } catch (err) {
        console.error('상세페이지 조회 중 오류:', err);
        res.status(500).json({ message: '상세페이지 조회 중 오류가 발생했습니다.' });
    }
});


// 상품 상세페이지 등록 (POST 요청)
// 상품 상세페이지 등록 처리 (POST 요청)
// 상품 상세페이지 등록 처리 (POST 요청)
router.post('/product/detail/register', upload.single('image'), async (req, res) => {
    const { product_id, description } = req.body;
    const image = req.file ? req.file.filename : '파일없음';

    if (!product_id || !description) {
        return res.status(400).json({ message: '상품 선택 및 설명은 필수 항목입니다.' });
    }

    try {
        // 상품 상세페이지 정보를 DB에 저장
        await db.query('INSERT INTO ProductDetails (product_id, description, image) VALUES (?, ?, ?)', [product_id, description, image]);
        res.status(201).json({ message: '상세페이지가 성공적으로 등록되었습니다.' });
    } catch (err) {
        console.error('상세페이지 등록 중 오류 발생:', err);
        res.status(500).json({ message: '상세페이지 등록 중 오류가 발생했습니다.' });
    }
});



// 상품 상세페이지를 가져오는 GET 요청
router.get('/product/:id', async (req, res) => {
    const productId = req.params.id;

    try {
        // Products 테이블에서 상품 가격을 가져옴
        const [product] = await db.query('SELECT name, price FROM Products WHERE id = ?', [productId]);

        if (product.length === 0) {
            return res.status(404).json({ message: '상품을 찾을 수 없습니다.' });
        }

        // ProductDetails 테이블에서 상품 설명 및 이미지를 가져옴
        const [productDetails] = await db.query('SELECT description, image FROM ProductDetails WHERE product_id = ?', [productId]);

        if (productDetails.length === 0) {
            return res.status(404).json({ message: '상세 정보를 찾을 수 없습니다.' });
        }

        // EJS 파일에 상품 및 상세 정보를 전달
        res.render('productDetail', { 
            product: product[0], 
            productDetails: productDetails[0] 
        });
    } catch (err) {
        console.error('상세페이지 조회 중 오류 발생:', err);
        return res.status(500).json({ message: '상세페이지 조회 중 오류가 발생했습니다.' });
    }
});


module.exports = router;
