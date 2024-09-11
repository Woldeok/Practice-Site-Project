const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();
const port = 3000;
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

// 로그 디렉토리 기본 경로 설정
const logBaseDir = path.join(__dirname, 'logs');

// logs 폴더가 없으면 생성하는 함수
function createLogsFolder() {
  if (!fs.existsSync(logBaseDir)) {
    fs.mkdirSync(logBaseDir, { recursive: true });
    console.log('logs 폴더 생성됨');
  }
}

// 1시간 단위 폴더 생성 함수
function createLogFolder() {
  const now = new Date();
  const folderName = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}-${String(now.getSeconds()).padStart(2, '0')}`;
  const logDir = path.join(logBaseDir, folderName);

  // 1시간 단위 폴더가 없으면 생성
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
    console.log(`${folderName} 폴더 생성됨`);
  }

  return logDir;
}

// 현재 시간 폴더와 파일을 초기화하는 함수
function createLogFile() {
  const logDir = createLogFolder();
  const now = new Date();
  const logFileName = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}-${String(now.getSeconds()).padStart(2, '0')}.log`;
  const logFilePath = path.join(logDir, logFileName);
  return logFilePath;
}

// 초기 "logs" 폴더 생성
createLogsFolder();

// 현재 폴더와 로그 파일 설정
let currentLogFilePath = createLogFile();

// 1시간마다 새로운 폴더와 로그 파일 생성
setInterval(() => {
  currentLogFilePath = createLogFile();
}, 60 * 60 * 1000); // 1시간 간격으로 실행

// winston logger 설정
const logger = winston.createLogger({
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(info => `${info.timestamp} [${info.level}]: ${info.message}`)
  ),
  transports: [
    new winston.transports.File({
      filename: currentLogFilePath,
      level: 'info'
    }),
    new winston.transports.Console() // 콘솔에도 로그 출력
  ]
});

// IP 주소 및 국가 가져오기 미들웨어 추가
app.use((req, res, next) => {
  // X-Forwarded-For 헤더로 프록시 뒤의 실제 IP를 확인 (클라이언트의 실제 IP를 가져오기 위함)
  let clientIp = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

  // IPv6 형식으로 표시된 로컬 IP를 IPv4로 변환
  if (clientIp.includes('::ffff:')) {
    clientIp = clientIp.split('::ffff:')[1];
  }

  // 로컬 환경일 경우 '127.0.0.1'이나 '::1'로 표시됨
  if (clientIp === '127.0.0.1' || clientIp === '::1') {
    clientIp = 'Localhost';
  }

  // geoip-lite를 사용하여 IP 주소 기반 국가 정보 가져오기
  const geo = geoip.lookup(clientIp);

  // 국가 정보를 확인하고, 맵에서 한국어 국가명을 가져옴. geo가 null이면 '알 수 없음'으로 처리
  const countryCode = geo ? geo.country : 'Unknown';
  const country = countryMap[countryCode] || '알 수 없음';

  // 로그에 IP 주소, 한국어 국가명, 요청 경로 및 메서드 기록
  logger.info(`IP: ${clientIp} - Country: ${country} - Method: ${req.method} - URL: ${req.url}`);
  next();
});

// 정적 파일 경로 설정
app.use('/css', express.static(path.join(__dirname, '/public/src/css')));
app.use('/img', express.static(path.join(__dirname, '/public/src/img')));
app.use('/js', express.static(path.join(__dirname, '/public/src/js')));

// 기본 경로에서 index.html 파일을 제공
app.get('/', (req, res) => {
  logger.info('Serving index.html');
  res.sendFile(path.join(__dirname, 'public/src/html', 'index.html'));
});
app.get('/login', (req, res) => {
  logger.info('Serving index.html');
  res.sendFile(path.join(__dirname, 'public/src/html', 'login.html'));
});
// 서버 시작
app.listen(port, () => {
  logger.info(`서버가 포트 ${port}에서 실행 중입니다.`);
});
