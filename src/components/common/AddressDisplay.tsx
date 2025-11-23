import React, { useContext, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSourcify } from '../../hooks/useSourcify';
import { Address } from '../../types';
import { AppContext } from '../../context';

interface AddressDisplayProps {
    address: Address;
    addressHash: string;
    chainId?: string;
}

const AddressDisplay: React.FC<AddressDisplayProps> = ({ address, addressHash, chainId = '1' }) => {
    const [storageSlot, setStorageSlot] = useState('');
    const [storageValue, setStorageValue] = useState('');
    const [showContractDetails, setShowContractDetails] = useState(false);
    const { jsonFiles } = useContext(AppContext);
    
    const isContract = address.code && address.code !== '0x';

    // Fetch Sourcify data only if it's a contract
    const { data: sourcifyData, loading: sourcifyLoading, isVerified } = useSourcify(
        Number(chainId),
        isContract ? addressHash : undefined,
        'all',
        true
    );

    const truncate = (str: string, start = 6, end = 4) => {
        if (!str) return '';
        if (str.length <= start + end) return str;
        return `${str.slice(0, start)}...${str.slice(-end)}`;
    };

    const formatBalance = (balance: string) => {
        try {
            const eth = Number(balance) / 1e18;
            return `${eth.toFixed(6)} ETH`;
        } catch (e) {
            return balance;
        }
    };

    const formatValue = (value: string) => {
        try {
            const eth = Number(value) / 1e18;
            return `${eth.toFixed(6)} ETH`;
        } catch (e) {
            return '0 ETH';
        }
    };

    const handleGetStorage = () => {
        // Check if the slot exists in the storeageAt object
        if (address.storeageAt && address.storeageAt[storageSlot]) {
            setStorageValue(address.storeageAt[storageSlot]);
        } else {
            setStorageValue('0x0000000000000000000000000000000000000000000000000000000000000000');
        }
    };
    
    // Check if we have local artifact data for this address
    const localArtifact = jsonFiles[addressHash.toLowerCase()];

    // Parse local artifact to sourcify format if it exists
    const parsedLocalData = localArtifact ? {
        name: localArtifact.contractName,
        compilerVersion: localArtifact.buildInfo?.solcLongVersion,
        evmVersion: localArtifact.buildInfo?.input?.settings?.evmVersion,
        abi: localArtifact.abi,
        files: localArtifact.sourceCode ? [{
            name: localArtifact.sourceName || 'Contract.sol',
            path: localArtifact.sourceName || 'Contract.sol',
            content: localArtifact.sourceCode
        }] : undefined,
        metadata: {
            language: localArtifact.buildInfo?.input?.language,
            compiler: localArtifact.buildInfo ? {
                version: localArtifact.buildInfo.solcVersion
            } : undefined
        },
        match: 'perfect' as const,
        creation_match: null,
        runtime_match: null,
        chainId: chainId,
        address: addressHash,
        verifiedAt: undefined
    } : null;

    // Use local artifact data if available and sourcify is not verified, otherwise use sourcify
    const contractData = (isVerified && sourcifyData) ? sourcifyData : parsedLocalData;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Address Header Card */}
            <div className="block-display-card">
                <div className="block-display-header">
                    <span className="block-label">Address</span>
                    <span className="block-number" style={{ fontFamily: 'monospace', fontSize: '1.1rem' }}>
                        {addressHash}
                    </span>
                </div>

                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '12px',
                    marginBottom: '0'
                }}>
                    {/* Type */}
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        padding: '10px 16px',
                        background: 'rgba(16, 185, 129, 0.04)',
                        borderRadius: '8px',
                        borderLeft: '3px solid #10b981'
                    }}>
                        <span style={{ 
                            fontSize: '0.85rem',
                            color: '#10b981',
                            fontWeight: '600',
                            fontFamily: 'Outfit, sans-serif'
                        }}>Type</span>
                        <span style={{ 
                            fontWeight: '600',
                            color: isContract ? '#3b82f6' : '#10b981',
                            fontFamily: 'Outfit, sans-serif',
                            fontSize: '0.95rem'
                        }}>
                            {isContract ? '📄 Contract' : '👤 EOA'}
                        </span>
                    </div>

                    {/* Balance */}
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        padding: '10px 16px',
                        background: 'rgba(16, 185, 129, 0.04)',
                        borderRadius: '8px',
                        borderLeft: '3px solid #10b981'
                    }}>
                        <span style={{ 
                            fontSize: '0.85rem',
                            color: '#10b981',
                            fontWeight: '600',
                            fontFamily: 'Outfit, sans-serif'
                        }}>Balance</span>
                        <span style={{ 
                            fontWeight: '600',
                            color: '#059669',
                            fontFamily: 'Outfit, sans-serif',
                            fontSize: '0.95rem'
                        }}>
                            {formatBalance(address.balance)}
                        </span>
                    </div>

                    {/* Transaction Count */}
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        padding: '10px 16px',
                        background: 'rgba(16, 185, 129, 0.04)',
                        borderRadius: '8px',
                        borderLeft: '3px solid #10b981'
                    }}>
                        <span style={{ 
                            fontSize: '0.85rem',
                            color: '#10b981',
                            fontWeight: '600',
                            fontFamily: 'Outfit, sans-serif'
                        }}>Transactions</span>
                        <span style={{ 
                            fontWeight: '600',
                            color: '#059669',
                            fontFamily: 'Outfit, sans-serif',
                            fontSize: '0.95rem'
                        }}>
                            {Number(address.txCount).toLocaleString()}
                        </span>
                    </div>
                    
                    {/* Verification (only for contracts) */}
                    {isContract && (
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '10px 16px',
                            background: 'rgba(16, 185, 129, 0.04)',
                            borderRadius: '8px',
                            borderLeft: '3px solid #10b981'
                        }}>
                            <span style={{ 
                                fontSize: '0.85rem',
                                color: '#10b981',
                                fontWeight: '600',
                                fontFamily: 'Outfit, sans-serif'
                            }}>Verified</span>
                            <span style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                            }}>
                                {sourcifyLoading ? (
                                    <span style={{
                                        color: 'rgba(255, 255, 255, 0.5)',
                                        fontSize: '0.9rem',
                                        fontFamily: 'Outfit, sans-serif'
                                    }}>
                                        Checking...
                                    </span>
                                ) : (isVerified || parsedLocalData) ? (
                                    <>
                                        <span style={{
                                            color: '#10b981',
                                            fontWeight: '600',
                                            fontSize: '0.95rem',
                                            fontFamily: 'Outfit, sans-serif'
                                        }}>
                                            ✓ Yes
                                        </span>
                                        {contractData?.match && (
                                            <span style={{
                                                fontSize: '0.7rem',
                                                padding: '2px 6px',
                                                background: 'rgba(16, 185, 129, 0.2)',
                                                borderRadius: '4px',
                                                color: '#10b981',
                                                fontWeight: '600'
                                            }}>
                                                {contractData.match === 'perfect' ? parsedLocalData ? 'Local' : 'Perfect' : 'Partial'}
                                            </span>
                                        )}
                                    </>
                                ) : (
                                    <span style={{
                                        color: 'rgba(255, 255, 255, 0.5)',
                                        fontSize: '0.9rem',
                                        fontFamily: 'Outfit, sans-serif'
                                    }}>
                                        No
                                    </span>
                                )}
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {/* Contract Verification Details */}
            {isContract && (isVerified || parsedLocalData) && contractData && (
                <div className="block-display-card">
                    <div className="block-display-header" style={{ cursor: 'pointer' }} onClick={() => setShowContractDetails(!showContractDetails)}>
                        <span className="block-label">Contract Details</span>
                        <span style={{ fontSize: '1.2rem', color: '#10b981' }}>{showContractDetails ? '▼' : '▶'}</span>
                    </div>

                    {showContractDetails && (
                        <div className="block-display-grid">
                            {contractData.name && (
                                <div className="block-detail-item">
                                    <span className="detail-label">Contract Name</span>
                                    <span className="detail-value" style={{ color: '#10b981', fontWeight: '600' }}>
                                        {contractData.name}
                                    </span>
                                </div>
                            )}

                            {contractData.compilerVersion && (
                                <div className="block-detail-item">
                                    <span className="detail-label">Compiler Version</span>
                                    <span className="detail-value">{contractData.compilerVersion}</span>
                                </div>
                            )}

                            {contractData.evmVersion && (
                                <div className="block-detail-item">
                                    <span className="detail-label">EVM Version</span>
                                    <span className="detail-value">{contractData.evmVersion}</span>
                                </div>
                            )}

                            {contractData.chainId && (
                                <div className="block-detail-item">
                                    <span className="detail-label">Chain ID</span>
                                    <span className="detail-value">{contractData.chainId}</span>
                                </div>
                            )}

                            {contractData.verifiedAt && (
                                <div className="block-detail-item">
                                    <span className="detail-label">Verified At</span>
                                    <span className="detail-value">
                                        {new Date(contractData.verifiedAt).toLocaleString()}
                                    </span>
                                </div>
                            )}

                            {contractData.match && (
                                <div className="block-detail-item">
                                    <span className="detail-label">Match Type</span>
                                    <span className="detail-value" style={{
                                        color: contractData.match === 'perfect' ? '#10b981' : '#f59e0b',
                                        fontWeight: '600'
                                    }}>
                                        {contractData.match.toUpperCase()}
                                    </span>
                                </div>
                            )}

                            {contractData.creation_match && (
                                <div className="block-detail-item">
                                    <span className="detail-label">Creation Match</span>
                                    <span className="detail-value" style={{
                                        color: contractData.creation_match === 'perfect' ? '#10b981' : '#f59e0b',
                                        fontWeight: '600'
                                    }}>
                                        {contractData.creation_match.toUpperCase()}
                                    </span>
                                </div>
                            )}

                            {contractData.runtime_match && (
                                <div className="block-detail-item">
                                    <span className="detail-label">Runtime Match</span>
                                    <span className="detail-value" style={{
                                        color: contractData.runtime_match === 'perfect' ? '#10b981' : '#f59e0b',
                                        fontWeight: '600'
                                    }}>
                                        {contractData.runtime_match.toUpperCase()}
                                    </span>
                                </div>
                            )}
                            
                            {/* Contract Bytecode */}
                            <div className="block-detail-item" style={{ gridColumn: '1 / -1' }}>
                                <span className="detail-label">Contract Bytecode</span>
                                <div style={{
                                    marginTop: '8px',
                                    padding: '12px',
                                    background: 'rgba(255, 255, 255, 0.03)',
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                    borderRadius: '8px',
                                    fontFamily: 'monospace',
                                    fontSize: '0.75rem',
                                    wordBreak: 'break-all',
                                    color: '#10b981',
                                    maxHeight: '200px',
                                    overflowY: 'auto',
                                }}>
                                    {address.code}
                                </div>
                            </div>
                            
                            {/* Source Code */}
                            {((contractData.files && contractData.files.length > 0) || (contractData as any).sources) && (() => {
                                // Prepare source files array - either from files or sources object
                                const sources = (contractData as any).sources;
                                const sourceFiles = contractData.files && contractData.files.length > 0
                                    ? contractData.files
                                    : sources
                                        ? Object.entries(sources).map(([path, source]: [string, any]) => ({
                                            name: path,
                                            path: path,
                                            content: source.content || ''
                                        }))
                                        : [];

                                return sourceFiles.length > 0 ? (
                                    <div className="block-detail-item" style={{ gridColumn: '1 / -1' }}>
                                        <div style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            cursor: 'pointer',
                                            userSelect: 'none'
                                        }} onClick={() => {
                                            const elem = document.getElementById('source-code-content');
                                            const icon = document.getElementById('source-code-icon');
                                            if (elem && icon) {
                                                const isHidden = elem.style.display === 'none';
                                                elem.style.display = isHidden ? 'block' : 'none';
                                                icon.textContent = isHidden ? '▼' : '▶';
                                            }
                                        }}>
                                            <span className="detail-label">Source Code</span>
                                            <span id="source-code-icon" style={{ fontSize: '0.9rem', color: '#10b981' }}>▶</span>
                                        </div>
                                        <div id="source-code-content" style={{
                                            marginTop: '8px',
                                            display: 'none'
                                        }}>
                                            {sourceFiles.map((file: any, idx: number) => (
                                                <div key={idx} style={{ marginBottom: '16px' }}>
                                                    <div style={{
                                                        padding: '8px 12px',
                                                        background: 'rgba(16, 185, 129, 0.08)',
                                                        border: '1px solid rgba(16, 185, 129, 0.2)',
                                                        borderRadius: '6px 6px 0 0',
                                                        fontFamily: 'monospace',
                                                        fontSize: '0.85rem',
                                                        color: '#10b981',
                                                        fontWeight: '600'
                                                    }}>
                                                        📄 {file.name || file.path}
                                                    </div>
                                                    <pre style={{
                                                        margin: 0,
                                                        padding: '16px',
                                                        background: 'rgba(0, 0, 0, 0.3)',
                                                        border: '1px solid rgba(16, 185, 129, 0.2)',
                                                        borderTop: 'none',
                                                        borderRadius: '0 0 6px 6px',
                                                        fontFamily: 'monospace',
                                                        fontSize: '0.75rem',
                                                        color: '#e5e7eb',
                                                        maxHeight: '400px',
                                                        overflowY: 'auto',
                                                        overflowX: 'auto',
                                                        whiteSpace: 'pre'
                                                    }}>
                                                        {file.content}
                                                    </pre>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : null;
                            })()}
                            
                            {/* Contract ABI */}
                            {contractData.abi && contractData.abi.length > 0 && (
                                <div className="block-detail-item" style={{ gridColumn: '1 / -1' }}>
                                    <span className="detail-label">Contract ABI</span>
                                    <div style={{ marginTop: '8px' }}>
                                        {/* Functions */}
                                        {contractData.abi.filter((item: any) => item.type === 'function').length > 0 && (
                                            <div style={{ marginBottom: '12px' }}>
                                                <div style={{ 
                                                    fontSize: '0.85rem', 
                                                    color: '#10b981', 
                                                    marginBottom: '6px',
                                                    fontWeight: '600'
                                                }}>
                                                    Functions ({contractData.abi.filter((item: any) => item.type === 'function').length})
                                                </div>
                                                <div style={{ 
                                                    display: 'flex',
                                                    flexWrap: 'wrap',
                                                    gap: '8px'
                                                }}>
                                                    {contractData.abi
                                                        .filter((item: any) => item.type === 'function')
                                                        .slice(0, 15)
                                                        .map((func: any, idx: number) => (
                                                            <span key={idx} style={{
                                                                padding: '4px 10px',
                                                                background: 'rgba(59, 130, 246, 0.15)',
                                                                color: '#3b82f6',
                                                                borderRadius: '6px',
                                                                fontSize: '0.8rem',
                                                                fontFamily: 'monospace'
                                                            }}>
                                                                {func.name}
                                                            </span>
                                                        ))}
                                                    {contractData.abi.filter((item: any) => item.type === 'function').length > 15 && (
                                                        <span style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.85rem', alignSelf: 'center' }}>
                                                            +{contractData.abi.filter((item: any) => item.type === 'function').length - 15} more
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                        
                                        {/* Events */}
                                        {contractData.abi.filter((item: any) => item.type === 'event').length > 0 && (
                                            <div style={{ marginBottom: '12px' }}>
                                                <div style={{ 
                                                    fontSize: '0.85rem', 
                                                    color: '#10b981', 
                                                    marginBottom: '6px',
                                                    fontWeight: '600'
                                                }}>
                                                    Events ({contractData.abi.filter((item: any) => item.type === 'event').length})
                                                </div>
                                                <div style={{ 
                                                    display: 'flex',
                                                    flexWrap: 'wrap',
                                                    gap: '8px'
                                                }}>
                                                    {contractData.abi
                                                        .filter((item: any) => item.type === 'event')
                                                        .slice(0, 10)
                                                        .map((event: any, idx: number) => (
                                                            <span key={idx} style={{
                                                                padding: '4px 10px',
                                                                background: 'rgba(139, 92, 246, 0.15)',
                                                                color: '#8b5cf6',
                                                                borderRadius: '6px',
                                                                fontSize: '0.8rem',
                                                                fontFamily: 'monospace'
                                                            }}>
                                                                {event.name}
                                                            </span>
                                                        ))}
                                                    {contractData.abi.filter((item: any) => item.type === 'event').length > 10 && (
                                                        <span style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.85rem', alignSelf: 'center' }}>
                                                            +{contractData.abi.filter((item: any) => item.type === 'event').length - 10} more
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                        
                                        {/* Constructor */}
                                        {contractData.abi.find((item: any) => item.type === 'constructor') && (
                                            <div>
                                                <div style={{ 
                                                    fontSize: '0.85rem', 
                                                    color: '#10b981', 
                                                    marginBottom: '6px',
                                                    fontWeight: '600'
                                                }}>
                                                    Constructor
                                                </div>
                                                <span style={{
                                                    padding: '4px 10px',
                                                    background: 'rgba(245, 158, 11, 0.15)',
                                                    color: '#f59e0b',
                                                    borderRadius: '6px',
                                                    fontSize: '0.8rem',
                                                    fontFamily: 'monospace',
                                                    display: 'inline-block'
                                                }}>
                                                    constructor
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                            
                            {/* Metadata Info */}
                            {contractData.metadata && (
                                <div className="block-detail-item" style={{ gridColumn: '1 / -1' }}>
                                    <span className="detail-label">Additional Metadata</span>
                                    <div style={{
                                        marginTop: '8px',
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                                        gap: '12px'
                                    }}>
                                        {contractData.metadata.language && (
                                            <div style={{ 
                                                padding: '8px',
                                                background: 'rgba(255, 255, 255, 0.03)',
                                                borderRadius: '6px'
                                            }}>
                                                <div style={{ fontSize: '0.75rem', color: '#10b981', marginBottom: '4px' }}>
                                                    Language
                                                </div>
                                                <div style={{ fontSize: '0.85rem', color: '#10b981' }}>
                                                    {contractData.metadata.language}
                                                </div>
                                            </div>
                                        )}
                                        {contractData.metadata.compiler && (
                                            <div style={{ 
                                                padding: '8px',
                                                background: 'rgba(255, 255, 255, 0.03)',
                                                borderRadius: '6px'
                                            }}>
                                                <div style={{ fontSize: '0.75rem', color: '#10b981', marginBottom: '4px' }}>
                                                    Compiler
                                                </div>
                                                <div style={{ fontSize: '0.85rem', color: '#10b981' }}>
                                                    {contractData.metadata.compiler.version}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                            
                            {sourcifyData && (<div className="block-detail-item" style={{ gridColumn: '1 / -1' }}>
                                <a
                                    href={`https://repo.sourcify.dev/contracts/full_match/${chainId}/${addressHash}/`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{
                                        color: '#10b981',
                                        textDecoration: 'none',
                                        fontWeight: '600',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '6px'
                                    }}
                                >
                                    View Full Contract on Sourcify ↗
                                </a>
                            </div>)}
                        </div>
                    )}
                </div>
            )}

            {/* Recent Transactions Table */}
            {address.recentTransactions && address.recentTransactions.length > 0 && (
                <div className="block-display-card">
                    <div className="block-display-header">
                        <span className="block-label">Recent Transactions</span>
                        <span style={{ fontSize: '0.9rem', color: 'rgba(255, 255, 255, 0.6)' }}>
                            Last {address.recentTransactions.length} transactions
                        </span>
                    </div>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{
                            width: '100%',
                            borderCollapse: 'collapse',
                            fontFamily: 'Outfit, sans-serif',
                        }}>
                            <thead>
                                <tr style={{
                                    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                                }}>
                                    <th style={{ padding: '12px', textAlign: 'left', color: 'rgba(255, 255, 255, 0.6)', fontWeight: '600', fontSize: '0.85rem' }}>
                                        TX Hash
                                    </th>
                                    <th style={{ padding: '12px', textAlign: 'left', color: 'rgba(255, 255, 255, 0.6)', fontWeight: '600', fontSize: '0.85rem' }}>
                                        From
                                    </th>
                                    <th style={{ padding: '12px', textAlign: 'left', color: 'rgba(255, 255, 255, 0.6)', fontWeight: '600', fontSize: '0.85rem' }}>
                                        To
                                    </th>
                                    <th style={{ padding: '12px', textAlign: 'right', color: 'rgba(255, 255, 255, 0.6)', fontWeight: '600', fontSize: '0.85rem' }}>
                                        Value
                                    </th>
                                    <th style={{ padding: '12px', textAlign: 'center', color: 'rgba(255, 255, 255, 0.6)', fontWeight: '600', fontSize: '0.85rem' }}>
                                        Status
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {address.recentTransactions.map((tx, index) => (
                                    <tr key={tx.hash} style={{
                                        borderBottom: index < address.recentTransactions!.length - 1 ? '1px solid rgba(255, 255, 255, 0.05)' : 'none',
                                        transition: 'background 0.2s',
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                    >
                                        <td style={{ padding: '12px' }}>
                                            <Link
                                                to={`/${chainId}/tx/${tx.hash}`}
                                                style={{
                                                    color: '#10b981',
                                                    textDecoration: 'none',
                                                    fontFamily: 'monospace',
                                                    fontSize: '0.9rem',
                                                }}
                                            >
                                                {truncate(tx.hash, 8, 6)}
                                            </Link>
                                        </td>
                                        <td style={{ padding: '12px' }}>
                                            <Link
                                                to={`/${chainId}/address/${tx.from}`}
                                                style={{
                                                    color: tx.from?.toLowerCase() === addressHash.toLowerCase() ? '#f59e0b' : '#10b981',
                                                    textDecoration: 'none',
                                                    fontFamily: 'monospace',
                                                    fontSize: '0.9rem',
                                                }}
                                            >
                                                {tx.from?.toLowerCase() === addressHash.toLowerCase() ? 'This Address' : truncate(tx.from || '', 6, 4)}
                                            </Link>
                                        </td>
                                        <td style={{ padding: '12px' }}>
                                            {tx.to ? (
                                                <Link
                                                    to={`/${chainId}/address/${tx.to}`}
                                                    style={{
                                                        color: tx.to?.toLowerCase() === addressHash.toLowerCase() ? '#f59e0b' : '#10b981',
                                                        textDecoration: 'none',
                                                        fontFamily: 'monospace',
                                                        fontSize: '0.9rem',
                                                    }}
                                                >
                                                    {tx.to?.toLowerCase() === addressHash.toLowerCase() ? 'This Address' : truncate(tx.to, 6, 4)}
                                                </Link>
                                            ) : (
                                                <span style={{ color: '#8b5cf6', fontSize: '0.85rem', fontWeight: '600' }}>
                                                    Contract Creation
                                                </span>
                                            )}
                                        </td>
                                        <td style={{ padding: '12px', textAlign: 'right', fontFamily: 'monospace', color: '#10b981', fontWeight: '600', fontSize: '0.9rem' }}>
                                            {formatValue(tx.value)}
                                        </td>
                                        <td style={{ padding: '12px', textAlign: 'center' }}>
                                            {tx.receipt?.status === '0x1' ? (
                                                <span style={{
                                                    padding: '4px 10px',
                                                    background: 'rgba(16, 185, 129, 0.15)',
                                                    color: '#10b981',
                                                    borderRadius: '6px',
                                                    fontSize: '0.8rem',
                                                    fontWeight: '600',
                                                }}>
                                                    ✓ Success
                                                </span>
                                            ) : tx.receipt?.status === '0x0' ? (
                                                <span style={{
                                                    padding: '4px 10px',
                                                    background: 'rgba(239, 68, 68, 0.15)',
                                                    color: '#ef4444',
                                                    borderRadius: '6px',
                                                    fontSize: '0.8rem',
                                                    fontWeight: '600',
                                                }}>
                                                    ✗ Failed
                                                </span>
                                            ) : (
                                                <span style={{
                                                    padding: '4px 10px',
                                                    background: 'rgba(245, 158, 11, 0.15)',
                                                    color: '#f59e0b',
                                                    borderRadius: '6px',
                                                    fontSize: '0.8rem',
                                                    fontWeight: '600',
                                                }}>
                                                    ⏳ Pending
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Storage Section (for contracts) */}
            {isContract && (
                <div className="block-display-card">
                    <div className="block-display-header">
                        <span className="block-label">Contract Storage</span>
                    </div>
                    <div style={{ padding: '16px' }}>
                        <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
                            <input
                                type="text"
                                placeholder="Storage slot (e.g., 0x0)"
                                value={storageSlot}
                                onChange={(e) => setStorageSlot(e.target.value)}
                                style={{
                                    flex: 1,
                                    padding: '10px 14px',
                                    background: 'rgba(255, 255, 255, 0.05)',
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                    borderRadius: '8px',
                                    color: '#1f2937',
                                    fontFamily: 'monospace',
                                    fontSize: '0.9rem',
                                }}
                            />
                            <button
                                onClick={handleGetStorage}
                                style={{
                                    padding: '10px 24px',
                                    background: '#10b981',
                                    border: 'none',
                                    borderRadius: '8px',
                                    color: '#ffffff',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                    transition: 'background 0.2s',
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = '#059669'}
                                onMouseLeave={(e) => e.currentTarget.style.background = '#10b981'}
                            >
                                Get
                            </button>
                        </div>
                        {storageValue && (
                            <div style={{
                                padding: '12px',
                                background: 'rgba(16, 185, 129, 0.1)',
                                border: '1px solid rgba(16, 185, 129, 0.3)',
                                borderRadius: '8px',
                                fontFamily: 'monospace',
                                fontSize: '0.85rem',
                                wordBreak: 'break-all',
                                color: '#10b981',
                            }}>
                                {storageValue}
                            </div>
                        )}
                    </div>

                </div>
            )}
            </div>
    );
};

export default AddressDisplay;
