const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');  // 비밀번호 암호화
const jwt = require('jsonwebtoken');  // JWT 토큰 생성
const db = require('../db');  // MySQL 데이터베이스 연결
const winston = require('winston');
const path = require('path');

const secretKey = 'your_secret_key';  // JWT 서명에 사용할 비밀키

// 로그인 라우터 전용 로거 생성 (로그 기록을 남기기 위한 winston 설정)
const loginLogger = winston.createLogger({
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(info => `${info.timestamp} [${info.level}]: ${info.message}`)
  ),
  transports: [
    new winston.transports.File({
      filename: path.join(__dirname, '../logs/login.log'),  // 로그인 로깅을 위한 파일
      level: 'info'
    }),
    new winston.transports.Console()  // 콘솔에도 로그 출력
  ]
});

// 로그인 처리 라우터 (POST 요청)
router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        // 사용자 정보 조회
        const [user] = await db.query('SELECT * FROM Users WHERE username = ?', [username]);

        // 사용자가 없는 경우 처리
        if (!user || user.length === 0) {
            loginLogger.info(`로그인 실패: 사용자 없음 - Username: ${username}`);
            return res.status(401).json({ message: '사용자를 찾을 수 없습니다.' });
        }

        // 비밀번호 확인
        const validPassword = await bcrypt.compare(password, user[0].password);
        if (!validPassword) {
            loginLogger.info(`로그인 실패: 잘못된 비밀번호 - Username: ${username}`);
            return res.status(401).json({ message: '잘못된 비밀번호입니다.' });
        }

        // JWT 토큰 생성
        const token = jwt.sign({ userId: user[0].user_id, username: user[0].username }, secretKey, { expiresIn: '1h' });

        // 토큰을 쿠키에 저장 (쿠키는 httpOnly 속성으로 클라이언트에서 접근 불가)
        res.cookie('token', token, { httpOnly: true });

        // 로그인 성공 기록 및 응답
        loginLogger.info(`로그인 성공 - Username: ${username}`);
        res.json({ message: '로그인 성공', userId: user[0].user_id });
    } catch (error) {
        // 서버 오류 처리
        loginLogger.error(`로그인 오류: ${error.message}`);
        res.status(500).json({ message: '서버 오류 발생' });
    }
});

// 로그인 페이지 제공 (GET 요청)
router.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/src/html', 'Login.html'));
});

module.exports = router;
