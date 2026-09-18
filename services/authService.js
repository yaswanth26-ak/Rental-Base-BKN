import bcrypt from 'bcrypt';
import UserDB from '../models/userDB.js';
import { signToken } from '../utils/jwt.js';
import { AppError } from '../utils/errors.js';
import { requireFields, sanitizeUser } from '../utils/validation.js';

const SALT_ROUNDS = 10;

export async function registerUser(body) {
  requireFields(body, ['name', 'phone', 'password']);

  const name = String(body.name).trim();
  const phone = String(body.phone).trim();
  const email = body.email ? String(body.email).trim() : null;
  const password = String(body.password);

  // Public registration always creates a normal user. Ignore any client-supplied role
  // to prevent privilege escalation to admin.
  const role = 'user';

  if (password.length < 6) {
    throw new AppError('password must be at least 6 characters', 400);
  }

  const existingPhone = await UserDB.findByPhone(phone);
  if (existingPhone) {
    throw new AppError('Phone number is already registered', 409);
  }

  if (email) {
    const existingEmail = await UserDB.findByEmail(email);
    if (existingEmail) {
      throw new AppError('Email is already registered', 409);
    }
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await UserDB.create({
    name,
    phone,
    email,
    passwordHash,
    role,
  });

  const token = signToken({ id: user.id, role: user.role });

  return {
    user: sanitizeUser(user),
    token,
  };
}

export async function loginUser(body) {
  requireFields(body, ['phone', 'password']);

  const phone = String(body.phone).trim();
  const password = String(body.password);

  const user = await UserDB.findByPhone(phone);
  if (!user) {
    throw new AppError('Invalid phone or password', 401);
  }

  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) {
    throw new AppError('Invalid phone or password', 401);
  }

  const token = signToken({ id: user.id, role: user.role });

  return {
    user: sanitizeUser(user),
    token,
  };
}

export async function getCurrentUser(userId) {
  const user = await UserDB.findById(userId);
  if (!user) {
    throw new AppError('User not found', 404);
  }
  return sanitizeUser(user);
}

export async function updateProfile(userId, body) {
  requireFields(body, ['name', 'phone']);

  const name = String(body.name).trim();
  const phone = String(body.phone).trim();
  const email = body.email ? String(body.email).trim() : null;

  const existingPhone = await UserDB.findByPhone(phone);
  if (existingPhone && existingPhone.id !== userId) {
    throw new AppError('Phone number is already registered', 409);
  }

  if (email) {
    const existingEmail = await UserDB.findByEmail(email);
    if (existingEmail && existingEmail.id !== userId) {
      throw new AppError('Email is already registered', 409);
    }
  }

  const user = await UserDB.updateProfile(userId, { name, email, phone });
  return sanitizeUser(user);
}

export async function changePassword(userId, body) {
  requireFields(body, ['current_password', 'new_password']);

  const currentPassword = String(body.current_password);
  const newPassword = String(body.new_password);

  if (newPassword.length < 6) {
    throw new AppError('new_password must be at least 6 characters', 400);
  }

  const user = await UserDB.findById(userId);
  if (!user) {
    throw new AppError('User not found', 404);
  }

  const match = await bcrypt.compare(currentPassword, user.password_hash);
  if (!match) {
    throw new AppError('Current password is incorrect', 400);
  }

  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await UserDB.updatePassword(userId, passwordHash);

  return true;
}
