import { Router } from 'express';
import { getUsersContributions } from '../controllers/github';
import { getChainData } from '../controllers/chain';
import { getMergeData } from '../controllers/merge';

const router = Router();

router.get('/users/contributions', getUsersContributions);
router.get('/users/chainData', getChainData);
router.get('/users/activity', getMergeData);

export default router;
