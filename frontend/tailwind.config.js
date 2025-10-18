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
  			// PsychPATH Brand System - Official Colors
  			brand: {
				DEFAULT: '#004C9A',      // Primary Blue
				accent: '#33B0E5',       // Accent Blue
				dark: '#003366',         // Dark Blue
				light: '#E6F2FF',        // Light Blue
			},
			
			// Semantic Colors
			background: '#F7FAFC',       // Background
			surface: '#FFFFFF',          // Surface/Card
			text: '#1E293B',             // Primary Text
			textLight: '#64748B',        // Secondary Text
			success: '#0FA958',          // Success Green
			warning: '#FACC15',          // Warning Yellow
			error: '#EF4444',            // Error Red
			
			// Legacy compatibility
			primary: '#004C9A',
			primaryLight: '#33B0E5',
			secondary: '#F59E0B',
			secondaryLight: '#FBBF24',
			accent: '#DC2626',
			accentLight: '#EF4444',
			textDark: '#1E293B',
			bgCard: '#FFFFFF',
			bgSection: '#F7FAFC',
			border: '#E2E8F0',
			
			// Legacy color mappings for compatibility
			primaryBlue: '#004C9A',
			secondaryAmber: '#F9AB55',
			accentOrange: '#B26734',
			backgroundCard: '#FFFFFF',
			backgroundSection: '#F7FAFC',
			borderLight: '#E2E8F0',
			
			// Shadcn/ui compatibility
			foreground: 'hsl(var(--foreground))',
			card: {
				DEFAULT: 'hsl(var(--card))',
				foreground: 'hsl(var(--card-foreground))'
			},
			popover: {
				DEFAULT: 'hsl(var(--popover))',
				foreground: 'hsl(var(--popover-foreground))'
			},
			muted: {
				DEFAULT: 'hsl(var(--muted))',
				foreground: 'hsl(var(--muted-foreground))'
			},
			destructive: {
				DEFAULT: 'hsl(var(--destructive))',
				foreground: 'hsl(var(--destructive-foreground))'
			},
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
  				'Lexend',
  				'sans-serif'
  			],
  			body: [
  				'Inter',
  				'system-ui',
  				'sans-serif'
  			],
  			labels: [
  				'Lexend',
  				'sans-serif'
  			]
  		},
  		borderRadius: {
  			card: '1rem',               // 16px
  			xl: '1.5rem',               // 24px for cards
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
		boxShadow: {
			psychpath: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
			'psychpath-lg': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
			'psychpath-xl': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
		},
  		spacing: {
  			section: '1.5rem'           // 24px
  		}
  	}
  },
  plugins: [require('tailwindcss-animate')],
}

