import React, { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useHuntStore } from '../store/huntStore'
import { useThesisStore } from '../store/thesisStore'
import { useVolatilityStore } from '../store/volatilityStore'
import type { VolRegime, TermStructure } from '../api/volatilityOverlay'
import { AskAIDock } from '../components/ui/AskAIDock'
import { EmptyState } from '../components/ui/EmptyState'
import { useTopBar } from '../store/topbarStore'
import { addHuntThesisToDossier, isDuplicateInDossier } from '../utils/huntToThesis'

const tk = {
  bg: '#ede9e0', surface: '#fbf8f1', border: 'rgba(216,208,196,0.7)',
  borderStrong: 'rgba(0,0,0,0.12)', amber: '#f4922c',
  amberGrad: 'linear-gradient(to bottom, #ffd87a 0%, #f4922c 35%, #e0511a 70%, #a01a0c 100%)',
  text: '#1a1a1f', textMid: '#56504a', textMuted: '#a8a5a0',
  green: '#2d6a4f', greenLight: 'rgba(45,106,79,0.10)',
  red: '#9b2c1a', redLight: 'rgba(155,44,26,0.10)',
  blue: '#1e4d6b', blueLight: 'rgba(30,77,107,0.10)',
}

function convictionColor(score: number) {
  if (score >= 75) return tk.green
  if (score >= 50) return tk.amber
  return tk.red
}

const ConvictionBar: React.FC<{ score: number; label: string }> = ({ score, label }) => {
  const color = convictionColor(score)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 200 }}>
      <div style={{ flex: 1, height: 5, borderRadius: 3, background: 'rgba(216,208,196,0.5)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${score}%`, background: color, borderRadius: 3 }} />
      </div>
      <span style={{ fontFamily: 'GeistMono, monospace', fontSize: 11, fontWeight: 700, color, minWidth: 28 }}>
        {score}
      </span>
      <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', padding: '2px 7px', borderRadius: 4, background: color === tk.green ? tk.greenLight : color === tk.amber ? 'rgba(244,146,44,0.12)' : tk.redLight, color, border: `1px solid ${color}40` }}>
        {label}
      </span>
    </div>
  )
}

const ActionBadge: React.FC<{ action: string }> = ({ action }) => {
  const cfg = {
    advance_to_dossier: { label: 'Advance', color: tk.green, bg: tk.greenLight },
    watch:              { label: 'Watch', color: tk.amber, bg: 'rgba(244,146,44,0.12)' },
    pass:               { label: 'Pass', color: tk.textMuted, bg: 'rgba(216,208,196,0.35)' },
  }[action] ?? { label: action, color: tk.textMuted, bg: 'rgba(216,208,196,0.35)' }
  return (
    <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', padding: '4px 10px', borderRadius: 5, background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}40` }}>
      {cfg.label}
    </span>
  )
}

const DetailSection: React.FC<{ title: string; children: React.ReactNode; accent?: boolean }> = ({ title, children, accent }) => (
  <section style={{
    borderRadius: 10,
    padding: '14px 16px',
    background: accent ? 'rgba(244,146,44,0.05)' : tk.surface,
    border: `1px solid ${accent ? 'rgba(244,146,44,0.18)' : tk.border}`,
    boxShadow: '0 1px 4px rgba(60,40,10,0.04)',
  }}>
    <p style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: accent ? tk.amber : tk.textMuted, marginBottom: 10 }}>
      {title}
    </p>
    {children}
  </section>
)

const BulletList: React.FC<{ items: string[]; dotColor?: string }> = ({ items, dotColor = tk.textMuted }) => (
  <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 5 }}>
    {items.map((item, i) => (
      <li key={i} style={{ display: 'flex', gap: 7, fontSize: 12, color: tk.textMid, lineHeight: 1.55 }}>
        <span style={{ color: dotColor, flexShrink: 0 }}>·</span>
        {item}
      </li>
    ))}
  </ul>
)

const MetaCell: React.FC<{ label: string; value: string; mono?: boolean }> = ({ label, value, mono }) => (
  <div style={{ padding: '8px 12px', borderRight: '1px solid rgba(216,208,196,0.6)' }}>
    <p style={{ fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: tk.textMuted, marginBottom: 3 }}>
      {label}
    </p>
    <p style={{ fontSize: 12, fontWeight: 600, color: tk.text, lineHeight: 1.2, fontFamily: mono ? 'GeistMono, monospace' : 'inherit' }}>
      {value || '—'}
    </p>
  </div>
)

// ── Vol helpers ───────────────────────────────────────────────────────────────

