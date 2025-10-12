import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import ConfigurationIcon from './ConfigurationIcon'
import ConfigurationMessage from './ConfigurationMessage'
import { useConfiguration } from '@/hooks/useConfiguration'
import { toast } from 'sonner'

const ConfigurationExample: React.FC = () => {
  const { 
    getIcons, 
    getMessages, 
    getStyling, 
    getMessage, 
    getIcon,
    loading,
    error 
  } = useConfiguration({ configName: 'main_system_config', autoLoad: true })

  const handleSuccess = () => {
    const message = getMessage('success', 'save', 'Success!')
    toast.success(message)
  }

  const handleError = () => {
    const message = getMessage('error', 'save', 'Error!')
    toast.error(message)
  }

  if (loading) {
    return <div>Loading configuration...</div>
  }

  if (error) {
    return <div>Error loading configuration: {error}</div>
  }

  const icons = getIcons()
  const messages = getMessages()
  const styling = getStyling()

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Configuration System Demo</CardTitle>
          <p className="text-sm text-muted-foreground">
            This demonstrates how the configuration system works
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          
          {/* Icons Section */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Configured Icons</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="flex items-center gap-2">
                <ConfigurationIcon iconName="add" size={20} />
                <span className="text-sm">Add: {getIcon('add')}</span>
              </div>
              <div className="flex items-center gap-2">
                <ConfigurationIcon iconName="edit" size={20} />
                <span className="text-sm">Edit: {getIcon('edit')}</span>
              </div>
              <div className="flex items-center gap-2">
                <ConfigurationIcon iconName="delete" size={20} />
                <span className="text-sm">Delete: {getIcon('delete')}</span>
              </div>
              <div className="flex items-center gap-2">
                <ConfigurationIcon iconName="view" size={20} />
                <span className="text-sm">View: {getIcon('view')}</span>
              </div>
              <div className="flex items-center gap-2">
                <ConfigurationIcon iconName="submit" size={20} />
                <span className="text-sm">Submit: {getIcon('submit')}</span>
              </div>
              <div className="flex items-center gap-2">
                <ConfigurationIcon iconName="approve" size={20} />
                <span className="text-sm">Approve: {getIcon('approve')}</span>
              </div>
            </div>
          </div>

          {/* Messages Section */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Configured Messages</h3>
            <div className="space-y-2">
              <div>
                <strong>Success Save:</strong> 
                <ConfigurationMessage category="success" type="save" />
              </div>
              <div>
                <strong>Error Save:</strong> 
                <ConfigurationMessage category="error" type="save" />
              </div>
              <div>
                <strong>Success Submit:</strong> 
                <ConfigurationMessage category="success" type="submit" />
              </div>
            </div>
          </div>

          {/* Styling Section */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Configured Colors</h3>
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <div 
                  className="w-8 h-8 rounded border"
                  style={{ backgroundColor: styling.primary_color }}
                />
                <span className="text-sm">Primary: {styling.primary_color}</span>
              </div>
              <div className="flex items-center gap-2">
                <div 
                  className="w-8 h-8 rounded border"
                  style={{ backgroundColor: styling.secondary_color }}
                />
                <span className="text-sm">Secondary: {styling.secondary_color}</span>
              </div>
              <div className="flex items-center gap-2">
                <div 
                  className="w-8 h-8 rounded border"
                  style={{ backgroundColor: styling.accent_color }}
                />
                <span className="text-sm">Accent: {styling.accent_color}</span>
              </div>
            </div>
          </div>

          {/* Section Colors */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Section Colors</h3>
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <div 
                  className="w-8 h-8 rounded border"
                  style={{ backgroundColor: styling.section_a_color }}
                />
                <span className="text-sm">Section A: {styling.section_a_color}</span>
              </div>
              <div className="flex items-center gap-2">
                <div 
                  className="w-8 h-8 rounded border"
                  style={{ backgroundColor: styling.section_b_color }}
                />
                <span className="text-sm">Section B: {styling.section_b_color}</span>
              </div>
              <div className="flex items-center gap-2">
                <div 
                  className="w-8 h-8 rounded border"
                  style={{ backgroundColor: styling.section_c_color }}
                />
                <span className="text-sm">Section C: {styling.section_c_color}</span>
              </div>
            </div>
          </div>

          {/* Interactive Demo */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Interactive Demo</h3>
            <div className="flex gap-2">
              <Button onClick={handleSuccess} className="bg-green-600 hover:bg-green-700">
                <ConfigurationIcon iconName="approve" size={16} className="mr-2" />
                Test Success Message
              </Button>
              <Button onClick={handleError} variant="destructive">
                <ConfigurationIcon iconName="reject" size={16} className="mr-2" />
                Test Error Message
              </Button>
            </div>
          </div>

          {/* Raw Data */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Raw Configuration Data</h3>
            <div className="space-y-2 text-xs">
              <div>
                <strong>All Icons:</strong>
                <pre className="mt-1 p-2 bg-gray-100 rounded overflow-auto">
                  {JSON.stringify(icons, null, 2)}
                </pre>
              </div>
              <div>
                <strong>All Messages:</strong>
                <pre className="mt-1 p-2 bg-gray-100 rounded overflow-auto">
                  {JSON.stringify(messages, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default ConfigurationExample
