const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../db');  // MySQL 연결
const winston = require('winston');
const path = require('path');
const session = require('express-session');

// 비밀키를 환경 변수로 관리
const secretKey = 'your_secret_key';

// 로그인 전용 로거 생성
const loginLogger = winston.createLogger({
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(info => `${info.timestamp} [${info.level}]: ${info.message}`)
    ),
    transports: [
        new winston.transports.File({
            filename: path.join(__dirname, '../logs/login.log'),  // 로그인 로그 파일
            level: 'info'
        }),
        new winston.transports.Console()
    ]
});

// 세션 설정 미들웨어 추가
router.use(session({
    secret: 'your_session_secret',  // 세션 비밀키
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }  // HTTP 사용시 false, HTTPS 사용시 true
}));

// 로그인 페이지 제공 (GET 요청)
router.get('/login', (req, res) => {
    loginLogger.info('로그인 페이지 요청');
    res.sendFile(path.join(__dirname, '../public/src/html', 'Login.html'));  // 로그인 페이지 반환
});

// 로그인 처리 (POST 요청)
router.post('/login', async (req, res) => {
    const { user_id, password } = req.body;
    loginLogger.info(`로그인 시도 - user_id: ${user_id}`);

    try {
        const [user] = await db.query('SELECT * FROM Users WHERE user_id = ?', [user_id]);

        if (!user || user.length === 0) {
            loginLogger.warn(`로그인 실패 - 사용자 없음: ${user_id}`);
            return res.status(401).json({ message: '사용자를 찾을 수 없습니다.' });
        }

        const validPassword = await bcrypt.compare(password, user[0].password);
        if (!validPassword) {
            loginLogger.warn(`로그인 실패 - 잘못된 비밀번호: ${user_id}`);
            return res.status(401).json({ message: '잘못된 비밀번호입니다.' });
        }

        // wtrdd 계정에 관리자 권한 추가
        let isAdmin = false;
        if (user[0].user_id === 'wtrdd') {
            isAdmin = true;
        }

        // 사용자의 권한 가져오기
        const userRole = user[0].role;  // role 필드가 있다고 가정

        // 세션에 사용자 정보, 관리자 권한, 권한(role) 추가
        req.session.userId = user[0].user_id;
        req.session.nickname = user[0].nickname;
        req.session.isAdmin = isAdmin;
        req.session.userRole = userRole; // 권한을 세션에 저장

        // JWT 생성
        const token = jwt.sign(
            { userId: user[0].user_id, nickname: user[0].nickname, isAdmin, role: userRole },  // role 추가
            secretKey,
            { expiresIn: '1h' }
        );
        loginLogger.info(`로그인 성공 - user_id: ${user_id}, nickname: ${user[0].nickname}, isAdmin: ${isAdmin}, role: ${userRole}`);

        // 토큰을 쿠키에 저장
        res.cookie('token', token, { httpOnly: true });

        // 로그인 성공 후 JSON 응답
        res.status(200).json({ message: '로그인 성공', userId: user[0].user_id });
    } catch (error) {
        loginLogger.error(`로그인 오류: ${error.message}`);
        res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
});


// 로그아웃 처리 (GET 요청)
router.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ message: '로그아웃 중 오류 발생' });
        }

        res.clearCookie('token');  // 쿠키에 저장된 JWT 토큰 삭제
        res.redirect('/');
    });
});

// 모듈 내보내기
module.exports = router;
