import express, { Request, Response } from 'express'
import cors from 'cors'
import multer from 'multer'
import axios from 'axios'
import { getRecommendations } from './data/products'
import dotenv from 'dotenv'
import recommendationsRouter from './routes/recommendations'

dotenv.config()

const app = express()
app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use('/recommendations', recommendationsRouter)

const upload = multer({ storage: multer.memoryStorage() })

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok' })
})

app.post('/analyze', upload.single('image'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Image file is required' })
    }

    const mlServiceUrl = process.env.ML_SERVICE_URL || 'http://127.0.0.1:8001/analyze'
    const response = await axios.post(mlServiceUrl, req.file.buffer, {
      headers: { 'Content-Type': 'application/octet-stream' },
      timeout: 30000,
    })

    const ml = response.data as { 
      issues: string[]; 
      confidence: number; 
      skin_tone?: any; 
      skin_type?: any;
      recommendations?: any[];
    }

    // Use ML-generated recommendations if available, otherwise fall back to static recommendations
    let recommendations = ml.recommendations || []
    
    // If no recommendations from ML service, use static recommendations
    if (recommendations.length === 0) {
      const skinTone = (req.query.tone as string | undefined) || (ml.skin_tone as any)
      const skinType = (req.query.type as string | undefined) || (ml.skin_type as any)
      recommendations = getRecommendations(ml.issues, { skinTone, skinType })
    }

    res.json({ 
      issues: ml.issues, 
      confidence: ml.confidence, 
      skin_tone: ml.skin_tone,
      skin_type: ml.skin_type,
      recommendations: recommendations 
    })
  } catch (error: any) {
    console.error('Analyze error:', error?.message)
    res.status(500).json({ error: 'Failed to analyze image' })
  }
})

const port = process.env.PORT || 4000
app.listen(port, () => {
  console.log(`Backend running on http://localhost:${port}`)
})

