const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');  
const jwt = require('jsonwebtoken');
const db = require('../db');
const winston = require('winston');
const path = require('path');

const secretKey = 'your_secret_key';  // JWT 서명에 사용할 비밀키

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

        const token = jwt.sign({ userId: user[0].user_id, nickname: user[0].nickname }, secretKey, { expiresIn: '1h' });
        loginLogger.info(`로그인 성공 - user_id: ${user_id}, nickname: ${user[0].nickname}`);

        // 토큰을 쿠키에 저장
        res.cookie('token', token, { httpOnly: true });

        // 로그인 성공 후 JSON 응답
        res.status(200).json({ message: '로그인 성공', userId: user[0].user_id });
    } catch (error) {
        loginLogger.error(`로그인 오류: ${error.message}`);
        res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
});

module.exports = router;
