import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { FaGithub } from 'react-icons/fa';
import './Features.css';

interface Feature {
  title: string;
  description: string;
  icon: string;
  tech: string[];
  github?: string;
  npm?: string;
  stats?: {
    tests?: string;
    coverage?: string;
  };
  highlights: string[];
  category:
    | 'Cryptography'
    | 'Identity'
    | 'Performance'
    | 'Integration'
    | 'Management'
    | 'Voting';
}

const features: Feature[] = [
  {
    title: 'Core Cryptography',
    icon: '🛡️',
    description:
      'Enterprise-grade ECIES protocol (v4.0) featuring robust security primitives. Built on Node.js Crypto API and @noble/curves for maximum security and performance.',
    tech: ['HKDF-SHA256', 'AAD Binding', 'AES-256-GCM', 'secp256k1'],
    category: 'Cryptography',
    highlights: [
      'HKDF-SHA256: Cryptographically robust key derivation (RFC 5869)',
      'AAD Binding: Strict binding of metadata to prevent tampering',
      'Shared Ephemeral Key: Optimized multi-recipient encryption',
      'Compressed Keys: 33-byte public keys for efficiency',
      'Support for Simple, Single, and Multiple recipient modes',
    ],
  },
  {
    title: 'Identity System',
    icon: '🆔',
    description:
      'Flexible, pluggable identity provider system that adapts to your architecture. Support for standard and custom ID formats with automatic configuration syncing.',
    tech: ['Pluggable Providers', 'ObjectId / UUID', 'Custom IDs', 'Auto-Sync'],
    category: 'Identity',
    highlights: [
      'Built-in support for MongoDB ObjectId (12 bytes)',
      'Built-in support for GUID/UUID (16 bytes)',
      'Support for custom ID formats (1-255 bytes)',
      'Member abstraction with integrated cryptographic operations',
      'Automatic constant adaptation based on selected provider',
    ],
  },
  {
    title: 'Key Management',
    icon: '🔑',
    description:
      'Comprehensive key management capabilities including HD wallets and secure memory handling. Protects sensitive data in memory using obfuscation.',
    tech: ['BIP39', 'BIP32/BIP44', 'SecureString', 'SecureBuffer'],
    category: 'Management',
    highlights: [
      'BIP39 Mnemonic phrase generation (12-24 words)',
      'BIP32/BIP44 Hierarchical Deterministic wallet derivation',
      'SecureString/SecureBuffer with XOR obfuscation',
      'Automatic memory zeroing for sensitive data',
      'Cross-platform compatibility',
    ],
  },
  {
    title: 'Streaming Encryption',
    icon: '🚀',
    description:
      'Memory-efficient streaming encryption for processing large files. Designed to handle any file size with constant low memory usage.',
    tech: ['Streams API', 'Chunking', 'Low Memory', 'High Performance'],
    category: 'Performance',
    highlights: [
      'Process gigabytes of data with <10MB RAM usage',
      'Ideal for server-side file encryption',
      'Node.js stream compatibility',
      'Efficient chunk processing',
      'Maintains cryptographic integrity across streams',
    ],
  },
  {
    title: 'Internationalization',
    icon: '🌍',
    description:
      'Built-in internationalization support for error messages and status updates. Ready for global deployment out of the box.',
    tech: ['i18n', '8 Languages', 'Error Translation', 'Zero Deps'],
    category: 'Integration',
    highlights: [
      'Supported languages: en-US, en-GB, fr, es, de, zh-CN, ja, uk',
      'Automatic error message translation',
      'Runtime configuration injection',
      'No external i18n dependencies required',
      'Easy to extend with new languages',
    ],
  },
  {
    title: 'Voting System',
    icon: '🗳️',
    description:
      'Secure homomorphic encryption support for voting systems. Derive Paillier keys from your identity for privacy-preserving vote aggregation.',
    tech: ['Paillier', 'Homomorphic', 'Zero-Knowledge', 'Privacy'],
    category: 'Voting',
    highlights: [
      'Derive Paillier keys from ECDH identity',
      'Homomorphic addition of encrypted votes',
      'Privacy-preserving vote aggregation',
      'Cryptographically verifiable results',
      'Seamless integration with identity system',
    ],
  },
];

