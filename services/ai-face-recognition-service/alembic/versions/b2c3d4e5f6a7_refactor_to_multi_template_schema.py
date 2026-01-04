"""refactor_to_multi_template_schema

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-01-02 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'b2c3d4e5f6a7'
down_revision: Union[str, None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """
    Refactor to multi-template schema:
    - Create users table
    - Refactor face_embeddings table (remove pgvector, add JSON vector, face_type)
    - Update attendance_logs
    """
    
    # Create users table
    op.create_table('users',
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('employee_code', sa.String(length=50), nullable=False),
        sa.Column('full_name', sa.String(length=100), nullable=False),
        sa.Column('department', sa.String(length=100), nullable=True),
        sa.Column('avatar_url', sa.String(length=255), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.PrimaryKeyConstraint('user_id'),
        sa.UniqueConstraint('employee_code')
    )
    op.create_index(op.f('ix_users_user_id'), 'users', ['user_id'], unique=False)
    op.create_index(op.f('ix_users_employee_code'), 'users', ['employee_code'], unique=False)
    
    # Drop old face_embeddings table and recreate with new schema
    op.drop_table('face_embeddings')
    
    op.create_table('face_embeddings',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('embedding_vector', sa.Text(), nullable=False),  # JSON string
        sa.Column('face_type', sa.String(length=20), nullable=True, server_default='MASTER'),
        sa.Column('device_model', sa.String(length=50), nullable=True),
        sa.Column('image_path', sa.String(length=500), nullable=True),
        sa.Column('quality_score', sa.Float(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True, server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_face_embeddings_id'), 'face_embeddings', ['id'], unique=False)
    op.create_index(op.f('ix_face_embeddings_user_id'), 'face_embeddings', ['user_id'], unique=False)
    op.create_index(op.f('ix_face_embeddings_face_type'), 'face_embeddings', ['face_type'], unique=False)
    op.create_index(op.f('ix_face_embeddings_is_active'), 'face_embeddings', ['is_active'], unique=False)
    
    # Update attendance_logs table
    op.add_column('attendance_logs', sa.Column('checkin_time', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True))
    op.add_column('attendance_logs', sa.Column('matched_by_type', sa.String(length=20), nullable=True))
    op.add_column('attendance_logs', sa.Column('similarity_score', sa.Float(), nullable=True))
    op.add_column('attendance_logs', sa.Column('image_snapshot_url', sa.String(length=500), nullable=True))
    
    # Create indexes for new columns
    op.create_index(op.f('ix_attendance_logs_checkin_time'), 'attendance_logs', ['checkin_time'], unique=False)
    op.create_index(op.f('ix_attendance_logs_matched_by_type'), 'attendance_logs', ['matched_by_type'], unique=False)


def downgrade() -> None:
    """Rollback multi-template schema changes"""
    # Drop new indexes
    op.drop_index(op.f('ix_attendance_logs_matched_by_type'), table_name='attendance_logs')
    op.drop_index(op.f('ix_attendance_logs_checkin_time'), table_name='attendance_logs')
    
    # Remove new columns from attendance_logs
    op.drop_column('attendance_logs', 'image_snapshot_url')
    op.drop_column('attendance_logs', 'similarity_score')
    op.drop_column('attendance_logs', 'matched_by_type')
    op.drop_column('attendance_logs', 'checkin_time')
    
    # Drop new tables
    op.drop_index(op.f('ix_face_embeddings_is_active'), table_name='face_embeddings')
    op.drop_index(op.f('ix_face_embeddings_face_type'), table_name='face_embeddings')
    op.drop_index(op.f('ix_face_embeddings_user_id'), table_name='face_embeddings')
    op.drop_index(op.f('ix_face_embeddings_id'), table_name='face_embeddings')
    op.drop_table('face_embeddings')
    
    op.drop_index(op.f('ix_users_employee_code'), table_name='users')
    op.drop_index(op.f('ix_users_user_id'), table_name='users')
    op.drop_table('users')
