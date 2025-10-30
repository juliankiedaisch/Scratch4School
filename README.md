# Scratch4School

![Main Layout](packages/scratch-gui/src/components/login-screen/Scratch4SchoolLogo.png)

Scratch4School is a modified version of the official Scratch 3 GUI from the [Scratch website](https://scratch.mit.edu/), specifically adapted for educational environments. This adaptation enhances the original Scratch platform with features designed to facilitate classroom use, project management, and collaboration between teachers and students.

The backend is written in Python with an SQLite database, which provides sufficient performance and reliability for educational settings with 0-1000 users.

The codebase for the frontend is based on the official Scratch editor: [Scratch Codebase](https://github.com/scratchfoundation/scratch-editor)

## Features

### Local Project Storage and Sharing
![Projects](documentation/projects.gif)

Projects are stored locally on your server. Students can choose to publish their projects to SSO groups, making them accessible to other group members. Published projects can be viewed by others or copied as a starting point for derivative work.

### Teacher View for Student Projects
![Projects](documentation/teacher.gif)

Users assigned to the teacher group have special access permissions that allow them to view, monitor, and provide feedback on student projects. This facilitates assessment and guidance without disrupting the student's creative process.

### Backdrop Library System
![Backdrop](documentation/backdrop.gif)

The Backdrop feature serves as a personal library system where users can store reusable elements such as:
- Code blocks and scripts
- Character costumes
- Sound effects
- Background images
- Sprite figures

All items saved to the Backdrop are stored locally on your own server and can be easily reused across multiple projects, encouraging modular development and resource sharing.

## Getting Started

### Self-hosting Scratch4School with existing Apache as Proxy

This guide explains how to set up the Scratch4School application on your own server using Docker and Apache as a reverse proxy.

#### Prerequisites

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

#### Step 1: Prepare Your Configuration Files

You need to customize two main configuration files:

#### 1. Docker Compose Configuration

Edit the `docker-compose.yml` file:

1. Replace `CHANGEME` with a secure random string for the `SECRET_KEY`
2. Set up OAuth configuration:
   - Replace `CLIENT_ID` with your IServ OAuth client ID
   - Replace `CLIENT_SECRET` with your IServ OAuth client secret
   - Replace `ISERV-DOMAIN` with your IServ domain (e.g., `iserv.school.edu`)
   - Replace `SCRATCH-DOMAIN` with your Scratch4School domain (e.g., `scratch.school.edu`)
   - Replace `ROLE_ADMIN` with your admin group (not role!) (e.g., `admins`)
   - Replace `ROLE_TEACHER` with your teacher group (not role!) (e.g., `lehrende`)

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
  - ROLE_ADMIN=ADMIN # Iservgroup not role!
  - ROLE_TEACHER=TEACHER # Iservgroup not role!
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

#### Step 2: Set Up Docker Containers

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

#### Step 3: Configure Apache

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

#### Step 4: Verify the Installation

1. Open your browser and navigate to your domain (e.g., `https://scratch.school.edu`)
2. You should see the Scratch4School login page
3. Try logging in with your IServ credentials

#### PostgreSQL for High-Concurrency Deployments (100+ Users)

For production deployments with 100+ concurrent users, we recommend using PostgreSQL instead of SQLite. PostgreSQL provides better support for concurrent access and improved performance under heavy load.

##### Benefits of PostgreSQL

- **Concurrent Access**: Handles hundreds of simultaneous users without write locks
- **Connection Pooling**: Efficiently manages database connections with configurable pool sizes
- **Transaction Safety**: Automatic retry logic for transient database errors
- **Scalability**: Better performance for large datasets and complex queries

##### PostgreSQL Configuration

The updated `docker-compose.yml` files already include PostgreSQL support. The database service is configured with:

- **Image**: `postgres:15-alpine` (lightweight and performant)
- **Database**: `scratch4school`
- **User**: `scratch`
- **Password**: Set via `POSTGRES_PASSWORD` environment variable
- **Persistent Storage**: Data stored in `postgres_data` volume
- **Health Checks**: Ensures database is ready before backend starts

##### Environment Variables

Set the following environment variables in your `docker-compose.yml`:

```yaml
environment:
  # Database Configuration (PostgreSQL)
  - DATABASE_URI=postgresql://scratch:${POSTGRES_PASSWORD}@db:5432/scratch4school
  - POSTGRES_PASSWORD=your_secure_db_password_here
```

For local development with SQLite (not recommended for production):
```yaml
environment:
  # Database Configuration (SQLite - for local development only)
  - DATABASE_URI=sqlite:///db/main.db
```

##### Migration from SQLite to PostgreSQL

If you're migrating from an existing SQLite installation:

1. **Backup your SQLite database**:
   ```bash
   cd ~/scratch4school/data
   cp db/main.db db/main.db.backup
   ```

2. **Update your `docker-compose.yml`** with PostgreSQL configuration (already included in the latest version).

3. **Set secure password**:
   ```bash
   export POSTGRES_PASSWORD="your_secure_password_here"
   ```

4. **Start PostgreSQL service**:
   ```bash
   docker-compose up -d db
   ```

5. **Wait for PostgreSQL to be ready**:
   ```bash
   docker-compose logs -f db
   # Wait for "database system is ready to accept connections"
   ```

6. **Initialize database schema** (backend will auto-create tables on first run):
   ```bash
   docker-compose up -d backend
   docker-compose logs -f backend
   ```

7. **Optional**: Migrate data from SQLite to PostgreSQL using a migration tool like `pgloader` or manual export/import.

Note: The application will automatically create the required database schema on first startup with PostgreSQL.

##### Performance Tuning

The backend is configured with the following PostgreSQL optimizations:

- **Connection Pool**: 10 connections with 20 overflow
- **Pool Recycle**: Connections recycled every hour
- **Pre-ping**: Validates connections before use
- **Gunicorn Workers**: 4 worker processes with 2 threads each
- **Timeout**: 120 seconds for long-running operations

#### Troubleshooting

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
  docker-compose logs -f db
  ```

- Check PostgreSQL connection:
  ```bash
  docker-compose exec db psql -U scratch -d scratch4school -c "SELECT version();"
  ```

- Ensure your firewall allows traffic on ports 80 and 443
- Verify that the OAuth configuration is correct in both IServ and your Docker environment
- Check that your SSL certificates are valid and properly configured
- For database issues, check `POSTGRES_PASSWORD` is set correctly in your environment

#### Summary of Key Changes

Here's a quick checklist of all the placeholder values you need to replace:

- In `docker-compose.yml`:
  - `SECRET_KEY=CHANGEME` → Your secure random string
  - `POSTGRES_PASSWORD=changeme_db_password` → Your secure database password (PostgreSQL)
  - `OAUTH_CLIENT_ID=CLIENT_ID` → Your OAuth client ID
  - `OAUTH_CLIENT_SECRET=CLIENT_SECRET` → Your OAuth client secret
  - All instances of `ISERV-DOMAIN` → Your IServ domain
  - All instances of `SCRATCH-DOMAIN` (and `SCARTCH-DOMAIN`) → Your Scratch4School domain
  - `ROLE_ADMIN=ADMIN` → Your IServ admin group name
  - `ROLE_TEACHER=TEACHER` → Your IServ teacher group name

- In `apache_proxy.conf`:
  - All instances of `SCRATCH_DOMAIN` → Your Scratch4School domain
  - All instances of `SCRATCH_IP` → Your Docker host IP
  - `/path/to/cert.combine` → Path to your SSL certificate
  - `/path/to/private.key` → Path to your private key

See `backend/.env.example` for a complete list of environment variables.

## Documentation

Some documentation can be found here ![Wiki](https://github.com/juliankiedaisch/Scratch4School/wiki)
