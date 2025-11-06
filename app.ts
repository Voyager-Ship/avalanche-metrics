import express from 'express';
import indexRouter from './routes/index';

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Mount routes
app.use('/', indexRouter);

const port = process.env.PORT ? Number(process.env.PORT) : 3000;

app.listen(port, () => {
	console.log(`Server listening on http://localhost:${port}`);
});

export default app;
