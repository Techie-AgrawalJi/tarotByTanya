import { Mail, Phone } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { SiFacebook, SiInstagram, SiWhatsapp } from "react-icons/si";

export function Footer() {
  return (
    <footer
      data-testid="footer"
      className="border-t border-white/10 bg-[#05050f] px-4 py-10 md:py-12 relative z-10"
    >
      <div className="container mx-auto max-w-6xl space-y-8">
        <div className="space-y-3 text-base">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-foreground/45">
            Contact
          </div>
          <div className="flex flex-col gap-3 lg:flex-row lg:flex-nowrap lg:items-center lg:gap-6">
            <a
              href="mailto:tanyaagrawal1711@gmail.com"
              className="flex items-center gap-3 text-foreground/70 hover:text-primary transition-colors"
            >
              <Mail className="w-4 h-4 text-primary shrink-0" />
              <span>tanyaagrawal1711@gmail.com</span>
            </a>
            <a
              href="tel:+917877082223"
              className="flex items-center gap-3 text-foreground/70 hover:text-primary transition-colors"
            >
              <Phone className="w-4 h-4 text-primary shrink-0" />
              <span>+91 78770 82223</span>
            </a>
            <a
              href="https://wa.me/917877082223?text=Namaste!%20Mujhe%20ek%20reading%20book%20karni%20hai."
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 text-foreground/70 hover:text-[#25D366] transition-colors"
            >
              <SiWhatsapp className="w-4 h-4 text-[#25D366] shrink-0" />
              <span>WhatsApp chat</span>
            </a>
          </div>
        </div>

        <div className="flex flex-col gap-4 text-base text-foreground/55 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3 lg:justify-end">
            <a
              href="https://www.instagram.com/tarot_reader_tanyaa11?igsh=MTgzbzVoYTNvcGtjcQ=="
              className="w-9 h-9 rounded-full border border-white/10 bg-white/5 flex items-center justify-center text-foreground/70 hover:text-white hover:bg-[#E1306C] hover:border-[#E1306C] transition-colors"
              aria-label="Instagram"
              target="_blank"
            >
              <SiInstagram className="w-4 h-4" />
            </a>
            <a
              href="https://www.facebook.com/share/18dVDhxxQM/"
              className="w-9 h-9 rounded-full border border-white/10 bg-white/5 flex items-center justify-center text-foreground/70 hover:text-white hover:bg-[#1877F2] hover:border-[#1877F2] transition-colors"
              aria-label="Facebook"
              target="_blank"
            >
              <SiFacebook className="w-4 h-4" />
            </a>
          </div>
          <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:gap-6 lg:gap-8">
            <Dialog>
              <DialogTrigger asChild>
                <button className="hover:text-primary transition-colors">
                  Privacy Policy
                </button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto bg-[#0b0b18] border-white/10 text-left">
                <DialogHeader>
                  <DialogTitle className="text-white">
                    Privacy Policy
                  </DialogTitle>
                  <DialogDescription className="text-foreground/60">
                    How we handle your information when you use the site or book
                    a reading.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 text-base leading-7 text-foreground/75">
                  <p>
                    We collect the details you share through the booking form,
                    WhatsApp, email, and review forms, including your name,
                    phone number, email, date of birth, and reading preferences.
                  </p>
                  <p>
                    We use this information to respond to inquiries, schedule
                    readings, manage client communication, and improve the
                    website experience. For repeat clients, the WhatsApp number
                    may be used as a unique identifier so we can avoid duplicate
                    records.
                  </p>
                  <p>
                    We do not sell personal data. Information may be shared only
                    with service providers needed to operate the site, such as
                    hosting, form handling, cloud storage, and analytics tools,
                    and only when required to deliver the service.
                  </p>
                  <p>
                    This website is intended for adults seeking spiritual
                    guidance. Please avoid submitting sensitive details unless
                    they are relevant to your reading.
                  </p>
                </div>
              </DialogContent>
            </Dialog>
            <Dialog>
              <DialogTrigger asChild>
                <button className="hover:text-primary transition-colors">
                  Terms &amp; Conditions
                </button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto bg-[#0b0b18] border-white/10 text-left">
                <DialogHeader>
                  <DialogTitle className="text-white">
                    Terms &amp; Conditions
                  </DialogTitle>
                  <DialogDescription className="text-foreground/60">
                    Rules for using the site and booking spiritual services.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 text-base leading-7 text-foreground/75">
                  <p>
                    By using this website, you agree that tarot readings, spell
                    work, healing, manifestation rituals, face reading, and name
                    correction are spiritual services for guidance and
                    reflection.
                  </p>
                  <p>
                    Services are offered to adults only. Any guidance provided
                    is not a substitute for medical, legal, financial, or
                    psychological advice, and no outcome is guaranteed.
                  </p>
                  <p>
                    Booking confirmations are based on availability and the
                    information you provide. Please share accurate details so
                    the reading can be prepared properly.
                  </p>
                  <p>
                    Payments, if applicable, should be made only through the
                    methods communicated on the website or in direct
                    conversation. Cancellations, rescheduling, and refunds are
                    handled case by case.
                  </p>
                  <p>
                    We may refuse service if the request is abusive, fraudulent,
                    inappropriate, or outside the scope of the readings offered
                    on this site.
                  </p>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="pt-6 border-t border-white/5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-base text-foreground/40">
          <p>© 2026 Divine Tanyaa · All Rights Reserved</p>
          <p>Last Updated: May 18, 2026</p>
        </div>
      </div>
    </footer>
  );
}
