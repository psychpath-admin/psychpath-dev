/** @type {import('tailwindcss').Config} */
export default {
    darkMode: ['class'],
    content: [
    './index.html',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
  	extend: {
  		colors: {
  			// PsychPathway Brand Colors - Enhanced for better contrast
  			primary: '#2563EB',        // Brighter Deep Blue
  			primaryLight: '#3B82F6',   // Lighter Blue
  			secondary: '#F59E0B',      // Brighter Amber
  			secondaryLight: '#FBBF24', // Lighter Amber
  			accent: '#DC2626',         // Brighter Red-Orange
  			accentLight: '#EF4444',    // Lighter Red
  			textDark: '#111827',       // Darker Charcoal
  			textLight: '#4B5563',      // Darker Grey for better contrast
  			bgCard: '#FFFFFF',         // White
  			bgSection: '#F9FAFB',      // Very Light Grey
  			border: '#D1D5DB',         // Darker border for visibility
  			
			// Legacy color mappings for compatibility
			primaryBlue: '#3F72AF',
			secondaryAmber: '#F9AB55',
			accentOrange: '#B26734',
			backgroundCard: '#FFFFFF',
			backgroundSection: '#EEEEEE',
			borderLight: '#E9ECEF',
			
			// Shadcn/ui compatibility (using our brand colors)
			background: 'hsl(var(--background))',
			foreground: 'hsl(var(--foreground))',
			card: {
				DEFAULT: 'hsl(var(--card))',
				foreground: 'hsl(var(--card-foreground))'
			},
			popover: {
				DEFAULT: 'hsl(var(--popover))',
				foreground: 'hsl(var(--popover-foreground))'
			},
			// Note: primary, secondary, accent are defined above as our brand colors
			muted: {
				DEFAULT: 'hsl(var(--muted))',
				foreground: 'hsl(var(--muted-foreground))'
			},
			destructive: {
				DEFAULT: 'hsl(var(--destructive))',
				foreground: 'hsl(var(--destructive-foreground))'
			},
			border: 'hsl(var(--border))',
			input: 'hsl(var(--input))',
			ring: 'hsl(var(--ring))',
			chart: {
				'1': 'hsl(var(--chart-1))',
				'2': 'hsl(var(--chart-2))',
				'3': 'hsl(var(--chart-3))',
				'4': 'hsl(var(--chart-4))',
				'5': 'hsl(var(--chart-5))'
			}
  		},
  		fontFamily: {
  			headings: [
  				'Bebas Neue',
  				'sans-serif'
  			],
  			body: [
  				'Inter',
  				'system-ui',
  				'sans-serif'
  			],
  			labels: [
  				'Lexend Deca',
  				'sans-serif'
  			]
  		},
  		borderRadius: {
  			card: '16px',
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
		boxShadow: {
			psychpath: '0 1px 2px 0 rgba(0,0,0,0.05)'
		},
  		spacing: {
  			section: '24px'
  		}
  	}
  },
  plugins: [require('tailwindcss-animate')],
}

