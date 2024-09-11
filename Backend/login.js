const express = require('express');
const router = express.Router();
const path = require('path');
const winston = require('winston');
const geoip = require('geoip-lite');

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

// 로그인 페이지 라우팅
router.get('/login', (req, res) => {
  const { clientIp, country } = getClientInfo(req); // IP와 국가 정보 가져오기
  loginLogger.info(`IP: ${clientIp} - Country: ${country} - Method: ${req.method} - URL: ${req.url}`); // 로그 기록
  res.sendFile(path.join(__dirname, '../public/src/html', 'login.html'));
});

module.exports = router;
