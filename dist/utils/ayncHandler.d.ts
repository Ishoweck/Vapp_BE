import { Request, Response, NextFunction } from 'express';
/**
 * Async handler wrapper to catch errors in async route handlers
 */
export declare const asyncHandler: (fn: Function) => (req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=ayncHandler.d.ts.map