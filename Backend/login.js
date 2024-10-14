const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../db');  // MySQL 연결
const winston = require('winston');
const path = require('path');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);  // MySQL 세션 스토어

// 비밀키 설정
const secretKey = process.env.JWT_SECRET || 'your_secret_key';  // 비밀키

// 세션 스토어 옵션 설정
const sessionStore = new MySQLStore({
    host: '172.27.14.125',
    port: 3306,
    user: 'wtrdd',
    password: 'Gaspp2647@',
    database: 'Practice_Site_Project'
});

// 세션 설정 미들웨어 추가
router.use(session({
    secret: 'your_session_secret',  // 세션 비밀키
    resave: false,
    saveUninitialized: false,  // 세션에 변화가 없으면 저장하지 않음
    cookie: { secure: false, maxAge: 60000 },  // HTTPS 사용시 secure: true로 변경, 세션 만료 시간 60초
    store: sessionStore
}));

// 로그인 로거 설정
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

        // 관리자 권한 확인 (wtrdd 계정)
        let isAdmin = false;
        if (user[0].user_id === 'wtrdd') {
            isAdmin = true;
        }

        // 사용자 권한(role) 가져오기
        const userRole = user[0].role || 'user';  // role이 없으면 기본값은 'user'

        // 세션에 사용자 정보 저장
        req.session.userId = user[0].user_id;
        req.session.nickname = user[0].nickname;
        req.session.isAdmin = isAdmin;
        req.session.userRole = userRole;

        let token;
        let tokenGenerated = false;

        try {
            // JWT 토큰 생성 (1시간 유효)
            token = jwt.sign(
                { userId: user[0].user_id, nickname: user[0].nickname, isAdmin, role: userRole },
                secretKey,
                { expiresIn: '1h' }
            );

            // JWT 토큰 유효 시간 계산
            const decodedToken = jwt.decode(token);
            const expirationTime = new Date(decodedToken.exp * 1000);  // 유닉스 타임스탬프를 Date로 변환

            loginLogger.info(`토큰 발급 성공 - user_id: ${user[0].user_id}, nickname: ${user[0].nickname}, token 유효시간: ${expirationTime}`);
            tokenGenerated = true;

            // 토큰을 쿠키에 저장
            res.cookie('token', token, { httpOnly: true, secure: false });  // HTTPS 사용시 secure: true로 변경

        } catch (error) {
            loginLogger.error(`토큰 발급 오류: ${error.message}`);
            tokenGenerated = false;  // 토큰 발급 실패 시 플래그 설정
        }

        // 로그인 성공 시 응답
        if (tokenGenerated) {
            res.status(200).json({
                message: '로그인 성공 (토큰 발급됨)',
                userId: user[0].user_id,
                nickname: user[0].nickname,  // 닉네임 추가
                isAdmin,
                role: userRole
            });
        } else {
            res.status(200).json({
                message: '로그인 성공 (세션만 사용)',
                userId: user[0].user_id,
                nickname: user[0].nickname,  // 닉네임 추가
                isAdmin,
                role: userRole
            });
        }
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

module.exports = router;
