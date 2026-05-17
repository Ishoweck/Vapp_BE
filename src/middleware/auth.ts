import { Response, NextFunction } from 'express';
import { AuthRequest, UserRole } from '../types';
import { verifyAccessToken } from '../utils/jwt';
import { ApiResponse } from '../types';
import User from '../models/User';

export const authenticate = async (
  req: AuthRequest,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      res.status(401).json({
        success: false,
        message: 'Please log in to continue',
        error: 'No token provided',
      });
      return;
    }

    const decoded = verifyAccessToken(token);

    // Check the user is still active in the DB — catches deleted/suspended accounts
    const user = await User.findById(decoded.id).select('status').lean();
    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Account no longer exists',
        error: 'account_deleted',
      });
      return;
    }
    if ((user as any).status === 'inactive' || (user as any).status === 'deleted') {
      res.status(401).json({
        success: false,
        message: 'Your account has been deleted. Thank you for using VendorSpot.',
        error: 'account_deleted',
      });
      return;
    }

    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
    };

    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Invalid or expired token',
      error: error instanceof Error ? error.message : 'Authentication failed',
    });
  }
};

export const authorize = (...roles: UserRole[]) => {
  return (req: AuthRequest, res: Response<ApiResponse>, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Please log in to continue',
      });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: 'Insufficient permissions',
        error: `Required role: ${roles.join(' or ')}`,
      });
      return;
    }

    next();
  };
};

export const optionalAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (token) {
      const decoded = verifyAccessToken(token);
      req.user = {
        id: decoded.id,
        email: decoded.email,
        role: decoded.role,
      };
    }

    next();
  } catch (error) {
    // If token is invalid, just continue without user
    next();
  }
};
