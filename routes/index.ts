import { Router } from 'express';
import { getUsersContributions } from '../controllers/github';

const router = Router();

router.get('/users/contributions', getUsersContributions);

export default router;
