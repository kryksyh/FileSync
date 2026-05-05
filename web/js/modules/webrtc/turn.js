class Turn {
  _username = null;
  _credential = null;
  _expiration = null;

  getServers = async () => {
    await this._getCredentials();
    const host = window.location.hostname;
    // HTTPS deployments terminate TLS for `turn.<host>:443` at Caddy and
    // proxy plain TURN to coturn. Going through :443 lets connections
    // traverse firewalls that block 3478.
    if (window.location.protocol === 'https:') {
      return [
        {
          urls: `turns:turn.${host}:443?transport=tcp`,
          username: this._username,
          credential: this._credential,
        }
      ]
    }
    // HTTP-only deployments keep coturn published on 3478.
    return [
      {
        urls: `stun:${host}:3478`
      },
      {
        urls: `turn:${host}:3478`,
        username: this._username,
        credential: this._credential,
      }
    ]
  }

  _getCredentials = async () => {
    const now = Math.floor(Date.now() / 1000);

    // Check if token is still valid
    if (this._expiration !== null && this._expiration > now) {
      return { username: this._username, credential: this._credential };
    }

    // Fetch new token
    const response = await fetch("/api/credentials", { method: "GET" });

    if (!response.ok) {
      throw new Error("An issue occurred while getting the token.");
    }

    // Parse the response as JSON
    const data = await response.json();

    // Get JWT from cookie
    const token = data.token
    if (!token) throw new Error("Token cookie not found");

    // Decode JWT to get username and credential
    const payload = this._decodeJwt(token);

    // Set cached values
    this._username = payload.username;
    this._credential = payload.credential;
    this._expiration = payload.exp - 10; // Subtract 10 seconds for safety
  };

  _decodeJwt(token) {
    const payload = token.split(".")[1];
    const json = atob(payload);
    return JSON.parse(json);
  }
}

export const turn = new Turn();