const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');  
const db = require('../db');
const winston = require('winston');
const path = require('path');

// 회원가입 전용 로거 생성
const signupLogger = winston.createLogger({
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(info => `${info.timestamp} [${info.level}]: ${info.message}`)
  ),
  transports: [
    new winston.transports.File({
      filename: path.join(__dirname, '../logs/signup.log'),  // 회원가입 로그 파일
      level: 'info'
    }),
    new winston.transports.Console()
  ]
});

// 회원가입 페이지 제공 (GET 요청)
router.get('/signup', (req, res) => {
    signupLogger.info('회원가입 페이지 요청');
    res.sendFile(path.join(__dirname, '../public/src/html', 'signup.html'));  // 회원가입 페이지 반환
});

// 회원가입 처리 (POST 요청)
router.post('/signup', async (req, res) => {
    const { user_id, nickname, password, email } = req.body;
    signupLogger.info(`회원가입 시도 - user_id: ${user_id}, nickname: ${nickname}`);

    try {
        // 중복 사용자 확인
        const [existingUser] = await db.query('SELECT * FROM Users WHERE user_id = ?', [user_id]);
        if (existingUser.length > 0) {
            signupLogger.warn(`회원가입 실패 - 중복된 아이디: ${user_id}`);
            return res.status(400).json({ message: '이미 존재하는 아이디입니다.' });
        }

        // 닉네임 중복 확인
        const [existingNickname] = await db.query('SELECT * FROM Users WHERE nickname = ?', [nickname]);
        if (existingNickname.length > 0) {
            signupLogger.warn(`회원가입 실패 - 중복된 닉네임: ${nickname}`);
            return res.status(400).json({ message: '이미 존재하는 닉네임입니다.' });
        }

        // 비밀번호 암호화
        const hashedPassword = await bcrypt.hash(password, 10);

        // 새 사용자 추가
        await db.query('INSERT INTO Users (user_id, nickname, password, email) VALUES (?, ?, ?, ?)', 
                       [user_id, nickname, hashedPassword, email]);

        signupLogger.info(`회원가입 성공 - user_id: ${user_id}, nickname: ${nickname}`);
        res.status(200).json({ message: '회원가입 성공' });
    } catch (error) {
        signupLogger.error(`회원가입 오류: ${error.message}`);
        res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
});

module.exports = router;
