const express = require('express');
const cors = require('cors');
const db = require('./db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
require('dotenv').config();

const app = express();

// ==========================================
// 1. CORS CONFIGURATION & PREFLIGHT HANDLING
// ==========================================
const corsOptions = {
origin: ['http://localhost:5173', 'http://localhost:3000', 'https://precious-illumination-production-eb7a.up.railway.app'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.use(express.json());

// ==========================================
// 2. NODEMAILER EMAIL TRANSPORTER CONFIG
// ==========================================
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

async function sendOtpEmail(email, otpCode) {
  const mailOptions = {
    from: '"Gym App Security" <no-reply@gymapp.com>',
    to: email,
    subject: 'Your Login Verification Code',
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
        <h2 style="color: #1f2937;">Gym App Security Code</h2>
        <p style="color: #4b5563;">Your 6-digit verification code is:</p>
        <h1 style="color: #2563eb; letter-spacing: 5px; font-size: 32px;">${otpCode}</h1>
        <p style="color: #6b7280; font-size: 14px;">This code will expire in <strong>5 minutes</strong>.</p>
      </div>
    `
  };
  await transporter.sendMail(mailOptions);
}

// ==========================================
// 3. HEALTH CHECK & TEST ROUTE
// ==========================================
app.get('/', (req, res) => {
  res.send('🚀 Gym Backend API is Running & Ready!');
});

// ==========================================
// 4. GET ALL USERS
// ==========================================
app.get('/api/users', async (req, res) => {
  try {
    const [users] = await db.query('SELECT user_id, full_name, email, phone, gender, address, created_at FROM users');
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 5. GET ALL PRODUCTS (with specs & images)
// ==========================================
app.get('/api/products', async (req, res) => {
  try {
    const [products] = await db.query('SELECT * FROM products ORDER BY product_id DESC');

    for (let product of products) {
      product.images = product.image_url ? [product.image_url] : [];
      product.description = product.short_description || '';
      product.warranty = product.warranty_info || '';

      const [specs] = await db.query('SELECT label, value FROM product_specs WHERE product_id = ?', [product.product_id]);
      product.specs = specs;
    }

    res.json(products);
  } catch (err) {
    res.status(500).json({ 
      error: "Product fetching error.", 
      details: err.message 
    });
  }
});

// ==========================================
// 5.1. POST NEW PRODUCT TO DATABASE
// ==========================================
app.post('/api/products', async (req, res) => {
  const {
    name,
    price,
    category,
    subcategory,
    stock,
    image_url,
    description,
    full_description,
    warranty,
    shipping_info,
    images = [],
    specs = []
  } = req.body;

  if (!name || !price || !category) {
    return res.status(400).json({ message: 'Product Name, Price, and Category are required.' });
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const [result] = await connection.query(
      `INSERT INTO products 
       (name, price, category, subcategory, stock, image_url, description, full_description, warranty, shipping_info) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name, 
        parseFloat(price), 
        category, 
        subcategory || '', 
        parseInt(stock) || 0, 
        image_url || 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=800', 
        description || '', 
        full_description || description || '', 
        warranty || '1 Year Commercial Warranty', 
        shipping_info || 'Ships within 24-48 hours'
      ]
    );

    const productId = result.insertId;

    if (images && images.length > 0) {
      for (let img of images) {
        if (img && img.trim()) {
          await connection.query('INSERT INTO product_images (product_id, image_url) VALUES (?, ?)', [productId, img.trim()]);
        }
      }
    } else if (image_url) {
      await connection.query('INSERT INTO product_images (product_id, image_url) VALUES (?, ?)', [productId, image_url]);
    }

    if (specs && specs.length > 0) {
      for (let spec of specs) {
        if (spec.label && spec.value) {
          await connection.query('INSERT INTO product_specs (product_id, label, value) VALUES (?, ?, ?)', [productId, spec.label.trim(), spec.value.trim()]);
        }
      }
    }

    await connection.commit();
    console.log('✅ New Product Added to Database:', name);
    res.status(201).json({ message: 'Product successfully added!', product_id: productId });

  } catch (err) {
    await connection.rollback();
    console.error('❌ Add Product Error:', err);
    res.status(500).json({ message: 'Failed to insert product into database.', details: err.message });
  } finally {
    connection.release();
  }
});

