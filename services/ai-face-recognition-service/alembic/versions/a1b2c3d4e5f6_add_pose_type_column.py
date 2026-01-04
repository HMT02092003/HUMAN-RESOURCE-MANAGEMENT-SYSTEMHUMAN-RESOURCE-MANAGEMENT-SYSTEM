"""add_pose_type_column

Revision ID: a1b2c3d4e5f6
Revises: 0bb00ecc3399
Create Date: 2026-01-02 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = '0bb00ecc3399'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add pose_type column for multi-angle face recognition (eKYC standard)"""
    # Add pose_type column with default value 'frontal'
    op.add_column('face_embeddings', 
        sa.Column('pose_type', sa.String(length=50), nullable=False, server_default='frontal')
    )
    # Create index for faster queries
    op.create_index(op.f('ix_face_embeddings_pose_type'), 'face_embeddings', ['pose_type'], unique=False)


def downgrade() -> None:
    """Remove pose_type column"""
    op.drop_index(op.f('ix_face_embeddings_pose_type'), table_name='face_embeddings')
    op.drop_column('face_embeddings', 'pose_type')
