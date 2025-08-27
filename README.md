# Scratch4School
This is the official Scratch 3 GUI from [Scratch website](https://scratch.mit.edu/) with modifications to use it in school. The backend is written in python with an sqlite database. This should be sufficant for a usercase of 0-1000 Users.

The Codebase for the frontend can be found here: [Scratch Codebase](https://github.com/scratchfoundation/scratch-editor)


## Self-hosting Scratch4School with existing Apache as Proxy

This guide explains how to set up the Scratch4School application on your own server using Docker and Apache as a reverse proxy.

### Prerequisites

- A server with Docker and Docker Compose installed
- Apache web server with the following modules enabled:
  - `mod_proxy`
  - `mod_proxy_http`
  - `mod_proxy_wstunnel` (for WebSocket support)
  - `mod_ssl` (for HTTPS)
  - `mod_headers` (for CORS headers)
  - `mod_rewrite` (for handling OPTIONS requests)
- A valid SSL certificate for your domain
- IServ OAuth credentials (for authentication)

### Step 1: Prepare Your Configuration Files

You need to customize two main configuration files:

#### 1. Docker Compose Configuration

Edit the `docker-compose.yml` file:

1. Replace `CHANGEME` with a secure random string for the `SECRET_KEY`
2. Set up OAuth configuration:
   - Replace `CLIENT_ID` with your IServ OAuth client ID
   - Replace `CLIENT_SECRET` with your IServ OAuth client secret
   - Replace `ISERV-DOMAIN` with your IServ domain (e.g., `iserv.school.edu`)
   - Replace `SCRATCH-DOMAIN` with your Scratch4School domain (e.g., `scratch.school.edu`)

Example of relevant sections to modify:

```yaml
environment:
  - SECRET_KEY=your_secure_random_string_here
  # OAuth Configuration
  - OAUTH_CLIENT_ID=your_client_id_here
  - OAUTH_CLIENT_SECRET=your_client_secret_here
  - OAUTH_AUTHORIZE_URL=https://your-iserv-domain.com/iserv/oauth/v2/auth
  - OAUTH_TOKEN_URL=https://your-iserv-domain.com/iserv/oauth/v2/token
  - OAUTH_USERINFO_URL=https://your-iserv-domain.com/iserv/public/oauth/userinfo
  - OAUTH_JWKS_URI=https://your-iserv-domain.com/iserv/public/jwk
  - OAUTH_REDIRECT_URI=https://your-scratch-domain.com/backend/authorize
  # Frontend URL for redirects after auth
  - FRONTEND_URL=https://your-scratch-domain.com
```

#### 2. Apache Proxy Configuration

Edit the `apache_proxy.conf` file:

1. Replace all instances of `SCRATCH_DOMAIN` with your actual domain (e.g., `scratch.school.edu`)
2. Replace all instances of `SCRATCH_IP` with the IP address where Docker is running
   - Use `127.0.0.1` if Docker is running on the same machine as Apache
   - Use the server's LAN IP if Docker is running on a different machine
3. Update the SSL certificate paths:
   - `SSLCertificateFile /path/to/cert.combine` with the path to your certificate
   - `SSLCertificateKeyFile /path/to/private.key` with the path to your private key

The ports (8601 for frontend and 5008 for backend) are already configured in both files, but you can confirm these match in both the Apache config and Docker Compose file.

### Step 2: Set Up Docker Containers

1. Create a directory for your Scratch4School deployment:
   ```bash
   mkdir -p ~/scratch4school/data/{uploads,db}
   cd ~/scratch4school
   ```

2. Copy your edited `docker-compose.yml` to this directory.

3. Start the containers:
   ```bash
   docker-compose up -d
   ```

### Step 3: Configure Apache

1. Copy your edited `apache_proxy.conf` to your Apache configuration directory:
   ```bash
   sudo cp apache_proxy.conf /etc/apache2/sites-available/scratch4school.conf
   ```

2. Enable the site:
   ```bash
   sudo a2ensite scratch4school.conf
   ```

3. Make sure all required Apache modules are enabled:
   ```bash
   sudo a2enmod proxy proxy_http proxy_wstunnel ssl headers rewrite
   ```

4. Test Apache configuration:
   ```bash
   sudo apache2ctl configtest
   ```

5. Restart Apache:
   ```bash
   sudo systemctl restart apache2
   ```

### Step 4: Verify the Installation

1. Open your browser and navigate to your domain (e.g., `https://scratch.school.edu`)
2. You should see the Scratch4School login page
3. Try logging in with your IServ credentials

### Troubleshooting

If you encounter issues:

- Check Apache logs: 
  ```bash
  sudo tail -f /var/log/apache2/scratch_error.log
  sudo tail -f /var/log/apache2/scratch_access.log
  ```

- Check Docker container logs:
  ```bash
  docker-compose logs -f frontend
  docker-compose logs -f backend
  ```

- Ensure your firewall allows traffic on ports 80 and 443
- Verify that the OAuth configuration is correct in both IServ and your Docker environment
- Check that your SSL certificates are valid and properly configured

### Summary of Key Changes

Here's a quick checklist of all the placeholder values you need to replace:

- In `docker-compose.yml`:
  - `SECRET_KEY=CHANGEME` → Your secure random string
  - `OAUTH_CLIENT_ID=CLIENT_ID` → Your OAuth client ID
  - `OAUTH_CLIENT_SECRET=CLIENT_SECRET` → Your OAuth client secret
  - All instances of `ISERV-DOMAIN` → Your IServ domain
  - All instances of `SCRATCH-DOMAIN` (and `SCARTCH-DOMAIN`) → Your Scratch4School domain

- In `apache_proxy.conf`:
  - All instances of `SCRATCH_DOMAIN` → Your Scratch4School domain
  - All instances of `SCRATCH_IP` → Your Docker host IP
  - `/path/to/cert.combine` → Path to your SSL certificate
  - `/path/to/private.key` → Path to your private key