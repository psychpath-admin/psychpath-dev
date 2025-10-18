import { motion } from 'framer-motion'
import BaseLayout from '../layouts/BaseLayout'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { fadeIn, slideUp, stagger } from '../utils/motion'

export default function DesignSystemExample() {
  return (
    <BaseLayout className="min-h-screen">
      <div className="min-h-screen grid lg:grid-cols-2">
        {/* Left side - Gradient Hero */}
        <motion.div 
          className="brand-hero flex flex-col justify-center items-center text-white p-8 lg:p-16"
          initial="hidden"
          animate="visible"
          variants={fadeIn}
        >
          <motion.div 
            className="text-center space-y-6"
            variants={stagger}
          >
            <motion.div variants={slideUp}>
              <img 
                src="/psychpath-logo.png" 
                alt="PsychPATH Logo" 
                className="h-16 w-auto mx-auto mb-8"
              />
            </motion.div>
            
            <motion.h1 
              className="text-4xl lg:text-6xl font-headings font-bold"
              variants={slideUp}
            >
              Every Milestone.
            </motion.h1>
            
            <motion.h2 
              className="text-4xl lg:text-6xl font-headings font-bold"
              variants={slideUp}
            >
              Every Endorsement.
            </motion.h2>
            
            <motion.h3 
              className="text-4xl lg:text-6xl font-headings font-bold"
              variants={slideUp}
            >
              One Path.
            </motion.h3>
            
            <motion.p 
              className="text-xl lg:text-2xl font-body opacity-90 max-w-lg mx-auto"
              variants={slideUp}
            >
              Professional psychology training and assessment platform for provisional psychologists and registrars.
            </motion.p>
            
            <motion.div 
              className="flex flex-col sm:flex-row gap-4 justify-center mt-8"
              variants={slideUp}
            >
              <Button variant="secondary" size="lg">
                Learn More
              </Button>
              <Button variant="accent" size="lg">
                Get Started
              </Button>
            </motion.div>
          </motion.div>
        </motion.div>

        {/* Right side - Form Card */}
        <motion.div 
          className="bg-background flex items-center justify-center p-8"
          initial="hidden"
          animate="visible"
          variants={slideUp}
        >
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Welcome to PsychPATH</CardTitle>
              <CardDescription>
                Sign in to access your psychology training dashboard
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-6">
              <motion.div 
                className="space-y-4"
                initial="hidden"
                animate="visible"
                variants={stagger}
              >
                <motion.div className="space-y-2" variants={slideUp}>
                  <Label htmlFor="email">Email Address</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    placeholder="Enter your email"
                  />
                </motion.div>
                
                <motion.div className="space-y-2" variants={slideUp}>
                  <Label htmlFor="password">Password</Label>
                  <Input 
                    id="password" 
                    type="password" 
                    placeholder="Enter your password"
                  />
                </motion.div>
                
                <motion.div className="space-y-4" variants={slideUp}>
                  <Button className="w-full" size="lg">
                    Sign In
                  </Button>
                  
                  <div className="text-center">
                    <Button variant="ghost" size="sm">
                      Forgot your password?
                    </Button>
                  </div>
                </motion.div>
              </motion.div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
      
      {/* Brand Showcase Section */}
      <motion.section 
        className="py-16 px-8 bg-background"
        initial="hidden"
        animate="visible"
        variants={fadeIn}
      >
        <div className="max-w-6xl mx-auto">
          <motion.div 
            className="text-center mb-12"
            variants={slideUp}
          >
            <h2 className="text-3xl font-headings font-bold text-text mb-4">
              PsychPATH Design System
            </h2>
            <p className="text-textLight font-body max-w-2xl mx-auto">
              A cohesive design system built with Tailwind CSS, ShadCN UI, and Framer Motion, 
              featuring professional typography and smooth animations.
            </p>
          </motion.div>
          
          <motion.div 
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-8"
            variants={stagger}
          >
            <motion.div variants={slideUp}>
              <Card>
                <CardHeader>
                  <CardTitle>Brand Colors</CardTitle>
                  <CardDescription>
                    Professional blue palette with semantic colors
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-brand"></div>
                      <span className="font-body text-sm">Primary Blue (#004C9A)</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-brand-accent"></div>
                      <span className="font-body text-sm">Accent Blue (#33B0E5)</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-success"></div>
                      <span className="font-body text-sm">Success (#0FA958)</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
            
            <motion.div variants={slideUp}>
              <Card>
                <CardHeader>
                  <CardTitle>Typography</CardTitle>
                  <CardDescription>
                    Lexend for headings, Inter for body text
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <h3 className="font-headings font-bold text-lg">Lexend Heading</h3>
                    <p className="font-body text-textLight">
                      Inter body text for optimal readability and professional appearance.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
            
            <motion.div variants={slideUp}>
              <Card>
                <CardHeader>
                  <CardTitle>Components</CardTitle>
                  <CardDescription>
                    Consistent buttons, cards, and inputs
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <Button size="sm">Primary</Button>
                    <Button variant="outline" size="sm">Outline</Button>
                    <Button variant="accent" size="sm">Accent</Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        </div>
      </motion.section>
    </BaseLayout>
  )
}
