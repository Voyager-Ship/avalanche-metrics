import { Router } from 'express';
import { getUsersContributions } from '../controllers/github';
import { getAdressesContracts } from '../controllers/chain';
import { getUsersActivity } from '../controllers/activity';

const router = Router();

router.post('/users/contributions', getUsersContributions);
router.post('/users/contracts', getAdressesContracts);
router.post('/users/activity', getUsersActivity);

export default router;
