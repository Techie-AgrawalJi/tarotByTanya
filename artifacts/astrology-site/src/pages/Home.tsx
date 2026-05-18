import { Starfield } from "@/components/Starfield";
import { Navbar } from "@/components/Navbar";
import { Hero } from "@/components/Hero";
import { About } from "@/components/About";
import { Services } from "@/components/Services";
import { Pricing } from "@/components/Pricing";
import { Booking } from "@/components/Booking";
import Reviews from "@/components/Reviews";
import { Footer } from "@/components/Footer";

export default function Home() {
  return (
    <main className="min-h-screen relative font-sans text-foreground">
      <Starfield />
      <Navbar />
      <Hero />
      <About />
      <Services />
      <Pricing />
      <Booking />
      <Reviews />
      <Footer />
    </main>
  );
}