// ==========================================
// 6. USER REGISTER (UPDATED FULL DETAILS)
// ==========================================
// ==========================================
// 6. USER REGISTER (UPDATED COLUMN NAMES)
// ==========================================
app.post('/api/auth/register', async (req, res) => {
  const { name, email, password, phone, gender, address } = req.body;

  if (!email || !password || !name) {
    return res.status(400).json({ message: 'Full Name, Email, and Password are required.' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Ginamit ang phone_number para sa database match
    const [result] = await db.query(
      'INSERT INTO users (email, full_name, password_hash, phone_number, gender, address) VALUES (?, ?, ?, ?, ?, ?)',
      [
        email, 
        name, 
        hashedPassword, 
        phone || null, 
        gender || 'Male', 
        address || null
      ]
    );

    const userId = result.insertId;

    const token = jwt.sign(
      { user_id: userId, email },
      process.env.JWT_SECRET || 'gym_app_secret_key',
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: { 
        id: userId, 
        name: name, 
        email: email,
        phone: phone || '',
        gender: gender || '',
        address: address || ''
      }
    });
  } catch (err) {
    console.error('Registration Error:', err);
    res.status(400).json({ message: 'Registration failed. Email may already exist.', details: err.message });
  }
});

// ==========================================
// 7. USER LOGIN
// ==========================================
app.post('/api/auth/login', async (req, res) => {
  const { email, password, deviceToken } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and Password are required.' });
  }

  try {
    const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    if (users.length === 0) {
      return res.status(400).json({ message: 'User not found.' });
    }

    const user = users[0];
    const userId = user.user_id || user.id;

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials.' });
    }

    if (deviceToken) {
      const [devices] = await db.query(
        'SELECT * FROM remembered_devices WHERE user_id = ? AND device_token = ? AND expires_at > NOW()',
        [userId, deviceToken]
      );

      if (devices.length > 0) {
        const token = jwt.sign(
          { user_id: userId, email: user.email },
          process.env.JWT_SECRET || 'gym_app_secret_key',
          { expiresIn: '7d' }
        );

        return res.json({
          requiresOtp: false,
          token,
          user: { 
            id: userId, 
            name: user.full_name, 
            email: user.email,
            phone: user.phone_number || '',
            gender: user.gender || '',
            address: user.address || ''
          }
        });
      }
    }

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await db.query('DELETE FROM user_otps WHERE user_id = ?', [userId]);
    await db.query(
      'INSERT INTO user_otps (user_id, otp_code, expires_at) VALUES (?, ?, ?)',
      [userId, otpCode, expiresAt]
    );

    await sendOtpEmail(user.email, otpCode);

    res.json({
      requiresOtp: true,
      userId: userId,
      message: 'Verification code sent to your email.'
    });

  } catch (err) {
    res.status(500).json({ error: 'Login failed on server.', details: err.message });
  }
});

// ==========================================
// 8. VERIFY OTP ROUTE
// ==========================================
app.post('/api/auth/verify-otp', async (req, res) => {
  const { userId, otpCode, rememberDevice } = req.body;

  if (!userId || !otpCode) {
    return res.status(400).json({ message: 'User ID and OTP Code are required.' });
  }

  try {
    const [otps] = await db.query(
      'SELECT * FROM user_otps WHERE user_id = ? AND otp_code = ?',
      [userId, String(otpCode).trim()]
    );

    if (otps.length === 0) {
      return res.status(400).json({ message: 'Invalid OTP code.' });
    }

    const otpRecord = otps[0];

    if (new Date(otpRecord.expires_at) < new Date()) {
      return res.status(400).json({ message: 'OTP Code has expired. Please request a new one.' });
    }

    await db.query('DELETE FROM user_otps WHERE user_id = ?', [userId]);

    const [users] = await db.query('SELECT * FROM users WHERE user_id = ?', [userId]);
    if (users.length === 0) {
      return res.status(400).json({ message: 'User not found.' });
    }
    const user = users[0];

    let newDeviceToken = null;
    if (rememberDevice === true || rememberDevice === "true") {
      newDeviceToken = crypto.randomBytes(32).toString('hex');
      await db.query(
        'INSERT INTO remembered_devices (user_id, device_token, expires_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 30 DAY))',
        [userId, newDeviceToken]
      );
    }

    const token = jwt.sign(
      { user_id: userId, email: user.email },
      process.env.JWT_SECRET || 'gym_app_secret_key',
      { expiresIn: '7d' }
    );

    res.json({
      token,
      deviceToken: newDeviceToken,
      user: { 
        id: userId, 
        name: user.full_name, 
        email: user.email,
        phone: user.phone_number || '',
        gender: user.gender || '',
        address: user.address || ''
      }
    });

  } catch (err) {
    res.status(500).json({ message: 'Failed to verify OTP.', details: err.message });
  }
});

