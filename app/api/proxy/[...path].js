export default async function handler(req, res) {
  const { path } = req.query;
  
  // Construct the backend URL
  const backendUrl = `http://emr-lite-core.eastus.azurecontainer.io/${path.join('/')}`;
  
  // Copy headers from frontend request
  const headers = {
    'Content-Type': 'application/json',
  };
  
  // Copy auth headers if they exist
  if (req.headers.authorization) {
    headers.authorization = req.headers.authorization;
  }
  
  try {
    const response = await fetch(backendUrl, {
      method: req.method,
      headers,
      body: req.method !== 'GET' && req.method !== 'HEAD' ? JSON.stringify(req.body) : undefined,
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({ error: 'Backend request failed', details: error.message });
  }
}
