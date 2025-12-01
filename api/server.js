// api/server.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { pool } from './db.js';
import { authRequired } from './auth-mw.js';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' })); // allow base64 images etc.

//  helpers 

function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, username: user.username },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

// simple health check
app.get('/', (_req, res) => {
  res.json({ ok: true, service: 'talkpoint-api' });
});


//                  AUTH ROUTES

//   sp_signup(IN p_email, IN p_username, IN p_password_hash,
//             OUT p_code, OUT p_expires)
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { email, username, password } = req.body;

    if (!email || !password || !username) {
      return res
        .status(400)
        .json({ error: 'Email, username and password are required.' });
    }

    if (!email.endsWith('@louisville.edu')) {
      return res
        .status(400)
        .json({ error: 'Use your @louisville.edu email.' });
    }

    const hash = await bcrypt.hash(password, 10);

    // call procedure with 3 IN + 2 OUT params
    await pool.query(
      'CALL sp_signup(?,?,?,@v_code,@v_expires)',
      [email, username, hash]
    );

    // read OUT params
    const [[out]] = await pool.query(
      'SELECT @v_code AS code, @v_expires AS expiresAt'
    );

    console.log('------------------------------------------');
    console.log('[signup] new user:', email);
    console.log('[signup] verification code:', out.code);
    console.log('[signup] expires at:', out.expiresAt);
    console.log('------------------------------------------');

    res.json({
      ok: true,
      message:
        'Account created. Use the verification code printed in the server console.'
    });
  } catch (err) {
    console.error('signup error', err);

    if (err.code === 'ER_DUP_ENTRY') {
      return res
        .status(400)
        .json({ error: 'That email or username is already in use.' });
    }

    res.status(500).json({ error: 'Failed to sign up.' });
  }
});

// ---------- VERIFY EMAIL + AUTO LOGIN ----------
// Uses procedure:
//   sp_verify_code(IN p_email, IN p_code, OUT p_user_id)
app.post('/api/auth/verify', async (req, res) => {
  try {
    let { email, code } = req.body;
    email = (email || '').trim();
    code = (code || '').trim();

    if (!email || !code) {
      return res.status(400).json({ error: 'Email and code are required.' });
    }

    // Call procedure with OUT param for the user id
    await pool.query('CALL sp_verify_code(?,?,@v_user_id)', [email, code]);

    const [[out]] = await pool.query('SELECT @v_user_id AS user_id');
    const userId = out && out.user_id;

    console.log('[verify] email:', email, 'code:', code, 'user_id:', userId);

    if (!userId) {
      return res
        .status(400)
        .json({ error: 'Invalid or expired verification code.' });
    }

    const [users] = await pool.query(
      'SELECT id, email, username FROM users WHERE id = ?',
      [userId]
    );
    const user = users[0];

    if (!user) {
      return res
        .status(400)
        .json({ error: 'User not found after verification.' });
    }

    const token = signToken(user);
    res.json({
      ok: true,
      token,
      user: { id: user.id, email: user.email, username: user.username }
    });
  } catch (err) {
    console.error('verify error', err);
    res.status(500).json({ error: 'Failed to verify.' });
  }
});

// ---------- SIGN IN ----------
app.post('/api/auth/signin', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ error: 'Email and password are required.' });
    }

    const [rows] = await pool.query(
      'SELECT id, email, username, password_hash, verified_at FROM users WHERE email = ?',
      [email]
    );

    const user = rows[0];
    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials.' });
    }

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      return res.status(400).json({ error: 'Invalid credentials.' });
    }

    // PATCH: if verified_at is NULL
    if (!user.verified_at) {
      await pool.query(
        'UPDATE users SET verified_at = NOW() WHERE id = ?',
        [user.id]
      );
    }

    const token = signToken(user);
    res.json({
      ok: true,
      token,
      user: { id: user.id, email: user.email, username: user.username }
    });
  } catch (err) {
    console.error('signin error', err);
    res.status(500).json({ error: 'Failed to sign in.' });
  }
});

// -- Actual USER ----------
app.get('/api/me', authRequired, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, email, username FROM users WHERE id = ?',
      [req.user.id]
    );
    res.json({ ok: true, user: rows[0] || null });
  } catch (err) {
    console.error('me error', err);
    res.status(500).json({ error: 'Failed to load user.' });
  }
});


