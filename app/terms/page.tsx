import Link from 'next/link'

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-navy text-text">
      <nav className="h-14 bg-navy-light/95 backdrop-blur border-b border-white/8 flex items-center justify-between px-6">
        <Link href="/" className="font-head font-bold text-gold tracking-widest hover:text-gold-dim transition-colors">≡ WORLD CHASE</Link>
        <Link href="/" className="text-xs font-head text-text-muted hover:text-white transition-colors">← HOME</Link>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-12 prose prose-invert prose-sm">
        <div className="text-xs text-gold font-head tracking-[0.3em] mb-2">LEGAL</div>
        <h1 className="font-head font-bold text-3xl text-white mb-2">Terms of Service</h1>
        <p className="text-text-muted font-head text-xs mb-10">Last updated: May 2026</p>

        <div className="space-y-8 font-head text-text-muted text-sm leading-relaxed">

          <section>
            <h2 className="text-white font-bold text-base mb-2">1. Acceptance of Terms</h2>
            <p>By accessing or using World Chase ("the Game"), you agree to be bound by these Terms of Service. If you do not agree, do not use the Game.</p>
          </section>

          <section>
            <h2 className="text-white font-bold text-base mb-2">2. Eligibility</h2>
            <p>You must be at least 13 years of age to use World Chase. By creating an account you confirm you meet this requirement.</p>
          </section>

          <section>
            <h2 className="text-white font-bold text-base mb-2">3. Accounts</h2>
            <p>You are responsible for maintaining the security of your account and password. You are responsible for all activity that occurs under your account. Do not share your credentials.</p>
          </section>

          <section>
            <h2 className="text-white font-bold text-base mb-2">4. Tokens and Purchases</h2>
            <p>Tokens are virtual in-game currency with no real-world monetary value and cannot be exchanged for cash. All token purchases are final and non-refundable unless required by law. We reserve the right to modify token pricing at any time.</p>
          </section>

          <section>
            <h2 className="text-white font-bold text-base mb-2">5. Acceptable Use</h2>
            <p>You agree not to: cheat, exploit bugs, use automated scripts or bots, harass other players in chat, or attempt to reverse-engineer the platform. Violations may result in account suspension or permanent ban without refund.</p>
          </section>

          <section>
            <h2 className="text-white font-bold text-base mb-2">6. Content</h2>
            <p>Messages posted in the global chat are public. Do not post personal information, offensive material, spam, or illegal content. We reserve the right to remove any content and terminate accounts at our discretion.</p>
          </section>

          <section>
            <h2 className="text-white font-bold text-base mb-2">7. Intellectual Property</h2>
            <p>All game content, challenges, imagery, and code are the property of World Chase. You may not reproduce or distribute any part of the Game without written permission.</p>
          </section>

          <section>
            <h2 className="text-white font-bold text-base mb-2">8. Disclaimer of Warranties</h2>
            <p>The Game is provided "as is" without warranty of any kind. We do not guarantee uninterrupted or error-free service.</p>
          </section>

          <section>
            <h2 className="text-white font-bold text-base mb-2">9. Limitation of Liability</h2>
            <p>To the maximum extent permitted by law, World Chase shall not be liable for any indirect, incidental, or consequential damages arising from your use of the Game.</p>
          </section>

          <section>
            <h2 className="text-white font-bold text-base mb-2">10. Changes to Terms</h2>
            <p>We may update these Terms at any time. Continued use of the Game after changes constitutes acceptance of the new Terms.</p>
          </section>

          <section>
            <h2 className="text-white font-bold text-base mb-2">11. Contact</h2>
            <p>Questions? <Link href="/support" className="text-gold hover:text-gold-dim">Contact us via the Support page</Link>.</p>
          </section>

        </div>
      </div>

      <footer className="border-t border-white/8 py-6 mt-10">
        <div className="max-w-3xl mx-auto px-6 flex gap-6 justify-center">
          <Link href="/terms"   className="text-xs font-head text-text-muted/50 hover:text-text-muted">Terms of Service</Link>
          <span className="text-text-muted/30 text-xs">·</span>
          <Link href="/privacy" className="text-xs font-head text-text-muted/50 hover:text-text-muted">Privacy Policy</Link>
          <span className="text-text-muted/30 text-xs">·</span>
          <Link href="/support" className="text-xs font-head text-text-muted/50 hover:text-text-muted">Support</Link>
        </div>
      </footer>
    </div>
  )
}
