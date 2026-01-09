import express from 'express';
import indexRouter from './routes/index';
import { apiKeyAuth } from './middlewares/apiKeyAuth'
import cors from 'cors';
import dns from 'node:dns';

dns.setDefaultResultOrder('ipv4first');
const app = express();
app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key'],
  })
);

app.use(express.json({ limit: '500mb' }));
app.use(express.urlencoded({ extended: false, limit: '500mb' }));
app.use(apiKeyAuth)

// Mount routes
app.use('/', indexRouter);

const port = process.env.PORT ? Number(process.env.PORT) : 3000;

app.listen(port, () => {
	console.debug(`Server listening on http://localhost:${port}`);
});

export default app;
