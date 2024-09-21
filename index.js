const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const app = express();
const port = 3000;
require('dotenv').config();
const mainRouter = require('./Backend/main'); // 경로 수정 필요할 수 있음

const loginRouter = require('./Backend/login');
const signupRouter = require('./Backend/signup');
const board = require('./Backend/board');


// 쿠키 파서 설정
app.use(cookieParser());

// 정적 파일 경로 설정
app.use('/css', express.static(path.join(__dirname, '/views/css')));
app.use('/css', express.static(path.join(__dirname, '/public/src/css')));
app.use('/img', express.static(path.join(__dirname, '/public/src/img')));
app.use('/js', express.static(path.join(__dirname, '/public/src/js')));

// Body Parser 설정 (POST 요청에서 데이터 받기 위해)
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// 템플릿 엔진 EJS 설정
app.set('view engine', 'ejs');

// 라우터 적용
app.use('/', mainRouter);    // 메인 페이지 라우터
app.use('/', loginRouter);   // 로그인 라우터
app.use('/', signupRouter);  // 회원가입 라우터
app.use('/', board);   // 게시판 라우터

// 서버 시작
app.listen(port, () => {
  console.log(`서버가 포트 ${port}에서 실행 중입니다.`);
});
