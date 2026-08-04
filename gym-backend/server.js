const express = require('express');
const cors = require('cors');
const db = require('./db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
require('dotenv').config();

const app = express();

// ==========================================
// 0. STARTUP ENV VAR CHECK (helps catch missing Railway vars immediately)
// ==========================================
console.log('==================================================');
console.log('🔧 STARTUP CHECK - Environment Variables');
console.log('==================================================');
console.log('PORT:', process.env.PORT || '(not set, defaulting to 5001)');
console.log('RESEND_API_KEY:', process.env.RESEND_API_KEY ? `SET (length: ${process.env.RESEND_API_KEY.length})` : '❌ NOT SET');
console.log('EMAIL_FROM:', process.env.EMAIL_FROM || '(not set, defaulting to onboarding@resend.dev)');
console.log('JWT_SECRET:', process.env.JWT_SECRET ? 'SET' : '⚠️ NOT SET (using fallback)');
console.log('==================================================');

// ==========================================
// 1. CORS CONFIGURATION & PREFLIGHT HANDLING
// ==========================================
const corsOptions = {
origin: ['http://localhost:5173', 'http://localhost:3000', 'https://precious-illumination-production-eb7a.up.railway.app', 'https://gym-admin-production-6321.up.railway.app'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));

// Log every incoming request (method + path) - helpful to confirm requests are even reaching the server
app.use((req, res, next) => {
  console.log(`📥 [${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ==========================================
// 2. RESEND EMAIL (HTTP API - avoids Railway's SMTP/IPv6 ENETUNREACH issue)
// ==========================================
// Gumagamit ng Resend HTTP API imbes na SMTP (nodemailer) dahil naka-block
// ang raw SMTP socket connections (port 465/587) sa Railway network.
// Kailangan i-set ang RESEND_API_KEY env var sa Railway.
// Kung wala pang verified custom domain sa Resend, gamitin muna ang
// "onboarding@resend.dev" bilang sender (default fallback sa baba) -
// pero limitado lang ito, makakapag-send lang papunta sa email na
// ginamit mo sa pag-signup sa Resend hangga't hindi ka pa nag-verify ng domain.

async function sendOtpEmail(email, otpCode) {
  console.log(`📧 [sendOtpEmail] Attempting to send OTP to: ${email}`);

  const fromAddress = process.env.EMAIL_FROM || 'Gym App Security <onboarding@resend.dev>';

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: fromAddress,
        to: [email],
        subject: 'Your Login Verification Code',
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
            <h2 style="color: #1f2937;">Gym App Security Code</h2>
            <p style="color: #4b5563;">Your 6-digit verification code is:</p>
            <h1 style="color: #2563eb; letter-spacing: 5px; font-size: 32px;">${otpCode}</h1>
            <p style="color: #6b7280; font-size: 14px;">This code will expire in <strong>5 minutes</strong>.</p>
          </div>
        `
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ [sendOtpEmail] Resend API returned an error.');
      console.error('Status:', response.status);
      console.error('Response body:', JSON.stringify(data));
      throw new Error(data.message || `Resend API failed with status ${response.status}`);
    }

    console.log(`✅ [sendOtpEmail] Email sent successfully. Resend ID: ${data.id}`);
    return data;
  } catch (err) {
    console.error('❌ [sendOtpEmail] FAILED to send email.');
    console.error('Error message:', err.message);
    throw err; // re-throw so calling route still knows it failed
  }
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
    const [users] = await db.query('SELECT user_id, full_name, email, phone_number AS phone, gender, address, created_at FROM users');
    res.json(users);
  } catch (err) {
    console.error('❌ [GET /api/users] Error:', err.message);
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

const [specs] = await db.query('SELECT spec_label AS label, spec_value AS value FROM product_specs WHERE product_id = ?', [product.product_id]);
      product.specs = specs;
    }

    res.json(products);
  } catch (err) {
    console.error('❌ [GET /api/products] Error:', err.message);
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
       (name, price, category, subcategory, stock, image_url, short_description, full_description, warranty_info, shipping_info) 
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

if (specs && specs.length > 0) {
      for (let spec of specs) {
        if (spec.label && spec.value) {
          await connection.query('INSERT INTO product_specs (product_id, spec_label, spec_value) VALUES (?, ?, ?)', [productId, spec.label.trim(), spec.value.trim()]);
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
// 5.2. UPDATE EXISTING PRODUCT (PUT)
// ==========================================
app.put('/api/products/:id', async (req, res) => {
  const { id } = req.params;
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
    specs = []
  } = req.body;

  if (!name || !price || !category) {
    return res.status(400).json({ message: 'Product Name, Price, and Category are required.' });
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const [result] = await connection.query(
      `UPDATE products SET 
        name = ?, price = ?, category = ?, subcategory = ?, stock = ?, 
        image_url = ?, short_description = ?, full_description = ?, 
        warranty_info = ?, shipping_info = ?
       WHERE product_id = ?`,
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
        shipping_info || 'Ships within 24-48 hours',
        id
      ]
    );

    if (result.affectedRows === 0) {
      await connection.rollback();
      connection.release();
      return res.status(404).json({ message: 'Product not found.' });
    }

    // Replace specs: delete old ones, insert new ones
    await connection.query('DELETE FROM product_specs WHERE product_id = ?', [id]);

    if (specs && specs.length > 0) {
      for (let spec of specs) {
        if (spec.label && spec.value) {
          await connection.query(
            'INSERT INTO product_specs (product_id, spec_label, spec_value) VALUES (?, ?, ?)',
            [id, spec.label.trim(), spec.value.trim()]
          );
        }
      }
    }

    await connection.commit();
    console.log('✅ Product Updated:', id, name);
    res.json({ message: 'Product successfully updated!', product_id: id });

  } catch (err) {
    await connection.rollback();
    console.error('❌ Update Product Error:', err);
    res.status(500).json({ message: 'Failed to update product.', details: err.message });
  } finally {
    connection.release();
  }
});

// ==========================================
// 5.3. DELETE PRODUCT
// ==========================================
app.delete('/api/products/:id', async (req, res) => {
  const { id } = req.params;

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // Delete specs first (avoid FK constraint errors kung wala foreign key cascade)
    await connection.query('DELETE FROM product_specs WHERE product_id = ?', [id]);

    const [result] = await connection.query('DELETE FROM products WHERE product_id = ?', [id]);

    if (result.affectedRows === 0) {
      await connection.rollback();
      connection.release();
      return res.status(404).json({ message: 'Product not found.' });
    }

    await connection.commit();
    console.log('✅ Product Deleted:', id);
    res.json({ message: 'Product successfully deleted!' });

  } catch (err) {
    await connection.rollback();
    console.error('❌ Delete Product Error:', err);
    res.status(500).json({ message: 'Failed to delete product.', details: err.message });
  } finally {
    connection.release();
  }
});

// ==========================================
// 6. USER REGISTER (WITH OTP VERIFICATION)
// ==========================================
app.post('/api/auth/register', async (req, res) => {
  const { name, email, password, phone, gender, address } = req.body;

  if (!email || !password || !name) {
    return res.status(400).json({ message: 'Full Name, Email, and Password are required.' });
  }

  try {
    // Check kung existing na yung email bago mag-insert
    const [existing] = await db.query('SELECT user_id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(400).json({ message: 'Email already registered.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

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

    // Same OTP logic as login — hindi agad mag-iisyu ng token
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await db.query('DELETE FROM user_otps WHERE user_id = ?', [userId]);
    await db.query(
      'INSERT INTO user_otps (user_id, otp_code, expires_at) VALUES (?, ?, ?)',
      [userId, otpCode, expiresAt]
    );
    console.log('📝 [REGISTER] OTP generated and stored for user_id:', userId);

    await sendOtpEmail(email, otpCode);
    console.log('📝 [REGISTER] OTP email flow completed for:', email);

    res.json({
      requiresOtp: true,
      userId: userId,
      message: 'Verification code sent to your email.'
    });

  } catch (err) {
    console.error('❌ Registration Error:', err.message);
    res.status(400).json({ message: 'Registration failed.', details: err.message });
  }
});
// ==========================================
// 7. USER LOGIN
// ==========================================
app.post('/api/auth/login', async (req, res) => {
  const { email, password, deviceToken } = req.body;
  console.log('🔑 [LOGIN] Attempt for email:', email);

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and Password are required.' });
  }

  try {
    const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    if (users.length === 0) {
      console.log('🔑 [LOGIN] User not found:', email);
      return res.status(400).json({ message: 'User not found.' });
    }

    const user = users[0];
    const userId = user.user_id || user.id;

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      console.log('🔑 [LOGIN] Invalid password for:', email);
      return res.status(400).json({ message: 'Invalid credentials.' });
    }

    if (deviceToken) {
      const [devices] = await db.query(
        'SELECT * FROM remembered_devices WHERE user_id = ? AND device_token = ? AND expires_at > NOW()',
        [userId, deviceToken]
      );

      if (devices.length > 0) {
        console.log('🔑 [LOGIN] Remembered device found, skipping OTP for:', email);
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
    console.log('🔑 [LOGIN] OTP generated and stored for user_id:', userId);

    await sendOtpEmail(user.email, otpCode);
    console.log('🔑 [LOGIN] OTP email flow completed for:', email);

    res.json({
      requiresOtp: true,
      userId: userId,
      message: 'Verification code sent to your email.'
    });

  } catch (err) {
    console.error('❌ [LOGIN] Error:', err.message);
    console.error('Full login error:', JSON.stringify(err, Object.getOwnPropertyNames(err)));
    res.status(500).json({ error: 'Login failed on server.', details: err.message });
  }
});

// ==========================================
// 8. VERIFY OTP ROUTE
// ==========================================
app.post('/api/auth/verify-otp', async (req, res) => {
  const { userId, otpCode, rememberDevice } = req.body;
  console.log('🔢 [VERIFY-OTP] Attempt for userId:', userId);

  if (!userId || !otpCode) {
    return res.status(400).json({ message: 'User ID and OTP Code are required.' });
  }

  try {
    const [otps] = await db.query(
      'SELECT * FROM user_otps WHERE user_id = ? AND otp_code = ?',
      [userId, String(otpCode).trim()]
    );

    if (otps.length === 0) {
      console.log('🔢 [VERIFY-OTP] Invalid OTP for userId:', userId);
      return res.status(400).json({ message: 'Invalid OTP code.' });
    }

    const otpRecord = otps[0];

    if (new Date(otpRecord.expires_at) < new Date()) {
      console.log('🔢 [VERIFY-OTP] Expired OTP for userId:', userId);
      return res.status(400).json({ message: 'OTP Code has expired. Please request a new one.' });
    }

    await db.query('DELETE FROM user_otps WHERE user_id = ?', [userId]);

    const [users] = await db.query('SELECT * FROM users WHERE user_id = ?', [userId]);
    if (users.length === 0) {
      console.log('🔢 [VERIFY-OTP] User not found for userId:', userId);
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
      console.log('🔢 [VERIFY-OTP] Device remembered for userId:', userId);
    }

    const token = jwt.sign(
      { user_id: userId, email: user.email },
      process.env.JWT_SECRET || 'gym_app_secret_key',
      { expiresIn: '7d' }
    );

    console.log('✅ [VERIFY-OTP] Success for userId:', userId);

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
    console.error('❌ [VERIFY-OTP] Error:', err.message);
    res.status(500).json({ message: 'Failed to verify OTP.', details: err.message });
  }
});

// ==========================================
// 9. GOOGLE AUTHENTICATION
// ==========================================
app.post('/api/auth/google', async (req, res) => {
  console.log('==================================================');
  console.log('🟢 [GOOGLE AUTH] Route hit');
  const { token, deviceToken } = req.body;
  console.log('🟢 [GOOGLE AUTH] Token received:', token ? `YES (length: ${token.length})` : 'NO TOKEN');
  console.log('🟢 [GOOGLE AUTH] deviceToken present:', !!deviceToken);

  if (!token) {
    console.log('🔴 [GOOGLE AUTH] No token provided, aborting.');
    return res.status(400).json({ message: 'Google Token is required.' });
  }

  try {
    const decodedToken = jwt.decode(token);
    console.log('🟢 [GOOGLE AUTH] Decoded token payload:', decodedToken ? {
      email: decodedToken.email,
      name: decodedToken.name,
      hasPicture: !!decodedToken.picture
    } : 'FAILED TO DECODE');

    if (!decodedToken || !decodedToken.email) {
      console.log('🔴 [GOOGLE AUTH] Invalid token payload, aborting.');
      return res.status(400).json({ message: 'Invalid Google Token payload.' });
    }

    const { email, name, picture } = decodedToken;
    const fullName = name || 'Google User';

    console.log('🟢 [GOOGLE AUTH] Looking up user by email:', email);
    const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    let userId;
    let currentUser = null;

    if (users.length > 0) {
      currentUser = users[0];
      userId = currentUser.user_id || currentUser.id;
      console.log('🟢 [GOOGLE AUTH] Existing user found. userId:', userId);
    } else {
      console.log('🟢 [GOOGLE AUTH] No existing user, creating new one for:', email);
      const dummyPasswordHash = await bcrypt.hash(`GOOGLE_AUTH_${Date.now()}`, 10);
      const [result] = await db.query(
        'INSERT INTO users (email, full_name, password_hash) VALUES (?, ?, ?)',
        [email, fullName, dummyPasswordHash]
      );
      userId = result.insertId;
      console.log('✅ [GOOGLE AUTH] New user created. userId:', userId);
    }

    if (deviceToken) {
      console.log('🟢 [GOOGLE AUTH] Checking remembered device for userId:', userId);
      const [devices] = await db.query(
        'SELECT * FROM remembered_devices WHERE user_id = ? AND device_token = ? AND expires_at > NOW()',
        [userId, deviceToken]
      );

      if (devices.length > 0) {
        console.log('✅ [GOOGLE AUTH] Remembered device valid, skipping OTP.');
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
      console.log('🟢 [GOOGLE AUTH] No valid remembered device found, proceeding to OTP.');
    }

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    console.log('🟢 [GOOGLE AUTH] Clearing old OTPs for userId:', userId);
    await db.query('DELETE FROM user_otps WHERE user_id = ?', [userId]);

    console.log('🟢 [GOOGLE AUTH] Inserting new OTP for userId:', userId);
    await db.query(
      'INSERT INTO user_otps (user_id, otp_code, expires_at) VALUES (?, ?, ?)',
      [userId, otpCode, expiresAt]
    );

    console.log('🟢 [GOOGLE AUTH] Calling sendOtpEmail for:', email);
    await sendOtpEmail(email, otpCode);
    console.log('✅ [GOOGLE AUTH] sendOtpEmail completed successfully for:', email);

    res.json({
      requiresOtp: true,
      userId: userId,
      message: 'Verification code sent to your email.'
    });
    console.log('✅ [GOOGLE AUTH] Response sent, requiresOtp: true');
    console.log('==================================================');

  } catch (err) {
    console.error('🔴🔴🔴 [GOOGLE AUTH ERROR] 🔴🔴🔴');
    console.error('Error name:', err.name);
    console.error('Error message:', err.message);
    console.error('Error code:', err.code);
    console.error('Error stack:', err.stack);
    console.error('Full error object:', JSON.stringify(err, Object.getOwnPropertyNames(err)));
    console.log('==================================================');
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
