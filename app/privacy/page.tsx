import Link from 'next/link'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-navy text-text">
      <nav className="h-14 bg-navy-light/95 backdrop-blur border-b border-white/8 flex items-center justify-between px-6">
        <Link href="/" className="font-head font-bold text-gold tracking-widest hover:text-gold-dim transition-colors">≡ WORLD CHASE</Link>
        <Link href="/" className="text-xs font-head text-text-muted hover:text-white transition-colors">← HOME</Link>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-12">
        <div className="text-xs text-gold font-head tracking-[0.3em] mb-2">LEGAL</div>
        <h1 className="font-head font-bold text-3xl text-white mb-2">Privacy Policy</h1>
        <p className="text-text-muted font-head text-xs mb-10">Last updated: May 2026</p>

        <div className="space-y-8 font-head text-text-muted text-sm leading-relaxed">

          <section>
            <h2 className="text-white font-bold text-base mb-2">1. Information We Collect</h2>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li><strong className="text-white">Account data</strong> — email address, username, display name, country</li>
              <li><strong className="text-white">Game data</strong> — scores, answers submitted, rounds completed, token balances</li>
              <li><strong className="text-white">Payment data</strong> — processed by Stripe; we never store card details</li>
              <li><strong className="text-white">Chat messages</strong> — messages you send in global chat</li>
              <li><strong className="text-white">Usage data</strong> — pages visited, actions taken (via Vercel analytics if enabled)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-white font-bold text-base mb-2">2. How We Use Your Information</h2>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>To operate and improve the Game</li>
              <li>To display leaderboards and Hall of Fame rankings</li>
              <li>To process token purchases and award in-game items</li>
              <li>To send account-related emails (verification, password reset)</li>
              <li>To detect and prevent cheating or abuse</li>
            </ul>
          </section>

          <section>
            <h2 className="text-white font-bold text-base mb-2">3. Data Sharing</h2>
            <p>We do not sell your personal data. We share data only with:</p>
            <ul className="list-disc list-inside space-y-1 ml-2 mt-2">
              <li><strong className="text-white">Supabase</strong> — database and authentication provider</li>
              <li><strong className="text-white">Vercel</strong> — hosting and deployment</li>
              <li><strong className="text-white">Stripe</strong> — payment processing</li>
              <li><strong className="text-white">Anthropic</strong> — AI answer checking (only the text of your guess and the challenge location name are sent; no personal data)</li>
              <li><strong className="text-white">Google Maps</strong> — map display in-game</li>
            </ul>
          </section>

          <section>
            <h2 className="text-white font-bold text-base mb-2">4. Public Data</h2>
            <p>Your username, display name, avatar, title, country, scores, and chat messages are publicly visible to other players. Choose a username that does not reveal personal information you wish to keep private.</p>
          </section>

          <section>
            <h2 className="text-white font-bold text-base mb-2">5. Data Retention</h2>
            <p>We retain your account data for as long as your account is active. You may request deletion of your account and associated data by contacting support.</p>
          </section>

          <section>
            <h2 className="text-white font-bold text-base mb-2">6. Cookies</h2>
            <p>We use only essential cookies required for authentication (Supabase session tokens). No advertising or tracking cookies are used.</p>
          </section>

          <section>
            <h2 className="text-white font-bold text-base mb-2">7. Children's Privacy</h2>
            <p>World Chase is not directed at children under 13. We do not knowingly collect personal information from children under 13. If you believe a child has provided us with personal information, please contact us.</p>
          </section>

          <section>
            <h2 className="text-white font-bold text-base mb-2">8. Your Rights</h2>
            <p>Depending on your location, you may have rights to access, correct, or delete your personal data. Contact us via the Support page to exercise these rights.</p>
          </section>

          <section>
            <h2 className="text-white font-bold text-base mb-2">9. Changes to This Policy</h2>
            <p>We may update this Privacy Policy from time to time. We will notify users of significant changes via the platform.</p>
          </section>

          <section>
            <h2 className="text-white font-bold text-base mb-2">10. Contact</h2>
            <p><Link href="/support" className="text-gold hover:text-gold-dim">Contact us via the Support page</Link> with any privacy concerns.</p>
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
