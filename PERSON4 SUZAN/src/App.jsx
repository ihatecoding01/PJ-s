import React, { useState } from 'react';
import { ToastProvider } from './context/ToastContext.jsx';
import { WalletProvider } from './context/WalletContext.jsx';
import Navbar from './components/common/Navbar.jsx';
import Footer from './components/common/Footer.jsx';
import NetworkBanner from './components/common/NetworkBanner.jsx';
import ConnectWalletModal from './components/common/ConnectWalletModal.jsx';

import LandingPage from './pages/LandingPage.jsx';
import CommunityPage from './pages/CommunityPage.jsx';
import ChatPage from './pages/ChatPage.jsx';
import DraftPage from './pages/DraftPage.jsx';
import AgreementDetailPage from './pages/AgreementDetailPage.jsx';
import MyAgreementsPage from './pages/MyAgreementsPage.jsx';
import ProfilePage from './pages/ProfilePage.jsx';
import AdminPage from './pages/AdminPage.jsx';

function MainApp() {
  const [activePage, setActivePage] = useState('landing');
  const [selectedAgreementId, setSelectedAgreementId] = useState(null);
  const [selectedDraftId, setSelectedDraftId] = useState(null);
  const [activeChatThreadId, setActiveChatThreadId] = useState(null);

  const handleOpenAgreement = (id) => {
    setSelectedAgreementId(id);
    setActivePage('agreement_detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenDraft = (id) => {
    setSelectedDraftId(id);
    setActivePage('draft_review');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNavigateToChat = (threadId) => {
    setActiveChatThreadId(threadId);
    setActivePage('chat');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="flex flex-col min-h-screen">
      <NetworkBanner />
      <Navbar activePage={activePage} setActivePage={setActivePage} />
      <ConnectWalletModal />

      <main className="flex-1">
        {activePage === 'landing' && (
          <LandingPage
            setActivePage={setActivePage}
            onOpenAgreement={handleOpenAgreement}
          />
        )}

        {activePage === 'community' && (
          <CommunityPage
            onNavigateToChat={handleNavigateToChat}
          />
        )}

        {activePage === 'chat' && (
          <ChatPage
            activeThreadId={activeChatThreadId}
            onOpenDraftReview={handleOpenDraft}
          />
        )}

        {activePage === 'agreements' && (
          <MyAgreementsPage
            onOpenAgreement={handleOpenAgreement}
            onOpenDraft={handleOpenDraft}
            onNavigateToCommunity={() => setActivePage('community')}
          />
        )}

        {activePage === 'agreement_detail' && (
          <AgreementDetailPage
            agreementId={selectedAgreementId}
            onBack={() => setActivePage('agreements')}
          />
        )}

        {activePage === 'draft_review' && (
          <DraftPage
            agreementId={selectedDraftId}
            onProceedToWizard={(id) => {
              setSelectedAgreementId(id);
              setActivePage('agreement_detail');
            }}
          />
        )}

        {activePage === 'profile' && (
          <ProfilePage />
        )}

        {activePage === 'admin' && (
          <AdminPage />
        )}
      </main>

      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <WalletProvider>
        <MainApp />
      </WalletProvider>
    </ToastProvider>
  );
}
