import { Router } from 'express';
import { getUsersContributions } from '../controllers/github';
import { getAdressesContracts } from '../controllers/chain';
import { getUsersActivity } from '../controllers/merge';

const router = Router();

router.get('/users/contributions', getUsersContributions);
router.get('/users/contracts', getAdressesContracts);
router.get('/users/activity', getUsersActivity);

export default router;
