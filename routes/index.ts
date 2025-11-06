import { Router, Request, Response, NextFunction } from 'express';
import { getUserEvents } from '../controllers/github';

const router = Router();

router.get('/user/:user/events', getUserEvents);

export default router;
