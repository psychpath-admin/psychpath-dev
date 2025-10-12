import { useState, useEffect } from 'react'
// import configurationService from '@/services/configurationService' // Temporarily disabled

interface ButtonConfig {
  createOnly: string
  createAndCra: string
  updateOnly: string
  updateAndCra: string
}

const defaultButtonConfig: ButtonConfig = {
  createOnly: 'Create DCC Entry',
  createAndCra: 'Create DCC + CRA',
  updateOnly: 'Update DCC Entry',
  updateAndCra: 'Update DCC Entry + Create a CRA'
}

/**
 * Hook to get button wording configurations for DCC forms
 * @param isEditing - Whether the form is in edit mode
 * @returns Button configuration object with appropriate labels
 */
export const useButtonConfig = (isEditing: boolean = false) => {
  const [buttonConfig, setButtonConfig] = useState<ButtonConfig>(defaultButtonConfig)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadButtonConfig = async () => {
      try {
        // Temporarily disable configuration loading to avoid 500 errors
        // Load the button text configuration from the backend
        // await configurationService.loadConfiguration('ui_button_text')
        
        // Use defaults for now
        setButtonConfig(defaultButtonConfig)
        
        // TODO: Re-enable when configuration API is fixed
        // Get individual configuration values
        // const newConfig: ButtonConfig = {
        //   createOnly: configurationService.getValue('ui_button_text', 'dcc_form_button_create_only', defaultButtonConfig.createOnly),
        //   createAndCra: configurationService.getValue('ui_button_text', 'dcc_form_button_create_and_cra', defaultButtonConfig.createAndCra),
        //   updateOnly: configurationService.getValue('ui_button_text', 'dcc_form_button_update_only', defaultButtonConfig.updateOnly),
        //   updateAndCra: configurationService.getValue('ui_button_text', 'dcc_form_button_update_and_cra', defaultButtonConfig.updateAndCra)
        // }
        // setButtonConfig(newConfig)
      } catch (error) {
        console.warn('Failed to load button configurations, using defaults:', error)
        setButtonConfig(defaultButtonConfig)
      } finally {
        setLoading(false)
      }
    }

    loadButtonConfig()
  }, [])

  // Return the appropriate button text based on edit mode
  const getButtonText = (includeCra: boolean = false) => {
    if (isEditing) {
      return includeCra ? buttonConfig.updateAndCra : buttonConfig.updateOnly
    } else {
      return includeCra ? buttonConfig.createAndCra : buttonConfig.createOnly
    }
  }

  return {
    buttonConfig,
    getButtonText,
    loading,
    isEditing
  }
}

export default useButtonConfig
