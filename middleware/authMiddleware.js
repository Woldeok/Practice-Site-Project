const jwt = require('jsonwebtoken');

function authenticateToken(req, res, next) {
    const token = req.cookies.token; // 쿠키에서 토큰 가져오기

    // 토큰이 없는 경우 홈으로 리다이렉트
    if (!token) {
        console.log(`${new Date().toISOString()} [info]: 요청에 토큰이 없습니다. 홈으로 리다이렉트됩니다.`);
        return res.redirect('/'); // 홈으로 리다이렉트
    }

    // 토큰 검증
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
        if (err) {
            console.error('토큰 검증 실패:', err);
            // 유효하지 않은 토큰일 경우 홈으로 리다이렉트
            return res.redirect('/');
        }

        // 토큰이 유효한 경우 사용자 정보를 요청 객체에 추가하고 로그 기록
        req.user = user;
        console.log(`${new Date().toISOString()} [info]: 요청한 사용자 ID: ${user.userId}`);
        next(); // 다음 미들웨어로 이동
    });
}

module.exports = authenticateToken;
