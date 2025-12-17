import express from 'express';
import indexRouter from './routes/index';
import { apiKeyAuth } from './middlewares/auth'
import dns from 'node:dns';

dns.setDefaultResultOrder('ipv4first');
const app = express();

app.use(express.json({ limit: '500mb' }));
app.use(express.urlencoded({ extended: false, limit: '500mb' }));
app.use(apiKeyAuth)

// Mount routes
app.use('/', indexRouter);

const port = process.env.PORT ? Number(process.env.PORT) : 3000;

app.listen(port, () => {
	console.log(`Server listening on http://localhost:${port}`);
});

export default app;
