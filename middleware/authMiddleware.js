const jwt = require('jsonwebtoken');

function authenticateToken(req, res, next) {
    const token = req.cookies.token;  // 쿠키에서 토큰을 가져옵니다.
    if (!token) return res.status(401).json({ message: '토큰이 필요합니다.' }); // 인증 실패

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
        if (err) {
            console.error('토큰 검증 실패:', err);
            return res.status(403).json({ message: '유효하지 않은 토큰입니다.' }); // 토큰 유효하지 않음
        }
        req.user = user; // 사용자 정보를 요청 객체에 추가
        next();
    });
}

module.exports = authenticateToken; // 모듈 내보내기