//                       POSTS

// create post (sp_create_post(author_id, image_url, caption))
app.post('/api/posts', authRequired, async (req, res) => {
  try {
    const { imageData, caption } = req.body;

    if (!imageData || !caption) {
      return res
        .status(400)
        .json({ error: 'Image and caption are required.' });
    }

    const [resultSets] = await pool.query('CALL sp_create_post(?,?,?)', [
      req.user.id,
      imageData,
      caption
    ]);

    const post = (resultSets[0] && resultSets[0][0]) || null;
    res.json({ ok: true, post });
  } catch (err) {
    console.error('create post error', err);
    res.status(500).json({ error: 'Failed to create post.' });
  }
});

// List posts with scope + paging
// Uses sp_list_posts(user_id, scope, q, size, offset)
app.get('/api/posts', authRequired, async (req, res) => {
  try {
    const scope = req.query.scope || 'all'; // all | mine | following
    const q = req.query.q || '';
    const page = parseInt(req.query.page || '1', 10);
    const pageSize = parseInt(req.query.pageSize || '10', 10);
    const offset = (page - 1) * pageSize;

    const [resultSets] = await pool.query('CALL sp_list_posts(?,?,?,?,?)', [
      req.user.id,
      scope,
      q,
      pageSize,
      offset
    ]);

    const posts = resultSets[0] || [];
    res.json({ ok: true, posts, page, pageSize });
  } catch (err) {
    console.error('list posts error', err);
    res.status(500).json({ error: 'Failed to load posts.' });
  }
});


//                     COMMENTS


// Get comments for a post
app.get('/api/posts/:id/comments', authRequired, async (req, res) => {
  try {
    const postId = parseInt(req.params.id, 10);

    const [rows] = await pool.query(
      `
      SELECT c.id,
             c.post_id,
             c.author_id,
             u.username,
             c.body,
             c.created_at
      FROM comments c
      JOIN users u ON u.id = c.author_id
      WHERE c.post_id = ?
      ORDER BY c.created_at ASC
      `,
      [postId]
    );

    res.json({ ok: true, comments: rows });
  } catch (err) {
    console.error('get comments error', err);
    res.status(500).json({ error: 'Failed to load comments.' });
  }
});

// Add comment (uses comments.author_id, NOT user_id)
app.post('/api/posts/:id/comments', authRequired, async (req, res) => {
  try {
    const postId = parseInt(req.params.id, 10);
    const { body } = req.body;

    if (!body || !body.trim()) {
      return res.status(400).json({ error: 'Comment text is required.' });
    }

    await pool.query(
      `
      INSERT INTO comments (post_id, author_id, body, created_at)
      VALUES (?, ?, ?, NOW())
      `,
      [postId, req.user.id, body.trim()]
    );

    // return the freshly created comment (with username) so the UI can append immediately
    const [rows] = await pool.query(
      `
      SELECT c.id,
             c.post_id,
             c.author_id,
             u.username,
             c.body,
             c.created_at
      FROM comments c
      JOIN users u ON u.id = c.author_id
      WHERE c.post_id = ?
      ORDER BY c.created_at DESC
      LIMIT 1
      `,
      [postId]
    );

    res.json({ ok: true, comment: rows[0] || null });
  } catch (err) {
    console.error('add comment error', err);
    res.status(500).json({ error: 'Failed to add comment.' });
  }
});


//                       LIKES


// Like a post
app.post('/api/posts/:id/like', authRequired, async (req, res) => {
  try {
    const postId = parseInt(req.params.id, 10);

    
    await pool.query('CALL sp_like(?,?)', [req.user.id, postId]);

    res.json({ ok: true });
  } catch (err) {
    console.error('like error', err);
    res.status(500).json({ error: 'Failed to like post.' });
  }
});

// Unlike a post
app.post('/api/posts/:id/unlike', authRequired, async (req, res) => {
  try {
    const postId = parseInt(req.params.id, 10);

    await pool.query('CALL sp_unlike(?,?)', [req.user.id, postId]);

    res.json({ ok: true });
  } catch (err) {
    console.error('unlike error', err);
    res.status(500).json({ error: 'Failed to unlike post.' });
  }
});


//                  START SERVER


const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});