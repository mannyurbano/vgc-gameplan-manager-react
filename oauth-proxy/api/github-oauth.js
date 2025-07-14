// Simple GitHub OAuth Proxy
// This handles the token exchange for client-side OAuth

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'Authorization code is required' });
    }

    // GitHub OAuth configuration
    const clientId = 'Ov23liIpfWCMoPUySiiP';
    const clientSecret = 'your_client_secret_here'; // Replace with your actual client secret
    const redirectUri = 'https://vgc-gameplan-manager-react-production.up.railway.app';

    // Exchange authorization code for access token
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code: code,
        redirect_uri: redirectUri,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      return res.status(400).json({ error: tokenData.error_description || 'Token exchange failed' });
    }

    // Get user profile using the access token
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `token ${tokenData.access_token}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    const userData = await userResponse.json();

    if (!userResponse.ok) {
      return res.status(400).json({ error: 'Failed to fetch user profile' });
    }

    // Get user email
    const emailResponse = await fetch('https://api.github.com/user/emails', {
      headers: {
        'Authorization': `token ${tokenData.access_token}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    const emails = await emailResponse.json();
    const primaryEmail = emails.find(email => email.primary)?.email || '';

    return res.status(200).json({
      access_token: tokenData.access_token,
      user: {
        id: userData.id,
        login: userData.login,
        name: userData.name,
        avatar_url: userData.avatar_url,
        email: primaryEmail,
      },
    });

  } catch (error) {
    console.error('OAuth proxy error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
} 