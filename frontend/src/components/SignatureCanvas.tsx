import React, { useRef, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Eraser, Save, Upload } from 'lucide-react'

interface SignatureCanvasProps {
  onSave: (dataUrl: string) => void
  initialValue?: string
  label?: string
  width?: number
  height?: number
}

export default function SignatureCanvas({ 
  onSave, 
  initialValue, 
  label = "Signature",
  width = 400,
  height = 150
}: SignatureCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasSignature, setHasSignature] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(initialValue || null)

  useEffect(() => {
    if (initialValue) {
      setPreviewUrl(initialValue)
      setHasSignature(true)
    }
  }, [initialValue])

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true)
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.beginPath()
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top)
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return

    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top)
    ctx.stroke()
  }

  const stopDrawing = () => {
    setIsDrawing(false)
  }

  const clearCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setHasSignature(false)
    setPreviewUrl(null)
  }

  const saveSignature = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const dataUrl = canvas.toDataURL('image/png')
    setPreviewUrl(dataUrl)
    setHasSignature(true)
    onSave(dataUrl)
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string
      setPreviewUrl(dataUrl)
      setHasSignature(true)
      onSave(dataUrl)
    }
    reader.readAsDataURL(file)
  }

  const setupCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas size
    canvas.width = width
    canvas.height = height

    // Set drawing properties
    ctx.strokeStyle = '#000000'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    // Draw border
    ctx.strokeRect(0, 0, width, height)

    // If there's a preview, draw it
    if (previewUrl) {
      const img = new Image()
      img.onload = () => {
        ctx.drawImage(img, 0, 0, width, height)
      }
      img.src = previewUrl
    }
  }

  useEffect(() => {
    setupCanvas()
  }, [width, height, previewUrl])

  return (
    <div className="space-y-4">
      <Label className="text-sm font-medium">{label}</Label>
      
      {/* Canvas Container */}
      <Card className="border-2 border-dashed border-gray-300">
        <CardContent className="p-4">
          <div className="flex flex-col items-center space-y-4">
            {/* Canvas */}
            <canvas
              ref={canvasRef}
              className="border border-gray-200 cursor-crosshair"
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              style={{ width: `${width}px`, height: `${height}px` }}
            />
            
            {/* Controls */}
            <div className="flex space-x-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={clearCanvas}
                className="flex items-center gap-2"
              >
                <Eraser className="h-4 w-4" />
                Clear
              </Button>
              
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={saveSignature}
                disabled={!hasSignature}
                className="flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                Save
              </Button>
              
              <Button
                type="button"
                variant="outline"
                size="sm"
                asChild
                className="flex items-center gap-2"
              >
                <label htmlFor={`file-upload-${label.toLowerCase().replace(/\s+/g, '-')}`}>
                  <Upload className="h-4 w-4" />
                  Upload
                  <input
                    id={`file-upload-${label.toLowerCase().replace(/\s+/g, '-')}`}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preview */}
      {previewUrl && (
        <div className="space-y-2">
          <Label className="text-xs text-gray-600">Preview:</Label>
          <div className="border border-gray-200 rounded p-2 bg-gray-50">
            <img 
              src={previewUrl} 
              alt="Signature preview" 
              className="max-w-full h-auto max-h-20"
            />
          </div>
        </div>
      )}
    </div>
  )
}
