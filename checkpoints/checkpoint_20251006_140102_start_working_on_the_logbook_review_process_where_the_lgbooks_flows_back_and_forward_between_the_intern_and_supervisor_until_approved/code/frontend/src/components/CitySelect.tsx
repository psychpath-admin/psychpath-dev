import React from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { cityOptions, getCityInfo } from '../lib/cityMapping'

interface CitySelectProps {
  value?: string
  onValueChange: (city: string) => void
  placeholder?: string
  disabled?: boolean
}

export function CitySelect({ value, onValueChange, placeholder = "Select a city", disabled = false }: CitySelectProps) {
  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {cityOptions.map((city) => {
          const cityInfo = getCityInfo(city)
          return (
            <SelectItem key={city} value={city}>
              {city} {cityInfo && `(${cityInfo.state})`}
            </SelectItem>
          )
        })}
      </SelectContent>
    </Select>
  )
}

export default CitySelect

