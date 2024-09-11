const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');  // 비밀번호 암호화
const path = require('path');
const winston = require('winston');
const geoip = require('geoip-lite');
const db = require('../db');  // 예시: db.js 파일이 상위 디렉토리에 있는 경우
const jwt = require('jsonwebtoken');  // JWT 토큰 생성
const secretKey = 'your_secret_key';  // JWT 토큰 서명에 사용할 키

// 국가 코드를 한국어로 변환하는 맵
const countryMap = {
  US: '미국',
  KR: '대한민국',
  JP: '일본',
  CN: '중국',
  DE: '독일',
  FR: '프랑스',
  GB: '영국',
  RU: '러시아',
  Unknown: '알 수 없음'
};

// 로그인 라우터 전용 로거 생성
const loginLogger = winston.createLogger({
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(info => `${info.timestamp} [${info.level}]: ${info.message}`)
  ),
  transports: [
    new winston.transports.File({
      filename: path.join(__dirname, '../logs/login.log'), // 로그인 라우터 로그 파일
      level: 'info'
    }),
    new winston.transports.Console() // 콘솔에도 로그 출력
  ]
});

// IP 주소 및 국가 정보 가져오기 함수
function getClientInfo(req) {
  let clientIp = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

  // IPv6 주소 처리
  if (clientIp.includes('::ffff:')) {
    clientIp = clientIp.split('::ffff:')[1];
  }

  // 로컬 IP 처리
  if (clientIp === '127.0.0.1' || clientIp === '::1') {
    clientIp = 'Localhost';
  }

  // 국가 정보 가져오기
  const geo = geoip.lookup(clientIp);
  const countryCode = geo ? geo.country : 'Unknown';
  const country = countryMap[countryCode] || '알 수 없음';

  return { clientIp, country };
}

// 로그인 처리 라우터 (POST 요청)
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const { clientIp, country } = getClientInfo(req); // IP와 국가 정보 가져오기

  try {
    // 데이터베이스에서 사용자 정보 조회
    const [user] = await db.query('SELECT * FROM Users WHERE username = ?', [username]);

    if (user.length === 0) {
      loginLogger.info(`IP: ${clientIp} - Country: ${country} - 로그인 실패: 사용자 없음 - Username: ${username}`);
      return res.status(401).json({ message: '사용자를 찾을 수 없습니다.' });
    }

    // 비밀번호 비교
    const validPassword = await bcrypt.compare(password, user[0].password);
    if (!validPassword) {
      loginLogger.info(`IP: ${clientIp} - Country: ${country} - 로그인 실패: 잘못된 비밀번호 - Username: ${username}`);
      return res.status(401).json({ message: '잘못된 비밀번호입니다.' });
    }

    // 토큰 생성
    const token = jwt.sign({ userId: user[0].user_id, username: user[0].username }, secretKey, { expiresIn: '1h' });

    // 로그인 성공 시 로그인 기록 추가
    const userId = user[0].user_id;
    await db.query(
      'INSERT INTO LoginHistory (user_id, login_ip, login_country, token) VALUES (?, ?, ?, ?)', 
      [userId, clientIp, country, token]
    );

    // 로그인 성공 로그 기록
    loginLogger.info(`IP: ${clientIp} - Country: ${country} - 로그인 성공 - Username: ${username} - Token: ${token}`);

    // 로그인 성공 응답
    res.json({ message: '로그인 성공', userId: userId, token: token });

  } catch (error) {
    loginLogger.error(`로그인 오류: ${error.message}`);
    res.status(500).json({ message: '서버 오류 발생' });
  }
});

// 로그인 페이지 제공 (GET 요청)
router.get('/login', (req, res) => {
  const { clientIp, country } = getClientInfo(req); // IP와 국가 정보 가져오기
  loginLogger.info(`IP: ${clientIp} - Country: ${country} - Method: ${req.method} - URL: ${req.url}`); // 로그 기록
  res.sendFile(path.join(__dirname, '../public/src/html', 'Login.html'));
});

module.exports = router;
