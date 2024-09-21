const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/authMiddleware');  // JWT 인증 미들웨어
const db = require('../db');  // MySQL 연결

// 사용자 IP 및 ID 로깅 함수
function logUserActivity(req, action) {
    const userId = req.user ? req.user.userId : '비회원';
    const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    console.log(`${new Date().toISOString()} [info]: ${action} - 사용자: ${userId}, IP: ${ip}`);
}

// 게시글 목록 조회 (GET 요청)
router.get('/board', async (req, res) => {
    logUserActivity(req, 'GET /board');
    try {
        const [results] = await db.query('SELECT * FROM Board ORDER BY created_at DESC');
        res.render('board', { posts: results, user: req.user || null });
    } catch (err) {
        console.error('게시글 조회 오류:', err);
        return res.status(500).json({ message: '게시글 조회 중 오류 발생' });
    }
});

// 게시글 작성 페이지 (GET 요청)
router.get('/board/new', authenticateToken, (req, res) => {
    logUserActivity(req, 'GET /board/new');
    res.render('newPost', { user: req.user });
});

// 게시글 상세보기 (GET 요청)
router.get('/board/:id', async (req, res) => {
    const postId = req.params.id;
    logUserActivity(req, `GET /board/${postId}`);
    try {
        const [results] = await db.query('SELECT * FROM Board WHERE id = ?', [postId]);
        const [comments] = await db.query('SELECT * FROM Comments WHERE post_id = ?', [postId]);
        if (results.length === 0) {
            return res.status(404).json({ message: '게시글을 찾을 수 없습니다.' });
        }
        res.render('postDetail', { post: results[0], comments, user: req.user || null });
    } catch (err) {
        console.error('게시글 상세 조회 오류:', err);
        return res.status(500).json({ message: '게시글 조회 중 오류 발생' });
    }
});

// 게시글 작성 처리 (POST 요청)
router.post('/board', authenticateToken, async (req, res) => {
    const { title, content } = req.body;
    const userId = req.user.userId;
    const nickname = req.user.nickname; // 사용자 닉네임

    logUserActivity(req, `POST /board - 제목: ${title}, 사용자: ${userId}`);

    try {
        await db.query('INSERT INTO Board (title, content, author_id, author) VALUES (?, ?, ?, ?)', 
                       [title, content, userId, nickname]);
        res.redirect('/board');
    } catch (err) {
        console.error('게시글 작성 오류:', err);
        return res.status(500).json({ message: '게시글 작성 중 오류 발생' });
    }
});

// 게시글 수정 페이지 제공 (GET 요청)
router.get('/board/:id/edit', authenticateToken, async (req, res) => {
    const postId = req.params.id;
    logUserActivity(req, `GET /board/${postId}/edit`);
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
    const userId = req.user.userId;

    logUserActivity(req, `POST /board/${postId}/edit - 사용자: ${userId}`);

    try {
        await db.query('UPDATE Board SET title = ?, content = ? WHERE id = ?', [title, content, postId]);
        res.redirect(`/board/${postId}`);
    } catch (err) {
        console.error('게시글 수정 오류:', err);
        return res.status(500).json({ message: '게시글 수정 중 오류 발생' });
    }
});

// 게시글 삭제 처리 (POST 요청)
router.post('/board/:id/delete', authenticateToken, async (req, res) => {
    const postId = req.params.id;
    const userId = req.user.userId;

    logUserActivity(req, `POST /board/${postId}/delete - 사용자: ${userId}`);

    try {
        await db.query('DELETE FROM Board WHERE id = ?', [postId]);
        res.redirect('/board');
    } catch (err) {
        console.error('게시글 삭제 오류:', err);
        return res.status(500).json({ message: '게시글 삭제 중 오류 발생' });
    }
});

// 댓글 작성 처리 (POST 요청)
router.post('/board/:id/comment', authenticateToken, async (req, res) => {
    const postId = req.params.id;
    const userId = req.user.userId;  // 인증된 사용자 ID
    const commentContent = req.body.comment;  // 클라이언트에서 전송된 댓글 내용

    logUserActivity(req, `POST /board/${postId}/comment - 사용자: ${userId}`);

    try {
        await db.query('INSERT INTO Comments (post_id, user_id, content) VALUES (?, ?, ?)', 
                       [postId, userId, commentContent]);
        res.redirect(`/board/${postId}`);
    } catch (err) {
        console.error('댓글 작성 오류:', err);
        return res.status(500).json({ message: '댓글 작성 중 오류 발생' });
    }
});

// 댓글 수정 처리 (POST 요청)
router.post('/board/:postId/comment/:commentId/edit', authenticateToken, async (req, res) => {
    const { postId, commentId } = req.params;
    const { content } = req.body;
    const userId = req.user.userId;

    logUserActivity(req, `POST /board/${postId}/comment/${commentId}/edit - 사용자: ${userId}`);

    try {
        await db.query('UPDATE Comments SET content = ? WHERE id = ?', [content, commentId]);
        res.redirect(`/board/${postId}`);
    } catch (err) {
        console.error('댓글 수정 오류:', err);
        return res.status(500).json({ message: '댓글 수정 중 오류 발생' });
    }
});

// 댓글 삭제 처리 (POST 요청)
router.post('/board/:postId/comment/:commentId/delete', authenticateToken, async (req, res) => {
    const { postId, commentId } = req.params;
    const userId = req.user.userId;

    logUserActivity(req, `POST /board/${postId}/comment/${commentId}/delete - 사용자: ${userId}`);

    try {
        await db.query('DELETE FROM Comments WHERE id = ?', [commentId]);
        res.redirect(`/board/${postId}`);
    } catch (err) {
        console.error('댓글 삭제 오류:', err);
        return res.status(500).json({ message: '댓글 삭제 중 오류 발생' });
    }
});

module.exports = router;
