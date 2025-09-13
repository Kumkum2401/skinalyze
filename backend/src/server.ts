import express, { Request, Response } from 'express'
import cors from 'cors'
import multer from 'multer'
import axios from 'axios'
import { getRecommendations } from './data/products'
import dotenv from 'dotenv'
import recommendationsRouter from './routes/recommendations'

dotenv.config()

// Define the URLs that are allowed to access your backend
// Get allowed origins from environment variable, splitting by comma
const allowedOrigins = process.env.CORS_ORIGINS?.split(',') || ['http://localhost:5173'];

const corsOptions = {
    origin: (origin: any, callback: any) => {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    optionsSuccessStatus: 200,
};


const app = express()
app.use(cors(corsOptions))
app.use(express.json({ limit: '10mb' }))
app.use('/recommendations', recommendationsRouter)

const upload = multer({ storage: multer.memoryStorage() })

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok' })
})

// This is the correct endpoint for handling image uploads
app.post('/analyze', upload.single('image'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Image file is required' });
    }

    const mlServiceUrl = process.env.ML_SERVICE_URL;
    if (!mlServiceUrl) {
      console.error('ML_SERVICE_URL is not defined');
      return res.status(500).json({ error: 'ML service not configured' });
    }

    const response = await axios.post(mlServiceUrl, req.file.buffer, {
      headers: {
        'Content-Type': req.file.mimetype
      },
      timeout: 30000,
    });

    const ml = response.data as {
      issues: string[];
      confidence: number;
      skin_tone?: any;
      skin_type?: any;
      recommendations?: any[];
    };

 let recommendations = ml.recommendations || [];
 if (recommendations.length === 0) {
 const skinTone = (req.query.tone as string) || ml.skin_tone || 'defaultTone';
 const skinType = (req.query.type as string) || ml.skin_type || 'defaultType';
 recommendations = getRecommendations(ml.issues, { skinTone, skinType });
 }

 res.json({ ...ml, recommendations });
 } catch (error: any) { console.error('Analyze error:', error.response?.data || error.message);
 res.status(500).json({ error: 'Failed to analyze image' });
}
});

const PORT = Number(process.env.PORT) || 4000;

app.get('/', (_req: Request, res: Response) => {
  res.send('Backend is running! Use /analyze endpoint for predictions.');
});

app.listen(PORT, '0.0.0.0', () => {
 console.log(`Backend running on port ${PORT}`);
if (process.env.RENDER_EXTERNAL_URL) {
 console.log(`Public URL: ${process.env.RENDER_EXTERNAL_URL}`);
 }
});