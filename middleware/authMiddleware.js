const jwt = require('jsonwebtoken');
const secretKey = 'your_secret_key';  // JWT 서명에 사용할 비밀키

function authenticateToken(req, res, next) {
    const token = req.cookies.token;  // 쿠키에서 토큰을 가져옴

    if (!token) {
        req.user = null;  // 로그인하지 않은 경우
        return next();  // 로그인하지 않아도 진행할 수 있게 next 호출
    }

    jwt.verify(token, secretKey, (err, user) => {
        if (err) {
            req.user = null;  // 유효하지 않은 토큰인 경우도 null로 처리
        } else {
            req.user = user;  // 토큰이 유효하면 사용자 정보 저장
        }
        next();
    });
}

module.exports = authenticateToken;