function volRegimeColor(regime: VolRegime) {
  return {
    Calm:     { text: '#2d6a4f', bg: 'rgba(45,106,79,0.10)',  border: 'rgba(45,106,79,0.25)' },
    Elevated: { text: '#7a4a0c', bg: 'rgba(196,137,42,0.12)', border: 'rgba(196,137,42,0.30)' },
    Spike:    { text: '#9a3a10', bg: 'rgba(224,81,26,0.12)',  border: 'rgba(224,81,26,0.30)' },
    Crash:    { text: '#7a1a1a', bg: 'rgba(155,44,26,0.12)',  border: 'rgba(155,44,26,0.30)' },
  }[regime]
}

function volEntryGuidance(regime: VolRegime, ts: TermStructure) {
  if (regime === 'Calm') return {
    sizing: 'Full target size viable — no vol premium penalty on entry.',
    timing: 'Systematic entry; no urgency discount or fear premium to exploit.',
    thesis: 'Low uncertainty priced in. Thesis must stand on fundamentals. Options are cheap if you want a defined-risk structure.',
  }
  if (regime === 'Elevated' && ts !== 'backwardation') return {
    sizing: 'Start at 60–70% of target; reserve remainder for pullbacks.',
    timing: 'Contango term structure signals no imminent escalation — allow 1–2 weeks to find entry.',
    thesis: 'Elevated uncertainty but no near-term panic. Scale in over time; selling put spreads at entry targets exploits elevated IV.',
  }
  if (regime === 'Elevated') return {
    sizing: 'Start at 40–50%; backwardation = acute gap risk on entries.',
    timing: 'Wait for term structure to normalize to contango before adding full size.',
    thesis: 'Market hedging near-dated fear. If thesis is intact, creates asymmetric entry. Define risk explicitly — smaller initial size, clear invalidation level.',
  }
  if (regime === 'Spike') return {
    sizing: '30–50% initial; leave significant dry powder for follow-on.',
    timing: 'Best entries historically 3–7 days after VIX peaks — patience creates asymmetry.',
    thesis: 'Stress may be creating forced-seller dislocations. Confirm transmission path is intact before scaling. This vol regime stress-tests all core assumptions.',
  }
  return {
    sizing: '20–30% only; disciplined tranches, no chasing.',
    timing: 'Capitulation vol can mark generational entries — but requires proof of floor before scaling.',
    thesis: 'Crash vol tests every assumption. Only add when macro catalyst is confirmed and transmission path survives the stress scenario.',
  }
}

const VolIntelSection: React.FC = () => {
  const { regime, isLoading, fetch } = useVolatilityStore()
  useEffect(() => { if (!regime && !isLoading) fetch() }, [])
  if (!regime) return null

  const c = volRegimeColor(regime.regime)
  const guidance = volEntryGuidance(regime.regime, regime.termStructure)

  return (
    <section style={{
      borderRadius: 10, padding: '14px 16px',
      background: tk.surface, border: `1px solid ${tk.border}`,
      boxShadow: '0 1px 4px rgba(60,40,10,0.04)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <p style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: tk.textMuted, margin: 0, flex: 1 }}>
          Vol Intelligence
        </p>
        <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', padding: '2px 8px', borderRadius: 99, color: c.text, background: c.bg, border: `1px solid ${c.border}` }}>
          {regime.regime}
        </span>
        <span style={{ fontFamily: 'GeistMono, monospace', fontSize: 11, fontWeight: 700, color: tk.text }}>
          VIX {regime.level.toFixed(1)}
        </span>
        {regime.termStructure !== 'unknown' && (
          <span style={{ fontSize: 10, color: tk.textMuted, fontFamily: 'GeistMono, monospace' }}>
            {regime.termStructure}
          </span>
        )}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        {([
          ['Entry Sizing', guidance.sizing],
          ['Timing', guidance.timing],
          ['Trade Implication', guidance.thesis],
        ] as [string, string][]).map(([label, text]) => (
          <div key={label} style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 12 }}>
            <span style={{ fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: tk.textMuted, paddingTop: 2 }}>
              {label}
            </span>
            <span style={{ fontSize: 12, color: tk.textMid, lineHeight: 1.55 }}>
              {text}
            </span>
          </div>
        ))}
      </div>
    </section>
  )
}

