"""Add version column to projects table for optimistic locking"""

from alembic import op
import sqlalchemy as sa

def upgrade():
    op.add_column('projects', sa.Column('version', sa.Integer(), nullable=False, server_default='1'))

def downgrade():
    op.drop_column('projects', 'version')
