"""remove is_active column

Revision ID: e5f6a7b8c9d0
Revises: d4e5f6a7b8c9
Create Date: 2025-01-24 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'e5f6a7b8c9d0'
down_revision = 'd4e5f6a7b8c9'
branch_labels = None
depends_on = None


def upgrade():
    # Remove is_active column from face_embeddings table
    op.drop_column('face_embeddings', 'is_active')


def downgrade():
    # Restore is_active column if rolling back
    op.add_column('face_embeddings', sa.Column('is_active', sa.Boolean(), nullable=True, default=True))
    
    # Set default value for existing rows
    op.execute("UPDATE face_embeddings SET is_active = TRUE WHERE is_active IS NULL")
    
    # Add index
    op.create_index('ix_face_embeddings_is_active', 'face_embeddings', ['is_active'])
