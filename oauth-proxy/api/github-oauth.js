// OAuth Proxy for GitHub - Deploy this to Vercel
export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { client_id, client_secret, code, redirect_uri } = req.body;

    // Validate required fields
    if (!client_id || !client_secret || !code || !redirect_uri) {
      return res.status(400).json({ 
        error: 'Missing required fields: client_id, client_secret, code, redirect_uri' 
      });
    }

    // Exchange code for access token with GitHub
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id,
        client_secret,
        code,
        redirect_uri
      })
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('GitHub OAuth error:', errorText);
      return res.status(tokenResponse.status).json({ 
        error: 'GitHub OAuth exchange failed',
        details: errorText 
      });
    }

    const tokenData = await tokenResponse.json();

    // Check for errors in the response
    if (tokenData.error) {
      return res.status(400).json({ 
        error: 'OAuth error',
        details: tokenData.error_description || tokenData.error 
      });
    }

    // Return the access token
    return res.status(200).json(tokenData);

  } catch (error) {
    console.error('OAuth proxy error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
} 