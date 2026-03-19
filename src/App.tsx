import { useState } from 'react';
import { jsonToToon, toonToJson, countTokens } from './toon';
import './App.css';

const SAMPLE_JSON = JSON.stringify({
  company: "Acme Corp",
  founded: 2019,
  active: true,
  employees: [
    { name: "Alice", role: "CEO", age: 35 },
    { name: "Bob", role: "CTO", age: 32 },
    { name: "Charlie", role: "Designer", age: 28 },
    { name: "Diana", role: "Engineer", age: 30 }
  ],
  products: [
    { name: "Widget", price: 9.99, inStock: true },
    { name: "Gadget", price: 24.99, inStock: false },
    { name: "Doohickey", price: 4.99, inStock: true }
  ],
  address: {
    street: "123 Main St",
    city: "Springfield",
    state: "IL",
    zip: "62701"
  },
  tags: ["tech", "startup", "saas"]
}, null, 2);

function App() {
  const [left, setLeft] = useState('');
  const [right, setRight] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState<'left' | 'right' | null>(null);

  const jsonTokens = countTokens(left);
  const toonTokens = countTokens(right);
  const savings = left && right ? Math.round((1 - toonTokens / jsonTokens) * 100) : 0;

  function handleJsonToToon() {
    setError('');
    try {
      const result = jsonToToon(left);
      setRight(result);
    } catch (e) {
      setError(`Invalid JSON: ${(e as Error).message}`);
    }
  }

  function handleToonToJson() {
    setError('');
    try {
      const result = toonToJson(right);
      setLeft(result);
    } catch (e) {
      setError(`TOON parse error: ${(e as Error).message}`);
    }
  }

  function handleSample() {
    setLeft(SAMPLE_JSON);
    setError('');
    try {
      setRight(jsonToToon(SAMPLE_JSON));
    } catch { /* ignore */ }
  }

  async function handleCopy(side: 'left' | 'right') {
    const text = side === 'left' ? left : right;
    await navigator.clipboard.writeText(text);
    setCopied(side);
    setTimeout(() => setCopied(null), 1500);
  }

  return (
    <div className="app">
      <header>
        <h1>JSON &harr; TOON</h1>
        <p className="subtitle">
          Token-Oriented Object Notation — 30-60% fewer LLM tokens
        </p>
      </header>

      {error && <div className="error">{error}</div>}

      <div className="controls">
        <button onClick={handleJsonToToon} className="primary">
          JSON &rarr; TOON
        </button>
        <button onClick={handleToonToJson} className="primary">
          TOON &rarr; JSON
        </button>
        <button onClick={handleSample} className="secondary">
          Load Sample
        </button>
      </div>

      <div className="panels">
        <div className="panel">
          <div className="panel-header">
            <span>JSON</span>
            <div className="panel-meta">
              <span className="tokens">{jsonTokens} tokens</span>
              <button className="copy-btn" onClick={() => handleCopy('left')}>
                {copied === 'left' ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>
          <textarea
            value={left}
            onChange={e => setLeft(e.target.value)}
            placeholder="Paste JSON here..."
            spellCheck={false}
          />
        </div>

        <div className="panel">
          <div className="panel-header">
            <span>TOON</span>
            <div className="panel-meta">
              <span className="tokens">{toonTokens} tokens</span>
              {savings > 0 && (
                <span className="savings">{savings}% fewer tokens</span>
              )}
              <button className="copy-btn" onClick={() => handleCopy('right')}>
                {copied === 'right' ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>
          <textarea
            value={right}
            onChange={e => setRight(e.target.value)}
            placeholder="TOON output appears here..."
            spellCheck={false}
          />
        </div>
      </div>

      <footer>
        <p>
          TOON replaces JSON braces, quotes, and commas with indentation and
          tabular arrays — ideal for compressing structured data in LLM prompts.
        </p>
      </footer>
    </div>
  );
}

export default App;
