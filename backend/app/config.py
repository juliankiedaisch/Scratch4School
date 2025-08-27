import os
from datetime import timedelta

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # OAuth Configuration
    OAUTH_CLIENT_ID = os.environ.get('OAUTH_CLIENT_ID')
    OAUTH_CLIENT_SECRET = os.environ.get('OAUTH_CLIENT_SECRET')
    OAUTH_AUTHORIZE_URL = os.environ.get('OAUTH_AUTHORIZE_URL')
    OAUTH_TOKEN_URL = os.environ.get('OAUTH_TOKEN_URL')
    OAUTH_USERINFO_URL = os.environ.get('OAUTH_USERINFO_URL')
    OAUTH_JWKS_URI = os.environ.get('OAUTH_JWKS_URI')
    OAUTH_REDIRECT_URI = os.environ.get('OAUTH_REDIRECT_URI')
    
    # Frontend URL for redirects after auth
    FRONTEND_URL = os.environ.get('FRONTEND_URL')

class DevelopmentConfig(Config):
    DEBUG = True
    SQLALCHEMY_DATABASE_URI = os.environ.get('DEV_DATABASE_URI') or f'sqlite:///{os.path.join(os.getcwd(), "db/main.db")}'

class ProductionConfig(Config):
    DEBUG = False
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URI') or f'sqlite:///{os.path.join(os.getcwd(), "db/main.db")}'