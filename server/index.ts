import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import uploadRouter from './routes/upload';
import ocrRouter from './routes/ocr';
import renderRouter from './routes/render';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Static file serving
app.use('/uploads', express.static(path.join(rootDir, 'public/uploads')));
app.use('/output', express.static(path.join(rootDir, 'output')));

// Routes
app.use('/api/upload', uploadRouter);
app.use('/api/ocr', ocrRouter);
app.use('/api/render', renderRouter);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
