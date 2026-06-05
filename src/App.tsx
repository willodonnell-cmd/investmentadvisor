import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Shell } from './components/layout/Shell'
import { InvestmentDesk } from './screens/InvestmentDesk'
import { BrainstormingScreen } from './screens/BrainstormingScreen'
import { ThesisScreen } from './screens/ThesisScreen'
import { StockDetailScreen } from './screens/StockDetailScreen'
import { FundDetailScreen } from './screens/FundDetailScreen'
import { UnderwritingMemoScreen } from './screens/UnderwritingMemoScreen'
import { ComparisonScreen } from './screens/ComparisonScreen'
import { DecisionScreen } from './screens/DecisionScreen'
import { PortfolioScreen } from './screens/PortfolioScreen'
import { PaperTrackerScreen } from './screens/PaperTrackerScreen'
import { AttributionScreen } from './screens/AttributionScreen'
import { JournalScreen } from './screens/JournalScreen'
import { WorkspaceScreen } from './screens/WorkspaceScreen'
import { HuntScreen } from './screens/HuntScreen'
import { ErrorBoundary } from './components/ui/ErrorBoundary'

const App: React.FC = () => (
  <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
    <Routes>
      <Route element={<Shell />}>
        <Route path="/" element={<ErrorBoundary label="Investment Desk"><InvestmentDesk /></ErrorBoundary>} />
        <Route path="/brainstorm" element={<ErrorBoundary label="Brainstorming"><BrainstormingScreen /></ErrorBoundary>} />
        <Route path="/theses" element={<Navigate to="/" replace />} />
        <Route path="/thesis/:id" element={<ErrorBoundary label="Thesis"><ThesisScreen /></ErrorBoundary>} />
        <Route path="/stock/:ticker" element={<ErrorBoundary label="Stock Detail"><StockDetailScreen /></ErrorBoundary>} />
        <Route path="/fund/:ticker" element={<ErrorBoundary label="Fund Detail"><FundDetailScreen /></ErrorBoundary>} />
        <Route path="/memo/:id" element={<ErrorBoundary label="Memo"><UnderwritingMemoScreen /></ErrorBoundary>} />
        <Route path="/compare" element={<ErrorBoundary label="Comparison"><ComparisonScreen /></ErrorBoundary>} />
        <Route path="/decision" element={<ErrorBoundary label="Decision"><DecisionScreen /></ErrorBoundary>} />
        <Route path="/decision/:id" element={<ErrorBoundary label="Decision"><DecisionScreen /></ErrorBoundary>} />
        <Route path="/portfolio" element={<ErrorBoundary label="Portfolio"><PortfolioScreen /></ErrorBoundary>} />
        <Route path="/paper" element={<ErrorBoundary label="Performance Tracker"><PaperTrackerScreen /></ErrorBoundary>} />
        <Route path="/attribution" element={<ErrorBoundary label="Performance Attribution"><AttributionScreen /></ErrorBoundary>} />
        <Route path="/journal" element={<ErrorBoundary label="Decision Journal"><JournalScreen /></ErrorBoundary>} />
        <Route path="/workspace" element={<ErrorBoundary label="Workspace"><WorkspaceScreen /></ErrorBoundary>} />
        <Route path="/hunt/stocks" element={<ErrorBoundary label="Hunt Stocks"><HuntScreen key="stocks" mode="stocks" /></ErrorBoundary>} />
        <Route path="/hunt/funds" element={<ErrorBoundary label="Hunt Funds"><HuntScreen key="funds" mode="funds" /></ErrorBoundary>} />
        <Route path="/hunt" element={<Navigate to="/hunt/stocks" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  </BrowserRouter>
)

export default App
