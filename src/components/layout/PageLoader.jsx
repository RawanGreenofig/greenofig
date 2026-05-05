import { motion } from 'framer-motion'

export function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center"
      >
        <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mb-4 animate-pulse">
          <span className="text-primary-foreground font-bold text-2xl">G</span>
        </div>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: 120 }}
          transition={{ duration: 1, repeat: Infinity }}
          className="h-1 bg-primary rounded-full"
        />
        <p className="mt-4 text-muted-foreground text-sm">Loading...</p>
      </motion.div>
    </div>
  )
}
