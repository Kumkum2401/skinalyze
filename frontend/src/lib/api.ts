const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001';
export async function analyzeImage(input: Blob | string) {
  const form = new FormData()
  if (typeof input === 'string') {
    const res = await fetch(input)
    const blob = await res.blob()
    form.append('image', blob, 'capture.jpg')
  } else {
    form.append('image', input, 'upload.jpg')
  }

  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000'
  const response = await fetch(`${baseUrl}/analyze`, {
    method: 'POST',
    body: form,
  })
  if (!response.ok) throw new Error('Failed to analyze')
  return response.json()
}

