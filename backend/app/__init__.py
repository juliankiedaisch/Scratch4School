from flask import Flask, app
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from authlib.integrations.flask_client import OAuth
from werkzeug.middleware.proxy_fix import ProxyFix
import os
from urllib.parse import urlparse


# Initialize Flask extensions
db = SQLAlchemy()
oauth = OAuth()


def create_app(debug=False):
    app = Flask(__name__)
    # Configure the app based on environment
    if debug:
        app.config.from_object('app.config.DevelopmentConfig')
    else:
        app.config.from_object('app.config.ProductionConfig')
    # Add or update in your app's configuration
    app.config['SECRET_KEY'] = '9Hn8Nw2MvqKUL7o4JbSFOyzpgI_suZ81av0P5J1bbzgak'  # Use a strong, random key
    app.config['SESSION_TYPE'] = 'filesystem'
    app.config['SESSION_COOKIE_DOMAIN'] = f'.{urlparse(app.config["FRONTEND_URL"]).hostname}'
    app.config['SESSION_COOKIE_SECURE'] = False
    app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
    app.config['SESSION_COOKIE_PATH'] = '/backend'
    
    # Important: Set the correct server name if using subdomain session cookies
    app.config['SERVER_NAME'] = urlparse(app.config["FRONTEND_URL"]).hostname  # Adjust to your domain
    #app.config['PREFERRED_URL_SCHEME'] = 'https'
    app.config['APPLICATION_ROOT'] = '/backend'
    
    # Fix for proxied requests
    app.wsgi_app = ProxyFix(app.wsgi_app, x_proto=1, x_host=1, x_port=1, x_prefix=1)


    
    # Enable CORS
    CORS(app, supports_credentials=True, origins=[app.config["FRONTEND_URL"]])
    
    
    # Initialize extensions with app
    db.init_app(app)
    oauth.init_app(app)
    
    # Register OAuth provider
    oauth.register(
        name='oauth_provider',
        client_id=app.config['OAUTH_CLIENT_ID'],
        client_secret=app.config['OAUTH_CLIENT_SECRET'],
        authorize_url=app.config['OAUTH_AUTHORIZE_URL'],
        access_token_url=app.config['OAUTH_TOKEN_URL'],
        userinfo_endpoint=app.config['OAUTH_USERINFO_URL'],
        jwks_uri=app.config['OAUTH_JWKS_URI'],
        client_kwargs={'scope': 'openid profile uuid email groups', 'response_type': 'code', 'state_in_authorization_response': True},
        redirect_uri=app.config['OAUTH_REDIRECT_URI'],
        token_endpoint_auth_method='client_secret_post',
        
    )
    
    # File upload configuration
    app.config['UPLOAD_FOLDER'] = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'uploads')
    app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max upload size
    
    # Create upload folders if they don't exist
    os.makedirs(os.path.join(app.config['UPLOAD_FOLDER'], 'thumbnails'), exist_ok=True)
    os.makedirs(os.path.join(app.config['UPLOAD_FOLDER'], 'costume'), exist_ok=True)
    os.makedirs(os.path.join(app.config['UPLOAD_FOLDER'], 'sound'), exist_ok=True)
    
    # Register blueprints
    from app.routes.auth_routes import auth_bp
    from app.routes.api_routes import api_bp
    from app.routes.project_routes import projects_bp
    from app.routes.asset_routes import assets_bp
    from app.routes.teacher_routes import teacher_bp
    from app.routes.backpack_routes import backpack_bp
    app.register_blueprint(backpack_bp, url_prefix='/api/backpack')
    app.register_blueprint(auth_bp, url_prefix='/')
    app.register_blueprint(api_bp, url_prefix='/api')
    app.register_blueprint(projects_bp, url_prefix='/api/projects')
    app.register_blueprint(assets_bp, url_prefix='/api/assets')
    app.register_blueprint(teacher_bp, url_prefix='/api/teacher')
    

    return app