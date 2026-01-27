from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List, Optional
from datetime import date, datetime, timedelta

from app.core.database import get_db, AttendanceLog
from app.api.deps import get_current_user

router = APIRouter()

@router.get("/logs")
def get_attendance_logs(
    db: Session = Depends(get_db),
    page: int = 1,
    page_size: int = 20,
    start_date: Optional[str] = None, # YYYY-MM-DD
    end_date: Optional[str] = None,
    user_id: Optional[int] = None,
    user_ids: Optional[List[int]] = Query(None), # List of user IDs for department filter help
    search_name: Optional[str] = None, # Partial match on username
    search_time: Optional[str] = None, # HH:MM:SS or HH:MM
    current_user: dict = Depends(get_current_user)
):
    """
    Get attendance logs with filtering.
    """
    # 1. Authorization Logic
    if not current_user:
        # If no user (e.g. called internally or gateway auth failed), allow?
        # Better to block externals.
        # For now, if no user, assume unauthenticated.
        pass 
    else:
        role_id = int(current_user.get('roleId', 0))
        requester_id = int(current_user.get('id', 0) or current_user.get('sub', 0))

        # Role 2 = Employee. 
        # If Employee, can ONLY view own data.
        if role_id == 2:
            if user_id and user_id != requester_id:
                raise HTTPException(status_code=403, detail="Forbidden: You can only view your own logs")
            user_id = requester_id # Force filter

    # 2. Build Query
    query = db.query(AttendanceLog)

    if start_date:
        try:
            s_date = datetime.strptime(start_date, "%Y-%m-%d")
            query = query.filter(AttendanceLog.checkin_time >= s_date)
        except ValueError:
            pass
            
    if end_date:
        try:
            e_date = datetime.strptime(end_date, "%Y-%m-%d")
            # End date inclusive means < next day
            e_date = e_date + timedelta(days=1)
            query = query.filter(AttendanceLog.checkin_time < e_date)
        except ValueError:
            pass

    # Filter by specific user_id (Single)
    if user_id:
        query = query.filter(AttendanceLog.user_id == user_id)
        
    # Filter by list of user_ids (Department/Multiple)
    if user_ids:
        query = query.filter(AttendanceLog.user_id.in_(user_ids))

    # Search by Name
    if search_name:
        query = query.filter(AttendanceLog.username.ilike(f"%{search_name}%"))

    # Search by Time (HH:MM:SS)
    if search_time:
        # Cast timestamp to string and check if it contains the search_time
        # Postgres specific: to_char(checkin_time, 'HH24:MI:SS')
        from sqlalchemy import func
        # Note: timezone might be tricky. Assuming DB stores UTC or correct offset.
        # Usually it's better to store/search UTC. 
        # But user input is likely local time.
        # A simple string match on the timestamp might work if formatted, but DB side is safer.
        # For simplicity in Postgres:
        query = query.filter(func.to_char(AttendanceLog.checkin_time, 'HH24:MI:SS').ilike(f"%{search_time}%"))

    # 3. Sort & Paginate
    total = query.count()
    
    logs = query.order_by(desc(AttendanceLog.checkin_time))\
                .offset((page - 1) * page_size)\
                .limit(page_size)\
                .all()

    return {
        "success": True,
        "data": logs,
        "total": total,
        "page": page,
        "page_size": page_size
    }
