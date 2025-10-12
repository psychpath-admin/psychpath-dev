import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { 
  Settings, 
  Palette, 
  MessageSquare, 
  Image, 
  Workflow,
  Save,
  RefreshCw
} from 'lucide-react'
import { toast } from 'sonner'

interface ConfigurationItem {
  id: number
  key: string
  display_name: string
  description: string
  value_type: string
  value: string
  default_value: string
  user_roles: string[]
  contexts: string[]
  is_required: boolean
  is_readonly: boolean
  ui_component: string
  placeholder: string
  help_text: string
  order: number
}

interface SystemConfiguration {
  id: number
  name: string
  description: string
  is_active: boolean
  items: ConfigurationItem[]
}

const ConfigurationManagement: React.FC = () => {
  // const [categories, setCategories] = useState<ConfigurationCategory[]>([])
  const [configurations, setConfigurations] = useState<SystemConfiguration[]>([])
  const [activeConfig, setActiveConfig] = useState<SystemConfiguration | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('icons')

  // Load initial data
  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const configsRes = await fetch('/api/config/api/configurations/')

      if (configsRes.ok) {
        const configsData = await configsRes.json()
        setConfigurations(configsData.results || configsData)
        
        // Set the first configuration as active
        if (configsData.results?.length > 0 || configsData.length > 0) {
          const configs = configsData.results || configsData
          setActiveConfig(configs[0])
        }
      }
    } catch (error) {
      console.error('Error loading configuration data:', error)
      toast.error('Failed to load configuration data')
    } finally {
      setLoading(false)
    }
  }

  const saveConfiguration = async () => {
    if (!activeConfig) return

    setSaving(true)
    try {
      const response = await fetch(`/api/config/configurations/${activeConfig.id}/update_items/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: JSON.stringify({
          items: activeConfig.items.map(item => ({
            key: item.key,
            value: item.value
          }))
        })
      })

      if (response.ok) {
        toast.success('Configuration saved successfully!')
      } else {
        throw new Error('Failed to save configuration')
      }
    } catch (error) {
      console.error('Error saving configuration:', error)
      toast.error('Failed to save configuration')
    } finally {
      setSaving(false)
    }
  }

  const updateItemValue = (itemId: number, newValue: string) => {
    if (!activeConfig) return

    setActiveConfig({
      ...activeConfig,
      items: activeConfig.items.map(item =>
        item.id === itemId ? { ...item, value: newValue } : item
      )
    })
  }

  const getItemsByCategory = (categoryName: string) => {
    if (!activeConfig) return []
    return activeConfig.items.filter(item => {
      // Find the category by matching the key prefix
      return item.key.startsWith(`${categoryName}.`)
    })
  }

  const renderValueInput = (item: ConfigurationItem) => {
    const commonProps = {
      value: item.value,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => 
        updateItemValue(item.id, e.target.value),
      placeholder: item.placeholder,
      disabled: item.is_readonly
    }

    switch (item.value_type) {
      case 'BOOLEAN':
        return (
          <Checkbox
            checked={item.value === 'true'}
            onCheckedChange={(checked) => updateItemValue(item.id, checked ? 'true' : 'false')}
            disabled={item.is_readonly}
          />
        )
      
      case 'INTEGER':
        return (
          <Input
            type="number"
            {...commonProps}
            onChange={(e) => updateItemValue(item.id, e.target.value)}
          />
        )
      
      case 'COLOR':
        return (
          <div className="flex gap-2">
            <Input
              type="color"
              value={item.value}
              onChange={(e) => updateItemValue(item.id, e.target.value)}
              className="w-16 h-10"
              disabled={item.is_readonly}
            />
            <Input
              type="text"
              {...commonProps}
              onChange={(e) => updateItemValue(item.id, e.target.value)}
            />
          </div>
        )
      
      case 'JSON':
        return (
          <Textarea
            {...commonProps}
            rows={4}
            onChange={(e) => updateItemValue(item.id, e.target.value)}
          />
        )
      
      default:
        return item.ui_component === 'textarea' ? (
          <Textarea
            {...commonProps}
            rows={3}
            onChange={(e) => updateItemValue(item.id, e.target.value)}
          />
        ) : (
          <Input
            {...commonProps}
            onChange={(e) => updateItemValue(item.id, e.target.value)}
          />
        )
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading configuration...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Configuration Management</h1>
          <p className="text-muted-foreground">
            Manage system-wide configuration for icons, messages, styling, and workflows
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={saveConfiguration} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      {/* Configuration Selector */}
      <Card>
        <CardHeader>
          <CardTitle>Active Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <Select
            value={activeConfig?.id.toString() || ''}
            onValueChange={(value) => {
              const config = configurations.find(c => c.id.toString() === value)
              setActiveConfig(config || null)
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select configuration" />
            </SelectTrigger>
            <SelectContent>
              {configurations.map((config) => (
                <SelectItem key={config.id} value={config.id.toString()}>
                  {config.name} {!config.is_active && <Badge variant="secondary" className="ml-2">Inactive</Badge>}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Configuration Tabs */}
      {activeConfig && (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="icons" className="flex items-center gap-2">
              <Image className="h-4 w-4" />
              Icons
            </TabsTrigger>
            <TabsTrigger value="messages" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Messages
            </TabsTrigger>
            <TabsTrigger value="styling" className="flex items-center gap-2">
              <Palette className="h-4 w-4" />
              Styling
            </TabsTrigger>
            <TabsTrigger value="workflows" className="flex items-center gap-2">
              <Workflow className="h-4 w-4" />
              Workflows
            </TabsTrigger>
          </TabsList>

          <TabsContent value="icons">
            <ConfigurationCategoryTab
              items={getItemsByCategory('icons')}
              renderValueInput={renderValueInput}
            />
          </TabsContent>

          <TabsContent value="messages">
            <ConfigurationCategoryTab
              items={getItemsByCategory('messages')}
              renderValueInput={renderValueInput}
            />
          </TabsContent>

          <TabsContent value="styling">
            <ConfigurationCategoryTab
              items={getItemsByCategory('styling')}
              renderValueInput={renderValueInput}
            />
          </TabsContent>

          <TabsContent value="workflows">
            <ConfigurationCategoryTab
              items={getItemsByCategory('workflows')}
              renderValueInput={renderValueInput}
            />
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}

interface ConfigurationCategoryTabProps {
  items: ConfigurationItem[]
  renderValueInput: (item: ConfigurationItem) => React.ReactNode
}

const ConfigurationCategoryTab: React.FC<ConfigurationCategoryTabProps> = ({
  items,
  renderValueInput
}) => {
  return (
    <div className="space-y-4">
      {items.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Settings className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Items Found</h3>
            <p className="text-muted-foreground">
              No configuration items found for this category.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {items.map((item) => (
            <Card key={item.id}>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold">{item.display_name}</h3>
                      <p className="text-sm text-muted-foreground mb-2">
                        {item.description}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="outline">{item.value_type}</Badge>
                        <span>Key: {item.key}</span>
                        {item.is_required && <Badge variant="destructive">Required</Badge>}
                        {item.is_readonly && <Badge variant="secondary">Read Only</Badge>}
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Value</label>
                    {renderValueInput(item)}
                    {item.help_text && (
                      <p className="text-xs text-muted-foreground">{item.help_text}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

export default ConfigurationManagement
