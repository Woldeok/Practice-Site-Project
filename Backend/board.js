const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/authMiddleware');  // JWT 인증 미들웨어
const db = require('../db');  // MySQL 연결
const jwt = require('jsonwebtoken');  // JWT 토큰 처리
const secretKey = 'your_secret_key';  // JWT 서명에 사용할 키

// JWT 토큰 검증 및 사용자 정보 조회 함수
function logTokenAndUser(req) {
    const token = req.cookies.token;  // 쿠키에서 토큰을 가져옴

    if (token) {
        // 토큰이 있을 경우 토큰을 검증하고 유저 ID 조회
        jwt.verify(token, secretKey, (err, user) => {
            if (err) {
                console.error('토큰 검증 오류:', err);
            } else {
                console.log(`토큰 존재: 유저 ID - ${user.userId}`);
            }
        });
    } else {
        console.log('토큰 없음');
    }
}

// 게시글 목록 조회 (GET 요청)
router.get('/board', async (req, res) => {
    logTokenAndUser(req);  // 토큰 로그 기록

    try {
        const [results] = await db.query('SELECT * FROM Board ORDER BY created_at DESC');
        res.render('board', { posts: results, user: req.user || null });  // user 객체를 전달
    } catch (err) {
        console.error('게시글 조회 오류:', err);
        return res.status(500).json({ message: '게시글 조회 중 오류 발생' });
    }
});

// 게시글 작성 페이지 제공 (GET 요청) - 로그인한 사용자만 접근 가능
router.get('/board/new', authenticateToken, (req, res) => {
    logTokenAndUser(req);  // 토큰 로그 기록
    res.render('newPost', { user: req.user });
});

// 게시글 상세보기 (GET 요청)
router.get('/board/:id', async (req, res) => {
    logTokenAndUser(req);  // 토큰 로그 기록

    const postId = req.params.id;
    try {
        const [results] = await db.query('SELECT * FROM Board WHERE id = ?', [postId]);
        const [comments] = await db.query('SELECT * FROM Comments WHERE post_id = ?', [postId]); // 댓글 가져오기
        if (results.length === 0) {
            return res.status(404).json({ message: '게시글을 찾을 수 없습니다.' });
        }
        res.render('postDetail', { post: results[0], comments: comments, user: req.user || null });
    } catch (err) {
        console.error('게시글 상세 조회 오류:', err);
        return res.status(500).json({ message: '게시글 조회 중 오류 발생' });
    }
});

// 게시글 작성 처리 (POST 요청) - 로그인한 사용자만 가능
router.post('/board', authenticateToken, async (req, res) => {
    logTokenAndUser(req);  // 토큰 로그 기록

    const { title, content } = req.body;
    const userId = req.user.userId;  // 인증된 사용자 ID

    try {
        await db.query('INSERT INTO Board (title, content, author_id) VALUES (?, ?, ?)', [title, content, userId]);
        res.redirect('/board');  // 게시글 작성 후 게시판 목록으로 리디렉션
    } catch (err) {
        console.error('게시글 작성 오류:', err);
        return res.status(500).json({ message: '게시글 작성 중 오류 발생' });
    }
});

// 게시글 수정 페이지 제공 (GET 요청)
router.get('/board/:id/edit', authenticateToken, async (req, res) => {
    const postId = req.params.id;
    try {
        const [results] = await db.query('SELECT * FROM Board WHERE id = ?', [postId]);
        if (results.length === 0) {
            return res.status(404).json({ message: '게시글을 찾을 수 없습니다.' });
        }
        res.render('editPost', { post: results[0], user: req.user });
    } catch (err) {
        console.error('게시글 수정 페이지 제공 오류:', err);
        return res.status(500).json({ message: '게시글 수정 페이지 조회 중 오류 발생' });
    }
});

// 게시글 수정 처리 (POST 요청)
router.post('/board/:id/edit', authenticateToken, async (req, res) => {
    const postId = req.params.id;
    const { title, content } = req.body;
    try {
        await db.query('UPDATE Board SET title = ?, content = ? WHERE id = ?', [title, content, postId]);
        res.redirect(`/board/${postId}`);  // 수정 후 해당 게시글 페이지로 리디렉션
    } catch (err) {
        console.error('게시글 수정 오류:', err);
        return res.status(500).json({ message: '게시글 수정 중 오류 발생' });
    }
});

// 게시글 삭제 처리 (POST 요청)
router.post('/board/:id/delete', authenticateToken, async (req, res) => {
    const postId = req.params.id;
    try {
        await db.query('DELETE FROM Board WHERE id = ?', [postId]);
        res.redirect('/board');  // 삭제 후 게시판 목록으로 리디렉션
    } catch (err) {
        console.error('게시글 삭제 오류:', err);
        return res.status(500).json({ message: '게시글 삭제 중 오류 발생' });
    }
});

// 댓글 작성 처리 (POST 요청)
router.post('/board/:id/comment', authenticateToken, async (req, res) => {
    const postId = req.params.id;
    const { comment } = req.body;
    const userId = req.user.userId;

    try {
        await db.query('INSERT INTO Comments (post_id, comment, user_id) VALUES (?, ?, ?)', [postId, comment, userId]);
        res.redirect(`/board/${postId}`);  // 댓글 작성 후 해당 게시글로 리디렉션
    } catch (err) {
        console.error('댓글 작성 오류:', err);
        return res.status(500).json({ message: '댓글 작성 중 오류 발생' });
    }
});

module.exports = router;
