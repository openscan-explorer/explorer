import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import TransactionsSection from '../devtools/TransactionsSection';
import SignaturesSection from '../devtools/SignaturesSection';
import UtilsSection from '../devtools/UtilsSection';
import ContractsSection from '../devtools/ContractsSection';
import DevelopmentSection from '../devtools/DevelopmentSection';
import '../../styles/devtools.css';

const DevTools: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(location.search);
  const sectionParam = searchParams.get('section') || 'transactions';
  const [activeSection, setActiveSection] = useState(sectionParam);

  useEffect(() => {
    const newSection = searchParams.get('section') || 'transactions';
    const validSections = ['transactions', 'signatures', 'utils', 'contracts', 'development'];
    setActiveSection(validSections.includes(newSection) ? newSection : 'transactions');
  }, [location.search]);

  const tabs = [
    { name: 'transactions', label: 'Transactions' },
    { name: 'signatures', label: 'Signatures' },
    { name: 'utils', label: 'Utils' },
    { name: 'contracts', label: 'Contracts' },
    { name: 'development', label: 'Development' },
  ];

  const handleTabClick = (tabName: string) => {
    navigate(`/devtools?section=${tabName}`);
    setActiveSection(tabName);
  };

  return (
    <div className="page">
      <div className="devtools-content-wrapper">
				<div className="devtools-tabs">
					{tabs.map((tab) => (
						<button
							key={tab.name}
							onClick={() => handleTabClick(tab.name)}
							className={`devtools-tab ${activeSection === tab.name ? 'active' : ''}`}
						>
							{tab.label}
						</button>
					))}
				</div>

        <div className="devtools-content">
          {activeSection === 'transactions' && <TransactionsSection />}
          {activeSection === 'signatures' && <SignaturesSection />}
          {activeSection === 'utils' && <UtilsSection />}
          {activeSection === 'contracts' && <ContractsSection />}
          {activeSection === 'development' && <DevelopmentSection />}
        </div>
      </div>
    </div>
  );
};

export default DevTools;
