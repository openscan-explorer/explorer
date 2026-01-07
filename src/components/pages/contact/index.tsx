import type React from "react";

const Contact: React.FC = () => {
  const xmtpDmLink = "https://xmtp.chat/production/dm/0x08EEc580AD41e9994599BaD7d2a74A9874A2852c";

  return (
    <div className="container-medium page-container-padded">
      <div className="page-card">
        {/* Header */}
        <div className="text-center mb-large">
          <h1 className="page-heading">Contact Us</h1>
          <p className="page-subtitle">Get in touch with the OpenScan team</p>
        </div>

        {/* XMTP Section */}
        <div className="about-section">
          <div className="text-center mb-large opensource-card">
            <h2 className="opensource-title">Message via XMTP</h2>
            <p className="opensource-description">
              We use XMTP for decentralized, wallet-to-wallet messaging. Send us a direct message
              using your Ethereum wallet - no email required, fully encrypted, and censorship
              resistant.
            </p>
            <a
              href={xmtpDmLink}
              target="_blank"
              rel="noopener noreferrer"
              className="button-primary-inline"
            >
              Send a Message
            </a>
          </div>
        </div>

        {/* What is XMTP */}
        <div className="about-section">
          <h2 className="page-heading-large text-center">What is XMTP?</h2>
          <div className="data-grid-2 mb-large">
            <div className="feature-card text-center">
              <h3 className="feature-card-title">Wallet-Based Messaging</h3>
              <p className="feature-card-description">
                XMTP enables messaging between Ethereum wallets. No account creation needed - just
                connect your wallet.
              </p>
            </div>
            <div className="feature-card text-center">
              <h3 className="feature-card-title">End-to-End Encrypted</h3>
              <p className="feature-card-description">
                All messages are encrypted. Only you and the recipient can read the conversation.
              </p>
            </div>
            <div className="feature-card text-center">
              <h3 className="feature-card-title">Decentralized</h3>
              <p className="feature-card-description">
                No central server controls your messages. The protocol is open and permissionless.
              </p>
            </div>
            <div className="feature-card text-center">
              <h3 className="feature-card-title">Interoperable</h3>
              <p className="feature-card-description">
                Works across any app that supports XMTP - Converse, Coinbase Wallet, and more.
              </p>
            </div>
          </div>
        </div>

        {/* Alternative Contact */}
        <div className="text-center mb-large">
          <p className="about-section-intro">
            You can also reach us on{" "}
            <a
              href="https://x.com/openscan_eth"
              target="_blank"
              rel="noopener noreferrer"
              className="link-primary"
            >
              X (Twitter)
            </a>{" "}
            or open an issue on{" "}
            <a
              href="https://github.com/openscan-explorer/explorer/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="link-primary"
            >
              GitHub
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
};

export default Contact;
