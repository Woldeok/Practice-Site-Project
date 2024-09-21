const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');  
const db = require('../db');  
const path = require('path');

// 회원가입 페이지 제공 (GET 요청)
router.get('/signup', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/src/html', 'signup.html'));
});

// 회원가입 처리 (POST 요청)
router.post('/signup', async (req, res) => {
    const { username, password, email } = req.body;

    try {
        // 중복 사용자 체크
        const [existingUser] = await db.query('SELECT * FROM Users WHERE username = ?', [username]);
        if (existingUser.length > 0) {
            return res.status(400).json({ message: '이미 존재하는 아이디입니다.' });
        }

        // 비밀번호 암호화
        const hashedPassword = await bcrypt.hash(password, 10);

        // 새 사용자 추가
        await db.query('INSERT INTO Users (username, password, email) VALUES (?, ?, ?)', [username, hashedPassword, email]);

        res.json({ message: '회원가입 성공!' });
    } catch (error) {
        console.error('회원가입 오류:', error);
        res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
});

module.exports = router;
