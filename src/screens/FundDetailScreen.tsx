import React from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useHuntStore } from '../store/huntStore'
import { useThesisStore } from '../store/thesisStore'
import { AskAIDock } from '../components/ui/AskAIDock'
import { EmptyState } from '../components/ui/EmptyState'
import { useTopBar } from '../store/topbarStore'
import { addHuntThesisToDossier, isDuplicateInDossier } from '../utils/huntToThesis'

const tk = {
  surface: '#fbf8f1', border: 'rgba(216,208,196,0.7)',
  borderStrong: 'rgba(0,0,0,0.12)', amber: '#f4922c',
  amberGrad: 'linear-gradient(to bottom, #ffd87a 0%, #f4922c 35%, #e0511a 70%, #a01a0c 100%)',
  text: '#1a1a1f', textMid: '#56504a', textMuted: '#a8a5a0',
  green: '#2d6a4f', greenLight: 'rgba(45,106,79,0.10)',
  red: '#9b2c1a', redLight: 'rgba(155,44,26,0.10)',
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
    borderRadius: 10, padding: '14px 16px',
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

const MetaCell: React.FC<{ label: string; value: string; mono?: boolean; last?: boolean }> = ({ label, value, mono, last }) => (
  <div style={{ padding: '8px 12px', borderRight: last ? 'none' : '1px solid rgba(216,208,196,0.6)' }}>
    <p style={{ fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: tk.textMuted, marginBottom: 3 }}>
      {label}
    </p>
    <p style={{ fontSize: 12, fontWeight: 600, color: tk.text, lineHeight: 1.2, fontFamily: mono ? 'GeistMono, monospace' : 'inherit' }}>
      {value || '—'}
    </p>
  </div>
)

export const FundDetailScreen: React.FC = () => {
  const { ticker } = useParams<{ ticker: string }>()
  const navigate = useNavigate()
  const brief = useHuntStore(s =>
    s.fundResult?.opportunities.find(o => o.ticker.toUpperCase() === ticker?.toUpperCase())
  )
  const thesesMap = useThesisStore(s => s.theses)

  useTopBar({
    title: brief?.fundName ?? ticker ?? 'Fund Detail',
    backTo: '/hunt',
    backLabel: 'Hunt',
    crumb: ticker ?? '',
  })

  if (!brief) {
    return (
      <div style={{ padding: 20 }}>
        <EmptyState
          title="No detail available"
          description={`No fund hunt result for ${ticker}. Run a fund hunt first.`}
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
      displayName: brief.fundName,
      thesisType: brief.thesisType,
      thesisStatement: `${brief.fundName} (${brief.fundType}) — ${brief.regimeFit}`,
      transmissionPath: brief.transmissionPath,
      variantPerception: brief.variantPerception,
      vaultSignals: brief.topHoldings,
      keyRisks: brief.keyRisks,
      killConditions: brief.killConditions,
    }, 'Standalone')
    navigate(`/thesis/${thesis.id}`)
  }

  const priceDir = brief.priceChange >= 0 ? '+' : ''
  const priceColor = brief.priceChange >= 0 ? tk.green : tk.red

  return (
    <>
      <div style={{ padding: 20, maxWidth: 860, display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* ── Hero card ── */}
        <div style={{ display: 'flex', borderRadius: 12, overflow: 'hidden', background: 'rgba(248,244,238,0.92)', border: `1px solid ${tk.border}`, boxShadow: '0 2px 12px rgba(60,40,10,0.08)' }}>
          <div style={{ width: 4, flexShrink: 0, background: tk.amberGrad }} />
          <div style={{ flex: 1, padding: '16px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 12 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                  {brief.rank <= 3 && (
                    <div style={{ width: 26, height: 26, borderRadius: 6, flexShrink: 0, background: brief.rank === 1 ? tk.amber : 'rgba(216,208,196,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: 11, fontWeight: 800, color: brief.rank === 1 ? '#fff' : tk.textMuted }}>#{brief.rank}</span>
                    </div>
                  )}
                  <span style={{ fontFamily: 'GeistMono, monospace', fontSize: 22, fontWeight: 800, color: tk.text }}>
                    {brief.ticker}
                  </span>
                  <span style={{ fontSize: 15, color: tk.textMid, fontWeight: 500 }}>{brief.fundName}</span>
                  <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', padding: '2px 7px', borderRadius: 4, background: 'rgba(244,146,44,0.12)', color: tk.amber, border: '1px solid rgba(244,146,44,0.25)' }}>
                    {brief.fundType}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <ConvictionBar score={brief.conviction} label={brief.convictionLabel} />
                  {brief.currentPrice > 0 && (
                    <span style={{ fontFamily: 'GeistMono, monospace', fontSize: 13, fontWeight: 600, color: tk.text }}>
                      ${brief.currentPrice.toFixed(2)}
                      <span style={{ color: priceColor, marginLeft: 6, fontSize: 11 }}>
                        {priceDir}{brief.priceChange.toFixed(2)} ({priceDir}{brief.priceChangePct.toFixed(2)}%)
                      </span>
                    </span>
                  )}
                </div>
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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', borderTop: '1px solid rgba(216,208,196,0.6)' }}>
              <MetaCell label="Category" value={brief.category} />
              <MetaCell label="Expense Ratio" value={brief.expenseRatio} mono />
              <MetaCell label="AUM" value={brief.aum} />
              <MetaCell label="Regime Fit" value={brief.regimeFit.slice(0, 30)} />
              <MetaCell label="Action" value="" last>
                <ActionBadge action={brief.suggestedAction} />
              </MetaCell>
            </div>
          </div>
        </div>

        {/* ── Regime Fit & Transmission ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <DetailSection title="Regime Fit" accent>
            <p style={{ fontSize: 12, color: tk.textMid, lineHeight: 1.65, margin: 0 }}>
              {brief.regimeFit}
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

        {/* ── Holdings & Risk ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {brief.topHoldings.length > 0 && (
            <DetailSection title="Top Holdings">
              <BulletList items={brief.topHoldings.slice(0, 8)} dotColor={tk.amber} />
            </DetailSection>
          )}
          {brief.concentrationRisk && (
            <DetailSection title="Concentration Risk">
              <p style={{ fontSize: 12, color: tk.textMid, lineHeight: 1.55, margin: 0 }}>{brief.concentrationRisk}</p>
            </DetailSection>
          )}
          {brief.liquidityAssessment && (
            <DetailSection title="Liquidity">
              <p style={{ fontSize: 12, color: tk.textMid, lineHeight: 1.55, margin: 0 }}>{brief.liquidityAssessment}</p>
            </DetailSection>
          )}
        </div>

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
        context={`Fund: ${brief.ticker} — ${brief.fundName}`}
        starterQuestions={[
          `How does ${brief.ticker} fit the current macro regime?`,
          `What is the concentration risk in ${brief.ticker}?`,
          `Are there cheaper alternatives to ${brief.ticker} for this exposure?`,
          `What would invalidate the ${brief.ticker} thesis?`,
        ]}
      />
    </>
  )
}
