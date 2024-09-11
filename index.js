const express = require('express');
const path = require('path');
const app = express();
const port = 3000;

// 라우터 파일 가져오기
const mainRouter = require('./Backend/main');
const loginRouter = require('./Backend/login');

// 정적 파일 경로 설정
app.use('/css', express.static(path.join(__dirname, '/public/src/css')));
app.use('/img', express.static(path.join(__dirname, '/public/src/img')));
app.use('/js', express.static(path.join(__dirname, '/public/src/js')));

// 라우터 적용
app.use('/', mainRouter);   // 메인 페이지 라우터
app.use('/', loginRouter);  // 로그인 페이지 라우터

// 서버 시작
app.listen(port, () => {
  console.log(`서버가 포트 ${port}에서 실행 중입니다.`);
});
