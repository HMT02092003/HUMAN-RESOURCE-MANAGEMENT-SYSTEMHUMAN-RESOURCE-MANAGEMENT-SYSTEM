"""
Video Frame Extractor
=====================
Extract frames from video for face recognition processing
"""

import cv2
import numpy as np
import logging
from typing import List, Optional
import tempfile
import os

logger = logging.getLogger(__name__)


class VideoFrameExtractor:
    """
    Extract evenly-distributed frames from video file
    """
    
    @staticmethod
    def extract_frames(
        video_path: str, 
        target_count: int = 40,
        max_dimension: int = 1024
    ) -> List[np.ndarray]:
        """
        Extract evenly-distributed frames from video
        
        Args:
            video_path: Path to video file
            target_count: Number of frames to extract (default 40)
            max_dimension: Maximum width/height for resizing (default 640)
            
        Returns:
            List of frame arrays (BGR format)
        """
        logger.info(f"📹 Extracting {target_count} frames from video: {video_path}")
        
        cap = cv2.VideoCapture(video_path)
        
        if not cap.isOpened():
            logger.error("❌ Cannot open video file")
            return []
        
        try:
            # Get video properties
            total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            fps = cap.get(cv2.CAP_PROP_FPS)
            duration = total_frames / fps if fps > 0 else 0
            
            logger.info(
                f"📊 Video info: {total_frames} frames, "
                f"{fps:.1f} FPS, {duration:.1f}s duration"
            )
            
            if total_frames == 0:
                logger.error("❌ Video has no frames")
                return []
            
            # Calculate step size for even distribution
            if total_frames <= target_count:
                # If video has fewer frames than requested, take all
                step = 1
                actual_target = total_frames
            else:
                # Calculate step to get evenly distributed frames
                step = total_frames / target_count
                actual_target = target_count
            
            frames_list = []
            frame_indices = []
            
            # Extract frames at calculated intervals
            for i in range(actual_target):
                frame_idx = int(i * step)
                frame_indices.append(frame_idx)
                
                # Seek to frame
                cap.set(cv2.CAP_PROP_POS_FRAMES, frame_idx)
                ret, frame = cap.read()
                
                if not ret or frame is None:
                    logger.warning(f"⚠️ Failed to read frame at index {frame_idx}")
                    continue
                
                # Resize if needed to reduce memory
                height, width = frame.shape[:2]
                if max(height, width) > max_dimension:
                    if width > height:
                        new_width = max_dimension
                        new_height = int(height * (max_dimension / width))
                    else:
                        new_height = max_dimension
                        new_width = int(width * (max_dimension / height))
                    
                    frame = cv2.resize(
                        frame, 
                        (new_width, new_height), 
                        interpolation=cv2.INTER_AREA
                    )
                
                frames_list.append(frame)
            
            logger.info(
                f"✅ Extracted {len(frames_list)} frames from video "
                f"(indices: {frame_indices[0]}-{frame_indices[-1]})"
            )
            
            return frames_list
            
        except Exception as e:
            logger.error(f"❌ Error extracting frames: {e}")
            return []
            
        finally:
            cap.release()
    
    @staticmethod
    async def extract_frames_from_upload(
        video_bytes: bytes,
        target_count: int = 40,
        max_dimension: int = 1024
    ) -> List[np.ndarray]:
        """
        Extract frames from uploaded video bytes
        
        Args:
            video_bytes: Raw video file bytes
            target_count: Number of frames to extract
            max_dimension: Maximum dimension for resizing
            
        Returns:
            List of frame arrays
        """
        # Create temporary file
        with tempfile.NamedTemporaryFile(
            delete=False, 
            suffix='.mp4'
        ) as temp_file:
            temp_path = temp_file.name
            temp_file.write(video_bytes)
        
        try:
            # Extract frames
            frames = VideoFrameExtractor.extract_frames(
                temp_path, 
                target_count, 
                max_dimension
            )
            return frames
            
        finally:
            # Clean up temporary file (bắt buộc)
            try:
                if 'temp_path' in locals() and temp_path and os.path.exists(temp_path):
                    os.remove(temp_path)
                    logger.info(f"🗑️ Đã xóa file tạm: {temp_path}")
            except Exception as e:
                logger.warning(f"⚠️ Failed to remove temp file: {e}")
    
    @staticmethod
    def frames_to_bytes_list(frames: List[np.ndarray]) -> List[bytes]:
        """
        Convert frame arrays to JPEG bytes (for compatibility with existing processor)
        
        Args:
            frames: List of frame arrays (BGR)
            
        Returns:
            List of JPEG encoded bytes
        """
        bytes_list = []
        
        for idx, frame in enumerate(frames):
            try:
                # Encode frame as JPEG
                success, buffer = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 90])
                
                if success:
                    bytes_list.append(buffer.tobytes())
                else:
                    logger.warning(f"⚠️ Failed to encode frame {idx}")
                    
            except Exception as e:
                logger.error(f"❌ Error encoding frame {idx}: {e}")
        
        return bytes_list


# Create singleton instance
video_extractor = VideoFrameExtractor()