export const StockDetailScreen: React.FC = () => {
  const { ticker } = useParams<{ ticker: string }>()
  const navigate = useNavigate()
  const brief = useHuntStore(s =>
    s.stockResult?.opportunities.find(o => o.ticker.toUpperCase() === ticker?.toUpperCase())
  )
  const thesesMap = useThesisStore(s => s.theses)

  useTopBar({
    title: brief?.companyName ?? ticker ?? 'Stock Detail',
    backTo: '/hunt',
    backLabel: 'Hunt',
    crumb: ticker ?? '',
  })

  if (!brief) {
    return (
      <div style={{ padding: 20 }}>
        <EmptyState
          title="No detail available"
          description={`No hunt result for ${ticker}. Run a hunt first to populate details.`}
          action={{ label: '← Back to Hunt', onClick: () => navigate('/hunt') }}
        />
      </div>
    )
  }

  const isDup = isDuplicateInDossier(thesesMap, brief.ticker)

  const handleAdvance = () => {
    if (isDup) return
    const thesis = addHuntThesisToDossier({
      ticker: brief.ticker,
      displayName: brief.companyName,
      thesisType: brief.thesisType,
      mispricedVariable: brief.mispricedVariable,
      thesisStatement: brief.thesisStatement,
      transmissionPath: brief.transmissionPath,
      variantPerception: brief.variantPerception,
      vaultSignals: brief.vaultSignals,
      keyRisks: brief.keyRisks,
      killConditions: brief.killConditions,
    }, 'Standalone')
    navigate(`/thesis/${thesis.id}`)
  }

  return (
    <>
      <div style={{ padding: 20, maxWidth: 860, display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* ── Hero card ── */}
        <div style={{ display: 'flex', borderRadius: 12, overflow: 'hidden', background: 'rgba(248,244,238,0.92)', border: `1px solid ${tk.border}`, boxShadow: '0 2px 12px rgba(60,40,10,0.08)' }}>
          <div style={{ width: 4, flexShrink: 0, background: tk.amberGrad }} />
          <div style={{ flex: 1, padding: '16px 18px' }}>
            {/* Title row */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 12 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                  {brief.rank <= 3 && (
                    <div style={{ width: 26, height: 26, borderRadius: 6, flexShrink: 0, background: brief.rank === 1 ? tk.amber : 'rgba(216,208,196,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: 11, fontWeight: 800, color: brief.rank === 1 ? '#fff' : tk.textMuted }}>#{brief.rank}</span>
                    </div>
                  )}
                  <span style={{ fontFamily: 'GeistMono, monospace', fontSize: 22, fontWeight: 800, color: tk.text, letterSpacing: '-0.01em' }}>
                    {brief.ticker}
                  </span>
                  <span style={{ fontSize: 15, color: tk.textMid, fontWeight: 500 }}>{brief.companyName}</span>
                </div>
                <ConvictionBar score={brief.conviction} label={brief.convictionLabel} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, paddingTop: 4 }}>
                <ActionBadge action={brief.suggestedAction} />
                {brief.suggestedAction === 'advance_to_dossier' && (
                  <button
                    onClick={handleAdvance}
                    disabled={isDup}
                    style={{
                      padding: '8px 18px', borderRadius: 8, border: 'none', cursor: isDup ? 'not-allowed' : 'pointer',
                      fontSize: 12, fontWeight: 700, color: '#fff',
                      background: isDup ? 'rgba(216,208,196,0.6)' : `linear-gradient(135deg, ${tk.amber}, #c4692a)`,
                      boxShadow: isDup ? 'none' : '0 2px 8px rgba(244,146,44,0.30)',
                      opacity: isDup ? 0.6 : 1,
                    }}
                  >
                    {isDup ? 'Already in Dossier' : 'Advance to Dossier →'}
                  </button>
                )}
              </div>
            </div>

            {/* Meta strip */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', borderTop: '1px solid rgba(216,208,196,0.6)' }}>
              <MetaCell label="Thesis Type" value={brief.thesisType.replace(/([A-Z])/g, ' $1').trim()} />
              <MetaCell label="Mispriced Variable" value={brief.mispricedVariable.replace(/([A-Z])/g, ' $1').trim()} />
              <MetaCell label="Vault Signals" value={`${brief.vaultSignals.length}`} mono />
              <div style={{ padding: '8px 12px' }}>
                <p style={{ fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: tk.textMuted, marginBottom: 3 }}>Action</p>
                <ActionBadge action={brief.suggestedAction} />
              </div>
            </div>
          </div>
        </div>

        <VolIntelSection />

        {/* ── Thesis ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <DetailSection title="Thesis Statement" accent>
            <p style={{ fontSize: 13, color: tk.text, fontWeight: 500, lineHeight: 1.6, margin: 0 }}>
              {brief.thesisStatement}
            </p>
          </DetailSection>
          <DetailSection title="Transmission Path">
            <p style={{ fontSize: 12, color: tk.textMid, lineHeight: 1.65, margin: 0 }}>
              {brief.transmissionPath}
            </p>
          </DetailSection>
        </div>

        <DetailSection title="Variant Perception" accent>
          <p style={{ fontSize: 12, color: tk.textMid, lineHeight: 1.65, margin: 0 }}>
            {brief.variantPerception}
          </p>
        </DetailSection>

        {/* ── Evidence ── */}
        <div>
          <p style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: tk.textMuted, marginBottom: 8 }}>
            Evidence Chain
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            {brief.vaultSignals.length > 0 && (
              <DetailSection title="Your Vault Signals">
                <BulletList items={brief.vaultSignals} dotColor={tk.amber} />
              </DetailSection>
            )}
            {brief.pitchbookContext && (
              <DetailSection title="PitchBook Context">
                <p style={{ fontSize: 12, color: tk.textMid, lineHeight: 1.55, margin: 0 }}>{brief.pitchbookContext}</p>
              </DetailSection>
            )}
            {brief.morningstarView && (
              <DetailSection title="Morningstar View">
                <p style={{ fontSize: 12, color: tk.textMid, lineHeight: 1.55, margin: 0 }}>{brief.morningstarView}</p>
              </DetailSection>
            )}
            {brief.marketMetrics && (
              <DetailSection title="Market Metrics">
                <p style={{ fontSize: 12, color: tk.textMid, lineHeight: 1.55, margin: 0, fontFamily: 'GeistMono, monospace' }}>{brief.marketMetrics}</p>
              </DetailSection>
            )}
            {brief.insiderSignal && (
              <DetailSection title="Insider Signal">
                <p style={{ fontSize: 12, color: tk.textMid, lineHeight: 1.55, margin: 0 }}>{brief.insiderSignal}</p>
              </DetailSection>
            )}
            {brief.analystConsensus && (
              <DetailSection title="Analyst Consensus">
                <p style={{ fontSize: 12, color: tk.textMid, lineHeight: 1.55, margin: 0 }}>{brief.analystConsensus}</p>
              </DetailSection>
            )}
          </div>
        </div>

        {/* ── Risks ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {brief.keyRisks.length > 0 && (
            <DetailSection title="Key Risks">
              <BulletList items={brief.keyRisks} dotColor={tk.red} />
            </DetailSection>
          )}
          {brief.killConditions.length > 0 && (
            <DetailSection title="Kill Conditions">
              <BulletList items={brief.killConditions} dotColor={tk.red} />
            </DetailSection>
          )}
        </div>

        {brief.advisorVerdict && (
          <DetailSection title="Advisor Verdict" accent>
            <p style={{ fontSize: 12, color: tk.textMid, lineHeight: 1.65, margin: 0 }}>{brief.advisorVerdict}</p>
          </DetailSection>
        )}

        {/* ── Watch triggers ── */}
        {brief.watchTriggers && brief.watchTriggers.length > 0 && (
          <DetailSection title="Watch Triggers">
            <BulletList items={brief.watchTriggers} dotColor={tk.amber} />
          </DetailSection>
        )}

        {/* ── Action bar ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 4 }}>
          <button
            onClick={() => navigate('/hunt')}
            style={{ padding: '8px 16px', borderRadius: 8, background: 'transparent', border: `1px solid ${tk.borderStrong}`, fontSize: 12, fontWeight: 500, color: tk.textMid, cursor: 'pointer' }}
          >
            ← Back to Hunt
          </button>
          {brief.suggestedAction === 'advance_to_dossier' && (
            <button
              onClick={handleAdvance}
              disabled={isDup}
              style={{
                padding: '10px 24px', borderRadius: 9, border: 'none', cursor: isDup ? 'not-allowed' : 'pointer',
                fontSize: 13, fontWeight: 700, color: '#fff',
                background: isDup ? 'rgba(216,208,196,0.6)' : `linear-gradient(135deg, ${tk.amber}, #c4692a)`,
                boxShadow: isDup ? 'none' : '0 4px 14px rgba(244,146,44,0.35)',
                opacity: isDup ? 0.6 : 1,
              }}
            >
              {isDup ? 'Already in Dossier' : 'Advance to Dossier →'}
            </button>
          )}
        </div>

      </div>

      <AskAIDock
        context={`Stock: ${brief.ticker} — ${brief.companyName}`}
        starterQuestions={[
          `What is the biggest risk to the ${brief.ticker} thesis?`,
          `How does the current macro regime affect ${brief.ticker}?`,
          `What signals would confirm the transmission path for ${brief.ticker}?`,
          `Is there a better expression of this thesis than ${brief.ticker}?`,
        ]}
      />
    </>
  )
}