// ==========================================
// 8. VERIFY OTP ROUTE
// ==========================================
app.post('/api/auth/verify-otp', async (req, res) => {
  const { userId, otpCode, rememberDevice } = req.body;

  if (!userId || !otpCode) {
    return res.status(400).json({ message: 'User ID and OTP Code are required.' });
  }

  try {
    const [otps] = await db.query(
      'SELECT * FROM user_otps WHERE user_id = ? AND otp_code = ?',
      [userId, String(otpCode).trim()]
    );

    if (otps.length === 0) {
      return res.status(400).json({ message: 'Invalid OTP code.' });
    }

    const otpRecord = otps[0];

    if (new Date(otpRecord.expires_at) < new Date()) {
      return res.status(400).json({ message: 'OTP Code has expired. Please request a new one.' });
    }

    await db.query('DELETE FROM user_otps WHERE user_id = ?', [userId]);

    const [users] = await db.query('SELECT * FROM users WHERE user_id = ?', [userId]);
    if (users.length === 0) {
      return res.status(400).json({ message: 'User not found.' });
    }
    const user = users[0];

    let newDeviceToken = null;
    if (rememberDevice === true || rememberDevice === "true") {
      newDeviceToken = crypto.randomBytes(32).toString('hex');
      await db.query(
        'INSERT INTO remembered_devices (user_id, device_token, expires_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 30 DAY))',
        [userId, newDeviceToken]
      );
    }

    const token = jwt.sign(
      { user_id: userId, email: user.email },
      process.env.JWT_SECRET || 'gym_app_secret_key',
      { expiresIn: '7d' }
    );

    res.json({
      token,
      deviceToken: newDeviceToken,
      user: { 
        id: userId, 
        name: user.full_name, 
        email: user.email,
        phone: user.phone || '',
        gender: user.gender || '',
        address: user.address || ''
      }
    });

  } catch (err) {
    res.status(500).json({ message: 'Failed to verify OTP.', details: err.message });
  }
});

// ==========================================
// 9. GOOGLE AUTHENTICATION
// ==========================================
app.post('/api/auth/google', async (req, res) => {
  const { token, deviceToken } = req.body;

  if (!token) {
    return res.status(400).json({ message: 'Google Token is required.' });
  }

  try {
    const decodedToken = jwt.decode(token);

    if (!decodedToken || !decodedToken.email) {
      return res.status(400).json({ message: 'Invalid Google Token payload.' });
    }

    const { email, name, picture } = decodedToken;
    const fullName = name || 'Google User';

    const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    let userId;
    let currentUser = null;

    if (users.length > 0) {
      currentUser = users[0];
      userId = currentUser.user_id || currentUser.id;
    } else {
      const dummyPasswordHash = await bcrypt.hash(`GOOGLE_AUTH_${Date.now()}`, 10);
      const [result] = await db.query(
        'INSERT INTO users (email, full_name, password_hash) VALUES (?, ?, ?)',
        [email, fullName, dummyPasswordHash]
      );
      userId = result.insertId;
    }

    if (deviceToken) {
      const [devices] = await db.query(
        'SELECT * FROM remembered_devices WHERE user_id = ? AND device_token = ? AND expires_at > NOW()',
        [userId, deviceToken]
      );

      if (devices.length > 0) {
        const sessionToken = jwt.sign(
          { user_id: userId, email },
          process.env.JWT_SECRET || 'gym_app_secret_key',
          { expiresIn: '7d' }
        );

        return res.json({
          requiresOtp: false,
          token: sessionToken,
          user: { 
            id: userId, 
            name: fullName, 
            email: email, 
            picture: picture || null,
            phone: currentUser?.phone || '',
            gender: currentUser?.gender || '',
            address: currentUser?.address || ''
          }
        });
      }
    }

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await db.query('DELETE FROM user_otps WHERE user_id = ?', [userId]);
    await db.query(
      'INSERT INTO user_otps (user_id, otp_code, expires_at) VALUES (?, ?, ?)',
      [userId, otpCode, expiresAt]
    );

    await sendOtpEmail(email, otpCode);

    res.json({
      requiresOtp: true,
      userId: userId,
      message: 'Verification code sent to your email.'
    });

  } catch (err) {
    res.status(500).json({ message: 'Google Authentication failed on server.', details: err.message });
  }
});

// ==========================================
// 10. SERVER PORT INITIALIZATION
// ==========================================
const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
