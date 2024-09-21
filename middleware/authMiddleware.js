const jwt = require('jsonwebtoken');
const secretKey = 'your_secret_key';  // JWT 서명에 사용할 키

// JWT 인증 미들웨어
function authenticateToken(req, res, next) {
    const token = req.cookies.token;  // 쿠키에서 토큰을 가져옴

    if (!token) {
        return res.redirect('/login');  // 토큰이 없으면 로그인 페이지로 리디렉션
    }

    // JWT 토큰 검증
    jwt.verify(token, secretKey, (err, user) => {
        if (err) {
            return res.redirect('/login');  // 유효하지 않은 토큰일 경우
        }
        req.user = user;  // 인증된 사용자 정보를 요청 객체에 저장
        next();  // 다음 미들웨어로 이동
    });
}

module.exports = authenticateToken;
