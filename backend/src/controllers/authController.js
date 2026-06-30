import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { dbService } from '../services/dbService.js';
import { checkMongoState } from '../config/database.js';
import { config } from '../config/config.js';

export const register = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'All registration parameters (username, email, password) are required.' });
    }

    if (username.length < 3 || username.length > 15) {
      return res.status(400).json({ error: 'Username must be between 3 and 15 characters.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long for optimal product safety.' });
    }

    // Check existing
    const existingUser = await dbService.findUserByUsername(username);
    if (existingUser) {
      return res.status(400).json({ error: 'Username is already registered.' });
    }

    const existingEmail = await dbService.findUserByEmail(email);
    if (existingEmail) {
      return res.status(400).json({ error: 'Email address is already in use.' });
    }

    // Create user (hashing is handled by pre-save hooks in schema, or in memory backup helper)
    const user = await dbService.createUser({ username, email, password });

    // Auto-generate JWT token on successful sign-up
    const token = jwt.sign({ id: user.id, username: user.username, email: user.email }, config.JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      message: 'Account successfully registered!',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email
      }
    });

  } catch (err) {
    console.error('[Auth Register] Exception:', err);
    res.status(500).json({ error: err.message || 'Fatal error creating your account.' });
  }
};

export const login = async (req, res) => {
  try {
    const { credential, password } = req.body; // credential can be email or username

    if (!credential || !password) {
      return res.status(400).json({ error: 'Both credential (username/email) and password are required.' });
    }

    // Try finding user by username first, then fallback to email
    let user = await dbService.findUserByUsername(credential);
    if (!user) {
      user = await dbService.findUserByEmail(credential);
    }

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials. User not found.' });
    }

    // Verify Password
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Incorrect password. Access denied.' });
    }

    // Sign Token
    const token = jwt.sign(
      { id: user.id || user._id?.toString(), username: user.username, email: user.email },
      config.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Authentication successful!',
      token,
      user: {
        id: user.id || user._id?.toString(),
        username: user.username,
        email: user.email
      }
    });

  } catch (err) {
    console.error('[Auth Login] Exception:', err);
    res.status(500).json({ error: 'Fatal error executing authorization checks.' });
  }
};

export const getMe = (req, res) => {
  // Return current authenticated profile alongside database backend status
  res.json({
    user: req.user,
    backendStatus: {
      mongoConnected: checkMongoState(),
      redisConnected: !!config.REDIS_URL,
      operatingMode: checkMongoState() ? 'CLOUD_PRODUCTION' : 'HIGH_FIDELITY_LOBBY_SANDBOX'
    }
  });
};
