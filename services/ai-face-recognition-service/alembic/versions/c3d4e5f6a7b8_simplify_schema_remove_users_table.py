"""simplify_schema_remove_users_table

Revision ID: c3d4e5f6a7b8
Revises: b2c3d4e5f6a7
Create Date: 2026-01-02 14:30:00.000000

Đơn giản hóa schema: xóa bảng users, chỉ giữ face_embeddings với user_id + username
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'c3d4e5f6a7b8'
down_revision: Union[str, None] = 'b2c3d4e5f6a7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """
    Simplify schema:
    1. Add username column to face_embeddings
    2. Copy any existing user data if needed
    3. Drop users table
    """
    
    # Add username column to face_embeddings
    op.add_column('face_embeddings', sa.Column('username', sa.String(100), nullable=True))
    
    # Create index on username
    op.create_index('ix_face_embeddings_username', 'face_embeddings', ['username'])
    
    # If you have existing data in users table, copy employee_code to username
    # (Optional - uncomment if needed)
    # op.execute("""
    #     UPDATE face_embeddings fe
    #     SET username = u.employee_code
    #     FROM users u
    #     WHERE fe.user_id = u.user_id
    # """)
    
    # Make username NOT NULL after data migration
    op.alter_column('face_embeddings', 'username', nullable=False)
    
    # Drop users table
    op.drop_table('users')


def downgrade() -> None:
    """
    Rollback: recreate users table and remove username from face_embeddings
    """
    
    # Recreate users table
    op.create_table('users',
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('employee_code', sa.String(50), nullable=False),
        sa.Column('full_name', sa.String(100), nullable=False),
        sa.Column('department', sa.String(100), nullable=True),
        sa.Column('avatar_url', sa.String(255), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('user_id')
    )
    
    op.create_index('ix_users_user_id', 'users', ['user_id'])
    op.create_index('ix_users_employee_code', 'users', ['employee_code'], unique=True)
    
    # Drop username column and index from face_embeddings
    op.drop_index('ix_face_embeddings_username', 'face_embeddings')
    op.drop_column('face_embeddings', 'username')
