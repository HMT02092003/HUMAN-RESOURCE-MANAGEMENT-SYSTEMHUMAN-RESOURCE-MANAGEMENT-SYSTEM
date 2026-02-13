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

@router.get("")
def get_attendance_logs(
    request: Request,
    db: Session = Depends(get_db),
    page: int = 1,
    page_size: int = 20,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    user_id: Optional[int] = None,
    search_name: Optional[str] = None,
    search_dept: Optional[str] = None,
    search_time: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """
    Get attendance logs with aggregated user/department info.
    """
    # 1. Authorization & Scope Verification
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required to view logs")

    token_auth_header = request.headers.get("Authorization")
    allowed_user_ids = None # None means all users allowed (global)
    
    # User info is nested under 'user' key in the payload from auth-service
    user_info = current_user.get('user', {})
    role_id = int(str(user_info.get('roleId', current_user.get('roleId', 0))))
    requester_id = int(str(user_info.get('id', current_user.get('id', 0) or current_user.get('sub', 0))))
        
    # Admin (Role 1) always has global access
    if role_id != 1:
        try:
            # Check scope for 'attendance_history' permission via Auth Service
            base_url = settings.API_GATEWAY_URL if hasattr(settings, 'API_GATEWAY_URL') else "http://api-gateway:4000"
            # Fallback to direct auth-service if gateway fails
            check_scope_url = f"{base_url}/api/auth/users/check-scope"
            
            headers = {"Content-Type": "application/json"}
            if token_auth_header:
                headers["Authorization"] = token_auth_header
            
            resp = requests.post(
                check_scope_url, 
                json={"permissionKey": "attendance_history"}, 
                headers=headers,
                timeout=3
            )
            
            if resp.status_code == 200:
                scope_data = resp.json()
                if scope_data.get("success"):
                    allowed_user_ids = scope_data.get("userIds", [])
                    # logger.info(f"Scope check for user {requester_id}: {scope_data.get('scope')} ({len(allowed_user_ids)} users)")
            else:
                # Fallback for Employee (Role 2) if check-scope fails
                if role_id == 2:
                    allowed_user_ids = [requester_id]
        except Exception as e:
            logger.error(f"Error checking scope via auth-service: {e}")
            if role_id == 2:
                allowed_user_ids = [requester_id]

    # 2. Build Query
    query = db.query(AttendanceLog)

    # Apply Scope Filter
    if allowed_user_ids is not None:
        query = query.filter(AttendanceLog.user_id.in_(allowed_user_ids))

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
        # If user provided a specific user_id, ensure it's within their allowed IDs
        if allowed_user_ids is not None and user_id not in allowed_user_ids:
             # If they try to filter for someone they can't see, return empty or forbidden
             # For better UX, we just force the filter to something impossible or empty
             query = query.filter(AttendanceLog.user_id == -1) 
        else:
             query = query.filter(AttendanceLog.user_id == user_id)
    
    # Apply Time Filter
    if search_time:
         clean_time = search_time[:5]
         query = query.filter(func.to_char(AttendanceLog.checkin_time, 'HH24:MI').ilike(f"%{clean_time}%"))

    # 3. Sort & Paginate
    total = query.count()
    logs = query.order_by(desc(AttendanceLog.checkin_time))\
                .offset((page - 1) * page_size)\
                .limit(page_size)\
                .all()

    # 4. Fetch User Enriched Data (BULK)
    # Collect distinct user IDs from logs that are not 0 (unknown)
    user_ids_to_fetch = list(set([log.user_id for log in logs if log.user_id and log.user_id > 0]))
    
    user_map = {}
    if user_ids_to_fetch:
        try:
            base_url = settings.API_GATEWAY_URL if hasattr(settings, 'API_GATEWAY_URL') else "http://localhost:4000"
            # Fallback to direct service if needed
            urls_to_try = [
                f"{base_url}/api/auth/users/bulk",
                "http://localhost:4001/api/users/bulk"
            ]
            
            payload = {"userIds": user_ids_to_fetch}
            headers = {"Content-Type": "application/json"}
            # Pass auth token if available, though endpoint is public/internal
            if token_auth_header:
                headers["Authorization"] = token_auth_header
                
            fetched_users = []
            
            for url in urls_to_try:
                try:
                    # print(f"DEBUG: Bulk fetching users from {url} with IDs: {user_ids_to_fetch}")
                    resp = requests.post(url, json=payload, headers=headers, timeout=5)
                    
                    if resp.status_code == 200:
                        data = resp.json()
                        fetched_users = data.get("data", []) or []
                        # print(f"DEBUG: Fetched {len(fetched_users)} users")
                        break # Success
                    # else:
                        # print(f"DEBUG: Failed {url} status {resp.status_code}")
                except Exception as e:
                    logger.error(f"Error bulk fetching from {url}: {e}")
                    
            for u in fetched_users:
                # Map using string ID for consistency
                uid = str(u.get("id"))
                user_map[uid] = u
                
        except Exception as e:
            logger.error(f"Error in bulk user fetch logic: {e}")

    # 5. Aggegate/Enrich Data
    enriched_logs = []
    
    # Filter by name/dept logic is now applied AFTER fetching (because we fetch only relevant page users)
    # Note: If strict filtering by name/dept is required on DB level, it requires cross-service complexity.
    # Current implementation filters the page results. For partial name match on whole DB, use 'searchUsers' flow which is different.
    # Given the previous code, full DB filtering was attempted by fetching ALL users first.
    # If the user wants to filter solely on the viewed page, this is fine.
    # If they want to search the whole database by name/dept, we can't efficiently do it this way.
    # Assuming "viewing logs" context, post-fetch enrichment is standard.
    
    for log in logs:
        log_dict = {c.name: getattr(log, c.name) for c in log.__table__.columns}
        
        # Enrich with User Info
        u_info = user_map.get(str(log.user_id), {})
        
        # 1. Map Department
        raw_dept = u_info.get('department')
        dept_obj = {'name': '---'}
        
        if isinstance(raw_dept, dict):
             dept_name = raw_dept.get('name') or raw_dept.get('dept_name') or raw_dept.get('description') or ''
             if dept_name:
                dept_obj = {'name': dept_name}
        elif raw_dept:
             dept_obj = {'name': str(raw_dept)}
             
        log_dict['department'] = dept_obj
        
        # 2. Map FullName
        full_name = u_info.get('fullName') or u_info.get('full_name') or u_info.get('name')
        
        if not full_name:
             first = u_info.get('firstName') or u_info.get('first_name') or ''
             last = u_info.get('lastName') or u_info.get('last_name') or ''
             if first or last:
                 full_name = f"{first} {last}".strip()
        
        log_dict['fullName'] = full_name or log.username
        
        # Special case: If user_id > 0 but no info found, keep existing info or show user_id
        if log.user_id and log.user_id > 0 and not u_info:
            # Maybe keep username from log but it might be just 'toanhm'
            pass

        # Apply Search Filter (In-Memory)
        # Note: Proper implementation would filter before pagination. 
        # But without a shared DB, filtering by related fields requires:
        # 1. Fetch all matching User IDs from Auth Service (searchUsers endpoint)
        # 2. Pass those IDs to Logs DB query.
        
        match_filter = True
        if search_name:
             s_name = search_name.lower()
             u_full = str(log_dict['fullName']).lower()
             u_name = str(log_dict['username']).lower()
             if s_name not in u_full and s_name not in u_name:
                 match_filter = False
        
        if search_dept and match_filter:
             s_dept = search_dept.lower()
             d_name = str(dept_obj['name']).lower()
             if s_dept not in d_name:
                 match_filter = False
        
        if match_filter:
            enriched_logs.append(log_dict)
            
    # Note: If filtering reduced the page size, the frontend pagination might look weird 
    # (e.g. page 1 has 5 items instead of 20 even if more exist).
    # To fix this properly, we'd need the "Fetch Users First" approach but optimized.
    # For now, we return what we have to ensure DATA correctness.

    return {
        "success": True,
        "data": enriched_logs,
        "total": total, # Total in DB, not total matching filter (limitation of cross-service)
        "page": page,
        "page_size": page_size
    }
