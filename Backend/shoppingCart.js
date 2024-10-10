const express = require('express');
const router = express.Router();
const db = require('../db');  // MySQL 연결
const winston = require('winston');
const jwt = require('jsonwebtoken');  // JWT 사용

// winston 로거 설정
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message }) => {
            return `${timestamp} [${level}]: ${message}`;
        })
    ),
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'logs/shopping_cart.log' })
    ]
});

// 장바구니에 상품 추가 (JWT를 사용한 유저 인증)
router.post('/add', async (req, res) => {
    const token = req.cookies.token || req.headers.authorization?.split(' ')[1];

    if (!token) {
        logger.warn('장바구니 추가 실패: 토큰이 없습니다.');
        return res.status(401).json({ message: '로그인이 필요합니다.' });
    }

    try {
        const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
        const user_id = decoded.userId;  // userId는 이제 문자형으로도 가능

        const { product_id, quantity } = req.body;

        if (!product_id) {
            logger.warn('장바구니 추가 실패: product_id가 누락되었습니다.');
            return res.status(400).json({ message: 'product_id가 필요합니다.' });
        }

        // 장바구니에 이미 있는 상품인지 확인
        const [existingCartItem] = await db.query(
            'SELECT * FROM ShoppingCart WHERE user_id = ? AND product_id = ?',
            [user_id, product_id]
        );

        if (existingCartItem.length > 0) {
            // 이미 있는 경우 수량을 업데이트
            await db.query(
                'UPDATE ShoppingCart SET quantity = quantity + ? WHERE user_id = ? AND product_id = ?',
                [quantity || 1, user_id, product_id]
            );
            logger.info(`장바구니 업데이트: user_id=${user_id}, product_id=${product_id}, 추가된 수량=${quantity}`);
        } else {
            // 없는 경우 새로 추가
            await db.query(
                'INSERT INTO ShoppingCart (user_id, product_id, quantity) VALUES (?, ?, ?)',
                [user_id, product_id, quantity || 1]
            );
            logger.info(`장바구니 추가: user_id=${user_id}, product_id=${product_id}, 수량=${quantity}`);
        }

        res.status(201).json({ message: '상품이 장바구니에 추가되었습니다.' });
    } catch (error) {
        logger.error(`장바구니 추가 중 오류 발생: ${error.message}`);
        res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
});
router.get('/cart', async (req, res) => {
    try {
        // Ensure user is authenticated and req.user is populated
        const token = req.cookies.token || req.headers.authorization.split(' ')[1];

        if (!token) {
            return res.status(401).json({ message: '로그인이 필요합니다.' });
        }

        // Decode token to get user info (this assumes you're using JWT)
        const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
        const userId = decoded.userId; // Ensure userId is populated correctly

        if (!userId) {
            return res.status(400).json({ message: '사용자 정보를 찾을 수 없습니다.' });
        }

        // Fetch cart items for the user
        const [cartItems] = await db.query(
            'SELECT ShoppingCart.*, Products.name, Products.price, Products.image FROM ShoppingCart JOIN Products ON ShoppingCart.product_id = Products.id WHERE ShoppingCart.user_id = ?',
            [userId]
        );

        // Calculate total price
        let totalPrice = 0;
        if (cartItems && cartItems.length > 0) {
            totalPrice = cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
        }

        // Render the cart.ejs template with cart items and total price
        res.render('cart', { cartItems, totalPrice });
    } catch (error) {
        console.error('장바구니 조회 중 오류:', error);
        res.status(500).json({ message: '장바구니를 불러오는 중 오류가 발생했습니다.' });
    }
});
router.post('/cart/remove', async (req, res) => {
    const token = req.cookies.token || req.headers.authorization?.split(' ')[1]; // JWT 토큰 확인

    if (!token) {
        return res.status(401).json({ message: '로그인이 필요합니다.' });
    }

    try {
        // 토큰 검증 및 사용자 정보 추출
        const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
        const user_id = decoded.userId; // 토큰에서 userId 추출

        const { product_id } = req.body;  // 클라이언트에서 전달된 상품 ID

        if (!product_id) {
            return res.status(400).json({ message: 'product_id가 필요합니다.' });
        }

        // 장바구니에서 해당 상품 삭제
        await db.query('DELETE FROM ShoppingCart WHERE user_id = ? AND product_id = ?', [user_id, product_id]);

        // 상품 삭제 후 홈(/)으로 리다이렉트
        res.redirect('/');  // 홈 페이지로 이동
    } catch (err) {
        console.error('장바구니 삭제 오류:', err);
        res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
});


module.exports = router;
