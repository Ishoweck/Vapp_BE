import { Response } from 'express';
import { AuthRequest, ApiResponse, UserRole, UserStatus } from '../types';
import User from '../models/User';
import { Wallet } from '../models/Additional';
import { generateTokens, verifyRefreshToken } from '../utils/jwt';
import { generateOTP, generateAffiliateCode, generateResetCode } from '../utils/helpers';
import { sendOTPEmail, sendWelcomeEmail, sendPasswordResetEmail, sendFounderWelcomeEmail, sendProductPostingGuideEmail } from '../utils/email';
import { AppError } from '../middleware/error';
import crypto from 'crypto';
import { queueEmailsInBackground } from '../utils/email-queue';
import { deleteFromCloudinary, uploadToCloudinary } from '../utils/cloudinary';

export class AuthController {
  /**
   * Register new user
   */
 async register(req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
    let { firstName, lastName, email, phone, password, role, fullName } = req.body;

    // Support fullName field — split into firstName and lastName
    if (fullName && (!firstName || !lastName)) {
      const parts = fullName.trim().split(/\s+/);
      firstName = parts[0];
      lastName = parts.length > 1 ? parts.slice(1).join(' ') : parts[0];
    }

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new AppError('Email already registered', 400);
    }

    // Generate OTP
    const otpCode = generateOTP();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Create user
    const user = await User.create({
      firstName,
      lastName,
      email,
      phone,
      password,
      role: role || UserRole.CUSTOMER,
      otp: {
        code: otpCode,
        expiresAt: otpExpiry,
      },
    });

    // Create wallet for user
    await Wallet.create({ user: user._id });

    // Generate affiliate code if applicable
    if (role === UserRole.AFFILIATE || user.isAffiliate) {
      user.affiliateCode = generateAffiliateCode(email);
      await user.save();
    }

    // Send OTP email
    console.log(otpCode);
    await sendOTPEmail(email, otpCode);

    res.status(201).json({
      success: true,
      message: 'Registration successful. Please verify your email.',
      data: {
        userId: user._id,
        email: user.email,
      },
    });
  }
  /**
   * Verify email with OTP
   */
 
async verifyEmail(req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
  const { email, otp } = req.body;

  const user = await User.findOne({ email });
  if (!user) {
    throw new AppError('User not found', 404);
  }

  if (user.emailVerified) {
    throw new AppError('Email already verified', 400);
  }

  if (!user.otp || user.otp.code !== otp) {
    throw new AppError('Invalid OTP', 400);
  }

  if (user.otp.expiresAt && user.otp.expiresAt < new Date()) {
    throw new AppError('OTP expired', 400);
  }

  // Update user
  user.emailVerified = true;
  user.status = UserStatus.ACTIVE;
  user.otp = undefined;
  await user.save();

  // Queue welcome emails in background with 10 second delays
  queueEmailsInBackground ([
    () => sendWelcomeEmail(user.email, user.firstName),
    () => sendFounderWelcomeEmail(user.email),
    () => sendProductPostingGuideEmail(user.email),
  ], 10000); // 10 seconds between each email

  // Generate tokens
  const tokens = generateTokens(user._id, user.email, user.role);

  res.json({
    success: true,
    message: 'Email verified successfully',
    data: {
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
      },
      ...tokens,
    },
  });
}

  /**
   * Resend OTP
   */
  async resendOTP(req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      throw new AppError('User not found', 404);
    }

    if (user.emailVerified) {
      throw new AppError('Email already verified', 400);
    }

    // Generate new OTP
    const otpCode = generateOTP();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

    user.otp = {
      code: otpCode,
      expiresAt: otpExpiry,
    };
    await user.save();

    // Send OTP email
    await sendOTPEmail(email, otpCode);

    res.json({
      success: true,
      message: 'OTP sent successfully',
    });
  }

/**
 * Login with daily login bonus
 */
async login(req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
  const { email, password } = req.body;

  // Find user with password
  const user = await User.findOne({ email }).select('+password');
  if (!user) {
    throw new AppError('Invalid credentials', 401);
  }

  // Check password
  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    throw new AppError('Invalid credentials', 401);
  }

  // Check if email is verified
  if (!user.emailVerified) {
    throw new AppError('Please verify your email first', 403);
  }

  // Check if account is active
  if (user.status !== UserStatus.ACTIVE) {
    throw new AppError('Account is not active', 403);
  }

  // ✅ AWARD DAILY LOGIN POINTS
  await this.awardDailyLoginPoints(user);

  // Update last login
  user.lastLogin = new Date();
  await user.save();

  // Generate tokens
  const tokens = generateTokens(user._id, user.email, user.role);

  res.json({
    success: true,
    message: 'Login successful',
    data: {
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        role: user.role,
        avatar: user.avatar,
      },
      ...tokens,
    },
  });
}

/**
 * Award daily login points with streak tracking and transaction logging
 */