const Features = () => {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  return (
    <section className="features section" id="features" ref={ref}>
      <motion.div
        className="features-container"
        initial={{ opacity: 0 }}
        animate={inView ? { opacity: 1 } : {}}
        transition={{ duration: 0.6 }}
      >
        <h2 className="section-title">
          Key <span className="gradient-text">Features</span>
        </h2>
        <p className="features-subtitle">
          Secure, efficient, and easy-to-use encryption for modern applications
        </p>

        <motion.div
          className="suite-intro"
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <h3>
            Secure your data with <em>Elliptic Curve Cryptography</em>,{' '}
            <em>Authenticated Encryption</em>, and <em>Identity Management</em>
          </h3>
          <p>
            <strong>
              @digitaldefiance/node-ecies-lib brings enterprise-grade encryption
              to Node.js.
            </strong>{' '}
            This isn't just a wrapper—it's a complete security suite that
            handles key management, identity binding, and large file encryption
            with <strong>Node.js Crypto API</strong> performance.
          </p>
          <div className="problem-solution">
            <div className="problem">
              <h4>❌ The Problem: Complex & Insecure Encryption</h4>
              <ul>
                <li>Hard to implement correctly without security flaws</li>
                <li>Vulnerable to tampering (lack of AAD binding)</li>
                <li>High memory usage when processing large files</li>
                <li>Incompatible implementations between Node and Browser</li>
                <li>Lack of proper key management and derivation</li>
              </ul>
              <p>
                <strong>Result:</strong> Security vulnerabilities and
                performance bottlenecks in your application.
              </p>
            </div>
            <div className="solution">
              <h4>✅ The Solution: Standardized & Robust ECIES</h4>
              <p>
                <strong>@digitaldefiance/node-ecies-lib</strong> provides a{' '}
                <strong>Protocol v4.0 implementation</strong> that ensures
                security by default: HKDF key derivation, AAD binding, and
                authenticated encryption (AES-GCM).
              </p>
              <p>
                Built for <strong>TypeScript</strong> with{' '}
                <strong>Node.js Crypto API</strong>, it offers{' '}
                <strong>streaming support</strong> for gigabyte-sized files,{' '}
                <strong>pluggable identity providers</strong>, and full{' '}
                <strong>Node.js compatibility</strong>.
              </p>
            </div>
          </div>
          <div className="value-props">
            <div className="value-prop">
              <strong>🛡️ Protocol v4.0</strong>
              <p>
                HKDF-SHA256 key derivation and AAD binding for maximum security
              </p>
            </div>
            <div className="value-prop">
              <strong>🆔 Identity Binding</strong>
              <p>
                Bind encryption to specific user identities to prevent relay
                attacks
              </p>
            </div>
            <div className="value-prop">
              <strong>🚀 Streaming Support</strong>
              <p>
                Encrypt and decrypt large files with constant low memory usage
              </p>
            </div>
            <div className="value-prop">
              <strong>🌍 Internationalization</strong>
              <p>
                Built-in error translation in 8 languages for global
                applications
              </p>
            </div>
          </div>
        </motion.div>

        <div className="features-grid">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              className="feature-card card"
              initial={{ opacity: 0, y: 50 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: index * 0.1, duration: 0.6 }}
            >
              <div className="feature-header">
                <div className="feature-icon">{feature.icon}</div>
                <h3>{feature.title}</h3>
                <span
                  className={`feature-badge ${feature.category.toLowerCase()}`}
                >
                  {feature.category}
                </span>
              </div>

              <p className="feature-description">{feature.description}</p>

              <ul className="feature-highlights">
                {feature.highlights.map((highlight, i) => (
                  <li key={i}>{highlight}</li>
                ))}
              </ul>

              <div className="feature-tech">
                {feature.tech.map((tech) => (
                  <span key={tech} className="tech-badge">
                    {tech}
                  </span>
                ))}
              </div>

              {feature.github && (
                <div className="feature-links">
                  <a
                    href={feature.github}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="feature-link"
                  >
                    <FaGithub />
                    GitHub
                  </a>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </motion.div>
    </section>
  );
};

export default Features;
