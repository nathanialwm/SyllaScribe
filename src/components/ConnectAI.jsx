import { useState } from 'react';
import { aiAPI } from '../services/api';

export default function ConnectAI() {
  const [testMessage, setTestMessage] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imagePrompt, setImagePrompt] = useState('What is in this image?');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Test simple text message
  const handleTest = async (e) => {
    e.preventDefault();
    setError('');
    setResponse('');
    setLoading(true);

    try {
      const data = await aiAPI.test(testMessage);
      setResponse(data.response);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Analyze image
  const handleImageAnalysis = async (e) => {
    e.preventDefault();
    setError('');
    setResponse('');
    setLoading(true);

    try {
      const data = await aiAPI.analyzeImage(imageUrl, imagePrompt);
      setResponse(data.response);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mt-5">
      <h2>AI Connection Test</h2>
      <p className="text-muted">Test the AI integration with OpenRouter</p>

      {/* Simple Text Test */}
      <div className="card mb-4">
        <div className="card-header">
          <h5>Text Message Test</h5>
        </div>
        <div className="card-body">
          <form onSubmit={handleTest}>
            <div className="mb-3">
              <label htmlFor="testMessage" className="form-label">Test Message</label>
              <input
                type="text"
                className="form-control"
                id="testMessage"
                value={testMessage}
                onChange={(e) => setTestMessage(e.target.value)}
                placeholder="Enter a test message..."
                required
                disabled={loading}
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Sending...' : 'Send Test Message'}
            </button>
          </form>
        </div>
      </div>

      {/* Image Analysis Test */}
      <div className="card mb-4">
        <div className="card-header">
          <h5>Image Analysis Test</h5>
        </div>
        <div className="card-body">
          <form onSubmit={handleImageAnalysis}>
            <div className="mb-3">
              <label htmlFor="imageUrl" className="form-label">Image URL</label>
              <input
                type="url"
                className="form-control"
                id="imageUrl"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://example.com/image.jpg"
                required
                disabled={loading}
              />
              <small className="form-text text-muted">
                Try: https://upload.wikimedia.org/wikipedia/commons/thumb/d/dd/Gfp-wisconsin-madison-the-nature-boardwalk.jpg/2560px-Gfp-wisconsin-madison-the-nature-boardwalk.jpg
              </small>
            </div>
            <div className="mb-3">
              <label htmlFor="imagePrompt" className="form-label">Prompt (Optional)</label>
              <input
                type="text"
                className="form-control"
                id="imagePrompt"
                value={imagePrompt}
                onChange={(e) => setImagePrompt(e.target.value)}
                placeholder="What is in this image?"
                disabled={loading}
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Analyzing...' : 'Analyze Image'}
            </button>
          </form>
        </div>
      </div>

      {/* Response Display */}
      {error && (
        <div className="alert alert-danger" role="alert">
          <strong>Error:</strong> {error}
        </div>
      )}

      {response && (
        <div className="card">
          <div className="card-header">
            <h5>AI Response</h5>
          </div>
          <div className="card-body">
            <p className="mb-0">{response}</p>
          </div>
        </div>
      )}
    </div>
  );
}