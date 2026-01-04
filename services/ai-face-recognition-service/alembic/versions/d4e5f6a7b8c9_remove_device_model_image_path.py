"""remove device_model and image_path from face_embeddings

Revision ID: d4e5f6a7b8c9
Revises: c3d4e5f6a7b8
Create Date: 2026-01-03 22:45:00.000000
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'd4e5f6a7b8c9'
down_revision = 'c3d4e5f6a7b8'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Drop columns if they exist
    conn = op.get_bind()
    insp = sa.inspect(conn)
    cols = [c['name'] for c in insp.get_columns('face_embeddings')]

    if 'device_model' in cols:
        op.drop_column('face_embeddings', 'device_model')

    if 'image_path' in cols:
        try:
            op.drop_column('face_embeddings', 'image_path')
        except Exception:
            # Some older schemas may not have this column
            pass


def downgrade() -> None:
    # Recreate columns (nullable)
    op.add_column('face_embeddings', sa.Column('device_model', sa.String(length=50), nullable=True))
    op.add_column('face_embeddings', sa.Column('image_path', sa.String(length=500), nullable=True))
