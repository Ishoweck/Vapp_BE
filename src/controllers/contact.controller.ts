import { Request, Response } from 'express';
import { ContactMessage } from '../models/ContactMessage';
import { ApiResponse } from '../types';

export class ContactController {
  async submit(req: Request, res: Response<ApiResponse>): Promise<void> {
    const { name, email, subject, message } = req.body;

    if (!name || !email || !message) {
      res.status(400).json({ success: false, message: 'name, email and message are required' });
      return;
    }

    await ContactMessage.create({ name, email, subject, message });

    res.status(201).json({ success: true, message: 'Contact message received' });
  }
}

export const contactController = new ContactController();
