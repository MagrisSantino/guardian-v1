import { SmoothScroll } from "@/components/landing/smooth-scroll"
import { Navbar } from "@/components/landing/navbar"
import { Hero } from "@/components/landing/hero"
import { Stats } from "@/components/landing/stats"
import { Features } from "@/components/landing/features"
import { HowItWorks } from "@/components/landing/how-it-works"
import { Purpose } from "@/components/landing/purpose"
import { Comments } from "@/components/landing/comments"
import { BottomCTA } from "@/components/landing/bottom-cta"
import { Footer } from "@/components/landing/footer"

export default function HomePage() {
  return (
    <SmoothScroll>
      <main className="min-h-screen">
        <Navbar />
        <Hero />
        <Stats />
        <Features />
        <HowItWorks />
        <Purpose />
        <Comments />
        <BottomCTA />
        <Footer />
      </main>
    </SmoothScroll>
  )
}
