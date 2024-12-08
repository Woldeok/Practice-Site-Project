const express = require('express');
const router = express.Router();
const path = require('path');
const winston = require('winston');
const geoip = require('geoip-lite');

// 국가 코드 매핑
const countryMap = {
  US: '미국',
  KR: '대한민국',
  // 추가 국가 코드 매핑
};

// 메인 라우터 로거 생성
const mainLogger = winston.createLogger({
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(info => `${info.timestamp} [${info.level}]: ${info.message}`)
  ),
  transports: [
    new winston.transports.File({
      filename: path.join(__dirname, '../logs/main.log'), 
      level: 'info'
    }),
    new winston.transports.Console() 
  ]
});

// IP와 국가 정보 가져오기
function getClientInfo(req) {
  let clientIp = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  if (clientIp.includes('::ffff:')) {
    clientIp = clientIp.split('::ffff:')[1];
  }
  const geo = geoip.lookup(clientIp);
  const countryCode = geo ? geo.country : 'Unknown';
  const country = countryMap[countryCode] || '알 수 없음';
  return { clientIp, country };
}

// 메인 페이지 라우팅
router.get('/', (req, res) => {
  const { clientIp, country } = getClientInfo(req);
  mainLogger.info(`IP: ${clientIp} - Country: ${country} - Method: ${req.method} - URL: ${req.url}`);
  res.sendFile(path.join(__dirname, '../public/src/html', 'index.html'));
});

module.exports = router;