private async awardDailyLoginPoints(user: any): Promise<void> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const lastLogin = user.lastLogin ? new Date(user.lastLogin) : null;
  
  if (lastLogin) {
    lastLogin.setHours(0, 0, 0, 0);
  }

  // Check if user already logged in today
  if (lastLogin && lastLogin.getTime() === today.getTime()) {
    // Already logged in today, no points
    return;
  }

  // Initialize login streak tracking if it doesn't exist
  if (!user.loginStreak) {
    user.loginStreak = {
      currentStreak: 0,
      lastLoginDate: null,
    };
  }

  // Check if login is consecutive (yesterday)
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  let pointsAwarded = 1; // Base daily login point
  let streakBonus = 0;
  let newStreak = 1;

  if (lastLogin && lastLogin.getTime() === yesterday.getTime()) {
    // Consecutive day - increase streak
    newStreak = (user.loginStreak.currentStreak || 0) + 1;
  } else if (!lastLogin || lastLogin.getTime() < yesterday.getTime()) {
    // Streak broken - reset to 1
    newStreak = 1;
  }

  // Award streak bonuses
  if (newStreak === 7) {
    streakBonus = 20;
    pointsAwarded += streakBonus;
  } else if (newStreak === 14) {
    streakBonus = 50;
    pointsAwarded += streakBonus;
  } else if (newStreak === 30) {
    streakBonus = 120;
    pointsAwarded += streakBonus;
  }

  // Update user points and streak
  user.points = (user.points || 0) + pointsAwarded;
  user.loginStreak = {
    currentStreak: newStreak,
    lastLoginDate: today,
  };

  await user.save();

  // ✅ CREATE TRANSACTION RECORD
  const PointsTransaction = (await import('../models/PointsTransaction')).default;
  
  let description = `Daily login`;
  if (streakBonus > 0) {
    description = `Daily login + ${newStreak}-day streak bonus`;
  }

  await PointsTransaction.create({
    user: user._id,
    type: 'earn',
    activity: 'login',
    points: pointsAwarded,
    description,
    metadata: {
      streakDay: newStreak,
      basePoints: 1,
      bonusPoints: streakBonus,
    },
  });

  // Log the points award
  console.log(`✅ Daily login points awarded: ${pointsAwarded} to user ${user.email} (Streak: ${newStreak})`);
  
  if (streakBonus > 0) {
    console.log(`🎉 Streak bonus: ${streakBonus} points for ${newStreak}-day streak!`);
  }
}

 /**
 * Forgot password - Generate and send reset OTP
 */
async forgotPassword(req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      // Don't reveal if email exists for security
      res.json({
        success: true,
        message: 'If email exists, password reset code has been sent',
      });
      return;
    }

    // Generate OTP
    const otpCode = generateOTP();
    const hashedCode = crypto.createHash('sha256').update(otpCode).digest('hex');

    user.resetPasswordToken = hashedCode;
    user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await user.save();

    // Send reset email with OTP
    await sendPasswordResetEmail(email, otpCode);

    console.log(`🔐 Password reset OTP generated for ${email}: ${otpCode}`);

    res.json({
      success: true,
      message: 'Password reset code sent to email',
    });
  }

  /**
   * Reset password with OTP code
   */
  async resetPassword(req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
    console.log('🔍 Reset password request body:', JSON.stringify(req.body, null, 2));

    const { code, password, token } = req.body;

    // Accept both 'code' and 'token' for backwards compatibility
    const resetCode = code || token;

    if (!resetCode || !password) {
      console.log('❌ Missing fields - code:', !!resetCode, 'password:', !!password);
      throw new AppError('Reset code and new password are required', 400);
    }

    const normalizedCode = resetCode.trim();
    console.log('🔐 Normalized code:', normalizedCode);

    const hashedCode = crypto.createHash('sha256').update(normalizedCode).digest('hex');

    const user = await User.findOne({
      resetPasswordToken: hashedCode,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      console.log('❌ No user found with valid reset code');
      throw new AppError('Invalid or expired reset code', 400);
    }

    console.log('✅ User found:', user.email);

    // Update password
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    console.log(`✅ Password reset successful for ${user.email}`);

    res.json({
      success: true,
      message: 'Password reset successful',
    });
  }
  /**
   * Refresh token
   */
  async refreshToken(req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      throw new AppError('Refresh token required', 400);
    }

    const decoded = verifyRefreshToken(refreshToken);

    const user = await User.findById(decoded.id);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Generate new tokens
    const tokens = generateTokens(user._id, user.email, user.role);

    res.json({
      success: true,
      message: 'Token refreshed successfully',
      data: tokens,
    });
  }

  /**
   * Get current user
   */
  async getMe(req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
    const user = await User.findById(req.user?.id);

    if (!user) {
      throw new AppError('User not found', 404);
    }

    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phone: user.phone,
          role: user.role,
          status: user.status,
          avatar: user.avatar,
          addresses: user.addresses,
          emailVerified: user.emailVerified,
          phoneVerified: user.phoneVerified,
          isAffiliate: user.isAffiliate,
          affiliateCode: user.affiliateCode,
        },
      },
    });
  }

  /**
   * Update profile
   */
  async updateProfile(req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
    const { firstName, lastName, phone, avatar } = req.body;

    const user = await User.findById(req.user?.id);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (phone) user.phone = phone;
    if (avatar) user.avatar = avatar;

    await user.save();

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: { user },
    });
  }


  // In auth.controller.ts
async updateAvatar(req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
  const { base64Image } = req.body;
  const user = await User.findById(req.user?.id);
  if (!user) throw new AppError('User not found', 404);

  // Delete old avatar if exists
  if (user.avatar) {
    const oldPublicId = user.avatar.split('/').slice(-2).join('/').split('.')[0];
    await deleteFromCloudinary(oldPublicId).catch(() => {});
  }

  const { url } = await uploadToCloudinary(base64Image, 'avatars');
  user.avatar = url;
  await user.save();

  res.json({ success: true, message: 'Avatar updated', data: { avatar: url } });
}

  /**
   * Change password
   */
  async changePassword(req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user?.id).select('+password');
    if (!user) {
      throw new AppError('User not found', 404);
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      throw new AppError('Current password is incorrect', 400);
    }

    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Password changed successfully',
    });
  }
}

export const authController = new AuthController();