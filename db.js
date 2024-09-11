const mysql = require('mysql2');

// MySQL 데이터베이스 연결 설정 (비밀번호 없이)
const pool = mysql.createPool({
    host: 'localhost',   // MySQL 서버 주소
    user: 'root',        // MySQL 사용자
    // password 필드 생략 또는 빈 문자열
    database: 'Practice_Site_Project' // 데이터베이스 이름
});

// 연결을 프로미스로 사용하도록 설정
const promisePool = pool.promise();

module.exports = promisePool;
