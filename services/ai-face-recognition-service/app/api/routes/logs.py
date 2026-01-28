from fastapi import APIRouter, Depends, Query, HTTPException, Request
from sqlalchemy.orm import Session
from sqlalchemy import desc, func
from typing import List, Optional, Dict, Any
from datetime import date, datetime, timedelta
import requests
import logging

from app.core.database import get_db, AttendanceLog
from app.api.deps import get_current_user
from app.core.config import settings

logger = logging.getLogger(__name__)
router = APIRouter()

def fetch_users_from_auth(token: str) -> List[Dict[str, Any]]:
    """
    Fetch all users from Auth Service to map department info.
    """
    if not token:
        return []
    
    try:
        # Construct URL. Using API Gateway URL from settings.
        # Fallback to localhost if not set (development)
        base_url = settings.API_GATEWAY_URL if hasattr(settings, 'API_GATEWAY_URL') else "http://localhost:4000"
        
        # We need to call the Auth Service. 
        # If going through Gateway (common pattern): /api/auth/users
        # If Gateway strips /api/auth, then it depends on config. 
        # Usually internal service-to-service calls might skip Gateway for speed, 
        # but using Gateway ensures we don't need to know internal IPs.
        url = f"{base_url}/api/auth/users" 
        
        # Try fetching a large page to get most users for mapping
        headers = {"Authorization": token}
        params = {"page": 1, "pageSize": 1000}
        
        resp = requests.get(url, headers=headers, params=params, timeout=5)
        
        if resp.status_code == 200:
            data = resp.json()
            # Handle different response structures
            if isinstance(data, list):
                return data
            return data.get("results", []) or data.get("data", []) or []
    except Exception as e:
        logger.error(f"Error fetching users from Auth Service: {e}")
        return []
    return []

@router.get("")
def get_attendance_logs(
    request: Request,
    db: Session = Depends(get_db),
    page: int = 1,
    page_size: int = 20,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    user_id: Optional[int] = None,
    # user_ids: Optional[List[int]] = Query(None), # Removed, backend handles aggregation
    search_name: Optional[str] = None,
    search_dept: Optional[str] = None, # New: Search by department name
    search_time: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """
    Get attendance logs with aggregated user/department info.
    """
    # 1. Authorization
    token = request.headers.get("Authorization")
    if current_user:
        role_id = int(current_user.get('roleId', 0))
        requester_id = int(current_user.get('id', 0) or current_user.get('sub', 0))
        if role_id == 2: # Employee
            if user_id and user_id != requester_id:
                 raise HTTPException(status_code=403, detail="Forbidden")
            user_id = requester_id

    # 2. Fetch Users (if needed for Dept search or Enrichment)
    users_list = []
    user_map = {}
    
    # Only fetch if we have a token (authenticated) and likely need it
    if token:
        users_list = fetch_users_from_auth(token)
        for u in users_list:
            user_map[u.get('id')] = u

    # 3. Handle Department Search Filter
    # If searching by Department, find matching User IDs first
    dept_user_ids = []
    filter_by_dept = False
    
    if search_dept and users_list:
        filter_by_dept = True
        s_dept_lower = search_dept.lower()
        for u in users_list:
            dept = u.get('department', {})
            # Department might be object or ID. Assuming object with name based on frontend usage
            dept_name = dept.get('name', '') if isinstance(dept, dict) else str(dept)
            if s_dept_lower in dept_name.lower():
                dept_user_ids.append(u.get('id'))
        
        # If no users found for this department, logs should be empty
        if not dept_user_ids:
            return {
                "success": True, 
                "data": [], 
                "total": 0, 
                "page": page, 
                "page_size": page_size
            }

    # 4. Build Query
    query = db.query(AttendanceLog)

    if start_date:
        try:
            s_date = datetime.strptime(start_date, "%Y-%m-%d")
            query = query.filter(AttendanceLog.checkin_time >= s_date)
        except ValueError:
            pass
    
    if end_date:
        try:
            e_date = datetime.strptime(end_date, "%Y-%m-%d") + timedelta(days=1)
            query = query.filter(AttendanceLog.checkin_time < e_date)
        except ValueError:
            pass

    if user_id:
        query = query.filter(AttendanceLog.user_id == user_id)
    
    # Apply Department Filter
    if filter_by_dept:
        query = query.filter(AttendanceLog.user_id.in_(dept_user_ids))

    if search_name:
        query = query.filter(AttendanceLog.username.ilike(f"%{search_name}%"))

    if search_time:
         # Truncate to HH:MM to allow minute-level search even if SS is provided
         clean_time = search_time[:5]
         query = query.filter(func.to_char(AttendanceLog.checkin_time, 'HH24:MI:SS').ilike(f"%{clean_time}%"))

    # 5. Sort & Paginate
    total = query.count()
    logs = query.order_by(desc(AttendanceLog.checkin_time))\
                .offset((page - 1) * page_size)\
                .limit(page_size)\
                .all()

    # 6. Aggegate/Enrich Data
    enriched_logs = []
    for log in logs:
        # Convert SQLAlchemy model to dict
        log_dict = {c.name: getattr(log, c.name) for c in log.__table__.columns}
        
        # Enrich with User Info
        u_info = user_map.get(log.user_id, {})
        log_dict['department'] = u_info.get('department', {})
        log_dict['fullName'] = u_info.get('fullName', '') or log.username
        
        enriched_logs.append(log_dict)

    return {
        "success": True,
        "data": enriched_logs,
        "total": total,
        "page": page,
        "page_size": page_size
    }
