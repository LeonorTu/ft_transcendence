const db = require('../db');

const googleOAuthHandler = async function(request, reply) {
  try {
    // Exchange the authorization code for tokens
    const { token } = await this.googleOAuth2.getAccessTokenFromAuthorizationCodeFlow(request);
    
    // Use the access token to get user profile
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${token.access_token}` }
    });
    
    if (!userInfoResponse.ok) {
      throw new Error('Failed to fetch user info from Google');
    }

	if (userInfoResponse.ok) {
		console.log("User info adquired corectly")
	}
    
    
    const googleUser = await userInfoResponse.json();
    
    // Check if user exists with this Google ID
    const user = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM users WHERE google_id = ?', [googleUser.id], (err, row) => {
        if (err) return reject(err);
        resolve(row);
      });
    });
    
    let userId;
    
    if (user) {
      // User exists, use their ID
      userId = user.id;
    } else {
      // Create new user
      const result = await new Promise((resolve, reject) => {
        db.run(
          'INSERT INTO users (username, email, google_id, password) VALUES (?, ?, ?, ?)',
          [googleUser.email.split('@')[0], googleUser.email, googleUser.id, ''],
          function(err) {
            if (err) return reject(err);
            resolve(this.lastID);
          }
        );
      });
      
      userId = result;
    }
    
    // Generate a JWT token
    const jwtToken = await reply.jwtSign({ 
      id: userId, 
      email: googleUser.email 
    });
    
    // Redirect to frontend with the token
    return reply.redirect(`/?access_token=${jwtToken}`);
    
  } catch (err) {
    request.log.error(`Google OAuth error: ${err.message}`);
    return reply.redirect('/?error=authentication_failed');
  }
};

module.exports = {
  googleOAuthHandler
};